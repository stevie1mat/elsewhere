// Remove repeated representations, not evidence required to decide or verify a task.
export function compactContext(c,{chat=false}={}){
 const object=({id,name,type,affordances,metres})=>({id,name,type,affordances,metres});
 const metric=c.task?.status==='active'?c.task.metric:'energy';
 const subset=v=>v?Object.fromEntries([...new Set([metric,'energy','thirst'])].filter(k=>v[k]!==undefined).map(k=>[k,Math.round(v[k]*10)/10])):undefined;
 const evidence=e=>e?{activity:e.activity,place:e.place,before:subset(e.before),after:subset(e.after),moneyChange:e.moneyChange}:undefined;
 return {...c,
 perception:{...c.perception,objects:(c.perception.objects||[]).map(object)},
 measuredEffects:(c.measuredEffects||[]).slice(0,3).map(e=>({...e,lastExample:e.lastExample?{before:subset(e.lastExample.before),after:subset(e.lastExample.after),duration:e.lastExample.duration}:undefined,note:undefined})),
 needAwareness:{unresolved:c.needAwareness?.unresolved?.map(({metric,value,status})=>({metric,value,status}))},
 memory:c.memory?{outcomesLearned:c.memory.outcomesLearned,helpful:c.memory.helpful,unhelpful:c.memory.unhelpful,knownObjects:(c.memory.knownObjects||[]).filter(o=>!(c.perception.objects||[]).some(p=>p.id===o.id)).map(object).slice(-3),lastOutcome:c.memory.lastOutcome}:null,
 task:c.task?{...c.task,lastEvidence:evidence(c.task.lastEvidence)}:null,
 lessonsForCurrentNeeds:(c.lessonsForCurrentNeeds||[]).slice(0,3).map(({lesson,...l})=>l),
 conversation:chat?c.conversation.slice(-4).map(m=>({...m,content:m.content.slice(0,240)})):c.conversation.filter(m=>m.role==='user').slice(-2).map(m=>({...m,content:m.content.slice(0,160)}))
 };
}
