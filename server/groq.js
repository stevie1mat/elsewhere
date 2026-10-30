import {TRAINING_ACTIONS} from './shared/training-scene.js';
import {executionAnswer} from './execution-replies.js';
import {parseHumanCommand} from './human-command.js';
import {commandContext} from './resident-commands.js';
import {validateDecision,RESIDENT_PLACES,RESIDENT_DECISION_SCHEMA as schema,RESIDENT_SYSTEM_PROMPT as SYSTEM} from './decision-contract.js';
export {validateDecision,RESIDENT_PLACES} from './decision-contract.js';
import {PHONE_SEARCH_REQUEST} from './shared/phone-request.js';
import {compactContext} from './compact-context.js';
import {rateLimitDetails} from './rate-limits.js';
import {decisionIssue,requestedObjective,objectiveIssue,humanActionConstraints,humanActionIssue} from './decision-check.js';
import {retrieveEffects,EFFECT_FACTS,needAwareness} from './experience.js';
import {relevantLessons} from './learning-progress.js';
import {ACTION_SUPPORT} from './action-catalog.js';
import {recordWorldRequests} from './world-requests.js';
import {installPlan,nextPlanStep,invalidatePlan} from './self-plan.js';
import {perception,cachedMemory,groundedRecall,recordObservation} from './cognition.js';
import {trackedProviderFetch,recordTelemetry} from './ai-telemetry.js';
import {ACTIVITY_ACTIONS,ensureMind} from './resident-mind.js';
import {LANDMARKS} from './shared/movement.js';
import {remember,applyResidentDecision} from './resident.js';

export const DEFAULT_GROQ_MODEL='openai/gpt-oss-20b';
export function residentContext(s){ensureMind(s);recordObservation(s,s.updatedAt||Date.now());return {
  commands:commandContext(s),
  verifiedTrainingSkills:(s.training?.skills||[]).map(({name,steps,trials,safetyCases})=>({name,steps,trials,safetyCases,source:'verified isolated practice; recheck live requirements before reuse'})),
  humanActionConstraints:humanActionConstraints(s.messages),
  bicycle:{mode:s.player.mode,owned:s.player.mode==='cycling'||!!s.player.bike,pickup:'Porto Cycle House',action:'collect_bicycle'},
  perception:perception(s),needs:Object.fromEntries(Object.entries(s.needs).map(([k,v])=>[k,Math.round(v)])),mood:s.mood,money:s.wallet,
  goal:s.ai?.goal||'Choose a purpose for your life.',personality:s.personality,plan:s.script?{goal:s.script.goal,criterion:s.script.successCriterion,status:s.script.status,reason:s.script.reason,next:s.script.steps.slice(s.script.cursor)}:null,settled:s.welcome.phase==='settled',destination:s.destination,
  phone:s.media?{query:s.media.query,reason:s.media.reason,status:s.media.status,playback:s.media.playback,selected:s.media.selected}:null,
  activity:s.activity?{kind:s.activity.kind,remaining:Math.ceil(s.activity.remaining)}:null,
  actionSupport:ACTION_SUPPORT,executionFeedback:(s.executionFeedback||[]).slice(-2),lastRejectedPlan:s.ai?.lastRejectedPlan||null,capabilities:ACTIVITY_ACTIONS,worldRequests:(s.worldRequests||[]).slice(-5).map(({name,kind,intendedUse,status})=>({name,kind,intendedUse,status})),
  reusableSkills:Object.values(s.skills||{}).filter(x=>x.successes>0).slice(-4).map(({name,verb,objectType,successes})=>({name,verb,objectType,successes})),
  measuredEffects:retrieveEffects(s),mechanics:EFFECT_FACTS,needAwareness:needAwareness(s),task:s.task||null,
  lessonsForCurrentNeeds:relevantLessons(s),
  memory:cachedMemory(s),recentEvents:s.events.slice(-4).map(e=>e.message),
  ...(s.trainingLab?{trainingLab:true,trainingMemory:s.trainingLessons||[]}:{}),
  places:RESIDENT_PLACES.map(({id,name})=>({id,name})),
  conversation:(s.messages||[]).slice(-6).map(({role,content})=>({role,content:content.slice(0,400)}))
};}

