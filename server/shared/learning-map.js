export const actionNames={mount_bicycle:'Mount parked bike',dismount:'Park bicycle',walk:'Walk to target',purchase_meal:'Pay for meal',collect_meal:'Collect meal',sit:'Sit on chair',eat:'Eat carried meal',inspect:'Inspect state',stop:'Explain blocker'};
export function examplePath(e){
 const task=e?.choice?.task;if(!actionNames[task])return null;const before=e.observation||{};
 const state=before.pose==='sit'?'seated':before.inventory?.carried?'carrying':before.mode==='cycling'?'cycling':'walking';
 const outcome=task==='mount_bicycle'?'mounted':task==='dismount'?'parked':task==='purchase_meal'?'paid':task==='collect_meal'?'collected':task==='sit'?'sitting':task==='eat'?'finished':task==='stop'?'blocked':task==='inspect'?'inspected':'arrived';
 return {state,task,outcome,correctionFrom:e.source==='automatic_teacher'&&e.studentProposal?.task!==task?e.studentProposal?.task:null};
}
export function learningMap(examples=[]){
 const counts={},corrections=[];const states={},outcomes={},links=new Map();
 const link=(from,to)=>{const key=from+'>'+to;links.set(key,{from,to,count:(links.get(key)?.count||0)+1});};
 for(const e of examples){const task=e.choice?.task;if(!actionNames[task])continue;counts[task]=(counts[task]||0)+1;
  const {state,outcome}=examplePath(e);states[state]=(states[state]||0)+1;link(state,task);
  outcomes[outcome]=(outcomes[outcome]||0)+1;link(task,outcome);
  if(e.source==='automatic_teacher'&&e.studentProposal?.task&&e.studentProposal.task!==task)corrections.push({from:e.studentProposal.task,to:task,exampleId:e.exampleId});
 }
 return {counts,states,outcomes,links:[...links.values()],corrections};
}
export const stateNames={cycling:'On bicycle',walking:'On foot',carrying:'Carrying food',seated:'Seated'};
export const outcomeNames={mounted:'Bicycle mounted',parked:'Bicycle parked',paid:'€4 paid',collected:'Food collected',sitting:'Seated pose',finished:'Meal finished',blocked:'Blocker explained',arrived:'Target reached',inspected:'State inspected'};
export const nodeLabel=id=>stateNames[id]||actionNames[id]||outcomeNames[id?.replace('out:','')]||id;
export function matchesNode(example,id){const p=examplePath(example);return !id||!!p&&(id===p.state||id===p.task||id==='out:'+p.outcome||id===p.correctionFrom);}
export function explainNode(id,examples=[]){
 const map=learningMap(examples),kind=id?.startsWith('out:')?'result':stateNames[id]?'before':'action',key=id?.replace('out:','');const count=kind==='result'?map.outcomes[key]||0:kind==='before'?map.states[key]||0:map.counts[key]||0;
 const meanings={mount_bicycle:'Get onto a parked bicycle that is within reach. This does not collect a new bicycle.',mounted:'The game confirmed that the character is riding the parked bicycle.',cycling:'The character was riding the bicycle before this decision.',walking:'The character was on foot, without a seated pose or a carried meal, before this decision.',carrying:'The character was carrying food and was not yet seated.',seated:'The character was already sitting before the next decision.',dismount:'Get off the bicycle and leave it parked. This does not buy food or eat.',walk:'Move to the chosen object. Walking does not buy, collect, sit, or eat.',purchase_meal:'Pay €4 for a meal at the counter. The food still needs to be collected.',collect_meal:'Pick up the meal that has already been paid for. The character now carries it.',sit:'Use the reached chair to sit down. Sitting alone does not consume food.',eat:'Consume the food already being carried, in the current pose.',inspect:'Check the registered game state before choosing another action.',stop:'Stop and explain an actual missing requirement, such as no chair or no money.',parked:'The game confirmed the bicycle was parked and the character was on foot.',paid:'The game confirmed payment for a meal.',collected:'The game confirmed food was in the character’s inventory.',sitting:'The game confirmed an actual seated pose.',finished:'The meal finished in a trial whose required game-state checks passed.',blocked:'The trial correctly explained why a required resource or route was unavailable.',arrived:'The movement action reached its chosen target.',inspected:'The character inspected the supplied game state.'};
 const corrections=map.corrections.filter(c=>c.from===id).length;
 return {label:nodeLabel(id),kind,count,meaning:meanings[key]||'A recorded part of an observed action.',countExplanation:kind==='before'?`${count} recorded example${count===1?'':'s'} started in this state.`:kind==='result'?`${count} recorded example${count===1?'':'s'} led to this result.`:`${count} recorded example${count===1?'':'s'} used this action.`,corrections,related:examples.filter(e=>matchesNode(e,id)).length};
}
