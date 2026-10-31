import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {spawn} from 'node:child_process';
import {stopMacWorkers} from './stop-mac-workers.js';
export const checkpointHash=path=>createHash('sha256').update(readFileSync(resolve(path,'adapters.safetensors'))).digest('hex');
export async function performModelDeployment({root,job,status,api}){
 const dir=resolve(root,'.training'),file=resolve(dir,'active-adapter.json');mkdirSync(dir,{recursive:true});const previous=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{active:'original'};
 const manifest=job.target==='candidate'?{active:'candidate',requestId:job.id,candidateId:job.candidateId,adapterPath:status.adapterPath,baseModel:status.baseModel,checkpointHash:job.checkpointHash}:{active:'original',requestId:job.id};
 if(manifest.active==='candidate'&&(status.datasetHash!==job.candidateId||!manifest.adapterPath||checkpointHash(manifest.adapterPath)!==job.checkpointHash))throw Error('Candidate checkpoint does not match the tested adapter.');
 const write=value=>{writeFileSync(file+'.tmp',JSON.stringify(value,null,2));renameSync(file+'.tmp',file);};const launch=()=>{const child=spawn(process.execPath,[resolve(root,'scripts/mac-ai-worker.js')],{cwd:root,stdio:'ignore',detached:true});child.unref();};
 await stopMacWorkers(root);try{write(manifest);launch();for(let elapsed=0;elapsed<45000;elapsed+=1500){await new Promise(r=>setTimeout(r,1500));const current=(await api()).deployment;if(current?.id===job.id&&current.status==='active')return;}throw Error('Worker did not confirm activation. Previous model restored.');}catch(e){await stopMacWorkers(root);write(previous);launch();throw e;}
}
