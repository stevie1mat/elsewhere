export function executionGap(s,d,now){
  if(s.player.interactionPose&&(d.action==='rest'&&s.player.interactionPose.kind==='sit'||d.action==='sleep'&&s.player.interactionPose.kind==='lie_down'))return null;
  const physical=/\b(sit down|sitting|lie down|lying down|in bed|on the bed)\b/i.test(d.intention||'');
  const blocked=['sleep','eat','interact'].includes(d.action)||physical;
  if(!blocked&&d.action!=='rest')return null;
  const message=d.action==='eat'?'No usable food object and eating interaction is available. No meal was consumed.':d.action==='rest'&&!physical?'Standing rest only. No seat was selected; choose an object interaction to sit.':'No usable target object was selected for this interaction. Inspect nearby objects and choose a supported affordance.';
  s.executionFeedback??=[];
  if(s.executionFeedback.at(-1)?.message!==message)s.executionFeedback.push({at:now,action:d.action,status:blocked?'blocked':'limited',message,source:'object interaction execution'});
  s.executionFeedback=s.executionFeedback.slice(-10);
  return {blocked,message};
}
