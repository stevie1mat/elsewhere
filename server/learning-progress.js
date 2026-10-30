// Behavioural outcome utility, not IQ or model training. Formula v1 is fixed.
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
export function progressSummary(s){
 const history=s.learningProgress?.history||[];
 const fallback=(s.outcomes||[]).map((o,i)=>({at:o.at,reward:o.reward,activity:o.activity,place:o.place,sequence:(s.learning?.totalOutcomes||s.outcomes.length)-s.outcomes.length+i+1}));
 const points=history.length?history:fallback;
 const scored=points.map((p,i)=>({...p,score:Math.round((50+50*mean(points.slice(Math.max(0,i-9),i+1).map(x=>x.reward)))*10)/10}));
 const current=scored.at(-1)?.score??null,previous=points.slice(-20,-10);
 const comparison=previous.length===10?50+50*mean(previous.map(x=>x.reward)):null;
 return {version:1,score:current,change:current!==null&&comparison!==null?Math.round((current-comparison)*10)/10:null,samples:Math.min(10,points.length),totalTracked:points.length,history:scored,window:10};
}
export function recordProgress(s,outcome){
 if(!s.learningProgress)s.learningProgress={version:1,history:(s.outcomes||[]).filter(o=>o!==outcome).map((o,i,a)=>({at:o.at,reward:o.reward,activity:o.activity,place:o.place,sequence:s.learning.totalOutcomes-a.length+i}))};
 s.learningProgress.history.push({at:outcome.at,reward:outcome.reward,activity:outcome.activity,place:outcome.place,sequence:s.learning.totalOutcomes});
 s.learningProgress.history=s.learningProgress.history.slice(-300);
}
const signal={rest:'energy',sleep:'energy',observe:'curiosity',reflect:'stress',exercise:'stress',eat:'hunger',work:'energy'};
export function contextualOutcome(s,activity,result){
 const need=signal[activity.kind];if(!need)return;
 const value=activity.before.needs[need],band=Math.floor(Math.min(99,value)/25),key=[activity.kind,activity.place,need,band].join('|');
 s.learning.contexts??={};const old=s.learning.contexts[key]||{action:activity.kind,place:activity.place,need,band,count:0,meanReward:0};
 const count=old.count+1;s.learning.contexts[key]={...old,count,meanReward:Math.round((old.meanReward+(result.reward-old.meanReward)/count)*1000)/1000,lastAt:result.at};
 // Keep persistence and prompts bounded.
 const entries=Object.entries(s.learning.contexts).sort((a,b)=>b[1].lastAt-a[1].lastAt).slice(0,100);s.learning.contexts=Object.fromEntries(entries);
}
export function relevantLessons(s){
 return Object.values(s.learning?.contexts||{}).filter(x=>Math.floor(Math.min(99,s.needs[x.need])/25)===x.band)
 .sort((a,b)=>b.count-a.count||b.lastAt-a.lastAt).slice(0,4)
 .map(({action,place,need,band,count,meanReward})=>({action,place,condition:`${need} ${band*25}–${band*25+24}`,trials:count,meanOutcome:meanReward,evidence:count<3?'limited':'repeated',lesson:meanReward<=0?'Little measured benefit in this context; reconsider repeating unless your goal differs.':'Helped in this context; consider reusing if it supports your goal.'}));
}
