// A model-written program over the game's action API, not executable JavaScript.
export function installPlan(s,decision,now){
  s.script={createdAt:now,goal:decision.goal,successCriterion:decision.successCriterion||decision.goal,status:'running',cursor:1,
    steps:[{objectId:decision.objectId,verb:decision.verb,action:decision.action,destination:decision.destination,seconds:Math.max(60,decision.seconds),intention:decision.intention,condition:{need:'none',min:0,max:100}},...(decision.nextSteps||[]).map(step=>({...step,seconds:Math.max(60,step.seconds)}))]};
}
export function nextPlanStep(s){
  const script=s.script;if(!script||script.status!=='running')return null;
  if(script.cursor>=script.steps.length){script.status='completed';return null;}
  const step=script.steps[script.cursor],c=step.condition;
  if(c&&c.need!=='none'&&(s.needs?.[c.need]<c.min||s.needs?.[c.need]>c.max)){
    script.status='needs_revision';script.reason=`Step ${script.cursor+1} condition no longer holds: ${c.need} must be ${c.min}–${c.max}.`;return null;
  }
  script.cursor++;return {...step,goal:script.goal,reply:step.intention,changePlan:true};
}
export function invalidatePlan(s,reason){if(s.script?.status==='running'){s.script.status='needs_revision';s.script.reason=reason;}}
