// Check the plan's declared contract, never substitute a routine for the model.
export function decisionIssue(s,d){
 const steps=[d,...(d.nextSteps||[])],o=d.objective;
 for(const step of steps)if(step.action==='interact'){
  const object=(s.objects||[]).find(x=>x.id===step.objectId);
  if(!object?.affordances.includes(step.verb))return 'The selected objectId/verb is not in the usable object registry. Choose a perceived or remembered object with the affordance.';
 }
 if(o?.interaction&&o.interaction!=='none'&&!steps.some(x=>x.action==='interact'&&x.verb===o.interaction||o.interaction==='lie_down'&&x.action==='sleep'))return 'The objective requires '+o.interaction+', but no step executes it. rest is standing-only. Use an interact step with objectId and verb from available objects (or sleep for a bed). Do not claim a physical pose without its command.';
 if(o?.metric==='energy'&&o.direction==='increase'&&steps.every(x=>x.action==='work'||x.action==='exercise'))return 'Every step consumes energy, contradicting the recovery objective. Choose supported recovery actions using mechanics and measuredEffects.';
 return null;
}
