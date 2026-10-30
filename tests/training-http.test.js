import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createPrivateServer} from '../server/private.js';import {createResident} from '../server/resident.js';
test('training page and API use existing authentication, route and persistence without changing the live resident',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'porto-training-http-')),s=createResident();s.obstacles=[];s.arrival.phase='landed';s.paused=true;writeFileSync(join(dir,'resident.json'),JSON.stringify(s));writeFileSync(join(dir,'index.html'),'<title>Existing game entry</title>');
 const app=createPrivateServer({code:'test',dataDir:dir,dist:dir,cloud:{configured:false},groqClient:{configured:true,provider:'fixture',model:'fixture',complete:async()=>({action:'stop',destination:'here',seconds:15,goal:'Stop',intention:'No chair',reply:'No usable chair is available.',changePlan:true})}});
 try{await app.ready;await new Promise((resolve,reject)=>{app.http.once('error',reject);app.http.listen(0,'127.0.0.1',resolve);});const base='http://127.0.0.1:'+app.http.address().port;
 assert.equal((await fetch(base+'/api/resident/training')).status,401);assert.match(await (await fetch(base+'/training')).text(),/access code/);
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'test'})}),Cookie=login.headers.get('set-cookie').split(';')[0];
 assert.match(await (await fetch(base+'/training',{headers:{Cookie}})).text(),/Existing game entry/);
 const initial=JSON.stringify({player:app.state.player,wallet:app.state.wallet,paused:app.state.paused});
 const start=await fetch(base+'/api/resident/training',{method:'POST',headers:{Cookie,'Content-Type':'application/json'},body:JSON.stringify({action:'start',scenario:'no_chair'})});assert.equal(start.status,200);assert.equal((await start.json()).active.mode,'planner');
 await new Promise(r=>setTimeout(r,350));const data=await (await fetch(base+'/api/resident/training',{headers:{Cookie}})).json();assert.equal(data.active.status,'correctly_blocked');assert.equal(data.reports.length,1);assert.equal(JSON.stringify({player:app.state.player,wallet:app.state.wallet,paused:app.state.paused}),initial);
 }finally{await app.close();}
});
