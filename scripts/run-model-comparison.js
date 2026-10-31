import {checkpointHash} from './model-deployment.js';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createInterface} from 'node:readline';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createTrainingService} from '../server/training.js';
import {createResident} from '../server/resident.js';
import {trainingInput,trainingPrompt} from '../server/training-context.js';
import {trainingChoiceDecision} from '../server/training-choice.js';
import {comparisonCases,comparisonMetrics} from '../server/training-comparison.js';
import {readMemory,memoryIssue} from './mac-memory.js';
import {stopMacWorkers} from './stop-mac-workers.js';
export async function runModelComparison({root,job,model,adapterPath,api,signal}){
 if(!model||!adapterPath||!existsSync(resolve(adapterPath,'adapters.safetensors')))throw Error('The candidate checkpoint is not available on this Mac.');
 if(!job.checkpointHash||checkpointHash(adapterPath)!==job.checkpointHash)throw Error('Adapter checkpoint differs from the comparison request.');
 const baseline=readMemory();if(baseline.pressure!==1)throw Error('Mac memory pressure is elevated. Comparison deferred.');
 const cases=comparisonCases(),rows=[];let child,guard,pending,cancelled=false;const dir=resolve(root,'.training/comparisons',job.id);mkdirSync(dir,{recursive:true});
 const abort=()=>{cancelled=true;child?.kill('SIGTERM');};signal?.addEventListener('abort',abort,{once:true});
 const update=async(status,message)=>api({action:'comparison_update',id:job.id,status,message,rows});
 await stopMacWorkers(root);
 try{try{const inventory=await fetch((process.env.LOCAL_AI_URL||'http://127.0.0.1:1234/v1')+'/models',{signal:AbortSignal.timeout(5000)});if(inventory.ok&&(await inventory.json()).data?.some(m=>m.id===(process.env.LOCAL_AI_MODEL||'resident-local')))await promisify(execFile)('/Applications/LM Studio.app/Contents/Resources/app/.webpack/lms',['unload',process.env.LOCAL_AI_MODEL||'resident-local'],{timeout:30000});}catch(error){if(error.code)throw error;}await update('running','Running paired trials with the same MLX runtime, no teacher and no examples.');
  for(const arm of ['original','candidate']){
   let ready;const readyPromise=new Promise((ok,fail)=>ready={ok,fail});
   child=spawn(resolve(root,'.venv-training/bin/python'),[resolve(root,'scripts/comparison-inference.py'),model,...(arm==='candidate'?[adapterPath]:[])],{cwd:root,stdio:['pipe','pipe','pipe']});
   child.stdin.on('error',e=>pending?.fail(e));let stderr='';child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-2000);});
   createInterface({input:child.stdout}).on('line',line=>{try{const value=JSON.parse(line);if(value.ready)ready.ok();else if(pending){const p=pending;pending=null;value.error?p.fail(Error(value.error)):p.ok(value.text);}}catch{pending?.fail(Error('Invalid local evaluation response.'));}});
   child.on('error',e=>{ready.fail(e);pending?.fail(e);});child.on('exit',code=>{const e=Error('Local comparison process exited '+code+'. '+stderr.slice(-200));ready.fail(e);pending?.fail(e);pending=null;});
   let checking=false;guard=setInterval(async()=>{if(checking)return;checking=true;try{const issue=memoryIssue(readMemory(),baseline);if(issue)throw Error(issue);const s=await api();if(s.comparison?.id!==job.id||s.comparison.status!=='running')throw Error('Comparison cancelled or interrupted.');}catch(e){cancelled=true;ready.fail(e);pending?.fail(e);child?.kill('SIGTERM');}finally{checking=false;}},3000);
   const timeout=setTimeout(()=>{ready.fail(Error('Model loading timed out.'));child?.kill('SIGTERM');},120000);try{await readyPromise;}finally{clearTimeout(timeout);}
   for(const test of cases){
    if(cancelled)throw Error('Comparison stopped.');let simTime=0;const live=createResident(0);const service=createTrainingService({getState:()=>live,now:()=>simTime,prepareState:s=>{
     // Both arms get identical held-out shifts and zero teacher/skill memory.
     if(s.player.bike){s.player.bike.x+=test.offset.x;s.player.bike.z+=test.offset.z;}for(const o of s.objects){o.x+=test.offset.x;o.z+=test.offset.z;o.approach={x:o.approach.x+test.offset.x,z:o.approach.z+test.offset.z};}
     for(const o of s.obstacles.slice(4)){o.minX+=test.offset.x;o.maxX+=test.offset.x;o.minZ+=test.offset.z;o.maxZ+=test.offset.z;}
    },decide:async(s,message)=>{s.trainingLessons=[];s.trainingExamples=[];s.training={skills:[]};s.ai.provider='MLX comparison';s.ai.model=arm;const prompt=trainingPrompt(trainingInput(s),message);let timer;
     const text=await new Promise((ok,fail)=>{timer=setTimeout(()=>{pending=null;fail(Error('Comparison inference timed out.'));child?.kill('SIGTERM');},120000);pending={ok,fail};child.stdin.write(JSON.stringify({prompt,seed:test.repeat})+'\n');}).finally(()=>clearTimeout(timer));
     try{return trainingChoiceDecision(JSON.parse(text.split('<|im_end|>')[0].trim()));}catch(error){error.kind='decision';throw error;}
    }});service.start({taskId:test.taskId,scenario:test.scenario,prompt:test.prompt});
    for(let ticks=0;service.busy;){if(cancelled)throw Error('Comparison stopped.');if(service.snapshot().modelBusy){await new Promise(r=>setTimeout(r,25));continue;}if(++ticks>20000)throw Error('Evaluation simulation exceeded its time limit.');simTime+=100;service.tick(.1);await new Promise(r=>setImmediate(r));}
    const report=service.snapshot().active;if(!['passed','failed','correctly_blocked','interrupted'].includes(report.status))throw Error('Evaluation trial did not finish.');const row={arm,caseId:test.id,taskId:test.taskId,scenario:test.scenario,prompt:test.prompt,repeat:test.repeat,...comparisonMetrics(report)};rows.push(row);writeFileSync(resolve(dir,'results.json'),JSON.stringify({id:job.id,rows},null,2));await update('running',`${rows.length}/${cases.length*2} trials complete. Testing ${arm}.`);
   }
   clearInterval(guard);child.stdin.end();await new Promise(ok=>{const current=child;const timer=setTimeout(()=>{current.kill('SIGTERM');ok();},5000);current.once('exit',()=>{clearTimeout(timer);ok();});});child=null;
  }
  await update('completed','Comparison finished. Review both models below; the live model has not changed.');
 }finally{signal?.removeEventListener('abort',abort);clearInterval(guard);child?.kill('SIGTERM');const worker=spawn(process.execPath,[resolve(root,'scripts/mac-ai-worker.js')],{cwd:root,stdio:'ignore',detached:true});worker.unref();}
}
