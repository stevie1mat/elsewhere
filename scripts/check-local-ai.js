import {createLocalClient} from '../server/local-client.js';
import {createResident} from '../server/resident.js';
import {ensureMind} from '../server/resident-mind.js';
import {residentContext,createResidentBrain} from '../server/groq.js';
import {compactContext} from '../server/compact-context.js';
import {PHONE_SEARCH_REQUEST} from '../server/shared/phone-request.js';
const s=createResident();s.arrival.phase='landed';s.obstacles=[];s.player.x=40;s.player.z=7;s.player.yaw=Math.PI;ensureMind(s);s.needs.energy=71;s.needs.thirst=84;
s.objects=[{id:'seat',name:'Bench',type:'bench',x:40,y:.59,z:10,yaw:0,approach:{x:40,z:8.7},affordances:['sit']}];
s.outcomes=[{at:1,activity:'rest',place:'Bench',duration:120,reward:-.02,before:{energy:71,thirst:84},after:{energy:87,thirst:87}}];
const client=createLocalClient(),cases=[{name:'energy recovery',message:'Please find somewhere to sit and raise energy by at least 10 points. Choose your own approach. Execute it now. Report measurements only after completion.',check:d=>d.action==='interact'&&d.verb==='sit'&&d.objectId==='seat'&&d.changePlan===true&&d.objective?.metric==='energy'&&d.objective.amount===10},{name:'phone search',message:PHONE_SEARCH_REQUEST,check:d=>d.action==='phone'&&!!d.mediaQuery&&d.changePlan===true}];
for(const item of cases){const state=JSON.parse(JSON.stringify(s)),brain=createResidentBrain({client});brain.initialize(state);state.ai.connected=true;const at=Date.now();try{await brain.chat(state,item.message);const d=state.script?.steps?.[0],objective=state.task?{metric:state.task.metric,amount:state.task.amount}:null;const ok=item.name==='energy recovery'?state.player.interactionPose?.kind==='sit'||state.pendingInteraction?.verb==='sit':state.activity?.kind==='phone';console.log(JSON.stringify({case:item.name,passed:ok,seconds:Math.round((Date.now()-at)/100)/10,usage:client.lastAttempt?.usage,action:d?.action,objective,query:state.media?.query,reply:state.messages?.at(-1)?.content}));if(!ok)process.exitCode=1;}catch(e){console.log(JSON.stringify({case:item.name,passed:false,error:e.message}));process.exitCode=1;}finally{brain.stop();}}
