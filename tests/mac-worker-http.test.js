import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {createPrivateServer} from '../server/private.js';
test('worker endpoint requires game authentication and preserves pause without invoking cloud providers',async()=>{
 let cloudCalls=0;const server=createPrivateServer({code:'test-only',dataDir:mkdtempSync(join(tmpdir(),'resident-mac-http-')),cloud:{configured:false},groqClient:{configured:false,complete:async()=>{cloudCalls++;throw Error('Cloud must not be used');}}});await server.ready;server.state.paused=true;
 await new Promise(r=>server.http.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.http.address().port;
 try{
 const unauth=await fetch(base+'/api/resident/worker',{method:'POST',body:JSON.stringify({op:'connect',workerId:'w',model:'resident-local'})});assert.equal(unauth.status,401);
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'test-only'})});const cookie=login.headers.get('set-cookie').split(';')[0];
 const post=(path,data)=>fetch(base+path,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(data)});
 const connected=await post('/api/resident/worker',{op:'connect',workerId:'w',model:'resident-local'});assert.equal(connected.status,200);assert.equal(server.state.paused,true);assert.equal(server.state.ai.localWorkerMode,true);assert.equal(server.state.ai.enabled,true);
 const poll=await post('/api/resident/worker',{op:'poll',workerId:'w'});assert.deepEqual(await poll.json(),{job:null,paused:true});assert.equal(cloudCalls,0);
 const chat=await post('/api/resident/chat',{message:'Use phone now'});assert.equal(chat.status,409);
 const beat=await post('/api/resident/worker',{op:'heartbeat',workerId:'w'});assert.equal(beat.status,200);
 const wait=await post('/api/resident/worker',{op:'disconnect',workerId:'w',reason:'memory'});assert.equal(wait.status,200);assert.match(server.state.ai.error,/waiting for memory/);assert.equal(server.state.ai.connected,false);assert.equal(server.state.paused,true);
 await post('/api/resident/worker',{op:'connect',workerId:'w',model:'resident-local'});assert.equal(server.state.paused,true);
 const switched=await post('/api/resident/worker',{op:'cloud'});assert.equal(switched.status,200);assert.equal(server.state.ai.localWorkerMode,false);assert.equal(server.state.paused,true);assert.equal(cloudCalls,0);
 }finally{await server.close();}
});
