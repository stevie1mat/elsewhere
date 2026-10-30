import test from 'node:test';import assert from 'node:assert/strict';
import {isProjectWorker,stopMacWorkers} from '../scripts/stop-mac-workers.js';
test('replacement only targets this project’s exact Node worker',()=>{
 const root='/tmp/game';
 assert.equal(isProjectWorker('/opt/homebrew/bin/node scripts/mac-ai-worker.js',root,root),true);
 assert.equal(isProjectWorker('node /tmp/game/scripts/mac-ai-worker.js',root,'/elsewhere'),true);
 assert.equal(isProjectWorker('node scripts/mac-ai-worker.js',root,'/different/game'),false);
 assert.equal(isProjectWorker('node scripts/mac-ai-worker.js.backup',root,root),false);
 assert.equal(isProjectWorker('zsh -c node scripts/mac-ai-worker.js',root,root),false);
 assert.equal(isProjectWorker('node server/private.js',root,root),false);
});
test('launcher waits for graceful exit and leaves unrelated workers alone',async()=>{
 let active=[{pid:901,command:'node scripts/mac-ai-worker.js'},{pid:902,command:'node scripts/mac-ai-worker.js'},{pid:903,command:'node other.js'}];const signals=[];
 await stopMacWorkers('/tmp/game',{list:()=>active,getCwd:p=>p===902?'/another/project':'/tmp/game',signal:(pid,sig)=>signals.push([pid,sig]),wait:async()=>{active=active.filter(p=>p.pid!==901);}});
 assert.deepEqual(signals,[[901,'SIGTERM']]);assert.equal(active.length,2);
});
test('unresponsive old worker is forcibly stopped before replacement',async()=>{
 let active=[{pid:901,command:'node scripts/mac-ai-worker.js'}];const signals=[];
 await stopMacWorkers('/tmp/game',{timeoutMs:0,list:()=>active,getCwd:()=>'/tmp/game',signal:(pid,sig)=>{signals.push(sig);if(sig==='SIGKILL')active=[];},wait:async()=>{}});
 assert.deepEqual(signals,['SIGTERM','SIGKILL']);
});
