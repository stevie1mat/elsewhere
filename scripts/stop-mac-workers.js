import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const project=fileURLToPath(new URL('../',import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function processes(){
 return execFileSync('/bin/ps',['-axo','pid=,command='],{encoding:'utf8'}).split('\n').flatMap(line=>{
  const m=/^\s*(\d+)\s+(.+)$/.exec(line);return m?[{pid:Number(m[1]),command:m[2]}]:[];
 });
}
function cwd(pid){
 try{return execFileSync('/usr/sbin/lsof',['-a','-p',String(pid),'-d','cwd','-Fn'],{encoding:'utf8'}).split('\n').find(s=>s.startsWith('n'))?.slice(1);}catch{return null;}
}
export function isProjectWorker(command,root,processCwd){
 const m=/^(?:\S*\/)?node\s+(.+?)(?:\s+--.*)?$/.exec(command);
 if(!m)return false;
 const script=m[1];
 return script===resolve(root,'scripts/mac-ai-worker.js')||
  (['scripts/mac-ai-worker.js','./scripts/mac-ai-worker.js'].includes(script)&&processCwd===resolve(root));
}
export async function stopMacWorkers(root=project,{list=processes,getCwd=cwd,signal=(pid,sig)=>process.kill(pid,sig),wait=sleep,timeoutMs=6000}={}){
 const find=()=>list().filter(p=>p.pid!==process.pid&&/^(?:\S*\/)?node\s+.*scripts\/mac-ai-worker\.js(?:\s|$)/.test(p.command)&&isProjectWorker(p.command,root,getCwd(p.pid)));
 const targets=find();
 if(!targets.length)return;
 console.log('Stopping '+targets.length+' previous Mac AI worker(s)…');
 for(const p of targets){try{signal(p.pid,'SIGTERM');}catch(e){if(e.code!=='ESRCH')throw e;}}
 const ids=new Set(targets.map(p=>p.pid));
 let remaining=[];
 for(let elapsed=0;elapsed<=timeoutMs;elapsed+=100){
  remaining=find().filter(p=>ids.has(p.pid));if(!remaining.length)return;
  await wait(100);
 }
 for(const p of remaining){try{signal(p.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}}
 for(let n=0;n<20;n++){if(!find().some(p=>ids.has(p.pid)))return;await wait(100);}
 throw Error('Previous Mac worker did not exit. New worker was not started.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await stopMacWorkers();
