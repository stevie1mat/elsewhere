import {TRAINING_CHOICE_SCHEMA,TRAINING_CHOICE_PROMPT,trainingChoiceDecision} from './training-choice.js';
import {trainingInput} from './training-context.js';
export function createTrainingTeacher({apiKey=process.env.GROQ_API_KEY,model=process.env.TRAINING_TEACHER_MODEL||process.env.GROQ_MODEL||'openai/gpt-oss-20b',fetchImpl=fetch}={}){
 return {configured:!!apiKey?.trim(),provider:'Groq',model,async review(s,proposal){return this.correct(s,'Review this student proposal against the goal and actual state: '+JSON.stringify({task:proposal.plannerTask,action:proposal.action,target:proposal.objectId,reply:proposal.reply})+'. Choose the best next atomic action. If the proposal is already useful, return that same task and target.');},async correct(s,reason){
  if(!apiKey?.trim())throw Error('Automatic teacher is not configured: GROQ_API_KEY is missing.');
  const world=trainingInput(s),schema=structuredClone(TRAINING_CHOICE_SCHEMA);schema.properties.task.enum=world.availableActions;
  const response=await fetchImpl('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({model,temperature:0,max_completion_tokens:512,...(model.startsWith('openai/gpt-oss')?{reasoning_effort:'low'}:{}),response_format:{type:'json_schema',json_schema:{name:'teacher_correction',strict:true,schema}},messages:[{role:'system',content:TRAINING_CHOICE_PROMPT+' You are the correction teacher. Return one safe, useful next action from the supplied state, not an entire plan. Do not copy a failed action. Explain an actual blocker with stop if the goal is unavailable.'},{role:'user',content:JSON.stringify({goal:s.ai.goal,reason,world})}]})});
  if(!response.ok)throw Error('Automatic teacher request failed (HTTP '+response.status+').');
  const data=await response.json();if(data.choices?.[0]?.finish_reason!=='stop')throw Error('Automatic teacher returned an incomplete correction.');
  const choice=JSON.parse(data.choices[0].message.content);if(!world.availableActions.includes(choice.task))throw Error('Automatic teacher proposed a physically unavailable action.');const decision=trainingChoiceDecision(choice);return {...decision,teacherModel:model,teacherProvider:'Groq'};
 }};
}
