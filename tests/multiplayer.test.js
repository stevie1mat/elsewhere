import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { Rooms } from '../server/rooms.js';
import { createCoopServer } from '../server/index.js';
import { QUEST_STOPS } from '../src/quest.js';

const position=stop=>({x:stop.x,z:stop.z,yaw:0,walked:10,speed:0});
test('rooms isolate quests, cap at two riders, and require both riders at the current stop',()=>{
 let now=1000;const rooms=new Rooms(()=>now);
 const a=rooms.join(null,null,{}),b=rooms.join(a.room.code,null,{}),other=rooms.join(null,null,{});
 assert.throws(()=>rooms.join(a.room.code,null,{}),/two riders/);
 assert.equal(rooms.position(a.room,a.player,{...position(QUEST_STOPS[0]),x:NaN}),false);
 assert.equal(rooms.position(a.room,a.player,{...position(QUEST_STOPS[0]),x:100,z:0}),false);
 for(let stage=0;stage<3;stage++){
   const message={stage,stop:QUEST_STOPS[stage].id};
   rooms.position(a.room,a.player,position(QUEST_STOPS[stage]));
   assert.throws(()=>rooms.advance(a.room,a.player,message),/Both riders/);
   rooms.position(a.room,b.player,position(QUEST_STOPS[stage]));
   rooms.advance(a.room,a.player,message);assert.equal(a.room.stage,stage+1);
   assert.throws(()=>rooms.advance(a.room,b.player,message),/already changed/);
 }
 assert.equal(other.room.stage,0);assert.equal(a.room.carrier,null);
 assert.equal(rooms.snapshot(a.room).players.length,2);
 assert.ok(!JSON.stringify(rooms.snapshot(a.room)).includes(a.player.token),'resume tokens stay private');
});
test('reconnect preserves the slot and stage; stale riders cannot complete objectives',()=>{
 let now=0;const rooms=new Rooms(()=>now);const a=rooms.join(null,null,{}),b=rooms.join(a.room.code,null,{});
 rooms.position(a.room,a.player,position(QUEST_STOPS[0]));rooms.position(a.room,b.player,position(QUEST_STOPS[0]));
 now=11000;assert.throws(()=>rooms.advance(a.room,a.player,{stage:0,stop:'cafe'}),/Both riders/);
 rooms.disconnect(a.room,b.player);assert.throws(()=>rooms.join(a.room.code,null,{}),/two riders/);
 assert.throws(()=>rooms.advance(a.room,a.player,{stage:0,stop:'cafe'}),/Wait for your friend/);
 const resumed=rooms.join(a.room.code,b.player.token,{});assert.equal(resumed.player.id,b.player.id);
 assert.throws(()=>rooms.join(a.room.code,b.player.token,{}),/already connected/);
 rooms.disconnect(a.room,b.player);now+=61000;rooms.sweep();assert.equal(a.room.players.size,1);
 const replacement=rooms.join(a.room.code,null,{});assert.notEqual(replacement.player.id,b.player.id);
 rooms.disconnect(a.room,a.player);rooms.disconnect(a.room,replacement.player);now+=16*60000;rooms.sweep();assert.equal(rooms.rooms.size,0);
});
function waitFor(ws,predicate){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',receive);reject(Error('Message timed out'));},2500);function receive(raw){const value=JSON.parse(raw);if(predicate(value)){clearTimeout(timer);ws.off('message',receive);resolve(value);}}ws.on('message',receive);});}
test('two real WebSocket clients share movement and complete the quest together',async t=>{
 const server=createCoopServer();server.http.listen(0,'127.0.0.1');await once(server.http,'listening');t.after(()=>server.close());
 const url=`ws://127.0.0.1:${server.http.address().port}/coop`;
 const a=new WebSocket(url);await once(a,'open');let welcome=waitFor(a,m=>m.type==='welcome');a.send(JSON.stringify({type:'join'}));const aw=await welcome;
 const b=new WebSocket(url);await once(b,'open');welcome=waitFor(b,m=>m.type==='welcome');b.send(JSON.stringify({type:'join',room:aw.room}));await welcome;
 const third=new WebSocket(url);await once(third,'open');const rejected=waitFor(third,m=>m.type==='error');third.send(JSON.stringify({type:'join',room:aw.room}));assert.match((await rejected).message,/two riders/);
 for(let stage=0;stage<3;stage++){
   const moved=waitFor(a,m=>m.type==='state'&&m.players.length===2&&m.players.every(p=>p.x===QUEST_STOPS[stage].x&&p.z===QUEST_STOPS[stage].z));
   a.send(JSON.stringify({type:'position',position:position(QUEST_STOPS[stage])}));b.send(JSON.stringify({type:'position',position:position(QUEST_STOPS[stage])}));await moved;
   const aState=waitFor(a,m=>m.type==='state'&&m.stage===stage+1),bState=waitFor(b,m=>m.type==='state'&&m.stage===stage+1);
   a.send(JSON.stringify({type:'advance',stage,stop:QUEST_STOPS[stage].id}));const [s1,s2]=await Promise.all([aState,bState]);assert.equal(s1.stage,s2.stage);if(stage===0)assert.equal(s1.carrier,aw.id);
 }
 const disconnected=waitFor(b,m=>m.type==='state'&&m.players.length===1);a.close();await disconnected;
 const resumed=new WebSocket(url);await once(resumed,'open');const ready=waitFor(resumed,m=>m.type==='state'&&m.stage===3&&m.players.length===2);resumed.send(JSON.stringify({type:'join',room:aw.room,token:aw.token}));await ready;
});
