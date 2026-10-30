import {existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {readMemory,memoryIssue} from './mac-memory.js';
import {createLocalClient} from '../server/local-client.js';
const env=fileURLToPath(new URL('../.env',import.meta.url));if(existsSync(env))process.loadEnvFile(env);
const server=new URL(process.env.PRIVATE_SERVER_URL||'https://elsewhere-ocqx.onrender.com');if(server.protocol!=='https:'&&server.hostname!=='127.0.0.1'&&server.hostname!=='localhost')throw Error('Hosted worker connection requires HTTPS.');
const client=createLocalClient(),workerId=randomUUID();let cookie,stopped=false,connected=false,busy=false;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function login(){const r=await fetch(new URL('/api/login',server),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:process.env.PRIVATE_ACCESS_CODE||'279279'}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Game login failed ('+r.status+').');cookie=r.headers.get('set-cookie')?.split(';')[0];if(!cookie)throw Error('Game session missing.');}
async function post(body){const r=await fetch(new URL('/api/resident/worker',server),{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({...body,workerId}),signal:AbortSignal.timeout(20000)});if(r.status===401){cookie=null;connected=false;throw Error('Game session expired; reconnecting.');}const d=await r.json();if(r.status===410){stopped=true;connected=false;}if(!r.ok){if(r.status===409)connected=false;throw Error(d.error||'Worker endpoint not ready ('+r.status+').');}return d;}
async function shutdown(){if(stopped)return;stopped=true;try{if(connected)await post({op:'disconnect'});}catch{}console.log('Mac worker stopped. The hosted resident will pause when local AI is unavailable.');}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>shutdown().then(()=>process.exit(0)));
if(process.argv.includes('--cloud')){await login();await post({op:'cloud'});console.log('Hosted game switched back to cloud providers. Manual pause state was preserved.');process.exit(0);}
const baseline=readMemory();if(baseline.pressure!==1)throw Error('Mac memory pressure is elevated. Local AI was not started.');
const generation=new AbortController();let memoryStopped=false;
const monitorMemory=()=>setInterval(()=>{if(memoryStopped)return;try{const issue=memoryIssue(readMemory(),baseline);if(!issue)return;console.log('Stopping local AI: '+issue+'.');}catch{console.log('Stopping local AI: memory monitoring failed.');}memoryStopped=true;generation.abort();execFile('/Applications/LM Studio.app/Contents/Resources/app/.webpack/lms',['unload','resident-local'],{timeout:15000},()=>{});void shutdown();},5000);
const models=await fetch((process.env.LOCAL_AI_URL||'http://127.0.0.1:1234/v1').replace(/\/$/,'')+'/models',{signal:AbortSignal.timeout(10000)});if(!models.ok)throw Error('Start LM Studio and load resident-local first.');const inventory=await models.json();if(!inventory.data?.some(m=>m.id===client.model))throw Error('Load the model in LM Studio with identifier '+client.model+'.');
const memoryGuard=monitorMemory();
console.log('Mac worker ready: '+client.model+'. Local API stays on loopback; the worker makes outbound HTTPS requests only.');
// Heartbeats continue during generation; no inference is started by this timer.
const heartbeat=setInterval(()=>{if(connected&&busy)void post({op:'poll'}).catch(()=>{connected=false;});},5000);
try{while(!stopped){try{
 if(!cookie)await login();if(!connected){await post({op:'connect',model:client.model});connected=true;console.log('Connected to hosted resident using Mac LM Studio. Manual pause state preserved.');}
 const {job}=await post({op:'poll'});if(stopped)break;if(!job){await pause(1500);continue;}
 busy=true;console.log('Generating local decision…');try{const decision=await client.complete(job.context,job.message,generation.signal);await post({op:'result',id:job.id,decision,usage:client.lastAttempt?.usage,sent:client.lastAttempt?.sent});console.log('Decision returned ('+Math.round((client.lastAttempt?.latencyMs||0)/100)/10+'s).');}
 catch(e){try{await post({op:'result',id:job.id,error:e.message});}catch{}console.log('Local decision failed: '+e.message);}finally{busy=false;}
 }catch(e){console.log(e.message);await pause(5000);}}
}finally{clearInterval(heartbeat);clearInterval(memoryGuard);await shutdown();}
