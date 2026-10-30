import test from 'node:test';import assert from 'node:assert/strict';
import {parseSwapMB,memoryIssue,createMemoryRecovery} from '../scripts/mac-memory.js';
test('memory guard reads macOS units and stops on rising swap or memory pressure',()=>{
 assert.equal(parseSwapMB('total = 2.00G used = 1.50G free = 512M'),1536);
 assert.throws(()=>parseSwapMB('unavailable'));
 const baseline={swapMB:0,pressure:1};
 assert.equal(memoryIssue({swapMB:0,pressure:1},baseline),null);
 assert.match(memoryIssue({swapMB:33,pressure:1},baseline),/swap/);
 assert.match(memoryIssue({swapMB:0,pressure:2},baseline),/pressure/);
});
test('memory recovery requires a continuous healthy minute and extends cooldown after repeated trips',()=>{
 let time=0;const guard=createMemoryRecovery({baseline:{swapMB:0,pressure:1},now:()=>time});
 const healthy={swapMB:0,pressure:1},warning={swapMB:0,pressure:2};
 assert.equal(guard.sample(warning),'pause');assert.equal(guard.waiting,true);
 time=10000;assert.equal(guard.sample(healthy),null);
 time=60000;assert.equal(guard.sample(warning),null); // Reset the stability clock.
 time=65000;guard.sample(healthy);time=124999;assert.equal(guard.sample(healthy),null);
 time=125000;assert.equal(guard.sample(healthy),'resume');assert.equal(guard.waiting,false);
 time=130000;assert.equal(guard.sample(warning),'pause');time=135000;guard.sample(healthy);
 time=200000;assert.equal(guard.sample(healthy),null); // Healthy minute, but second cooldown is 2 min.
 time=250000;assert.equal(guard.sample(healthy),'resume');
});
test('monitoring failure waits safely and swap baseline never increases during recovery',()=>{
 let time=0;const guard=createMemoryRecovery({baseline:{swapMB:0,pressure:1},now:()=>time});
 assert.equal(guard.sample(null),'pause');assert.match(guard.reason,/monitoring/);
 time=120000;guard.sample({swapMB:40,pressure:1});assert.equal(guard.waiting,true);
 time=240000;assert.equal(guard.sample({swapMB:40,pressure:1}),null);
 time=245000;guard.sample({swapMB:0,pressure:1});time=305000;
 assert.equal(guard.sample({swapMB:0,pressure:1}),'resume');
});
