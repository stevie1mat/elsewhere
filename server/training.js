import {trainingInput,practiceRequest,trainingFingerprint} from './training-context.js';
import {trainingChoiceDecision} from './training-choice.js';
import {applyTrainingAction} from './training-actions.js';
import {createResident,stepResident,applyResidentDecision,residentRoute} from './resident.js';
import {ensureMind} from './resident-mind.js';
import {validateDecision} from './decision-contract.js';
import {TRAINING_ACTIONS,TRAINING_SCENARIOS,TRAINING_PROMPTS,TRAINING_BOUNDS,trainingScene} from './shared/training-scene.js';

export {TRAINING_ACTIONS};
const terminal=new Set(['passed','failed','correctly_blocked','cancelled','interrupted']);
export function createTrainingResident(scenario){
 const scene=trainingScene(scenario),s=createResident();Object.assign(s.player,scene.start,{mode:'cycling',grounded:true});
 s.arrival.phase='landed';s.welcome.phase='settled';s.obstacles=scene.obstacles;s.objects=scene.objects;s.trainingLab=true;s.ai={enabled:true,connected:true};ensureMind(s);s.wallet=scene.wallet;s.needs.hunger=90;s.needs.thirst=30;s.thought='Ready for the practice task.';
 return s;
}
const evidence=()=>({parked:false,collected:false,seatedEating:false,hungerReduced:false,finishedMeal:false});
export function observeTraining(run,now){
 const s=run.state,p=s.player,e=run.evidence;
 e.parked ||=p.mode==='walking'&&!!p.bike;
 e.collected ||=!!p.carriedMeal||s.lastCommand?.action==='eat'&&s.lastCommand.status==='completed';
 e.seatedEating ||=p.mode==='walking'&&p.interactionPose?.kind==='sit'&&p.consuming==='eat';
 e.hungerReduced ||=run.baseline.hunger-s.needs.hunger>=10;
 e.finishedMeal ||=e.seatedEating&&s.lastCommand?.action==='eat'&&s.lastCommand.status==='completed'&&!s.mealOrder;
 if(!run.trace.length||now-run.trace.at(-1).at>=500){run.trace.push({at:now,seconds:Math.round(run.elapsed*10)/10,x:p.x,z:p.z,mode:p.mode,pose:p.interactionPose?.kind||null,activity:s.activity?.kind||null,consuming:p.consuming||null,hunger:Math.round(s.needs.hunger*10)/10,money:s.wallet,thought:s.thought});run.trace=run.trace.slice(-180);}
}
export function truthfulReply(reply,s){
 const text=reply||'';
 if(/\b(?:I am|I'm) (?:now )?(?:seated|sitting)\b/i.test(text)&&s.player.interactionPose?.kind!=='sit')return false;
 if(/\b(?:I am|I'm) (?:now )?eating\b/i.test(text)&&s.player.consuming!=='eat')return false;
 if(/\b(?:I have|I've) (?:already )?(?:parked|dismounted|got off)\b/i.test(text)&&s.player.mode==='cycling')return false;
 if(/\b(?:I have|I've) (?:already )?(?:collected|bought|picked up) (?:the |a )?(?:meal|food)\b/i.test(text)&&!s.mealOrder?.paid&&!s.player.carriedMeal)return false;
 if(/\b(?:I have|I've) (?:already )?(?:finished|eaten|completed) (?:the |a )?(?:meal|food)\b/i.test(text)&&!(s.lastCommand?.action==='eat'&&s.lastCommand.status==='completed'))return false;
 if(/\b(?:bike|bicycle) (?:is |has been )?(?:parked|dismounted)\b/i.test(text)&&s.player.mode==='cycling')return false;
 if(/\btraffic was heavy\b/i.test(text))return false;
 return true;
}
function expectedBlocker(run){
 const s=run.state;
 if(!s.objects.some(o=>o.affordances.includes('eat')))return 'food';
 if(!s.objects.some(o=>o.affordances.includes('sit')))return 'chair';
 if(run.baseline.money<4)return 'money';
 const counter=s.objects.find(o=>o.affordances.includes('eat'));
 if(!residentRoute(s.player.interactionPose?.exit||s.player,counter.approach,s.obstacles,1).length)return 'route';
 return null;
}
export function trainingVerdict(run){
 const completed=Object.values(run.evidence).every(Boolean),truthful=run.decisions.every(d=>d.truthful);
 if(completed){const singleMeal=run.baseline.money-run.state.wallet===4;return {status:truthful&&singleMeal?'passed':'failed',taskCompleted:true,truthful,reason:!singleMeal?'The task completed, but spending did not match one €4 meal.':truthful?'All five requirements verified from game state.':'Task completed, but a model reply claimed an action before it happened.'};}
 const blocker=expectedBlocker(run),last=run.decisions.at(-1),words={food:/food|meal|service/i,chair:/chair|seat/i,money:/money|funds|€4|afford|wallet/i,route:/route|path|reach|block|counter/i};
 const explanation=run.mode==='skill'?(last?.error||last?.feedback||last?.reply):last?.reply||'';
 const diagnosed=blocker&&last&&words[blocker].test(explanation)&&/cannot|can't|missing|unavailable|no usable|no chair|no food|not registered|insufficient|need|blocked|not enough|no reachable/i.test(explanation);
 if(diagnosed&&truthful&&!run.evidence.seatedEating)return {status:'correctly_blocked',taskCompleted:false,truthful,blocker,reason:'The model correctly explained the missing '+blocker+' requirement; no consumption was fabricated.'};
 return {status:'failed',taskCompleted:false,truthful,blocker,reason:!truthful?'The model made an unsupported completion claim.':blocker?'The '+blocker+' requirement was not correctly explained.':'Not verified: '+Object.entries(run.evidence).filter(([,done])=>!done).map(([key])=>({parked:'bicycle parked',collected:'meal collected',seatedEating:'eating while seated',hungerReduced:'hunger relief',finishedMeal:'meal completed'})[key]).join(', ')+'.'};
}
const report=(run,at=Date.now())=>({protocol:'atomic-v1',id:run.id,scenario:run.scenario,scene:run.scene,prompt:run.prompt,promptIndex:run.promptIndex,mode:run.mode,corrections:run.corrections||0,status:run.status,startedAt:run.startedAt,endedAt:run.endedAt,elapsed:run.elapsed,wallSeconds:Math.round(((run.endedAt||at)-run.startedAt)/1000),evidence:run.evidence,verdict:run.verdict,decisions:run.decisions,trace:run.trace,baseline:run.baseline,final:{hunger:run.state.needs.hunger,money:run.state.wallet,mode:run.state.player.mode},provider:run.state.ai.provider,model:run.state.ai.model,usage:run.state.ai.telemetry?{input:run.state.ai.telemetry.input,output:run.state.ai.telemetry.output,total:run.state.ai.telemetry.total}:null,lesson:run.verdict?.reason});
function thisExportExamples(reports){return reports.filter(r=>['teacher','coach'].includes(r.mode)&&['passed','correctly_blocked'].includes(r.status)&&r.protocol==='atomic-v1').flatMap(r=>r.decisions.filter(d=>d.executed&&!d.error&&d.truthful&&(r.mode==='teacher'||d.source==='automatic_teacher'||d.teacherApproved)).map((d,index)=>({exampleId:r.id+':'+index,source:d.teacherApproved&&d.source==='student'?'teacher_reviewed_student':d.source||'interactive_teacher',scenario:r.scenario,modelInput:d.modelInput,request:d.request,teacherModel:d.teacherModel||'interactive assistant',trialId:r.id,goal:r.prompt,observation:d.before,choice:{task:d.plannerTask,target:d.command.objectId||'',reply:d.reply},result:d.after||r.final})));}
export function createTrainingService({getState,decide,teacher,now=()=>Date.now()}){
 let active=null,pending=null;
 const db=()=>{const s=getState();s.training??={version:1,reports:[],skills:[]};return s.training;};
 function finish(verdict){if(!active||terminal.has(active.status))return;if(active.watch){const s=active.state;active.watch.record.after={position:{x:s.player.x,z:s.player.z},mode:s.player.mode,pose:s.player.interactionPose?.kind||null,money:s.wallet,hunger:s.needs.hunger,carriedMeal:!!s.player.carriedMeal};}delete active.waitReason;active.verdict=verdict;active.status=verdict.status;active.endedAt=now();db().reports.push(report(active));db().reports=db().reports.slice(-30);delete db().inProgress;if(['teacher','coach'].includes(active.mode)&&['passed','correctly_blocked'].includes(active.status)){db().teacherExamples??=[];const latest=thisExportExamples([report(active)]);for(const e of latest)if(!db().teacherExamples.some(x=>x.exampleId===e.exampleId))db().teacherExamples.push(e);}promote();}
 function promote(){
  const reports=db().reports.filter(r=>r.mode==='planner'&&r.protocol==='atomic-v1'),wins=reports.filter(r=>r.status==='passed'),variants=new Set(wins.map(r=>r.prompt.trim().toLowerCase()));
  const safety=['no_chair','no_food','no_money','blocked_route'].every(id=>reports.some(r=>r.scenario===id&&r.status==='correctly_blocked'));
  if(variants.size<3||!safety||db().skills.some(s=>s.id==='seated-meal-atomic-v1'))return;
  const example=wins.at(-1);db().skills.push({id:'seated-meal-atomic-v1',name:'Park, collect food, sit and eat',verifiedAt:now(),source:'training state verification',trials:wins.length,safetyCases:4,protocol:'atomic-v1',steps:example.decisions.filter(d=>d.executed).map(d=>d.command),evidenceIds:[...wins.map(r=>r.id),...reports.filter(r=>r.status==='correctly_blocked').map(r=>r.id)]});
 }
 function feedback(run,action,message,status='blocked'){const s=run.state;s.executionFeedback??=[];s.executionFeedback.push({action,status,message,at:now(),source:'training executor'});s.executionFeedback=s.executionFeedback.slice(-10);s.thought=message;}
 async function plan(run){
  if(pending||run!==active)return;run.status='thinking';db().inProgress={id:run.id,scenario:run.scenario,prompt:run.prompt,promptIndex:run.promptIndex,mode:run.mode,startedAt:run.startedAt};
  const token=run.id;pending=token;delete run.state.trainingProposal;
  try{
   let correcting=run.mode==='coach'&&!!run.correctionReason;let source=run.mode==='teacher'?'interactive_teacher':correcting?'automatic_teacher':'student';const modelInput=trainingInput(run.state);let proposal=run.mode==='teacher'?run.teacherDecision:correcting?await teacher.correct(run.state,run.correctionReason):await decide(run.state,practiceRequest(run.prompt));const studentProposal=run.mode==='coach'&&!correcting?{task:proposal.plannerTask,target:proposal.objectId||'',reply:proposal.reply}:null;let teacherApproved=false;if(run.mode==='coach'&&!correcting&&teacher.review){const review=await teacher.review(run.state,proposal);const same=review.plannerTask===proposal.plannerTask&&(!['walk','sit'].includes(review.plannerTask)||review.objectId===proposal.objectId);teacherApproved=true;if(!same){run.correctionReason='Teacher corrected the proposed student action before execution.';correcting=true;source='automatic_teacher';proposal=review;}else{proposal={...proposal,reply:review.reply,intention:review.intention,teacherModel:review.teacherModel,teacherProvider:review.teacherProvider};}}delete run.teacherDecision;const d=validateDecision(proposal);
   if(!active||active.id!==token||terminal.has(run.status))return;
   const truthful=truthfulReply(d.reply,run.state),record={source,teacherApproved,...(studentProposal?{studentProposal}:{}),modelInput,request:practiceRequest(run.prompt),...(correcting||teacherApproved?{correctionReason:run.correctionReason,teacherModel:proposal.teacherModel,teacherProvider:proposal.teacherProvider}:{}),at:now(),reply:d.reply,truthful,before:{position:{x:run.state.player.x,z:run.state.player.z},mode:run.state.player.mode,money:run.state.wallet,hunger:run.state.needs.hunger,inventory:{paid:!!run.state.mealOrder?.paid,carried:!!run.state.player.carriedMeal},pose:run.state.player.interactionPose?.kind||null,lastResult:structuredClone(run.state.executionFeedback?.slice(-1)||[]),objects:run.state.objects},command:d,...(proposal.plannerTask?{plannerTask:proposal.plannerTask}:{}),executed:false};run.decisions.push(record);if(correcting){run.corrections++;delete run.correctionReason;}
   if(!TRAINING_ACTIONS.includes(d.action)||d.nextSteps?.some(x=>!TRAINING_ACTIONS.includes(x.action)))record.error='This command is outside the first training task.';
   else if([d,...(d.nextSteps||[])].some(x=>x.destination!=='here'&&x.destination!=='cafe'))record.error='Only the practice café destination is available.';
   else{const result=applyTrainingAction(run.state,d,now());record.executed=!!result.started;record.error=result.error||null;record.feedback=result.message||result.error;run.queue=d.nextSteps||[];observeTraining(run,now());}
   run.status='running';delete run.waitReason;run.state.ai.connected=true;
   if(!truthful)return finish(trainingVerdict(run));
   if(d.action==='stop'){const verdict=trainingVerdict(run);if(run.mode==='coach'&&verdict.status==='failed'){run.correctionReason='The student stopped before the goal was verified and did not explain a real missing requirement.';run.status='running';return;}return finish(verdict);}
   if(record.error){feedback(run,d.action,record.error);if(run.mode==='coach')run.correctionReason=record.error;}
   else run.watch={record,x:run.state.player.x,z:run.state.player.z,stalled:0};
  }catch(error){if(active?.id!==token||terminal.has(run.status))return;
   if(error.status===429&&Number.isFinite(error.retryMs)&&error.retryMs>=0&&error.retryMs<=900000){run.status='waiting';run.retryAt=now()+Math.max(1000,error.retryMs);run.waitReason='Waiting for the shared model connection. Automatic retry in '+Math.max(1,Math.ceil(error.retryMs/1000))+' seconds.';}
   else{if(run.state.trainingProposal){const p=run.state.trainingProposal;run.decisions.push({at:now(),reply:p.decision.reply,command:p.decision,truthful:truthfulReply(p.decision.reply,run.state),executed:false,error:p.issue});if(error.kind==='decision'){run.queue=[];feedback(run,p.decision.action,p.issue);if(run.mode==='coach')run.correctionReason=p.issue;run.status='running';return;}}finish({status:error.kind==='decision'?'failed':'interrupted',taskCompleted:false,truthful:null,reason:error.kind==='decision'?error.message:[getState().ai?.error,error.message].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(' ')});}
  }finally{if(pending===token)pending=null;}
 }
 if(db().inProgress){db().reports.push({...db().inProgress,status:'interrupted',verdict:{reason:'Server restarted during the trial. No success or skill was awarded.'}});delete db().inProgress;}
 return {
  automation(enabled){if(typeof enabled!=='boolean')throw Error('Choose enabled=true or false.');db().automation={enabled,updatedAt:now()};return this.snapshot();},
  fineTuneStatus(input){const stages=['collecting','preparing','training','candidate','error'];if(!stages.includes(input.stage)||typeof input.message!=='string'||input.message.length>500)throw Error('Invalid fine-tuning status.');db().fineTuning={stage:input.stage,message:input.message,updatedAt:now(),examples:Number.isInteger(input.examples)?input.examples:0,weightsUpdated:input.stage==='candidate',activeModelUpdated:false};return this.snapshot();},
  get busy(){return !!pending||!!active&&!terminal.has(active.status);},
  export(){const examples=[...new Map([...(db().teacherExamples||[]),...thisExportExamples(db().reports)].map(e=>[e.exampleId,e])).values()];return {version:1,reports:db().reports,skills:db().skills,teacherExamples:examples,weightsUpdated:false};},
  snapshot(){return {teacherConfigured:!!teacher?.configured,automation:db().automation||{enabled:false},fineTuning:db().fineTuning||{stage:'collecting',message:'Collecting verified teacher examples; weights unchanged.',weightsUpdated:false,activeModelUpdated:false},busy:this.busy,modelBusy:!!pending,scenarios:TRAINING_SCENARIOS,prompts:TRAINING_PROMPTS,reports:db().reports.map(({trace,scene,...summary})=>summary),skills:db().skills.filter(s=>s.id==='seated-meal-atomic-v1'),active:active?{...report(active,now()),trace:undefined,state:{player:active.state.player,needs:active.state.needs,wallet:active.state.wallet,thought:active.state.thought,activity:active.state.activity,ai:{status:active.state.ai.status,provider:active.state.ai.provider,model:active.state.ai.model,error:active.state.ai.error}},scene:trainingScene(active.scenario),waitReason:active.waitReason}:null,scene:trainingScene('normal')};},
  start({scenario='normal',promptIndex=0,prompt,mode='planner'}={}){
   if(['preparing','training'].includes(db().fineTuning?.stage))throw Error('Adapter training is using the local model. Wait until it finishes.');
   if(this.busy)throw Error('A trial is already running. Cancel it before starting another.');
   if(!Number.isInteger(promptIndex)||promptIndex<0||promptIndex>=TRAINING_PROMPTS.length)throw Error('Invalid prompt variant.');
   if(!['planner','skill','teacher','student','coach'].includes(mode))throw Error('Invalid training mode.');
   if(mode==='coach'&&!teacher?.configured)throw Error('Automatic teacher is not configured. Set GROQ_API_KEY on the game server.');
   if(prompt!==undefined&&(typeof prompt!=='string'||!prompt.trim()||prompt.length>400))throw Error('Write a task of 1–400 characters.');
   const skill=db().skills.find(s=>s.id==='seated-meal-atomic-v1');if(mode==='skill'&&!skill)throw Error('No verified skill yet. Pass three wording variants and all four missing-requirement cases first.');
   const state=createTrainingResident(scenario);if(mode==='teacher'){state.ai.provider='Codex teacher';state.ai.model='interactive assistant';}state.ai.goal=prompt?.trim()||TRAINING_PROMPTS[promptIndex];state.player.look=structuredClone(getState().player.look||{});if(getState().player.paintColor!==undefined)state.player.paintColor=getState().player.paintColor;if(mode==='student')state.trainingExamples=db().reports.filter(r=>r.mode==='teacher'&&r.status==='passed'&&r.protocol==='atomic-v1').slice(-1).flatMap(r=>r.decisions.filter(d=>d.executed&&!d.error&&d.truthful).map(d=>({goal:r.prompt,before:{mode:d.before.mode,pose:d.before.pose,inventory:d.before.inventory},choice:{task:d.plannerTask,target:d.command.objectId||''},result:d.after})));state.training={skills:structuredClone(db().skills)};state.trainingLessons=db().reports.filter(r=>['passed','failed','correctly_blocked'].includes(r.status)&&r.protocol==='atomic-v1').slice(-3).map(r=>({scenario:r.scenario,result:r.status,lesson:r.lesson}));
   db().nextId=(db().nextId||0)+1;active={id:'trial-'+now()+'-'+db().nextId,scenario,scene:trainingScene(scenario),promptIndex,prompt:prompt?.trim()||TRAINING_PROMPTS[promptIndex],mode,status:'running',startedAt:now(),elapsed:0,state,evidence:evidence(),baseline:{hunger:state.needs.hunger,money:state.wallet},trace:[],decisions:[],corrections:0,visited:[],queue:mode==='skill'?structuredClone(skill.steps):[]};
   db().inProgress={id:active.id,scenario,prompt:active.prompt,promptIndex,mode,startedAt:active.startedAt};observeTraining(active,now());return this.snapshot();
  },teacherStep({trialId,expectedDecisions,choice}={}){
   const run=active;if(!run||run.mode!=='teacher'||terminal.has(run.status))throw Error('Start an active teacher trial first.');
   if(run.id!==trialId||run.decisions.length!==expectedDecisions)throw Error('Stale teacher observation. Read the latest trial state first.');
   if(pending||run.state.route.length||run.state.rest>0||run.state.motionCommand||run.state.settling||run.watch)throw Error('Wait for the current action result before choosing another.');
   run.teacherDecision=trainingChoiceDecision(choice);void plan(run);return this.snapshot();
  },cancel(){if(active&&!terminal.has(active.status))finish({status:'cancelled',taskCompleted:false,truthful:null,reason:'Trial cancelled. No success or skill awarded.'});return this.snapshot();},
  tick(dt){
   const run=active;if(!run||terminal.has(run.status)||pending)return;
   if(run.status==='waiting'&&now()<run.retryAt)return;
   const s=run.state,working=s.route.length||s.rest>0||s.motionCommand||s.settling;
   if(working){run.elapsed+=dt;s.ai.connected=true;stepResident(s,dt,now());observeTraining(run,now());
    const w=run.watch;if(w?.record.command.action==='visit'){
     const moved=Math.hypot(s.player.x-w.x,s.player.z-w.z);w.stalled=moved<.05?w.stalled+dt:0;if(moved>=.05){w.x=s.player.x;w.z=s.player.z;}
     if(w.stalled>=3){const message='No task progress: visit produced no movement for three seconds and did not collect or eat food. Choose an executable next action; eat with parameters.value=seated requests a seated meal. Explain a real missing requirement if blocked.';w.record.feedback=message;w.record.noProgress=true;feedback(run,'visit',message);s.route=[];s.rest=0;s.activity=null;s.activityOnArrival=null;s.player.moving=false;s.player.speed=0;run.queue=[];delete run.watch;}
    }
    if(run.evidence.finishedMeal)return finish(trainingVerdict(run));if(run.elapsed>=90)return finish(trainingVerdict(run));return;}
   if(run.watch){const record=run.watch.record;record.after={position:{x:s.player.x,z:s.player.z},mode:s.player.mode,pose:s.player.interactionPose?.kind||null,money:s.wallet,hunger:s.needs.hunger,carriedMeal:!!s.player.carriedMeal};feedback(run,record.command.action,record.error||s.lastCommand?.message||record.feedback||'Action finished; inspect current state.',record.error?'blocked':'completed');if(record.source==='automatic_teacher'&&record.executed&&!record.error){s.trainingExamples??=[];s.trainingExamples.push({before:{mode:record.before.mode,pose:record.before.pose,inventory:record.before.inventory},choice:{task:record.plannerTask,target:record.command.objectId||''},result:record.after});s.trainingExamples=s.trainingExamples.slice(-8);}
    delete run.watch;}
   if(run.corrections>=12)return finish({...trainingVerdict(run),status:'failed',reason:'Teacher correction budget reached. No model improvement claimed.'});
   if(run.mode==='coach'&&!run.correctionReason){const fingerprint=trainingFingerprint(s);if(run.visited.filter(x=>x===fingerprint).length>=2)run.correctionReason='Repeated game state: previous actions are cycling without task progress. Choose a different useful action or explain the real blocker.';run.visited.push(fingerprint);}
   if(run.decisions.length>=(run.mode==='coach'?24:16))return finish(trainingVerdict(run));
   if(run.queue.length){const command=run.queue.shift();const c=command.condition;if(c&&c.need!=='none'&&(s.needs[c.need]<c.min||s.needs[c.need]>c.max)){run.queue=[];return;}
    const result=applyTrainingAction(s,command,now());observeTraining(run,now());run.decisions.push({at:now(),reply:'Executing the next authored step.',truthful:true,command,executed:!!result.started,error:result.error||null,feedback:result.message||result.error});if(result.error){run.queue=[];feedback(run,command.action,result.error);}else run.watch={record:run.decisions.at(-1),x:s.player.x,z:s.player.z,stalled:0};return;}
   if(run.mode==='skill')return finish(trainingVerdict(run));if(run.mode==='teacher'){run.status='awaiting_teacher';return;}void plan(run);
  }
 };
}
