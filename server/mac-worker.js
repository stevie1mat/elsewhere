import {randomUUID} from 'node:crypto';
import {validateDecision,RESIDENT_SYSTEM_PROMPT} from './decision-contract.js';
export function createMacWorkerBroker({enabled=false,now=()=>Date.now(),timeoutMs=150000}={}){
 let selected=enabled,worker=null,lastSeen=0,model='resident-local',job=null,latest=null;
 const online=()=>!!worker&&now()-lastSeen<20000;
 function fail(message){if(job){const current=job;job=null;current.reject(Error(message));}}
 return {get enabled(){return selected;},get online(){return online();},get provider(){return 'Mac LM Studio';},get model(){return model;},get lastAttempt(){return latest;},get diagnostics(){return [{provider:'Mac LM Studio',model,status:online()?'connected':'unavailable',error:online()?null:'Mac worker offline. Start npm run ai:mac.'}];},
  connect(id,name){if(typeof id!=='string'||id.length>100||typeof name!=='string'||name.length>100)throw Error('Invalid worker identity');if(worker&&worker!==id&&online())throw Error('Another Mac worker is already connected. Stop it before connecting a second worker.');if(worker!==id)fail('Mac worker replaced.');selected=true;worker=id;model=name;lastSeen=now();},
  restoreMode(value){if(value!==selected){selected=value;worker=null;lastSeen=0;fail('AI mode changed.');}},
  cloud(){selected=false;worker=null;fail('Switched to cloud AI.');},
  disconnect(id){if(id!==worker)return false;worker=null;lastSeen=0;fail('Mac worker disconnected.');return true;},
  poll(id){if(id!==worker)throw Error('Worker must reconnect.');lastSeen=now();if(job&&!job.claimed){job.claimed=true;return {id:job.id,context:job.context,message:job.message};}return null;},
  result(id,input){if(id!==worker)throw Error('Worker must reconnect.');lastSeen=now();if(!job||input.id!==job.id)throw Error('Job expired or was cancelled.');const current=job;job=null;
   if(input.error){current.reject(Error('Local inference failed: '+String(input.error).slice(0,180)));return;}
   try{const decision=validateDecision(input.decision),usage=input.usage;latest={provider:'Mac LM Studio',model,at:current.at,status:'success',httpStatus:200,latencyMs:now()-current.at,usage:usage&&['input','output','total'].every(k=>Number.isFinite(usage[k])&&usage[k]>=0)?usage:null,sent:input.sent&&typeof input.sent.prompt==='string'&&input.sent.prompt.length<60000?{model,prompt:input.sent.prompt,temperature:input.sent.temperature,max_tokens:input.sent.max_tokens,stream:false}: {model,messages:[{role:'system',content:RESIDENT_SYSTEM_PROMPT},{role:'user',content:JSON.stringify({world:current.context,request:current.message})}]},received:{finishReason:'stop',content:JSON.stringify(decision)},error:null};current.resolve(decision);}catch(e){current.reject(e);throw e;}
  },
  async complete(context,message,signal){latest=null;if(!online())throw Error('Mac worker offline. Start npm run ai:mac.');if(job)throw Error('Mac worker is busy.');
   return new Promise((resolve,reject)=>{const timer=setTimeout(()=>fail('Mac model request timed out.'),timeoutMs);const aborted=()=>fail('Mac model request cancelled.');const clear=fn=>v=>{clearTimeout(timer);signal?.removeEventListener('abort',aborted);fn(v);};job={id:randomUUID(),context,message,at:now(),claimed:false,resolve:clear(resolve),reject:clear(reject)};if(signal?.aborted)aborted();else signal?.addEventListener('abort',aborted,{once:true});});
  }
 };
}
export function routeResidentClient(cloud,mac){let used=cloud;return {get configured(){return mac.enabled||cloud.configured;},get provider(){return mac.enabled?mac.provider:cloud.provider;},get model(){return mac.enabled?mac.model:cloud.model;},get providers(){return mac.enabled?['Mac LM Studio']:cloud.providers;},get attempts(){return used===mac?(mac.lastAttempt?[mac.lastAttempt]:[]):cloud.attempts||(cloud.lastAttempt?[cloud.lastAttempt]:[]);},get diagnostics(){return mac.enabled?mac.diagnostics:cloud.diagnostics;},async complete(c,m,s){used=mac.enabled?mac:cloud;return used.complete(c,m,s);}};}
