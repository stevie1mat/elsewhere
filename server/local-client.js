import {requestedObjective,humanActionConstraints} from './decision-check.js';
import {PHONE_SEARCH_REQUEST} from './shared/phone-request.js';
import {RESIDENT_DECISION_SCHEMA,RESIDENT_SYSTEM_PROMPT,validateDecision} from './decision-contract.js';
import {trackedProviderFetch} from './ai-telemetry.js';
export function createLocalClient({url=process.env.LOCAL_AI_URL||'http://127.0.0.1:1234/v1',model=process.env.LOCAL_AI_MODEL||'resident-local',fetchImpl=fetch}={}){
 const base=new URL(url);if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.protocol!=='http:')throw Error('Local inference must use a loopback HTTP URL.');
 const tracker=trackedProviderFetch(fetchImpl,'Mac LM Studio',model);return {provider:'Mac LM Studio',model,configured:true,get lastAttempt(){return tracker.latest;},async complete(context,message,signal){
  const outputSchema=structuredClone(RESIDENT_DECISION_SCHEMA),required=requestedObjective(message);
  outputSchema.properties.nextSteps.maxItems=1;
  const constraints=context.humanActionConstraints||humanActionConstraints(context.conversation,message.startsWith('Chat with the human.')?message.slice('Chat with the human. Their message: '.length):'');
  if(!constraints.phoneAllowed){
    for(const step of [outputSchema,outputSchema.properties.nextSteps.items])step.properties.action.enum=step.properties.action.enum.filter(action=>action!=='phone');
  }
  if(constraints.travelDestination&&message.startsWith('Chat with the human.')){
    outputSchema.properties.changePlan.enum=[true];
    outputSchema.properties.action.enum=[constraints.travelAction||'visit'];
    outputSchema.properties.destination.enum=[constraints.travelDestination];
  }
  for(const [key,maxLength] of [['goal',120],['intention',120],['reply',240],['successCriterion',120]])outputSchema.properties[key].maxLength=maxLength;
  const explicit=message.includes(PHONE_SEARCH_REQUEST)||required&&/\b(please|execute|task experiment)\b/i.test(message)&&!/\b(explain how|tell me|how can|how would)\b/i.test(message);
  if(explicit){
    const phone=message.includes(PHONE_SEARCH_REQUEST),seats=[...(context.perception?.objects||[]),...(context.memory?.knownObjects||[])].filter(o=>o.affordances?.includes('sit'));
    if(phone||required?.interaction==='sit'&&seats.length){
      outputSchema.properties.changePlan.enum=[true];outputSchema.properties.action.enum=[phone?'phone':'interact'];
      if(!phone){outputSchema.properties.verb.enum=['sit'];outputSchema.properties.objectId.enum=[...new Set(seats.map(o=>o.id))];}
      const goal=phone?{metric:'none',direction:'increase',amount:0,interaction:'none'}:required;
      for(const [key,value] of Object.entries(goal))outputSchema.properties.objective.properties[key].enum=[value];
    }
  }
  const instructions=RESIDENT_SYSTEM_PROMPT+'\nLow-memory response: at most one nextStep; reply <=240 characters; goal, intention and successCriterion <=120 characters each. Keep all fields concise. Return exactly one JSON object with all fields: '+JSON.stringify({action:'supported action',destination:'here or landmark ID',seconds:120,goal:'your goal',intention:'your intention',reply:'your public reply',changePlan:true,nextSteps:[],successCriterion:'measurable result',assetRequests:[],objectId:'',verb:'',mediaQuery:'',objective:{metric:'none',direction:'increase',amount:0,interaction:'none'}})+'. Replace example descriptions with real values. No markdown or reasoning text.';
  const prompt='<|im_start|>system\n'+instructions+'<|im_end|>\n<|im_start|>user\n'+JSON.stringify({world:context,request:message})+'<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n';
  const response=await tracker.fetch(base.href.replace(/\/$/,'')+'/completions',{method:'POST',headers:{'Content-Type':'application/json'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000),body:JSON.stringify({model,prompt,temperature:.2,max_tokens:512,stream:false,stop:['<|im_end|>','<|im_start|>'],response_format:{type:'json_schema',json_schema:{name:'resident_decision',strict:true,schema:outputSchema}}})});
  if(!response.ok)throw Error('Local model server returned HTTP '+response.status+'.');const data=await response.json(),choice=data.choices?.[0];if(choice?.finish_reason!=='stop')throw Error('Local model did not finish a complete decision.');
  let parsed;try{parsed=JSON.parse(choice.text??choice.message?.content);}catch{throw Error('Local model returned invalid JSON.');}for(const [k,max] of [['goal',180],['intention',160],['reply',1500],['successCriterion',180]])if(typeof parsed[k]==='string')parsed[k]=parsed[k].slice(0,max);
  for(const step of parsed.nextSteps||[])if(typeof step.intention==='string')step.intention=step.intention.slice(0,160);return validateDecision(parsed);
 }};
}
