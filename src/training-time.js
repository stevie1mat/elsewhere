export const trainingTimeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const formatter=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'short',day:'2-digit',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true,timeZoneName:'short'});
export function formatTrainingTime(value){return typeof value==='number'&&Number.isFinite(value)?formatter.format(new Date(value)):'Time unavailable';}
export function exampleTime(example){
 if(Number.isFinite(example.at))return {value:example.at,label:'Action recorded'};
 if(Number.isFinite(example.trialStartedAt))return {value:example.trialStartedAt,label:'Trial started (action time unavailable)'};
 const match=/^trial-(\d{13})-/.exec(example.trialId||'');return {value:match?Number(match[1]):null,label:'Trial started (action time unavailable)'};
}
