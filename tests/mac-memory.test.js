import test from 'node:test';import assert from 'node:assert/strict';
import {parseSwapMB,memoryIssue} from '../scripts/mac-memory.js';
test('memory guard reads macOS units and stops on rising swap or memory pressure',()=>{
 assert.equal(parseSwapMB('total = 2.00G used = 1.50G free = 512M'),1536);
 assert.throws(()=>parseSwapMB('unavailable'));
 const baseline={swapMB:0,pressure:1};
 assert.equal(memoryIssue({swapMB:0,pressure:1},baseline),null);
 assert.match(memoryIssue({swapMB:33,pressure:1},baseline),/swap/);
 assert.match(memoryIssue({swapMB:0,pressure:2},baseline),/pressure/);
});
