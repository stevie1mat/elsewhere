import {validateObjects} from './object-perception.js';
import {createSupabaseStore} from './supabase-store.js';
import {createResilientClient,createResidentBrain} from './groq.js';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createResident,stepResident,residentSnapshot,remember} from './resident.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const digest=value=>createHash('sha256').update(value).digest();
const loginPage=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private Porto Sol</title><style>body{background:#142b2c;color:#fff3db;font:17px system-ui;display:grid;place-items:center;min-height:95vh}form{max-width:320px;padding:30px}input,button{box-sizing:border-box;width:100%;padding:15px;margin-top:15px;border-radius:12px;border:0;font:inherit}button{background:#e5c58e;cursor:pointer}p{line-height:1.6}#error{color:#ffc3b3}</style></head><body><form><small>ELSEWHERE · PRIVATE WORLD</small><h1>Your city is waiting.</h1><p>Enter your access code to check in on your resident.</p><input aria-label="Access code" type="password" inputmode="numeric" autocomplete="current-password" required><button>Enter Porto Sol</button><p id="error" role="alert"></p></form><script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:document.querySelector('input').value})});if(r.ok)location.href='/';else document.querySelector('#error').textContent=r.status===429?'Too many attempts. Try again in 15 minutes.':'Incorrect access code.';}catch{document.querySelector('#error').textContent='Connection lost. Please try again.'}};</script></body></html>`;
export function createPrivateServer({code=process.env.PRIVATE_ACCESS_CODE||'279279',dataDir=process.env.PRIVATE_DATA_DIR||resolve(root,'.private-data'),dist=resolve(root,'dist'),groqClient=createResilientClient(),cloud=createSupabaseStore()}={}) {
  mkdirSync(dataDir,{recursive:true});const saveFile=resolve(dataDir,'resident.json');
  // Invalid saves fail loudly instead of silently restarting the character's life.
  const hadLocal=existsSync(saveFile);
  let state=existsSync(saveFile)?JSON.parse(readFileSync(saveFile,'utf8')):createResident();
  if(state.version!==1)throw Error('Unsupported resident save version');
  const brain=createResidentBrain({client:groqClient});brain.initialize(state);
  let cloudReady=!cloud.configured,cloudError=null,lastCloudSave=null,cloudWrite=null,loading=null;
  async function loadCloud(){
    if(cloudReady||loading)return loading;
    loading=(async()=>{try{
      const remote=await cloud.load();
      if(remote&&(!hadLocal||remote.updatedAt>=state.updatedAt)){state=remote;brain.initialize(state);}
      cloudReady=true;cloudError=null;save();await writeCloud();
    }catch(error){cloudError=error.message;console.error(cloudError);}finally{loading=null;}})();
    return loading;
  }
  async function writeCloud(){
    if(!cloud.configured||!cloudReady)return;
    if(cloudWrite)return cloudWrite;
    const snapshot=JSON.parse(JSON.stringify(state));
    cloudWrite=(async()=>{try{await cloud.save(snapshot);lastCloudSave=new Date().toISOString();cloudError=null;}catch(error){cloudError=error.message;console.error(cloudError);}finally{cloudWrite=null;}})();
    return cloudWrite;
  }
  const storageStatus=()=>({provider:cloud.configured?'supabase':'local',ready:cloudReady,lastCloudSave,error:cloudError});
  const sessions=new Map(),attempts=new Map();let saveError=null;
  const save=()=>{if(cloud.configured&&!cloudReady&&!hadLocal)return;try{writeFileSync(saveFile+'.tmp',JSON.stringify(state),{mode:0o600});renameSync(saveFile+'.tmp',saveFile);saveError=null;}catch(e){saveError=e.message;console.error('Resident save failed:',e.message);}};
  if(existsSync(saveFile))remember(state,'Server resumed the saved life. No activity was simulated while the server was stopped.',Date.now());
  save();
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const body=async req=>{let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>1500000)throw Error('Request too large');}return JSON.parse(data||'{}');};
  const http=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`){json(res,403,{error:'Origin rejected'});return;}
      if(url.pathname==='/health'&&req.method==='GET'){json(res,200,{ok:true,service:'private-resident'});return;}
      if(url.pathname==='/api/login'&&req.method==='POST'){
        const ip=req.socket.remoteAddress,now=Date.now();let limit=attempts.get(ip);
        if(!limit||limit.until<now){limit={count:0,until:now+900000};attempts.set(ip,limit);}
        if(limit.count>=10){json(res,429,{error:'Try again later'});return;}
        limit.count++;const input=await body(req);
        if(typeof input.code!=='string'||!timingSafeEqual(digest(input.code),digest(code))){json(res,401,{error:'Incorrect code'});return;}
        attempts.delete(ip);const token=randomBytes(32).toString('hex');sessions.set(token,now+7*86400000);
        res.setHeader('Set-Cookie',`porto_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);json(res,200,{ok:true});return;
      }
      const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('porto_session='))?.slice(14);
      if(!token||!(sessions.get(token)>Date.now())){
        if(url.pathname.startsWith('/api/')){json(res,401,{error:'Sign in required'});return;}
        res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(loginPage);return;
      }
      if(url.pathname==='/api/resident'&&req.method==='GET'){if(!cloudReady&&!hadLocal){json(res,503,{error:'Loading the saved life from Supabase. Please retry shortly.'});return;}json(res,200,{...residentSnapshot(state),saveError:saveError||cloudError,storage:storageStatus()});return;}
      if(url.pathname.startsWith('/api/resident/')&&!cloudReady&&!hadLocal){json(res,503,{error:'Waiting for the saved life from Supabase.'});return;}
      if(url.pathname==='/api/resident/world'&&req.method==='POST'){
        const input=await body(req);if(input.objects!==undefined){if(!validateObjects(input.objects)){json(res,400,{error:'Invalid interaction object registry'});return;}state.objects=input.objects;}
        if(!state.obstacles){
          if(!Array.isArray(input.obstacles)||input.obstacles.length>20000||!input.obstacles.every(b=>['minX','maxX','minZ','maxZ'].every(k=>Number.isFinite(b[k])&&Math.abs(b[k])<10000)&&b.minX<=b.maxX&&b.minZ<=b.maxZ)){json(res,400,{error:'Invalid world geometry'});return;}
          state.obstacles=input.obstacles.map(({minX,maxX,minZ,maxZ})=>({minX,maxX,minZ,maxZ}));remember(state,'Began the balloon journey to Porto Sol.',Date.now());save();void writeCloud();
        }save();void writeCloud();json(res,200,residentSnapshot(state));return;
      }
      if(url.pathname==='/api/resident/control'&&req.method==='POST'){
        const input=await body(req);
        if(!['pause','resume','restart'].includes(input.action)){json(res,400,{error:'Choose pause, resume or restart.'});return;}
        brain.setPaused(state,input.action==='pause');save();if(cloudWrite)await cloudWrite;await writeCloud();
        json(res,200,{...residentSnapshot(state),saveError:saveError||cloudError,storage:storageStatus()});return;
      }
      if(url.pathname==='/api/resident/chat'&&req.method==='POST'){
        const input=await body(req);
        if(typeof input.message!=='string'||!input.message.trim()||input.message.length>1200){json(res,400,{error:'Enter a message of up to 1200 characters.'});return;}
        try{const reply=await brain.chat(state,input.message.trim());save();void writeCloud();json(res,200,{reply,messages:state.messages});}
        catch(error){const retryAfterMs=error.retryMs>0?Math.max(1000,error.retryMs):null;if(retryAfterMs)res.setHeader('Retry-After',String(Math.ceil(retryAfterMs/1000)));json(res,error.status===429?429:503,{error:error.message,retryAfterMs});}return;
      }
      if(url.pathname.startsWith('/api/')){json(res,404,{error:'Not found'});return;}
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
      const path=resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!path.startsWith(dist+'/')||!existsSync(path)||!statSync(path).isFile()){res.writeHead(404);res.end('Not found');return;}
      const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.glb':'model/gltf-binary','.woff2':'font/woff2'};
      res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:readFileSync(path));
    }catch(error){console.error(error.message);if(!res.headersSent)json(res,500,{error:'Unable to process request'});else res.end();}
  });
  let last=Date.now();const tick=setInterval(()=>{const now=Date.now(),dt=Math.min(1,(now-last)/1000);last=now;try{if(!cloudReady&&!hadLocal)return;void brain.update(state);stepResident(state,dt,now);}catch(e){console.error('Resident simulation failed:',e.message);}},100);
  const persistence=setInterval(()=>{save();if(cloudReady)void writeCloud();else void loadCloud();const now=Date.now();for(const [key,until] of sessions)if(until<now)sessions.delete(key);for(const [key,limit] of attempts)if(limit.until<now)attempts.delete(key);},5000);
  const ready=loadCloud();
  return {http,get state(){return state;},ready,storageStatus,close:async()=>{brain.stop();clearInterval(tick);clearInterval(persistence);await ready;if(cloudWrite)await cloudWrite;save();await writeCloud();await new Promise(resolve=>http.close(resolve));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const envFile=resolve(root,'.env');if(existsSync(envFile))process.loadEnvFile(envFile);
  const server=createPrivateServer();await server.ready;server.http.listen(Number(process.env.PORT||8788),process.env.HOST||'127.0.0.1',()=>console.log('Private Porto Sol is running on port '+(process.env.PORT||8788)));
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close().then(()=>process.exit(0)));
}
