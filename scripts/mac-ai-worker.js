import {createAdapterClient} from './adapter-client.js';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readMemory,createMemoryRecovery} from './mac-memory.js';
import {createLocalClient} from '../server/local-client.js';

const env=fileURLToPath(new URL('../.env',import.meta.url));
if(existsSync(env))process.loadEnvFile(env);
const server=new URL(process.env.PRIVATE_SERVER_URL||'https://elsewhere-ocqx.onrender.com');
if(server.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(server.hostname))throw Error('Hosted worker connection requires HTTPS.');
const root=fileURLToPath(new URL('../',import.meta.url)),manifestPath=fileURLToPath(new URL('../.training/active-adapter.json',import.meta.url)),deploymentManifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):null,adapterManifest=deploymentManifest?.active==='candidate'?deploymentManifest:null;
const client=adapterManifest?createAdapterClient({root,manifest:adapterManifest}):createLocalClient(),workerId=randomUUID();
const localUrl=(process.env.LOCAL_AI_URL||'http://127.0.0.1:1234/v1').replace(/\/$/,'');
const lms='/Applications/LM Studio.app/Contents/Resources/app/.webpack/lms';
const run=promisify(execFile),pause=ms=>new Promise(r=>setTimeout(r,ms));
let cookie,stopped=false,connected=false,generation=new AbortController();
let memoryGuard,heartbeat,checking,unloading,needsCleanup=true;
async function login(){
 const r=await fetch(new URL('/api/login',server),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:process.env.PRIVATE_ACCESS_CODE||'279279'}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Game login failed ('+r.status+').');
 cookie=r.headers.get('set-cookie')?.split(';')[0];if(!cookie)throw Error('Game session missing.');
}
async function post(body){
 const r=await fetch(new URL('/api/resident/worker',server),{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({...body,workerId}),signal:AbortSignal.timeout(20000)});
 if(r.status===401){cookie=null;connected=false;throw Error('Game session expired; reconnecting.');}
 const d=await r.json();
 if(r.status===410){stopped=true;connected=false;generation.abort();}
 if(!r.ok){if(r.status===409)connected=false;throw Error(d.error||'Worker endpoint not ready ('+r.status+').');}
 return d;
}
async function shutdown(){
 if(stopped)return;stopped=true;generation.abort();
 try{if(connected)await post({op:'disconnect'});}catch{}
 connected=false;
 console.log('Mac worker stopped. The hosted resident pauses while local AI is unavailable.');
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>shutdown().then(()=>process.exit(0)));
if(process.argv.includes('--cloud')){
 await login();await post({op:'cloud'});console.log('Hosted game switched back to cloud providers. Manual pause state preserved.');process.exit(0);
}
let baseline;try{baseline=readMemory();}catch{baseline={swapMB:0,pressure:0};}
const recovery=createMemoryRecovery({baseline});
async function inventory(){
 const r=await fetch(localUrl+'/models',{signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('LM Studio API unavailable.');return (await r.json()).data||[];
}
async function releaseModel(){
 if(unloading)return unloading;
 unloading=(async()=>{
  if((await inventory()).some(m=>m.id===client.model))await run(lms,['unload',client.model],{timeout:30000});
  needsCleanup=false;
 })();
 try{await unloading;}finally{unloading=null;}
}
async function checkMemory(){
 if(checking)return checking;
 checking=(async()=>{
  let sample;try{sample=readMemory();}catch{sample=null;}
  const event=recovery.sample(sample);
  if(event==='pause'){
   console.log('Pausing local AI: '+recovery.reason+'. Waiting for stable memory; the worker stays running.');
   generation.abort();
   try{if(connected)await post({op:'disconnect',reason:'memory'});}catch{}
   connected=false;
  }
  if(recovery.waiting||event==='resume'||generation.signal.aborted&&!stopped){
   try{await releaseModel();}catch(e){console.log('Waiting to unload model: '+e.message);return;}
   if(!recovery.waiting&&!stopped){
    generation=new AbortController();
    console.log('Memory has been stable for one minute. Reconnecting local AI.');
   }
  }
 })();
 try{await checking;}finally{checking=null;}
}
async function ensureModel(){
 await checkMemory();if(recovery.waiting||generation.signal.aborted||stopped)throw Error('Waiting for Mac memory to recover.');
 if((await inventory()).some(m=>m.id===client.model)){needsCleanup=true;return;}
 if(client.model!=='resident-local')throw Error('Load your custom model before resuming.');
 console.log('Loading local model for this decision only…');
 needsCleanup=true;
 await run(lms,['load','qwen3.5-4b-mlx','--context-length','4096','--identifier','resident-local','--parallel','1','--ttl','60','--yes'],{signal:generation.signal,timeout:60000});
 await checkMemory();if(recovery.waiting||generation.signal.aborted)throw Error('Waiting for Mac memory to recover.');
}
console.log('Mac worker ready: '+client.model+'. Low-memory mode: unload after each decision; recover automatically after memory pressure.');
memoryGuard=setInterval(()=>{void checkMemory().catch(e=>console.log('Memory check: '+e.message));},5000);
// Heartbeats never claim jobs, including while a previous model is unloading.
heartbeat=setInterval(()=>{if(connected&&!recovery.waiting)void post({op:'heartbeat'}).catch(()=>{connected=false;});},5000);
try{
 await checkMemory();
 try{await releaseModel();}catch(e){console.log('Local model service: '+e.message);}
 while(!stopped){try{
  await checkMemory();if(recovery.waiting||generation.signal.aborted){await pause(5000);continue;}
  if(needsCleanup)await releaseModel();
  if(!cookie)await login();
  if(!connected){await post({op:'connect',model:adapterManifest?'resident-local + LoRA '+adapterManifest.candidateId.slice(0,12):client.model,deploymentId:deploymentManifest?.requestId,adapterId:adapterManifest?.candidateId});connected=true;console.log('Connected to hosted resident using Mac LM Studio. Manual pause state preserved.');}
  const {job}=await post({op:'poll'});if(stopped)break;if(!job){await pause(1500);continue;}
  try{
   if(adapterManifest){await checkMemory();if(recovery.waiting)throw Error('Waiting for Mac memory to recover.');await releaseModel();}else await ensureModel();console.log('Generating local decision…');
   const decision=await client.complete(job.context,job.message,generation.signal);
   if(recovery.waiting||generation.signal.aborted||stopped)continue;
   await post({op:'result',id:job.id,decision,usage:client.lastAttempt?.usage,sent:client.lastAttempt?.sent});
   console.log('Decision returned ('+Math.round((client.lastAttempt?.latencyMs||0)/100)/10+'s).');
  }catch(e){
   if(!recovery.waiting&&!stopped){try{await post({op:'result',id:job.id,error:e.message});}catch{}console.log('Local decision failed: '+e.message);}
  }finally{
   try{await releaseModel();}catch(e){console.log('Model cleanup: '+e.message);}
  }
 }catch(e){console.log(e.message);await pause(5000);}}
}finally{
 clearInterval(heartbeat);clearInterval(memoryGuard);await shutdown();
 try{await releaseModel();}catch{}
}
