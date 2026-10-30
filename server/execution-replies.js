// Status questions use game evidence, never speculative explanations from a model.
export function executionAnswer(s,message){
 const text=message.toLowerCase();
 const confirmation=/^(?:did you get (?:this|that)|did you understand|do you understand)[?!.]*$/.test(text.trim());
 const diagnostic=/^\s*(?:why\b|did you\b|are you\b|what (?:happened|is happening|are you|is missing)|what's (?:happening|missing)|i (?:dont|don't|do not) see\b)/.test(text)||/\b(?:are you missing|what is missing|what's missing|is something missing)\b/.test(text);
 if(!confirmation&&(!diagnostic||!/\b(?:bike|bicycle|eat|eating|food|meal|chair|sit|sitting|dismount|action|command|missing)\b/.test(text)))return null;
 const p=s.player,parts=[p.mode==='cycling'?"I'm still mounted on the bicycle.":p.bike?"I'm on foot; the bicycle is parked.":"I'm on foot, with no parked bicycle recorded." ];
 if(s.activity?.kind==='eat'&&p.consuming==='eat')parts.push(p.interactionPose?.kind==='sit'?"I'm seated and eating the purchased meal.":"I'm eating the purchased meal while standing.");
 else if(s.pendingCommand?.action==='eat')parts.push(s.mealOrder?.paid?"I've collected the meal and am walking to the chair; I haven't started eating yet.":"I'm walking to the meal service; I haven't started eating yet.");
 else{parts.push("I'm not eating right now. My current activity is "+(s.activity?.kind||'idle')+'.');if(s.activity?.kind==='observe')parts.push('Observe does not get me off the bicycle or consume food.');}
 const service=(s.objects||[]).some(o=>o.id==='cafe-meal'&&o.affordances?.includes('eat'));
 const chair=(s.objects||[]).some(o=>o.affordances?.includes('sit')&&Math.hypot(o.approach.x-35,o.approach.z-12)<=12);
 parts.push(service?'The food service is registered.':'The food service is not registered; reload the updated city.');
 if(!chair)parts.push('No usable café chair is registered for seated eating.');
 if((s.wallet??0)<4&&!s.mealOrder?.paid)parts.push('A new meal requires €4; I have €'+(s.wallet??0)+'.');
 if(s.lastRejectedCommand)parts.push('Last execution blocker: '+s.lastRejectedCommand.message);
 else if(service&&chair&&(s.wallet>=4||s.mealOrder?.paid))parts.push('No missing food, chair or funds requirement is recorded. The earlier reply did not establish that the action ran.');
 return parts.join(' ');
}
export function executionMessage(s,d){
 if(s.route?.length){
  const travel=s.player.mode==='cycling'?'riding':'walking';
  if(s.pendingInteraction)return `I'm on foot, walking to ${s.destination} to ${s.pendingInteraction.verb==='sit'?'sit down':'lie down'}.`;
  if(s.pendingCommand?.action==='eat')return s.mealOrder?.paid?"I collected the meal and am walking to the chair. I haven't started eating yet.":"I am on foot, walking to the café meal service. I haven't started eating yet.";
  return `I'm ${travel} to ${s.destination}.`;
 }
 if(s.motionCommand)return 'Started '+s.motionCommand.kind+'.';
 if(s.activity?.kind==='eat')return s.player.interactionPose?.kind==='sit'?"I'm seated and eating the purchased meal.":"I'm on foot and eating the purchased meal.";
 if(s.activity?.kind==='drink')return "I'm on foot and drinking water.";
 if(s.activity?.kind==='phone')return 'I took out my phone to search for “'+(s.media?.query||'a video')+'”. Playback has not been confirmed.';
 if(s.activity?.kind==='work')return 'Started a simulated work shift; payment is awarded only on completion.';
 if(s.activity?.kind==='exercise')return 'Started an in-place exercise.';
 if(s.activity?.kind==='observe')return "I'm observing the surroundings; no other interaction has started.";
 return s.thought||'Command accepted.';
}
