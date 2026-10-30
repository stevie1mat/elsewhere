import test from 'node:test';
import assert from 'node:assert/strict';
import {trackedProviderFetch,recordTelemetry} from '../server/ai-telemetry.js';
test('records actual reported usage, context and public answer, excluding headers and reasoning',async()=>{
 const tracker=trackedProviderFetch(async()=>new Response(JSON.stringify({usage:{prompt_tokens:120,completion_tokens:30,total_tokens:150},choices:[{finish_reason:'stop',message:{content:'{"action":"rest"}',reasoning:'private trace'}}]}),{status:200}),'Groq','test',['secret-value']);
 await tracker.fetch('https://provider.example',{headers:{Authorization:'Bearer secret-value'},body:JSON.stringify({model:'test',messages:[{role:'user',content:'hello'}]})});
 assert.deepEqual(tracker.latest.usage,{input:120,output:30,total:150});assert.equal(tracker.latest.sent.messages[0].content,'hello');
 assert.ok(!JSON.stringify(tracker.latest).includes('secret-value'));assert.ok(!JSON.stringify(tracker.latest).includes('private trace'));
 const ai={};recordTelemetry(ai,{lastAttempt:tracker.latest});assert.equal(ai.telemetry.total,150);assert.equal(ai.telemetry.requests,1);
 const restored=JSON.parse(JSON.stringify(ai));recordTelemetry(restored,{lastAttempt:tracker.latest});assert.equal(restored.telemetry.total,300);assert.equal(restored.telemetry.requests,2);
});
test('records provider errors without exposing keys and does not invent missing token usage',async()=>{
 const tracker=trackedProviderFetch(async()=>new Response(JSON.stringify({error:{message:'Quota exceeded for secret-value'}}),{status:429}),'Mistral','test',['secret-value']);
 await tracker.fetch('https://provider.example',{body:'{}'});assert.equal(tracker.latest.httpStatus,429);assert.match(tracker.latest.error,/Quota exceeded/);assert.ok(!tracker.latest.error.includes('secret-value'));assert.equal(tracker.latest.usage,null);
 const ai={};recordTelemetry(ai,{lastAttempt:tracker.latest});assert.equal(ai.telemetry.usageReported,0);assert.equal(ai.telemetry.total,0);assert.equal(ai.telemetry.requests,1);
});
