export function beginInteraction(s,object,verb,seconds,now){
  const pose=verb==='sit'?'sit':verb==='lie_down'?'lie_down':null;
  if(!pose||!object.affordances.includes(verb))return {error:`${object.name} does not support ${verb}.`};
  s.player.interactionPose={groundY:s.player.y||0,kind:pose,objectId:object.id,x:object.x,y:object.y,z:object.z,yaw:object.yaw,startedAt:now,exit:{x:s.player.x,z:s.player.z}};
  Object.assign(s.player,{x:object.x,z:object.z,yaw:object.yaw,speed:0,moving:false});
  s.skillAttempt={key:object.type+':'+verb,objectId:object.id,verb,objectType:object.type,startedAt:now};
  return {started:true,activity:verb==='lie_down'?'sleep':'rest',seconds};
}
export function finishInteraction(s,now,completed=true){
  const pose=s.player.interactionPose;if(!pose)return;
  Object.assign(s.player,pose.exit);delete s.player.interactionPose;
  if(s.skillAttempt){s.skills??={};const a=s.skillAttempt,skill=s.skills[a.key]||{name:`${a.verb} using ${a.objectType}`,objectType:a.objectType,verb:a.verb,successes:0,interruptions:0,steps:['navigate to usable approach slot','align with object','perform interaction pose','return to approach slot']};
    skill[completed?'successes':'interruptions']++;skill.lastUsedAt=now;skill.lastObjectId=a.objectId;s.skills[a.key]=skill;delete s.skillAttempt;
  }
}
