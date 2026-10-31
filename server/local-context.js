// Keep decision evidence and usable targets; remove repeated narrative for 4096-token local models.
export function localContext(context,message){
 if(context.trainingLab)return {trainingLab:true,goal:context.goal,position:context.perception?.position,body:context.commands?.body,inventory:context.trainingInventory,money:context.money,needs:context.needs,objects:context.trainingObjects,trainingCommands:context.trainingCommands,availableActions:context.trainingAvailableActions,executionFeedback:(context.executionFeedback||[]).slice(-2),trainingMemory:context.trainingMemory,teacherExamples:context.teacherExamples,verifiedSkills:context.verifiedTrainingSkills};
 const relevant=new Set(['visit','rest','interact','collect_bicycle','eat','drink','talk','stop']);
 for(const action of context.capabilities||[])if(message.toLowerCase().includes(action.replaceAll('_',' ')))relevant.add(action);
 const {actionSupport={},memory,mechanics,phone,plan,...rest}=context;
 return {...rest,
  actionSupport:Object.fromEntries(Object.entries(actionSupport).filter(([key])=>relevant.has(key)).map(([key,value])=>[key,value.slice(0,160)])),
  memory:memory?{outcomesLearned:memory.outcomesLearned,knownObjects:memory.knownObjects,lastOutcome:memory.lastOutcome}:null,
  mechanics:mechanics?Object.fromEntries(Object.entries(mechanics).filter(([key])=>key!=='interpretation')):undefined,
  phone:phone?{query:phone.query,status:phone.status,playback:phone.playback,selected:phone.selected?{title:phone.selected.title}:null}:null,
  plan:plan?{goal:plan.goal,status:plan.status,reason:plan.reason,next:(plan.next||[]).map(({action,destination,objectId,verb,condition,parameters})=>({action,destination,objectId,verb,condition,parameters}))}:null,
  measuredEffects:(context.measuredEffects||[]).slice(0,2),lessonsForCurrentNeeds:(context.lessonsForCurrentNeeds||[]).slice(0,1),
  recentEvents:(context.recentEvents||[]).slice(-2),executionFeedback:(context.executionFeedback||[]).slice(-1),
  reusableSkills:undefined,worldRequests:(context.worldRequests||[]).slice(-1)
 };
}
