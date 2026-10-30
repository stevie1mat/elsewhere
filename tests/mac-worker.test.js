import test from 'node:test';import assert from 'node:assert/strict';import {createMacWorkerBroker,routeResidentClient} from '../server/mac-worker.js';
const d={action:'observe',destination:'here',seconds:60,goal:'Observe nearby objects',intention:'Look around',reply:'Looking around'};
test('authenticated worker claim/result fulfills exactly one validated decision; stale results are rejected',async()=>{
 let time=1000;const b=createMacWorkerBroker({now:()=>time});b.connect('worker','resident-local');const promise=b.complete({needs:{energy:71}},'Choose',new AbortController().signal);const job=b.poll('worker');assert.equal(job.context.needs.energy,71);assert.equal(b.poll('worker'),null);time+=10;b.result('worker',{id:job.id,decision:d,usage:{input:12,output:5,total:17}});assert.deepEqual(await promise,d);assert.equal(b.lastAttempt.usage.total,17);assert.throws(()=>b.result('worker',{id:job.id,decision:d}));assert.throws(()=>b.poll('other'));
});
test('Mac mode never spends cloud tokens when disconnected; explicit cloud mode restores routing',async()=>{
 let calls=0;const b=createMacWorkerBroker({enabled:true});const c=routeResidentClient({configured:true,complete:async()=>{calls++;return d;}},b);await assert.rejects(c.complete({},'Choose'),/offline/);assert.equal(calls,0);b.cloud();await c.complete({},'Choose');assert.equal(calls,1);
});
test('pause cancellation discards late local decisions and expires worker lease',async()=>{
 let time=1000;const b=createMacWorkerBroker({now:()=>time});b.connect('w','local');const abort=new AbortController(),promise=b.complete({},'Choose',abort.signal);const job=b.poll('w');abort.abort();await assert.rejects(promise,/cancelled/);assert.throws(()=>b.result('w',{id:job.id,decision:d}),/expired/);time+=21000;assert.equal(b.online,false);
});
test('invalid local action is never executed',async()=>{
 const b=createMacWorkerBroker();b.connect('w','local');const promise=b.complete({},'Choose');const job=b.poll('w');assert.throws(()=>b.result('w',{id:job.id,decision:{...d,action:'arbitrary_code'}}));await assert.rejects(promise,/Unknown action/);
});
test('heartbeat keeps the lease alive without claiming a queued decision',async()=>{
 let time=1000;const b=createMacWorkerBroker({now:()=>time});b.connect('w','local');
 const promise=b.complete({},'Choose');time+=19000;b.heartbeat('w');time+=19000;b.heartbeat('w');assert.equal(b.online,true);
 const job=b.poll('w');assert.ok(job);b.result('w',{id:job.id,decision:d});await promise;
});
test('memory suspension cancels work, preserves the reason and permits reconnection',async()=>{
 const b=createMacWorkerBroker();b.connect('w','local');const pending=b.complete({},'Choose');
 const reason='Mac worker waiting for memory to recover. It will reconnect automatically.';
 b.disconnect('w',reason);await assert.rejects(pending,/waiting for memory/);assert.equal(b.online,false);
 await assert.rejects(b.complete({},'Choose'),/waiting for memory/);assert.equal(b.diagnostics[0].error,reason);
 b.connect('w','local');assert.equal(b.online,true);assert.equal(b.diagnostics[0].error,null);
});
