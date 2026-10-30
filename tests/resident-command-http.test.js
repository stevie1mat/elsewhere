import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPrivateServer} from '../server/private.js';
import {createResident} from '../server/resident.js';
import {SERVICES} from '../server/shared/services.js';

test('authenticated chat executes explicit controls while inference is offline, preserving one hosted life',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'porto-command-http-')),s=createResident();s.obstacles=[];s.objects=SERVICES;s.arrival.phase='landed';Object.assign(s.player,{x:30,z:-14});s.ai={localWorkerMode:true};writeFileSync(join(dir,'resident.json'),JSON.stringify(s));
 const app=createPrivateServer({code:'test',dataDir:dir,cloud:{configured:false},groqClient:{configured:false}});
 try{
  await app.ready;await new Promise((resolve,reject)=>{app.http.once('error',reject);app.http.listen(0,'127.0.0.1',resolve);});
  const base='http://127.0.0.1:'+app.http.address().port;
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'test'})});const Cookie=login.headers.get('set-cookie').split(';')[0];
  const post=message=>fetch(base+'/api/resident/chat',{method:'POST',headers:{Cookie,'Content-Type':'application/json'},body:JSON.stringify({message})});
  assert.equal((await fetch(base+'/api/resident/chat',{method:'POST'})).status,401);
  const pickup=await post('collect the bicycle');assert.equal(pickup.status,200);assert.equal(app.state.player.mode,'cycling');assert.equal(app.state.lastCommand.evidence.owned,true);
  const dismount=await post('get off the bike');assert.equal(dismount.status,200);assert.equal(app.state.player.mode,'walking');assert.ok(app.state.player.bike);
  const stop=await post('stop');assert.equal(stop.status,200);assert.equal(app.state.awaitingInstruction,true);assert.equal(app.state.route.length,0);
 }finally{await app.close();}
});
