import {applyResidentDecision} from './resident.js';
import {beginInteraction} from './interaction-skills.js';
// Atomic practice mechanics, sharing city movement, furniture, and consumption physics.
// No action chooses another action or queues a solution.
export function applyTrainingAction(s,d,now){
 const p=s.player,value=d.parameters?.value;
 const result=message=>{s.lastCommand={action:d.action,status:'completed',message,at:now};s.thought=message;return {started:true,message};};
 const counter=(s.objects||[]).find(o=>o.affordances.includes('eat'));
 const near=o=>o&&Math.hypot(p.x-o.approach.x,p.z-o.approach.z)<=1.1;
 if(d.nextSteps?.length)return {error:'Choose one action at a time; queued plans are disabled during discovery.'};
 if(d.action==='walk'&&p.mode==='walking'){const target=(s.objects||[]).find(o=>o.id===d.objectId);if(target&&Math.hypot(p.x-target.approach.x,p.z-target.approach.z)<=.8)return {error:'No progress: already at '+target.name+'. No movement occurred. Choose a different action using current inventory and object affordances.'};}
 if(d.action==='walk'&&p.mode==='cycling')return {error:'Walking requires being on foot. No movement occurred.'};
 if(d.action==='mount_bicycle'){if(!p.bike)return {error:'No parked bicycle is available.'};if(p.mode!=='walking')return {error:'Already on the bicycle.'};if(Math.hypot(p.x-p.bike.x,p.z-p.bike.z)>1.1)return {error:'The parked bicycle is out of reach. No mounting occurred.'};}
 if(d.action==='buy'){
  if(!['purchase_meal','collect_meal'].includes(value))return {error:'Only atomic purchase_meal or collect_meal is available.'};
  if(!counter)return {error:'No food service is available.'};
  if(p.mode!=='walking'||!near(counter))return {error:'The food counter is out of reach; no purchase or collection occurred.'};
  if(value==='purchase_meal'){
   if(s.mealOrder?.paid)return {error:'A paid meal already exists; no second charge was made.'};
   if(s.wallet<4)return {error:'Insufficient money: the meal costs €4.'};
   const before={needs:{...s.needs},money:s.wallet};s.wallet-=4;s.mealOrder={paid:true,before,remaining:15};return result('Paid €4. Meal awaits collection; inventory is empty.');
  }
  if(!s.mealOrder?.paid)return {error:'No paid meal is ready for collection.'};
  if(p.carriedMeal)return {error:'The meal is already in inventory.'};
  p.carriedMeal=true;return result('Collected one paid meal; inventory contains food.');
 }
 if(d.action==='interact'){
  const chair=(s.objects||[]).find(o=>o.id===d.objectId&&o.affordances.includes('sit'));
  if(!chair)return {error:'No usable chair matches that target.'};
  if(p.mode!=='walking'||!near(chair))return {error:'Chair approach is out of reach; no sitting occurred. walk with this chair target moves to its approach; sit never moves you.'};
  const r=beginInteraction(s,chair,'sit',15,now);if(r.error)return r;
  s.rest=0;s.activity=null;return result('Now seated on '+chair.name+'. No food consumed.');
 }
 if(d.action==='eat'){
  if(value!=='eat')return {error:'Combined meal shortcuts are disabled. Choose one atomic action.'};
  if(!p.carriedMeal||!s.mealOrder?.paid)return {error:'No collected meal in inventory. Nothing was eaten.'};
  if(p.consuming)return {error:'Already consuming the meal.'};
  p.consuming='eat';const duration=s.mealOrder.remaining??15;
  s.activity={kind:'eat',executionMode:'service_consumption',before:s.mealOrder.before,total:duration,remaining:duration,place:'Practice meal',startedAt:now};s.rest=duration;return {started:true,message:'Eating the carried meal in the current pose.'};
 }
 return applyResidentDecision(s,d,now);
}
