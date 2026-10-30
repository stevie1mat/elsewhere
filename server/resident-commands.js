import {COMMAND_ACTIONS} from './command-catalog.js';
import {canOccupy,canTravelOnFoot,groundElevation,LANDMARKS,BIKE_SHOP,CHALLENGE_BIKE,collectBicycle,toggleTravelMode,stepPlayer,stepWalker} from './shared/movement.js';
import {beginInteraction,finishInteraction} from './interaction-skills.js';
import {startActivity} from './resident-mind.js';
import {recordObservation} from './cognition.js';
import {restoreLife,lifeStep,advanceLife} from './shared/settling-story.js';
import {restoreQuest,activeStop,advanceQuest} from './shared/quest.js';
import {RoadPickups} from './shared/road-pickups.js';
import {RiderCombat} from './shared/rider-combat.js';
import {SKYWAY_GATE,createRide,rideInput,stepRide} from './shared/skyway.js';
import {skywayPose} from './shared/skyway-path.js';

import {SERVICES} from './shared/services.js';
export {SERVICES};
export const NPCS=[{id:'ines',name:'Inês',x:35,z:12},{id:'rui',name:'Rui',x:29,z:-15},{id:'sofia',name:'Sofia',x:-85,z:26},{id:'tomas',name:'Tomás',x:103,z:-35},{id:'beatriz',name:'Beatriz',x:27,z:77},{id:'mara',name:'Mara',x:-57,z:64}];
const clamp=n=>Math.max(0,Math.min(100,n));
const distance=(p,t)=>Math.hypot(p.x-t.x,p.z-t.z);
function log(s,message,now){s.events.push({at:now,message});s.events=s.events.slice(-500);}
export function stopBody(s,now){
 if(s.activity?.kind==='eat'&&s.activity.executionMode==='service_consumption'&&s.mealOrder?.paid){s.mealOrder.remaining=s.rest;s.player.carriedMeal=s.rest>0;}
 if(s.commandTask?.status==='active'){s.commandTask.status='cancelled';s.commandTask.endedAt=now;}
 finishInteraction(s,now,false);s.route=[];s.routeIndex=0;s.rest=0;s.activity=null;s.activityOnArrival=null;
 delete s.pendingDecision;delete s.pendingInteraction;delete s.pendingCommand;delete s.afterMount;delete s.motionCommand;delete s.player.consuming;delete s.player.exercising;
 if(s.player.grounded===false&&!s.player.swimming)s.settling=true;
 s.player.speed=0;s.player.vx=0;s.player.vz=0;s.player.moving=false;delete s.player.phone;
 if(s.media){s.media.endedAt=now;s.media.playback='stopped';}
}
export function dismountForAction(s,now){
 if(s.player.mode!=='cycling')return null;
 if(s.player.grounded===false)return 'Land before getting off the bicycle.';
 s.player.speed=0;s.player.vx=0;s.player.vz=0;
 return toggleTravelMode(s.player,s.obstacles||[]);
}
function receipt(s,d,message,now,status='completed'){
 s.thought=message;s.lastCommand={action:d.action,status,message,at:now,position:{x:s.player.x,z:s.player.z},mode:s.player.mode};
 if(s.commandTask?.action===d.action)s.commandTask={...s.commandTask,status:status==='completed'?'achieved':status,evidence:{mode:s.player.mode,position:{x:s.player.x,z:s.player.z}},endedAt:now};
 s.commandHistory??=[];s.commandHistory.push(s.lastCommand);s.commandHistory=s.commandHistory.slice(-40);log(s,message,now);recordObservation(s,now);
 return {started:true,message};
}
function arcade(s){
 s.arcade??={seed:1977};const random=()=>{s.arcade.seed=(Math.imul(1664525,s.arcade.seed)+1013904223)>>>0;return s.arcade.seed/4294967296;};
 if(!s.arcade.pickups)s.arcade.pickups=new RoadPickups(s.obstacles||[],random);
 Object.setPrototypeOf(s.arcade.pickups,RoadPickups.prototype);s.arcade.pickups.random=random;
 if(!s.arcade.combat)s.arcade.combat=new RiderCombat();
 Object.setPrototypeOf(s.arcade.combat,RiderCombat.prototype);
 return {...s.arcade,random};
}
function owned(s){return s.player.mode==='cycling'||!!s.player.bike;}
export function commandContext(s){
 const life=s.life||restoreLife(null),step=lifeStep(life),quest=s.parcelQuest||restoreQuest(null),stop=activeStop(quest);
 return {preferences:s.preferences||{},execution:{last:s.lastCommand||null,task:s.commandTask||null},body:{mode:s.player.mode,parkedBicycle:s.player.bike||null,pose:s.player.interactionPose?.kind,awaitingInstruction:!!s.awaitingInstruction},
 services:SERVICES.filter(o=>(s.objects||[]).some(x=>x.id===o.id)).map(({id,name,approach,affordances})=>({id,name,...approach,affordances})),npcs:NPCS,
 story:step?{id:step.id,place:step.place,x:step.x,z:step.z,choices:step.choices.map((c,i)=>({index:i,label:c.label})),items:life.items,friends:life.friends}: {complete:true},
 quest:stop?{id:stop.id,objective:stop.objective,x:stop.x,z:stop.z}: {complete:true},
 appearance:s.player.look||{outfit:'original',helmet:true},arcade:{coins:s.arcade?.pickups?.coins||0,nitro:s.arcade?.pickups?.nitro||0,skyway:s.skyway?{running:s.skyway.running,distance:s.skyway.distance,lives:s.skyway.lives,lane:s.skyway.lane}:null}};
}
function targetFor(s,d){
 const p=d.parameters||{};
 if(d.action==='mount_bicycle')return s.player.bike&&{...s.player.bike,name:'Parked bicycle',radius:1.5};
 if(d.action==='collect_challenge_bicycle')return {...CHALLENGE_BIKE,name:'Coral bicycle'};
 if(d.action==='enter_skyway')return {...SKYWAY_GATE,z:-374,name:'Skyway entrance',radius:2};
 if(d.action==='eat'&&d.parameters?.value==='seated'&&s.mealOrder?.paid){const chair=(s.objects||[]).find(o=>o.id===s.mealOrder.chairId);return chair&&{...chair.approach,name:chair.name,radius:.8};}
 if(['eat','drink'].includes(d.action))return {...SERVICES.find(o=>o.affordances.includes(d.action)).approach,name:d.action==='eat'?'Café meal service':'Café water service',radius:1};
 if(d.action==='quest'){const stop=activeStop(s.parcelQuest||restoreQuest(null));return stop&&{...stop,name:stop.speaker,radius:2};}
 if(d.action==='story_choice'||d.action==='talk'&&!d.objectId&&d.verb!=='hello'){
  const step=lifeStep(s.life||restoreLife(null));return step&&{...step,name:step.place,radius:2};
 }
 if(d.action==='talk'){const npc=NPCS.find(n=>n.id===d.objectId||n.name===d.parameters?.value);return npc&&{...npc,radius:2};}
 if(d.action==='buy'&&d.parameters?.value==='nitro')return {x:s.player.x,z:s.player.z,name:'Road supplies',radius:1};
 if(d.action==='buy')return {x:27,z:77,name:'Mercado stall',radius:2};
 if(d.objectId==='point')return {x:p.x,z:p.z,name:'Requested point',radius:.7};
 if(d.objectId){const object=(s.objects||[]).find(o=>o.id===d.objectId);if(object)return {...object.approach,name:object.name,radius:.8};}
 const place=LANDMARKS.find(l=>l.id===d.destination);return place&&{...place,radius:2};
}
const routed=['walk','run','ride','mount_bicycle','collect_challenge_bicycle','enter_skyway','talk','story_choice','quest','buy','eat','drink'];
export function applyCommand(s,d,now,route){
 if(!COMMAND_ACTIONS.includes(d.action)&&d.action!=='eat')return null;
 if(d.action==='buy'&&!['plant','mug','nitro'].includes(d.parameters?.value))return {error:'Choose plant, mug or nitro.'};
 if(d.action==='story_choice'){const step=lifeStep(s.life||restoreLife(null));if(!step?.choices[d.parameters?.choice??0])return {error:'That story choice is unavailable.'};}
 if(d.action==='talk'&&d.verb==='hello'&&!NPCS.some(n=>n.id===d.objectId||n.name===d.parameters?.value))return {error:'Choose a registered NPC.'};
 if(d.action==='move'&&!['','forward','backward','left','right'].includes(d.verb||''))return {error:'Unknown movement input.'};
 if(s.skyway&&!['exit_skyway','skyway_input','jump','stop','wait','stop_phone'].includes(d.action))return {error:'Exit the Skyway before doing a city activity.'};
 const p=s.player;
 if(d.action==='eat'&&!s.mealOrder?.paid&&s.wallet<4)return {error:'A meal costs €4.'};
 if(routed.includes(d.action)){
  if(d.action==='eat'&&d.parameters?.value==='seated'){
   const service=SERVICES.find(o=>o.id==='cafe-meal');
   let chair=(s.objects||[]).find(o=>o.id===s.mealOrder?.chairId&&o.affordances.includes('sit'));
   if(!chair)chair=(s.objects||[]).filter(o=>o.affordances.includes('sit')&&distance(o.approach,service.approach)<=12&&canOccupy(o.approach.x,o.approach.z,s.obstacles,.6)).sort((a,b)=>distance(a.approach,service.approach)-distance(b.approach,service.approach)).find(o=>route(service.approach,o.approach,s.obstacles,.8).length);
   if(!chair)return {error:'I cannot eat seated yet: no usable, reachable chair is registered near the café meal service. I have not bought a new meal.'};
   if(!s.mealOrder)s.mealOrder={chairId:chair.id,paid:false};else s.mealOrder.chairId=chair.id;
  }
  if(['eat','drink'].includes(d.action)&&!(s.objects||[]).some(o=>o.id===(d.action==='eat'?'cafe-meal':'cafe-water')&&o.affordances.includes(d.action)))return {error:d.action==='eat'?'No usable food service is registered. Reload the updated city.':'No usable water service is registered. Reload the updated city.'};
  if(d.action==='enter_skyway'&&!owned(s))return {error:'Collect a bicycle before entering the Skyway.'};
  if(d.action==='ride'&&!owned(s))return {error:'Collect a bicycle first.'};
  if(d.action==='mount_bicycle'&&p.mode==='cycling')return receipt(s,d,'Already on the bicycle.',now);
  if(d.action==='collect_challenge_bicycle'&&p.grounded===false)return {error:'Land before collecting a bicycle.'};
  if((['eat','drink','talk','story_choice','quest','walk','run'].includes(d.action)||d.action==='buy'&&d.parameters?.value!=='nitro')&&p.mode==='cycling'){
   const error=dismountForAction(s,now);if(error)return {error};
  }
  if(d.action==='ride'&&p.mode==='walking'){
   if(distance(p,p.bike)>2.8){const mount={...d,action:'mount_bicycle',destination:'here'};const result=applyCommand(s,mount,now,route);if(result.started)s.afterMount=d;return result;}
   const error=toggleTravelMode(p,s.obstacles);if(error)return {error};
  }
  const target=targetFor(s,d);if(!target)return {error:'No registered target is available for that command.'};
  if(distance(p.interactionPose?.exit||p,target)>(target.radius||2)){
   const path=route(p.interactionPose?.exit||p,target,s.obstacles,target.radius||2,p.mode==='cycling'?.95:.6);
   if(!path.length)return {error:'No safe route to '+target.name+'.'};
   stopBody(s,now);s.awaitingInstruction=false;s.route=path;s.routeIndex=0;s.destination=target.name;s.routeMode=d.action==='run'?'run':p.mode==='cycling'?'ride':'walk';s.pendingCommand=d;
   s.commandTask={action:d.action,status:'active',target:{x:target.x,z:target.z,name:target.name},startedAt:now};s.lastCommand={action:d.action,status:'travelling',target:target.name,at:now};s.thought='Going to '+target.name+'.';return {started:true};
  }
 }
 // All commands below execute only after their real proximity checks above.
 const parameter=d.parameters||{},verb=d.verb||'',value=parameter.value||'';
 if(d.action==='stop'){
  stopBody(s,now);s.awaitingInstruction=true;if(s.commandTask?.status==='active'){s.commandTask.status='cancelled';s.commandTask.endedAt=now;}if(s.script)s.script.status='cancelled';if(s.task?.status==='active'){s.task.status='cancelled';s.task.endedAt=now;}
  return receipt(s,d,'Stopped. Waiting for your next instruction.',now);
 }
 if(d.action==='stand_up'){if(p.mode==='cycling'){const error=dismountForAction(s,now);if(error)return {error};}stopBody(s,now);return receipt(s,d,'Standing up.',now);}
 if(d.action==='dismount'){
  if(p.mode!=='cycling')return receipt(s,d,'Already on foot.',now);
  stopBody(s,now);const error=dismountForAction(s,now);if(error)return {error};return receipt(s,d,'Bicycle parked. Now on foot.',now);
 }
 if(d.action==='mount_bicycle'){
  const next=s.afterMount;stopBody(s,now);const error=toggleTravelMode(p,s.obstacles);if(error)return {error};
  delete s.afterMount;const result=receipt(s,d,'Mounted the parked bicycle.',now);if(next)return applyCommand(s,next,now,route);return result;
 }
 if(['walk','run','ride'].includes(d.action)){stopBody(s,now);return receipt(s,d,'Reached '+(targetFor(s,d)?.name||'the destination')+'.',now);}
 if(d.action==='collect_challenge_bicycle'){
  stopBody(s,now);const error=collectBicycle(p,s.obstacles,CHALLENGE_BIKE);if(error)return {error};p.paintColor=CHALLENGE_BIKE.color;return receipt(s,d,'Collected and mounted the Coral bicycle.',now);
 }
 if(d.action==='look'){
  let yaw=parameter.yaw||0;
  if(d.objectId){const o=(s.objects||[]).find(o=>o.id===d.objectId);if(!o)return {error:'Unknown look target.'};yaw=Math.atan2(o.x-p.x,-(o.z-p.z));}
  else if(verb){const cardinal={north:0,south:Math.PI,east:Math.PI/2,west:-Math.PI/2};if(Object.hasOwn(cardinal,verb))yaw=cardinal[verb];else if(['left','right','behind'].includes(verb))yaw=p.yaw+(verb==='left'?-Math.PI/2:verb==='right'?Math.PI/2:Math.PI);else return {error:'Unknown look direction.'};}
  stopBody(s,now);p.yaw=yaw;return receipt(s,d,'Turned and inspected the registered surroundings.',now);
 }
 if(d.action==='scan'){
  stopBody(s,now);s.motionCommand={kind:'scan',remaining:Math.min(8,d.seconds),total:Math.min(8,d.seconds),startedAt:now,decision:d};return {started:true};
 }
 if(['move','reverse','brake','boost','jump','swim'].includes(d.action)){
  if(d.action==='jump'&&s.skyway){rideInput(s.skyway,'Space');return receipt(s,d,'Jumped on the Skyway.',now);}
  if(d.action==='jump'&&p.grounded===false)return {error:'Land before jumping again.'};
  if(d.action==='jump'&&p.mode!=='walking')return {error:'Get off the city bicycle before jumping.'};
  if(d.action==='swim'&&p.mode!=='walking')return {error:'Get off the bicycle before swimming.'};
  if(d.action==='boost'&&(p.mode!=='cycling'||(s.arcade?.pickups?.nitro||0)<=0))return {error:'Boost requires a mounted bicycle and nitro.'};
  if(d.action==='brake'){const velocity={speed:p.speed,vx:p.vx,vz:p.vz};stopBody(s,now);Object.assign(p,velocity);s.motionCommand={kind:'brake',remaining:1,startedAt:now,decision:d};return {started:true};}
  const target=d.objectId==='point'?targetFor(s,d):null;
  if(target&&!canTravelOnFoot(target.x,target.z,s.obstacles))return {error:'The requested swim target is not reachable water or land.'};
  stopBody(s,now);delete s.settling;s.motionCommand={kind:d.action,verb,target,remaining:d.action==='jump'?2:Math.min(d.seconds,30),startedAt:now,decision:d};s.awaitingInstruction=false;return {started:true};
 }
 if(d.action==='eat'||d.action==='drink'){
  const seated=d.action==='eat'&&d.parameters?.value==='seated';
  if(seated&&!s.mealOrder.paid){const before={needs:{...s.needs},money:s.wallet};s.wallet-=4;s.mealOrder={...s.mealOrder,paid:true,before,remaining:15};p.carriedMeal=true;return applyCommand(s,d,now,route);}
  if(d.action==='eat'&&!s.mealOrder?.paid&&s.wallet<4)return {error:'A meal costs €4.'};
  const before=seated?s.mealOrder.before:{needs:{...s.needs},money:s.wallet};stopBody(s,now);
  if(seated){const chair=(s.objects||[]).find(o=>o.id===s.mealOrder.chairId);const interaction=beginInteraction(s,chair,'sit',15,now);if(interaction.error)return interaction;}
  else if(d.action==='eat'){if(s.mealOrder?.paid){Object.assign(before,s.mealOrder.before);}else{s.wallet-=4;s.mealOrder={paid:true,before,remaining:15};}}
  delete p.carriedMeal;
  const duration=d.action==='eat'?(s.mealOrder?.remaining??15):15;
  p.consuming=d.action;s.activity={kind:d.action,executionMode:'service_consumption',before,total:duration,remaining:duration,place:d.action==='eat'?'Café meal service':'Café water service',startedAt:now};s.rest=duration;
  return {started:true,message:d.action==='eat'?(seated?'I parked the bicycle and am seated on the chair, eating the purchased meal.':'I am on foot, eating the purchased meal.'):'Drinking water from the café service.'};
 }
 if(d.action==='talk'){
  stopBody(s,now);
  if(verb==='hello'){
   const npc=NPCS.find(n=>n.id===d.objectId||n.name===value);if(!npc)return {error:'Choose a registered NPC.'};
   s.npcGreetings??={};if(s.npcGreetings[npc.id]===undefined||now-s.npcGreetings[npc.id]>=60000){s.needs.social=clamp(s.needs.social-12);s.npcGreetings[npc.id]=now;}
   return receipt(s,d,'Greeted '+npc.name+'.',now);
  }
  const step=lifeStep(s.life||restoreLife(null));const npc=NPCS.find(n=>n.id===d.objectId);
  if(npc&&(!step||!step.speaker.toLowerCase().includes(npc.name.toLowerCase()))){s.dialogue={speaker:npc.name,text:'Hello. Welcome to Porto Sol.',choices:[]};s.needs.social=clamp(s.needs.social-4);return receipt(s,d,npc.name+': Hello. Welcome to Porto Sol.',now);}
  if(!step)return {error:'The personal story is complete.'};
  s.dialogue={id:step.id,speaker:step.speaker,text:step.text,choices:step.choices.map((c,i)=>({index:i,label:c.label}))};return receipt(s,d,step.speaker+': '+step.text,now);
 }
 if(d.action==='story_choice'){
  const life=s.life||{...restoreLife(null),items:[...(s.inventory||[])]},step=lifeStep(life),choice=parameter.choice??0;
  if(!step||!step.choices[choice])return {error:'That story choice is unavailable.'};
  if(s.wallet<(step.choices[choice].cost||0))return {error:'Insufficient money for that story choice.'};
  stopBody(s,now);const next=advanceLife({...life,money:s.wallet},p,choice);if(next.stage===life.stage)return {error:'Move closer and stop before choosing.'};
  s.wallet=next.money;s.life=next;s.inventory=next.items;s.needs.social=clamp(s.needs.social-10);s.dialogue=null;
  return receipt(s,d,step.choices[choice].note,now);
 }
 if(d.action==='quest'){
  const quest=s.parcelQuest||restoreQuest(null),stop=activeStop(quest);if(!stop)return {error:'The parcel quest is complete.'};
  stopBody(s,now);const next=advanceQuest(quest,p,stop.id);if(next.stage===quest.stage)return {error:'Move closer to the quest interaction.'};
  s.parcelQuest=next;s.questInventory=next.stage===1?['Sealed parcel']:next.stage===2?['Sealed parcel','Postcard']:[];
  if(next.stage===3)p.paintColor=0xcaa24d;return receipt(s,d,next.stage===3?'Delivered the parcel; Sunset Gold paint unlocked.':stop.item,now);
 }
 if(d.action==='buy'){
  const a=arcade(s);if(value==='nitro'){if(!a.pickups.buyNitro())return {error:'Need 10 road coins and room for nitro.'};return receipt(s,d,'Bought 50% nitro for 10 road coins.',now);}
  const product={plant:{cost:6,name:'Small plant'},mug:{cost:4,name:'Blue mug'}}[value];if(!product)return {error:'Choose plant, mug or nitro.'};
  if(s.wallet<product.cost)return {error:'Insufficient money.'};stopBody(s,now);s.wallet-=product.cost;s.inventory??=[];s.inventory.push(product.name);if(s.life){s.life.items=s.inventory;s.life.money=s.wallet;}
  return receipt(s,d,'Bought '+product.name+' for €'+product.cost+'.',now);
 }
 if(d.action==='change_appearance'){
  const look={outfit:'original',helmet:true,backpack:false,sunglasses:false,...p.look};
  if(['original','ocean','terracotta','sage','midnight'].includes(value))look.outfit=value;
  else if(/^(helmet|backpack|sunglasses)_(on|off)$/.test(value)){const [key,on]=value.split('_');look[key]=on==='on';}
  else if(/^paint:#[\da-f]{6}$/i.test(value))p.paintColor=parseInt(value.slice(7),16);
  else return {error:'Unknown outfit, gear toggle or paint color.'};p.look=look;return receipt(s,d,'Appearance updated: '+value+'.',now);
 }
 if(d.action==='enter_skyway'){
  if(!owned(s))return {error:'Collect a bicycle before entering the Skyway.'};
  if(p.mode==='walking'){const error=toggleTravelMode(p,s.obstacles);if(error)return {error};}
  stopBody(s,now);const a=arcade(s);s.skyway=createRide(a.random);s.skyway.seed=s.arcade.seed;Object.assign(p,skywayPose(0,1));return receipt(s,d,'Entered the Skyway riding challenge.',now);
 }
 if(d.action==='exit_skyway'){
  if(!s.skyway)return {error:'No active Skyway ride.'};const ride=s.skyway,a=arcade(s);a.pickups.coins+=ride.coins;s.skywayRewards??={coins:0,gems:0};s.skywayRewards.coins+=ride.coins;s.skywayRewards.gems+=ride.gems;
  delete s.skyway;stopBody(s,now);Object.assign(p,{x:55,z:-374,y:groundElevation(55,-374),yaw:0,grounded:true});return receipt(s,d,'Left Skyway; banked '+ride.coins+' coins and '+ride.gems+' gems.',now);
 }
 if(d.action==='skyway_input'){
  if(!s.skyway)return {error:'Enter Skyway first.'};if(!['left','right','jump','brake','forward'].includes(verb))return {error:'Unknown Skyway input.'};const key={left:'KeyA',right:'KeyD',jump:'Space'}[verb];if(key)rideInput(s.skyway,key);
  s.skywayControl={verb,remaining:Math.min(30,d.seconds)};return receipt(s,d,'Skyway control: '+verb+'.',now);
 }
 if(d.action==='attack'){
  const m=/^(kick|punch)_(left|right)$/.exec(verb);if(!m)return {error:'Choose kick_left/right or punch_left/right.'};
  const a=arcade(s);if(!a.combat.start(m[1],m[2]==='left'?1:-1,p))return {error:'Attack requires riding speed and a ready cooldown.'};
  return receipt(s,d,'Started '+verb+'; damage is verified by collision.',now,'started');
 }
 if(d.action==='media_control'){
  if(!['play','pause','stop'].includes(verb)||!s.media)return {error:'Choose play/pause/stop with an existing phone search.'};
  if(verb==='play'&&(!s.media.selected||s.activity?.kind!=='phone'))return {error:'A selected result and active phone session are required.'};
  s.media.control={id:String(now),verb};return receipt(s,d,'Requested browser media '+verb+'. Playback is not verified until the browser reports it.',now,'requested');
 }
 if(d.action==='stop_phone'){delete p.phone;if(s.activity?.kind==='phone')stopBody(s,now);if(s.media){s.media.playback='stopped';s.media.endedAt=now;}return receipt(s,d,'Phone put away; playback stop requested.',now);}
 if(d.action==='wait'){stopBody(s,now);s.awaitingInstruction=false;return startActivity(s,{...d,action:'wait'},null,now);}
 return null;
}

// Substep input physics; the host ticks at 10 Hz while the movement APIs cap dt.
export function stepCommands(s,dt,now){
 const p=s.player,a=s.trainingLab?null:s.arcade||s.player.mode==='cycling'?arcade(s):null;
 if(s.settling&&!s.skyway){const n=Math.max(1,Math.ceil(dt/.05));for(let i=0;i<n;i++)stepPlayer(p,{forward:0},dt/n,s.obstacles);if(p.grounded)delete s.settling;return true;}
 if(s.skyway){
  const ride=s.skyway,random=(a||arcade(s)).random;ride.random=random;
  const n=Math.max(1,Math.ceil(dt/.05));for(let i=0;i<n;i++)stepRide(ride,dt/n,{brake:s.skywayControl?.verb==='brake'});
  Object.assign(p,skywayPose(ride.distance,ride.lanePosition),{y:skywayPose(ride.distance,ride.lanePosition).y+ride.jump,mode:'cycling',speed:ride.speed,moving:ride.running,walked:ride.distance});
  if(s.skywayControl){s.skywayControl.remaining-=dt;if(s.skywayControl.remaining<=0)delete s.skywayControl;}
  if(!ride.running){p.speed=0;p.moving=false;s.thought='Skyway ride ended. Exit to return to the city.';}
  return true;
 }
 if(a){
  const n=Math.max(1,Math.ceil(dt/.05));for(let i=0;i<n;i++)a.combat.update(dt/n,p,s.obstacles,a.pickups);
  const messages=a.pickups.update(dt,p);for(const message of messages)log(s,message,now);
 }
 const m=s.motionCommand;if(!m)return false;
 const n=Math.max(1,Math.ceil(dt/.05)),h=dt/n;let blocked=false;
 for(let i=0;i<n;i++){
  if(m.kind==='scan'){p.yaw+=Math.PI*2*h/m.total;recordObservation(s,now);continue;}
  if(m.target){const dx=m.target.x-p.x,dz=m.target.z-p.z;if(Math.hypot(dx,dz)<.7){m.remaining=0;break;}p.yaw=Math.atan2(dx,-dz);}
  const before={x:p.x,z:p.z};const input={brake:m.kind==='brake',forward:['jump','brake'].includes(m.kind)?0:m.kind==='reverse'||m.verb==='backward'?-1:1,right:m.verb==='left'?-1:m.verb==='right'?1:0,jump:m.kind==='jump'&&i===0&&!m.jumped,sprint:false};
  if(m.kind==='jump')m.jumped=true;
  if(m.kind==='boost'){input.boost=true;const inventory=(a||arcade(s)).pickups;inventory.nitro=Math.max(0,inventory.nitro-25*h);if(inventory.nitro===0)m.remaining=0;}
  stepPlayer(p,input,h,s.obstacles);
  if(m.kind!=='jump'&&distance(p,before)<.00001&&p.speed===0)blocked=true;
 }
 m.remaining-=dt;
 if(m.kind==='jump'&&p.grounded===false)m.remaining=Math.max(.05,m.remaining);
 if(m.remaining<=0||blocked){delete s.motionCommand;p.speed=0;p.vx=0;p.vz=0;p.moving=false;
  const message=blocked?'Movement stopped at an obstacle.':m.kind==='swim'&&m.target&&distance(p,m.target)>.8?'Swim command timed out before reaching the target.':'Completed '+m.kind+'.';
  receipt(s,m.decision,message,now,blocked?'blocked':m.kind==='swim'&&m.target&&distance(p,m.target)>.8?'incomplete':'completed');
 }
 return true;
}
