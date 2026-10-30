import test from 'node:test';import assert from 'node:assert/strict';import {aiConnectionStatus} from '../src/ai-connection-status.js';
test('connected model with rejected plan is distinct from disconnected AI and pause',()=>{
 const ai={enabled:true,provider:'Mac LM Studio',connected:false,failureKind:'decision',error:'AI plan could not be executed: unsupported benefit',providerHealth:[{provider:'Mac LM Studio',status:'connected'}]};
 assert.equal(aiConnectionStatus(ai).state,'attention');assert.match(aiConnectionStatus(ai).text,/AI connected.*plan rejected/);
 assert.equal(aiConnectionStatus(ai,{offline:true}).state,'offline');assert.equal(aiConnectionStatus(ai,{paused:true}).text,'Paused · AI stopped');
 assert.match(aiConnectionStatus({...ai,failureKind:'provider',error:'Mac worker offline',providerHealth:[]}).text,/AI unavailable/);
 assert.equal(aiConnectionStatus({...ai,connected:true,failureKind:null,error:null}).state,'online');
 assert.match(aiConnectionStatus({...ai,error:'Mac worker waiting for memory to recover.'}).text,/waiting for Mac memory.*automatically/);
});
