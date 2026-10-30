import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroqClient,createResidentBrain,validateDecision,GroqError} from '../server/groq.js';
import {createResident,stepResident} from '../server/resident.js';
const decision={action:'visit',destination:'garden',seconds:45,goal:'Explore a quiet place.',intention:'I want to see the garden.',reply:'I am heading to the garden for a walk.'};
const ready=()=>{const s=createResident(0);s.obstacles=[];s.arrival.phase='landed';return s;};
test('Groq request stays server-side, requests structured output, and rejects invalid actions',async()=>{
 let request;
 const client=createGroqClient({apiKey:'test-secret',fetchImpl:async(url,options)=>{request={url,...options};return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(decision)}}]})};}});
 assert.deepEqual(await client.complete({},'Decide'),decision);
 assert.equal(request.url,'https://api.groq.com/openai/v1/chat/completions');
 assert.equal(request.headers.Authorization,'Bearer test-secret');
 const body=JSON.parse(request.body);assert.equal(body.response_format.json_schema.strict,true);
 assert.throws(()=>validateDecision({...decision,destination:'invented-place'}));
 assert.throws(()=>validateDecision({...decision,action:'execute_code'}));
 assert.throws(()=>validateDecision({...decision,seconds:1000000}));
});
test('an AI choice drives the actual character instead of the fixed visit schedule',async()=>{
 const s=ready();let calls=0;const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>{calls++;return decision;}},now:()=>1000});brain.initialize(s);
 stepResident(s,.1,1000);assert.equal(s.route.length,0,'wait for a model choice rather than choose a scripted destination');
 await brain.update(s);stepResident(s,.1,1100);
 assert.equal(s.destination,'Jardim do Sol');assert.match(s.thought,/walking to Jardim do Sol/);assert.ok(s.route.length);assert.ok(s.player.moving);
 await brain.update(s);assert.equal(calls,1,'do not request another plan while walking');brain.stop();
});
test('rest decisions and chat are saved without chat replies executing actions',async()=>{
 let time=1000;const s=ready();const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>({...decision,action:'rest',destination:'here',seconds:30})},now:()=>time});brain.initialize(s);
 await brain.update(s);stepResident(s,.1,time);assert.equal(s.rest,60);assert.equal(s.route.length,0);
 time+=6000;assert.equal(await brain.chat(s,'What are you planning?'),decision.reply);
 assert.equal(s.messages.at(-2).role,'user');assert.equal(s.rest,60);assert.equal(s.pendingDecision,undefined);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(restored.messages.at(-1).content,decision.reply);brain.stop();
});
test('usage limits back off, prevent overlapping requests and never reveal provider response bodies',async()=>{
 const client=createGroqClient({apiKey:'test-secret',fetchImpl:async()=>({ok:false,status:429,headers:new Headers({'retry-after':'120'}),text:async()=>{throw Error('must not read raw provider error');}})});
 await assert.rejects(client.complete({},'test'),e=>e.retryMs===120000&&!e.message.includes('test-secret'));
 let time=1000,calls=0;const s=ready();const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>{calls++;throw new GroqError('Usage limit',{status:429,retryMs:120000});}},now:()=>time});brain.initialize(s);
 await brain.update(s);await brain.update(s);time+=119000;await brain.update(s);assert.equal(calls,1);time+=2000;await brain.update(s);assert.equal(calls,2);assert.equal(s.ai.status,'paused');brain.stop();
});
test('stopping the brain discards pending decisions and prevents future requests',async()=>{
 let resolve;const s=ready();const brain=createResidentBrain({client:{configured:true,model:'test',complete:()=>new Promise(r=>{resolve=r;})},now:()=>1000});brain.initialize(s);
 const pending=brain.update(s);brain.stop();resolve(decision);await pending;assert.equal(s.pendingDecision,undefined);assert.equal(s.events.length,0);
});
test('accepting a beach request replaces the home route and starts real coastal navigation',async()=>{
 const s=ready();s.player.x=21;s.player.z=-83;s.destination='Casa Aurora';s.route=[{x:20,z:-83}];s.rest=45;
 const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>({...decision,changePlan:true,destination:'coast',intention:'I am heading to the coast.',reply:"Let's head to the beach!"})},now:()=>1000});brain.initialize(s);
 assert.match(await brain.chat(s,'Can we go to the beach?'),/Costa Dourada/);
 assert.equal(s.destination,'Costa Dourada');assert.equal(s.rest,0);assert.ok(s.route.length>10);assert.match(s.thought,/Costa Dourada/);
 const before=s.player.z;stepResident(s,.1,1100);assert.ok(s.player.moving);assert.notEqual(s.player.z,before);brain.stop();
});
test('a chat question keeps the current route and a rejected route never promises movement',async()=>{
 const s=ready();const route=[{x:47,z:65}];s.route=route;
 let time=1000;let choice={...decision,changePlan:false};const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>choice},now:()=>time});brain.initialize(s);
 await brain.chat(s,'What are you doing?');assert.equal(s.route,route);
 time+=6000;choice={...decision,changePlan:true};s.obstacles=[{minX:40,maxX:55,minZ:60,maxZ:75}];
 const reply=await brain.chat(s,'Can we go to the garden?');assert.match(reply,/No safe route/);assert.equal(s.route,route);brain.stop();
});
test('chat waits out the normal cooldown and has priority over autonomous planning',async()=>{
 let time=0,calls=0;const s=ready();let brain;
 brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>{calls++;return {...decision,changePlan:false};}},now:()=>time,sleep:async ms=>{time+=ms;await brain.update(s);}});brain.initialize(s);
 await brain.chat(s,'hello');const reply=await brain.chat(s,'What are you doing?');
 assert.equal(reply,decision.reply);assert.equal(calls,2);assert.ok(time>=5000);assert.equal(s.messages.length,4);brain.stop();
});
test('long provider backoff reports actual retry time instead of a five-second error',async()=>{
 const s=ready();const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>{throw new GroqError('Provider limit',{retryMs:120000});}},now:()=>1000,sleep:async()=>{throw Error('must not hold a request for two minutes');}});brain.initialize(s);
 await assert.rejects(brain.chat(s,'hello'),/Provider limit/);
 await assert.rejects(brain.chat(s,'hello'),e=>e.status===429&&e.retryMs===120000&&/120 seconds/.test(e.message));brain.stop();
});
test('manual pause freezes actions and AI calls, and resume preserves the saved activity',async()=>{
 const s=ready();let calls=0;const brain=createResidentBrain({client:{configured:true,provider:'Groq',model:'test',complete:async()=>{calls++;return decision;}},now:()=>1000});brain.initialize(s);
 s.route=[{x:47,z:65}];s.rest=25;brain.setPaused(s,true);
 const before=JSON.stringify({route:s.route,rest:s.rest,events:s.events,needs:s.needs});
 for(let i=0;i<50;i++){await brain.update(s);stepResident(s,.1,1000+i*100);}
 assert.equal(calls,0);assert.equal(JSON.stringify({route:s.route,rest:s.rest,events:s.events,needs:s.needs}),before);
 await assert.rejects(brain.chat(s,'hello'),/Game paused/);
 assert.equal(JSON.parse(JSON.stringify(s)).paused,true);
 brain.setPaused(s,false);await brain.update(s);assert.equal(calls,1);assert.equal(s.rest,25);assert.equal(s.route.length,1);assert.equal(s.ai.connected,true);brain.stop();
});
test('pausing discards a late in-flight model decision without creating memories',async()=>{
 let resolve;const s=ready();const brain=createResidentBrain({client:{configured:true,model:'test',complete:()=>new Promise(r=>{resolve=r;})},now:()=>1000});brain.initialize(s);
 const pending=brain.update(s);brain.setPaused(s,true);resolve(decision);await pending;
 assert.equal(s.pendingDecision,undefined);assert.equal(s.events.length,0);assert.equal(s.ai.connected,false);assert.equal(s.ai.status,'manually_paused');brain.stop();
});
test('duration bounds reach the provider schema and rejection names the exact violated constraint',async()=>{
 let body;const invalid={...decision,seconds:9};const client=createGroqClient({apiKey:'test',fetchImpl:async(url,o)=>{body=JSON.parse(o.body);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(invalid)}}]});}});
 await assert.rejects(client.complete({},'Reconnect'),/seconds must be an integer from 15 to 180/);
 const properties=body.response_format.json_schema.schema.properties;assert.equal(properties.seconds.minimum,15);assert.equal(properties.seconds.maximum,180);assert.equal(properties.nextSteps.items.properties.seconds.minimum,15);
});
test('a complete failed_generation decision is validated locally without another paid request',async()=>{
 let calls=0;const client=createGroqClient({apiKey:'secret',fetchImpl:async()=>{calls++;return Response.json({error:{code:'json_validate_failed',failed_generation:JSON.stringify(decision)}},{status:400});}});
 assert.deepEqual(await client.complete({},'Decide'),decision);assert.equal(calls,1);assert.equal(client.attempts[0].status,'recovered');assert.ok(!JSON.stringify(client.attempts).includes('failed_generation'));
});
test('invalid failed_generation gets only one JSON-mode retry and all attempts remain counted',async()=>{
 const bodies=[];const client=createGroqClient({apiKey:'secret',fetchImpl:async(u,o)=>{bodies.push(JSON.parse(o.body));return bodies.length===1?Response.json({error:{code:'json_validate_failed',failed_generation:'incomplete and invalid'}},{status:400}):Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(decision)}}]});}});
 assert.deepEqual(await client.complete({},'Decide'),decision);assert.equal(bodies.length,2);assert.equal(bodies[0].response_format.type,'json_schema');assert.equal(bodies[1].response_format.type,'json_object');assert.equal(client.attempts.length,2);
});
test('JSON recovery never retries a rate limit or executes partial/invalid output',async()=>{
 let calls=0;const rate=createGroqClient({apiKey:'secret',fetchImpl:async()=>{calls++;return Response.json({error:{code:'rate_limit_exceeded'}},{status:429,headers:{'retry-after':'90'}});}});
 await assert.rejects(rate.complete({},'Decide'),e=>e.status===429&&e.retryMs===90000);assert.equal(calls,1);
 calls=0;const invalid=createGroqClient({apiKey:'secret',fetchImpl:async()=>{calls++;return Response.json({error:{code:'json_validate_failed',failed_generation:JSON.stringify({...decision,action:'execute_code'})}},{status:400});}});
 await assert.rejects(invalid.complete({},'Decide'),/JSON recovery/);assert.equal(calls,2);
});
