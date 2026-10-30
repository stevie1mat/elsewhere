const metrics=['none','energy','hunger','thirst','stress','curiosity','social','money'];
export const objectiveSchema={type:'object',additionalProperties:false,required:['metric','direction','amount','interaction'],properties:{metric:{type:'string',enum:metrics},direction:{type:'string',enum:['increase','decrease']},amount:{type:'integer',minimum:0,maximum:100},interaction:{type:'string',enum:['none','sit','lie_down']}}};
export function validateObjective(o){if(o===undefined)return;if(!o||!metrics.includes(o.metric)||!['increase','decrease'].includes(o.direction)||!Number.isInteger(o.amount)||o.amount<0||o.amount>100||!['none','sit','lie_down'].includes(o.interaction))throw Error('Invalid measurable objective.');}
const value=(s,metric)=>metric==='money'?s.wallet:s.needs[metric];
export function installObjective(s,d,now,replace=false){
 const o=d.objective;if(!o||o.metric==='none')return;
 if(s.task?.status==='active'&&!replace)return;
 if(s.task){s.taskHistory??=[];s.taskHistory.push({...s.task,...(s.task.status==='active'?{status:'superseded',endedAt:now}:{})});s.taskHistory=s.taskHistory.slice(-30);}
 const baseline=value(s,o.metric),target=baseline+(o.direction==='increase'?o.amount:-o.amount);
 s.task={...o,goal:d.goal,baseline,target,startedAt:now,status:'active',attempts:0,interactionVerified:false};
 if(o.metric!=='money'&&(target>100||target<0)){s.task.status='blocked';s.task.reason='Target exceeds the simulation need range 0–100.';}
}
export function verifyTask(s,outcome,now){
 const t=s.task;if(!t||t.status!=='active')return null;
 t.attempts++;t.current=value(s,t.metric);t.change=Math.round((t.current-t.baseline)*100)/100;
 if(t.interaction==='none'||s.player.interactionPose?.kind===t.interaction)t.interactionVerified=true;
 const reached=t.direction==='increase'?t.current>=t.target:t.current<=t.target;
 t.lastEvidence={at:now,activity:outcome.activity,place:outcome.place,before:outcome.before,after:outcome.after,moneyChange:outcome.moneyChange};
 if(reached&&t.interactionVerified&&(t.interaction==='none'||s.player.interactionPose?.kind===t.interaction)){t.status='achieved';t.endedAt=now;
  const report=`Verified task result: ${t.metric} ${t.baseline.toFixed(1)} → ${t.current.toFixed(1)} (${t.change>=0?'+':''}${t.change}). Target ${t.target.toFixed(1)} reached${t.interaction!=='none'?' with '+t.interaction+' verified':''}. Completed ${outcome.activity} at ${outcome.place}. This is measured game-state evidence.`;
  s.messages??=[];s.messages.push({role:'assistant',content:report,at:now,source:'task verifier'});s.messages=s.messages.slice(-100);
  if(s.script?.status==='running'){s.script.status='completed';s.script.reason='Measurable task target verified.';}
  return report;
 }
 const movement=t.metric==='money'?outcome.moneyChange:(outcome.after?.[t.metric]??t.current)-(outcome.before?.[t.metric]??t.current);
 t.lastAttemptHelped=t.direction==='increase'?movement>0:movement<0;
 if(!t.lastAttemptHelped&&s.script?.status==='running'){s.script.status='needs_revision';s.script.reason='Last completed activity did not improve the task metric. Reconsider using measured effects.';}
 return null;
}
