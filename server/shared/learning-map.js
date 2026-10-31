export const actionNames={dismount:'Park bicycle',walk:'Walk to target',purchase_meal:'Pay for meal',collect_meal:'Collect meal',sit:'Sit on chair',eat:'Eat carried meal',inspect:'Inspect state',stop:'Explain blocker'};
export function examplePath(e){
 const task=e?.choice?.task;if(!actionNames[task])return null;const before=e.observation||{};
 const state=before.pose==='sit'?'seated':before.inventory?.carried?'carrying':before.mode==='cycling'?'cycling':'walking';
 const outcome=task==='dismount'?'parked':task==='purchase_meal'?'paid':task==='collect_meal'?'collected':task==='sit'?'sitting':task==='eat'?'finished':task==='stop'?'blocked':task==='inspect'?'inspected':'arrived';
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
