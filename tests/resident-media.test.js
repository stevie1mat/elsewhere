import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaService,beginPhone} from '../server/resident-media.js';
import {createResident,applyResidentDecision,stepResident} from '../server/resident.js';
import {validateDecision} from '../server/groq.js';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Explorer} from '../src/explorer.js';
const person=()=>{const s=createResident();s.obstacles=[];s.arrival.phase='landed';s.ai={connected:true,enabled:true};return s;};
const d={action:'phone',mediaQuery:'piano improvisation',destination:'cafe',seconds:120,intention:'I want to explore piano music',goal:'Explore music',reply:'I will search for piano music.'};
const video={type:'video',videoId:'abcdefghijk',title:'Piano',author:'Artist'};
test('phone query is model authored and validated; use produces no invented listening or energy benefit',()=>{
 const s=person();assert.equal(validateDecision(d).mediaQuery,d.mediaQuery);assert.throws(()=>validateDecision({...d,mediaQuery:''}));assert.equal(applyResidentDecision(s,d,1).started,true);assert.equal(s.player.phone,true);assert.equal(s.media.playback,'not_started');const energy=s.needs.energy;stepResident(s,1,2);assert.ok(s.needs.energy<energy);assert.equal(s.worldRequests,undefined);
 s.paused=true;const before=JSON.stringify(s);stepResident(s,1,3);assert.equal(JSON.stringify(s),before);
});
test('search fails over on rejected API and caches valid video-only results',async()=>{
 const s=person();applyResidentDecision(s,d,1);let calls=0;
 const service=createMediaService({instances:['https://first.example','https://second.example'],fetchImpl:async()=>{calls++;return calls===1?new Response('',{status:403}):Response.json([video,{type:'channel',videoId:'bad'}]);}});
 await service.update(s);assert.equal(s.media.status,'ready');assert.equal(s.media.instance,'https://second.example');assert.equal(s.media.results.length,1);assert.equal(s.media.playback,'not_started');assert.equal(calls,2);
 beginPhone(s,d,2);await service.update(s);assert.equal(s.media.cached,true);assert.equal(calls,2);assert.equal(s.mediaHistory.length,1);assert.equal(JSON.parse(JSON.stringify(s)).media.query,d.mediaQuery);
});
test('paused or disconnected resident never searches; late search does not mutate paused state',async()=>{
 const s=person();applyResidentDecision(s,d,1);let calls=0,resolve;
 const service=createMediaService({instances:['https://first.example'],fetchImpl:()=>{calls++;return new Promise(r=>resolve=r);}});
 s.paused=true;await service.update(s);assert.equal(calls,0);s.paused=false;s.ai.connected=false;await service.update(s);assert.equal(calls,0);s.ai.connected=true;
 const pending=service.update(s);s.paused=true;const before=JSON.stringify(s);resolve(Response.json([video]));await pending;assert.equal(JSON.stringify(s),before);
});
test('all failed instances produce visible failure without fake videos or endless polling',async()=>{
 const s=person();applyResidentDecision(s,d,1);let calls=0;const service=createMediaService({instances:['https://first.example'],fetchImpl:async()=>{calls++;throw Error('secret arbitrary network error');}});
 await service.update(s);await service.update(s);assert.equal(calls,1);assert.equal(s.media.status,'unavailable');assert.equal(s.media.selected,undefined);assert.ok(!JSON.stringify(s.media).includes('secret'));
});
test('real character holds a human-scale phone; pose and prop disappear when phone action stops',async()=>{
 const data=await readFile(new URL('../public/assets/people/traveler-man.glb',import.meta.url));const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');const e=new Explorer(gltf.scene,gltf.animations[0]);const s=person();applyResidentDecision(s,d,1);e.update(s.player,0);assert.equal(e.phone.visible,true);
 const size=new T.Box3().setFromObject(e.phone).getSize(new T.Vector3());assert.ok(size.length()>.1&&size.length()<.3);const hand=e.walker.getObjectByName('Bip01_R_Hand').getWorldPosition(new T.Vector3());assert.ok(e.phone.getWorldPosition(new T.Vector3()).distanceTo(hand)<.1);
 applyResidentDecision(s,{action:'observe',destination:'cafe',seconds:15,intention:'Observe'},2);e.update(s.player,0);assert.equal(e.phone.visible,false);
});
