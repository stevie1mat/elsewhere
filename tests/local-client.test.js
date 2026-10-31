import test from 'node:test';import assert from 'node:assert/strict';import {createLocalClient} from '../server/local-client.js';
const d={action:'phone',destination:'',mediaQuery:'calm music',seconds:120,goal:'Explore music',intention:'Search my phone',reply:'I will search',changePlan:true};
test('local client uses loopback, shared JSON contract and public-response telemetry only',async()=>{
 let request;const c=createLocalClient({fetchImpl:async(u,o)=>{request={u,body:JSON.parse(o.body)};return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(d),reasoning_content:'private reasoning'}}],usage:{prompt_tokens:100,completion_tokens:40,total_tokens:140}});}});
 const result=await c.complete({needs:{energy:71}},'Use phone');assert.equal(result.destination,'here');assert.equal(request.u,'http://127.0.0.1:1234/v1/completions');assert.equal(request.body.response_format.json_schema.strict,true);assert.equal(c.lastAttempt.provider,'Mac LM Studio');assert.equal(c.lastAttempt.usage.total,140);assert.ok(!JSON.stringify(c.lastAttempt).includes('private reasoning'));assert.equal(request.body.stream,false);
 assert.equal(request.body.max_tokens,512);assert.equal(request.body.response_format.json_schema.schema.properties.nextSteps.maxItems,1);
 assert.equal(request.body.response_format.json_schema.schema.properties.reply.maxLength,240);
});
test('local client rejects public endpoints, malformed output and incomplete output',async()=>{
 assert.throws(()=>createLocalClient({url:'http://0.0.0.0:1234/v1'}),/loopback/);assert.throws(()=>createLocalClient({url:'https://public.example/v1'}),/loopback/);
 const c=createLocalClient({fetchImpl:async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]})});await assert.rejects(c.complete({},'Choose'),/did not finish/);
});
test('explicit human seat task constrains execution fields while autonomous choices remain open',async()=>{
 const calls=[];const c=createLocalClient({fetchImpl:async(u,o)=>{calls.push(JSON.parse(o.body));return Response.json({choices:[{finish_reason:'stop',text:JSON.stringify(d)}]});}});
 const context={perception:{objects:[{id:'bench-a',affordances:['sit']},{id:'bench-b',affordances:['sit']}]}};await c.complete(context,'Please sit and raise energy by at least 10 points. Execute it now.');
 const schema=calls[0].response_format.json_schema.schema;assert.deepEqual(schema.properties.action.enum,['interact']);assert.deepEqual(schema.properties.objectId.enum,['bench-a','bench-b']);assert.deepEqual(schema.properties.objective.properties.amount.enum,[10]);
 await c.complete(context,'Choose your next autonomous activity.');assert.ok(calls[1].response_format.json_schema.schema.properties.action.enum.includes('phone'));assert.ok(calls[1].response_format.json_schema.schema.properties.action.enum.includes('work'));
});
test('training sends a small task schema and retains correction evidence in the actual local prompt',async()=>{
 let request;const c=createLocalClient({fetchImpl:async(u,o)=>{request=JSON.parse(o.body);return Response.json({choices:[{finish_reason:'stop',text:JSON.stringify({task:'eat',target:'',reply:'I will collect the meal and eat seated.'})}]});}});
 const result=await c.complete({trainingLab:true,capabilities:['eat','dismount','scan','stop'],executionFeedback:[{message:'The previous visit did not eat.'}],trainingCommands:{eat:{parameters:{value:'seated'}}}},'Have a meal.');
 assert.deepEqual(request.response_format.json_schema.schema.properties.task.enum,['dismount','walk','purchase_meal','collect_meal','sit','eat','inspect','stop']);assert.match(request.prompt,/previous visit did not eat/);assert.match(request.prompt,/trainingCommands/);assert.equal(result.action,'eat');assert.equal(result.parameters.value,'eat');assert.equal(result.changePlan,true);assert.equal(result.objective.metric,'none');assert.equal(result.plannerTask,'eat');
});
