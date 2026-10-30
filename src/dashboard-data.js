import {dailyUsageView} from '../server/daily-usage.js';
import {progressSummary,relevantLessons} from '../server/learning-progress.js';
import {LANDMARKS} from '../server/shared/movement.js';
import {aiConnectionStatus} from './ai-connection-status.js';

export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const number=value=>Number.isFinite(value)?value.toLocaleString(undefined,{maximumFractionDigits:1}):'—';
export const pretty=value=>JSON.stringify(value??null,null,2);
export const placeName=id=>LANDMARKS.find(p=>p.id===id)?.name||id||'No destination';
export const residentRequests=s=>(s.worldRequests||[]).filter(r=>r.source!=='action capability check');
export const duration=seconds=>{if(!Number.isFinite(seconds))return '—';const m=Math.floor(seconds/60);return m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m}m ${Math.floor(seconds%60)}s`;};
export function dashboardModel(s,now=Date.now()){
 const ai=s.ai||{},t=ai.telemetry||{},attempts=t.recent||[],usage=dailyUsageView(t,now);
 const progress=progressSummary(s),requests=residentRequests(s);
 const nearest=s.player?LANDMARKS.map(p=>({...p,metres:Math.round(Math.hypot(p.x-s.player.x,p.z-s.player.z))})).sort((a,b)=>a.metres-b.metres)[0]:null;
 const intention=s.thought||s.pendingDecision?.intention||'Waiting for the first intention.';
 const activity=s.activity?.kind||(s.player?.moving?'walking':s.arrival?.phase&&s.arrival.phase!=='landed'?s.arrival.phase:'idle');
 const completeAttempts=attempts.filter(a=>Number.isFinite(a.latencyMs)&&a.status!=='pending');
 const latency=completeAttempts.length?completeAttempts.reduce((sum,a)=>sum+a.latencyMs,0)/completeAttempts.length:null;
 const events=[...(s.events||[]).map(e=>({...e,type:'event',text:e.message})),...(s.outcomes||[]).map(o=>({...o,type:'outcome',text:`Completed ${o.activity} at ${o.place} · outcome ${o.reward} · €${o.moneyChange>=0?'+':''}${o.moneyChange}`})),...(s.observations||[]).map(o=>({...o,type:'observation',text:`${o.activity} · ${(o.nearbyPlaces||[]).map(p=>p.name).join(', ')||'x '+o.position?.x+', z '+o.position?.z}`}))].sort((a,b)=>b.at-a.at);
 return {ai,t,usage,progress,requests,nearest,intention,activity,latency,events,status:aiConnectionStatus(ai,{paused:!!s.paused}),lessons:relevantLessons({...s,needs:s.needs||{}}),lastObservation:s.observations?.at(-1),outcomes:s.learning?.totalOutcomes||0,cacheHits:s.memoryCache?.hits||0,reusedSteps:ai.planStepsReused||0,recallHits:ai.localRecallHits||0,now};
}
export function researchSnapshot(s,now=Date.now()){
 return {exportedAt:new Date(now).toISOString(),note:'Simulation state, reported intentions and measured outcomes. Not model weights or internal reasoning.',resident:s};
}
export {LANDMARKS};