export class GroqError extends Error {
  constructor(message,{status=503,retryMs=60000,kind='provider'}={}){super(message);this.status=status;this.retryMs=retryMs;this.kind=kind;}
}
export function createGroqClient({apiKey=process.env.GROQ_API_KEY,model=process.env.GROQ_MODEL||DEFAULT_GROQ_MODEL,fetchImpl=fetch}={}){
  const configured=!!apiKey?.trim(),tracker=trackedProviderFetch(fetchImpl,'Groq',model,[apiKey]);let attempts=[];
  return {get lastAttempt(){return tracker.latest;},get attempts(){return attempts;},configured,model,provider:'Groq',async complete(context,message,signal){
    attempts=[];if(!configured)throw new GroqError('Groq is not configured. Add GROQ_API_KEY to the server .env.');
    for(let pass=0;pass<2;pass++){
      const jsonOnly=pass===1;let response;
      try{response=await tracker.fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
        signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),
        body:JSON.stringify({model,...(model.startsWith('openai/gpt-oss-')?{reasoning_effort:'low'}:{}),temperature:jsonOnly ? 0.2 : 0.7,max_completion_tokens:1024,
          response_format:jsonOnly?{type:'json_object'}:{type:'json_schema',json_schema:{name:'resident_decision',strict:true,schema}},
          messages:[{role:'system',content:SYSTEM+(jsonOnly?'\nThe structured decoder failed. Return ONLY one complete JSON decision matching this schema. No markdown. '+JSON.stringify(schema):'')},{role:'user',content:JSON.stringify({world:context,request:message})}]})
      });}catch{if(tracker.latest)attempts.push({...tracker.latest});throw new GroqError('Groq could not be reached. Retrying shortly.');}
      const attempt={...tracker.latest};attempts.push(attempt);
      if(!response.ok){
        let data;try{data=await response.json();}catch{}
        if(!jsonOnly&&response.status===400&&data?.error?.code==='json_validate_failed'){
          // Recover only a complete JSON object that passes all local action validation.
          // Never extract partial JSON or retain raw failed_generation/reasoning text.
          try{const decision=validateDecision(JSON.parse(data.error.failed_generation));attempt.status='recovered';attempt.error=null;return decision;}catch{}
          continue;
        }
        const retry=response.headers.get('retry-after'),numeric=Number(retry),retryMs=retry?(Number.isFinite(numeric)?numeric*1000:Date.parse(retry)-Date.now()):60000;
        const text=response.status===401?'Groq rejected the API key. Check the server configuration.':response.status===429?'Groq usage limit reached. Waiting before retrying.':response.status===400?'Groq could not produce a valid decision after JSON recovery.':`Groq request failed (${response.status}). Check model availability and account limits.`;
        const limit=response.status===429?rateLimitDetails(data?.error?.message||'',response.headers):null;
        throw new GroqError(limit?.kind?'Groq quota reached: '+limit.kind+'. Waiting for reset.':text,{status:response.status,retryMs:Math.max(30000,limit?.retryMs|| (Number.isFinite(retryMs)?retryMs:60000))});
      }
      try{const data=await response.json(),choice=data.choices?.[0];if(choice?.finish_reason!=='stop')throw Error('Incomplete response');return validateDecision(JSON.parse(choice.message.content));}
      catch(error){attempt.status='error';attempt.error=error instanceof SyntaxError?'Groq returned invalid JSON.':error.message==='Incomplete response'?'Groq response ended before a complete decision.':'Groq decision rejected: '+error.message;throw new GroqError(attempt.error);}
    }
  }};
}
export function createMistralClient({apiKey=process.env.MISTRAL_API_KEY,model=process.env.MISTRAL_MODEL||'mistral-small-latest',fetchImpl=fetch}={}){
  const tracker=trackedProviderFetch(fetchImpl,'Mistral',model,[apiKey]);
  return {get lastAttempt(){return tracker.latest;},configured:!!apiKey?.trim(),model,provider:'Mistral',async complete(context,message,signal){
    if(!apiKey?.trim())throw new GroqError('Mistral is not configured.');
    let response;
    try{response=await tracker.fetch('https://api.mistral.ai/v1/chat/completions',{
      method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),
      body:JSON.stringify({model,temperature:.7,max_tokens:1024,response_format:{type:'json_object'},messages:[
        {role:'system',content:SYSTEM+'\nReturn only a JSON object matching this schema: '+JSON.stringify(schema)},
        {role:'user',content:JSON.stringify({world:context,request:message})}
      ]})
    });}catch{throw new GroqError('Mistral timed out or could not be reached.');}
    if(!response.ok){
      const retry=response.headers.get('retry-after'),seconds=Number(retry);
      const retryMs=retry?(Number.isFinite(seconds)?seconds*1000:Date.parse(retry)-Date.now()):60000;
      throw new GroqError(response.status===401?'Mistral rejected the API key.':`Mistral request failed (${response.status}).`,{status:response.status,retryMs:Math.max(30000,Number.isFinite(retryMs)?retryMs:60000)});
    }
    try{const data=await response.json(),choice=data.choices?.[0];if(choice?.finish_reason!=='stop')throw Error('Incomplete');return validateDecision(JSON.parse(choice.message.content));}
    catch(error){throw new GroqError(error instanceof SyntaxError?'Mistral returned invalid JSON.':error.message==='Incomplete'?'Mistral response ended before a complete decision.':'Mistral decision rejected: '+error.message);}
  }};
}
// Stick with the last healthy provider. Failed providers cool down independently;
// a failed request tries the other API immediately, without waiting for a retry.
export function createResilientClient({clients=[createGroqClient(),createMistralClient()],now=()=>Date.now()}={}){
  const available=clients.filter(c=>c.configured),cooldowns=new Map(),health=new Map();let active=0,attempts=[];
  return {get attempts(){return attempts;},get diagnostics(){return available.map((c,i)=>({provider:c.provider,model:c.model,...health.get(i),retryAt:cooldowns.get(i)||null}));},configured:available.length>0,
    get model(){return available[active]?.model;},get provider(){return available[active]?.provider;},
    get providers(){return available.map(c=>c.provider);},
    async complete(context,message,signal){
      attempts=[];let earliest=Infinity;
      for(let offset=0;offset<available.length;offset++){
        if(signal?.aborted)throw new GroqError('Request cancelled.');
        const index=(active+offset)%available.length,client=available[index],until=cooldowns.get(index)||0;
        if(until>now()){earliest=Math.min(earliest,until);continue;}
        try{const result=await client.complete(context,message,signal);if(client.attempts?.length)attempts.push(...client.attempts);else if(client.lastAttempt)attempts.push({...client.lastAttempt});health.set(index,{status:'connected',error:null});active=index;cooldowns.delete(index);return result;}
        catch(error){if(client.attempts?.length)attempts.push(...client.attempts);else if(client.lastAttempt)attempts.push({...client.lastAttempt,status:'error',error:client.lastAttempt.error||error.message});health.set(index,{status:'unavailable',error:error.message,...(client.lastAttempt?.quota?{quota:client.lastAttempt.quota}:{})});if(signal?.aborted)throw new GroqError('Request cancelled.');const until=now()+Math.max(30000,error.retryMs||60000);cooldowns.set(index,until);earliest=Math.min(earliest,until);}
      }
      throw new GroqError('AI unavailable. '+available.map((c,i)=>c.provider+': '+(health.get(i)?.error||'waiting to retry')).join(' · '),{retryMs:Number.isFinite(earliest)?Math.max(1000,earliest-now()):60000});
    }
  };
}
export function createResidentBrain({client=createResilientClient(),now=()=>Date.now(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  let chatWaiting=0,busy=false,stopped=false,nextAt=0,failures=0,generation=0;let abort=new AbortController();
  function initialize(s){s.messages??=[];s.ai={...s.ai,enabled:client.configured,model:client.model,status:client.configured?'ready':'unconfigured',provider:client.provider||'Groq',providers:client.providers||['Groq'],fallback:false,connected:false,error:null};if(s.pendingDecision){try{validateDecision(s.pendingDecision);}catch{delete s.pendingDecision;}}}
  async function request(s,message){
    if(busy||now()<nextAt)throw new GroqError(busy?'The character is finishing another thought. Your message will retry automatically.':`AI connection is cooling down. Retrying in ${Math.max(1,Math.ceil((nextAt-now())/1000))} seconds.`,{status:429,retryMs:busy?1000:Math.max(1000,nextAt-now())});
    if(s.paused)throw new GroqError('Game paused. Resume to use AI.',{retryMs:0});
    const requestGeneration=generation;busy=true;const requestAttempts=[];
    const complete=async(context,text)=>{try{return await client.complete(context,text,abort.signal);}finally{requestAttempts.push(...(client.attempts||(client.lastAttempt?[client.lastAttempt]:[])));}};
    const chat=message.startsWith('Chat with the human.');
    const constraints=humanActionConstraints(s.messages,chat?message.slice('Chat with the human. Their message: '.length):'');
    try{const context={...compactContext(residentContext(s),{chat}),humanActionConstraints:constraints};
      if(s.trainingLab){context.capabilities=TRAINING_ACTIONS;context.actionSupport=Object.fromEntries(TRAINING_ACTIONS.map(a=>[a,ACTION_SUPPORT[a]]));context.places=context.places.filter(p=>p.id==='cafe');context.perception.nearbyPlaces=context.perception.nearbyPlaces.filter(p=>p.id==='cafe');context.commands.npcs=[];context.commands.story=null;context.commands.quest=null;}
      let decision=await complete(context,message);
      const required=requestedObjective(message);
      const promisedActionIssue=d=>chat&&d.changePlan!==true&&/\b(?:I am|I'm|I will|I'll)\s+(?:now\s+)?(?:dismounting|dismount|getting off|getting down|sitting|sit down|eating|eat|drinking|drink)\b/i.test(d.reply||'')?'An action promise with changePlan=false executes nothing. Execute the requested action or explain the actual blocker; do not claim movement, a pose or consumption.':null;
      let issue=promisedActionIssue(decision)||humanActionIssue(decision,constraints,{chat})||objectiveIssue(decision,required)||(message.includes(PHONE_SEARCH_REQUEST)&&decision.action==='phone'&&decision.changePlan!==true?'You selected a phone search for an explicit use-phone request but changePlan=false will not execute it. Set changePlan=true if accepting the phone task; otherwise decline clearly without promising playback.':message.startsWith('Chat with the human.')&&decision.changePlan!==true?null:decisionIssue(s,decision));
      if(issue&&s.trainingLab){s.trainingProposal={decision,issue};throw new GroqError('Training proposal rejected: '+issue,{retryMs:5000,kind:'decision'});}
      if(issue){
        if(requestGeneration!==generation||s.paused||stopped)throw new GroqError('Request cancelled.',{retryMs:0});
        // Human targets survive repair. An invented physical benefit from a
        // phone-only plan is itself the error and must be correctable.
        const invalidPhoneObjective=issue.startsWith('Phone use cannot');
        const originalObjective=required||(invalidPhoneObjective?null:decision.objective);
        const repairRule=originalObjective?'Repair the commands, retaining the same requested metric, amount, direction and interaction.':'Correct the impossible objective too. A phone-only plan must use objective metric=none, amount=0, interaction=none. You may choose another supported action and attainable goal. Do not claim physical benefits from phone use.';
        decision=await complete(context,message+'\nYour proposed plan failed the execution check: '+issue+' '+repairRule+' Original decision: '+JSON.stringify(decision));
        issue=promisedActionIssue(decision)||humanActionIssue(decision,constraints,{chat})||objectiveIssue(decision,required)||(message.includes(PHONE_SEARCH_REQUEST)&&decision.action==='phone'&&decision.changePlan!==true?'Phone action was still not marked for execution after repair.':decisionIssue(s,decision));
        if(originalObjective&&JSON.stringify(decision.objective)!==JSON.stringify(originalObjective)){
          if(['metric','amount','direction','interaction'].some(k=>decision.objective?.[k]!==originalObjective[k]))issue='The repair changed the requested objective instead of fixing the plan.';
        }
        if(issue){s.ai.lastRejectedPlan={action:decision.action,objective:decision.objective,reason:issue};const attempt=requestAttempts.at(-1);if(attempt){attempt.status='error';attempt.error='Decision rejected: '+issue;}throw new GroqError('AI plan could not be executed: '+issue,{retryMs:30000,kind:'decision'});}
      }
      if(requestGeneration!==generation||s.paused||stopped)throw new GroqError('Game paused or request cancelled.',{retryMs:0});failures=0;nextAt=now()+5000;s.ai.provider=client.provider||'Groq';s.ai.model=client.model;s.ai.connected=true;s.ai.lastResponseAt=now();s.ai.error=null;s.ai.failureKind=null;s.ai.lastRejectedPlan=null;return decision;}
    catch(error){if(requestGeneration!==generation||s.paused||stopped)throw new GroqError('Game paused or request cancelled.',{retryMs:0});s.ai.connected=false;s.ai.error=error.message;s.ai.failureKind=error.kind||'provider';if(error.kind==='decision')nextAt=now()+error.retryMs;else{failures++;nextAt=now()+Math.max(error.retryMs||60000,Math.min(900000,30000*2**Math.min(failures,5)));}throw error;}
    finally{recordTelemetry(s.ai,{attempts:requestAttempts,diagnostics:client.diagnostics});s.ai.retryAt=nextAt;busy=false;}
  }
  return {initialize,async trainingDecision(s,message){if(!s.trainingLab)throw Error('Training requires an isolated resident.');s.ai.provider=client.provider;s.ai.model=client.model;return request(s,message);},setPaused(s,paused){
    generation++;abort.abort();abort=new AbortController();failures=0;s.paused=paused;s.updatedAt=now();s.player.speed=0;s.player.moving=false;
    s.ai.connected=false;s.ai.status=paused?'manually_paused':'connecting';s.ai.error=null;s.ai.failureKind=null;
    if(!paused)nextAt=now();
  },async update(s){
    if(stopped||s.paused||s.manualCommand||s.awaitingInstruction||chatWaiting||!client.configured||busy||now()<nextAt||!s.obstacles)return;
    const updateGeneration=generation;const reconnecting=s.ai.connected!==true;
    if(!reconnecting&&(s.arrival.phase!=='landed'||s.route.length||s.rest>0||s.motionCommand||s.pendingDecision))return;
    if(!reconnecting){const step=nextPlanStep(s);if(step&&!humanActionIssue(step,humanActionConstraints(s.messages))){s.pendingDecision=step;s.ai.goal=step.goal;s.ai.planStepsReused=(s.ai.planStepsReused||0)+1;remember(s,`Continuing my plan: ${step.intention}`,now());return;}if(step)invalidatePlan(s,'Saved plan conflicts with the latest human action constraints.');}
    s.ai.status=reconnecting?'connecting':'thinking';s.ai.fallback=false;
    if(reconnecting){s.player.speed=0;s.player.moving=false;}
    try{
      const decision=await request(s,reconnecting?'Reconnect to the character. The server will resume any saved route, arrival or activity with its exact remaining time; do not restart or recreate it. Your response still needs a valid proposed decision with seconds=15..180 even when the saved activity has fewer than 15 seconds left. This proposed decision will be ignored while the existing activity resumes. Otherwise choose the next activity.':'Choose and execute your next autonomous activity.');
      if(stopped||s.paused||updateGeneration!==generation)return;
      recordWorldRequests(s,decision.assetRequests,now());
      s.ai.status='ready';s.ai.fallback=false;
      if(reconnecting&&(s.arrival.phase!=='landed'||s.route.length||s.rest>0||s.motionCommand||s.pendingDecision))return;
      installPlan(s,decision,now());
      s.pendingDecision={...decision,seconds:Math.max(60,decision.seconds)};s.ai.goal=decision.goal;s.ai.lastDecisionAt=now();
      if(decision.reply.includes('?')&&(!s.ai.lastQuestionAt||now()-s.ai.lastQuestionAt>=300000)){s.messages.push({role:'assistant',content:decision.reply,at:now()});s.messages=s.messages.slice(-100);s.ai.lastQuestionAt=now();}
      remember(s,`Chose to ${decision.action==='visit'?'visit '+RESIDENT_PLACES.find(p=>p.id===decision.destination).name:decision.action}. Goal: ${decision.goal}`,now());
    }catch(error){if(!stopped&&!s.paused&&updateGeneration===generation){s.ai.status='paused';s.ai.fallback=false;s.ai.connected=false;s.ai.error=error.message;}}
  },async chat(s,message){
    if(stopped)throw new GroqError('Server is stopping.');
    if(s.paused)throw new GroqError('Game paused. Resume to use AI.',{retryMs:0});
    const answer=executionAnswer(s,message);if(answer){s.messages.push({role:'user',content:message,at:now()},{role:'assistant',content:answer,at:now(),source:'execution state'});s.messages=s.messages.slice(-100);return answer;}
    const direct=parseHumanCommand(s,message);
    if(direct){
      if(s.arrival.phase!=='landed'||!s.obstacles)return 'Let me finish landing and load the city before executing that command.';
      const command=validateDecision(direct);generation++;abort.abort();abort=new AbortController();
      const result=applyResidentDecision(s,command,now());const reply=result.error||result.message||s.thought;
      if(!result.error){installPlan(s,command,now(),{replaceTask:true});s.awaitingInstruction=command.action==='stop';if(s.script)s.script.status='cancelled';delete s.pendingDecision;s.ai.goal=command.goal;s.manualCommand=true;s.commandRequest={action:command.action,at:now()};}
      s.messages.push({role:'user',content:message,at:now()},{role:'assistant',content:reply,at:now(),source:'command executor'});s.messages=s.messages.slice(-100);return reply;
    }
    if(!client.configured)throw new GroqError('AI chat is not configured on the server.',{retryMs:0});
    s.manualCommand=false;
    const recall=groundedRecall(s,message);
    if(recall&&s.ai.connected===true){s.messages.push({role:'user',content:message,at:now()},{role:'assistant',content:recall,at:now()});s.messages=s.messages.slice(-100);s.ai.localRecallHits=(s.ai.localRecallHits||0)+1;return recall;}
    let decision;chatWaiting++;
    try{
      const chatWaitMs=client.provider==='Mac LM Studio'?150000:7000;
      const deadline=now()+chatWaitMs;
      while(!stopped&&!s.paused&&(busy||now()<nextAt)&&now()<deadline){
        if(!busy&&nextAt-now()>7000)break;
        await sleep(Math.min(100,Math.max(1,deadline-now())));
      }
      if(stopped)throw new GroqError('Server is stopping.',{retryMs:0});
      decision=await request(s,`Chat with the human. Their message: ${message}`);
    }finally{chatWaiting--;}

    if(stopped)throw new GroqError('Server is stopping.');
    if(s.paused)throw new GroqError('Game paused. Resume to use AI.',{retryMs:0});
    recordWorldRequests(s,decision.assetRequests,now());
    let reply=decision.reply;
    if(decision.changePlan){
      if(s.arrival.phase!=='landed'||!s.obstacles){reply='Let me finish landing first, then we can choose where to go.';}
      else{
        const result=applyResidentDecision(s,decision,now());
        if(result.error)reply=result.error;
        else{if(result.message)reply=result.message;s.awaitingInstruction=decision.action==='stop';installPlan(s,decision,now(),{replaceTask:true});delete s.pendingDecision;s.ai.goal=decision.goal;s.ai.fallback=false;s.ai.status='ready';remember(s,`Changed activity after your request: ${decision.action} · ${s.destination||'here'}.`,now());}
      }
    }
    ensureMind(s);s.needs.social=Math.max(0,s.needs.social-8);

    s.messages.push({role:'user',content:message,at:now()},{role:'assistant',content:reply,at:now()});s.messages=s.messages.slice(-100);
    return reply;
  },stop(){stopped=true;abort.abort();}};
}
