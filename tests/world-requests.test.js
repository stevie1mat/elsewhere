import test from 'node:test';
import assert from 'node:assert/strict';
import {recordWorldRequests,validateWorldRequests} from '../server/world-requests.js';
import {createResident} from '../server/resident.js';
import {validateDecision,residentContext} from '../server/groq.js';
const request={name:'Read a book',kind:'ability',reason:'I want a quiet way to learn about the city.',intendedUse:'Read at home and remember interesting facts.',near:'home',priority:'medium'};
test('AI wishlist persists with evidence and notifies the human once per unique request',()=>{
 const s=createResident();recordWorldRequests(s,[request],1000);recordWorldRequests(s,[{...request,name:'READ A BOOK'}],2000);
 assert.equal(s.worldRequests.length,1);assert.equal(s.worldRequests[0].mentions,2);assert.equal(s.messages.length,1);assert.match(s.messages[0].content,/Read a book/);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(restored.worldRequests[0].status,'proposed');assert.equal(residentContext(restored).worldRequests[0].name,'Read a book');
});
test('known abilities and places are not requested as missing; visual absence remains unverified',()=>{
 const s=createResident();recordWorldRequests(s,[{...request,name:'sleep'}],1000);recordWorldRequests(s,[{...request,name:'Casa Aurora',kind:'place'}],1000);assert.equal(s.worldRequests.length,0);
 recordWorldRequests(s,[{...request,name:'Reading chair',kind:'object'}],1000);assert.match(s.worldRequests[0].evidence,/Not confirmed absent/);
});
test('world request output is bounded and validated with the model decision',()=>{
 validateWorldRequests([request]);assert.throws(()=>validateWorldRequests([request,request]));assert.throws(()=>validateWorldRequests([{...request,reason:'a'.repeat(181)}]));
 const d=validateDecision({action:'rest',destination:'here',seconds:60,goal:'Relax',intention:'Rest a moment.',reply:'I have an idea.',assetRequests:[request]});assert.equal(d.assetRequests[0].name,'Read a book');
});
