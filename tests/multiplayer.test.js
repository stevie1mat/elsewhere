import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { Rooms,PUBLIC_ROOM } from '../server/rooms.js';
import { createCoopServer } from '../server/index.js';
import { QUEST_STOPS } from '../src/quest.js';

const position=stop=>({x:stop.x,z:stop.z,yaw:0,walked:10,speed:0});
test('every rider joins one public room and any nearby rider can advance its quest',()=>{
 let now=1000;const rooms=new Rooms(()=>now);
 const a=rooms.join(null,null,{}),b=rooms.join('aaaaaaaaaaaaaaaa',null,{}),other=rooms.join(null,null,{});
 assert.equal(a.room,b.room);assert.equal(b.room,other.room);assert.equal(a.room.code,PUBLIC_ROOM);
 assert.equal(a.isNew,true);assert.deepEqual(rooms.snapshot(a.room).players[0].arrival,{phase:'balloon',elapsed:0});
 assert.equal(rooms.position(a.room,a.player,{...position(QUEST_STOPS[0]),x:NaN}),false);
 assert.equal(rooms.position(a.room,a.player,{...position(QUEST_STOPS[0]),x:100,z:0}),false);
 assert.equal(rooms.position(a.room,a.player,{...position(QUEST_STOPS[0]),mode:'walking',bike:null}),true);
 assert.equal(rooms.snapshot(a.room).players.find(p=>p.id===a.player.id).mode,'walking');
 assert.equal(rooms.snapshot(a.room).players.find(p=>p.id===a.player.id).bike,null);
 assert.equal(rooms.position(a.room,a.player,{...position(QUEST_STOPS[0]),mode:'walking',y:1.2,vy:2}),true);
 const jumping=rooms.snapshot(a.room).players.find(p=>p.id===a.player.id);
 assert.equal(jumping.y,1.2);assert.equal(jumping.vy,2);assert.equal(jumping.grounded,false);
 assert.equal(rooms.position(a.room,a.player,{...position(QUEST_STOPS[0]),y:NaN}),false);
 assert.equal(rooms.position(a.room,a.player,{...position(QUEST_STOPS[0]),vy:Infinity}),false);
 assert.equal(rooms.position(a.room,a.player,{...position(QUEST_STOPS[0]),x:-410,z:-330}),true);
 assert.equal(rooms.snapshot(a.room).players.find(p=>p.id===a.player.id).x,-410);
 for(let stage=0;stage<3;stage++){
   const message={stage,stop:QUEST_STOPS[stage].id};
   rooms.position(a.room,a.player,position(QUEST_STOPS[stage]));
   rooms.advance(a.room,a.player,message);assert.equal(a.room.stage,stage+1);
   assert.throws(()=>rooms.advance(a.room,b.player,message),/already changed/);
 }
 assert.equal(other.room.stage,3);assert.equal(a.room.carrier,null);
 assert.equal(rooms.snapshot(a.room).players.length,3);
 assert.ok(!JSON.stringify(rooms.snapshot(a.room)).includes(a.player.token),'resume tokens stay private');
});
test('reconnect preserves the slot and stale riders are eventually removed',()=>{
 let now=0;const rooms=new Rooms(()=>now);const a=rooms.join(null,null,{}),b=rooms.join(a.room.code,null,{});
 rooms.position(a.room,a.player,position(QUEST_STOPS[0]));rooms.position(a.room,b.player,position(QUEST_STOPS[0]));
 now=11000;assert.throws(()=>rooms.advance(a.room,a.player,{stage:0,stop:'cafe'}),/gold marker/);
 rooms.disconnect(a.room,b.player);
 const resumed=rooms.join(a.room.code,b.player.token,{});assert.equal(resumed.player.id,b.player.id);assert.equal(resumed.isNew,false);assert.deepEqual(rooms.snapshot(a.room).players.find(p=>p.id===b.player.id).arrival,{phase:'balloon',elapsed:0});
 assert.throws(()=>rooms.join(a.room.code,b.player.token,{}),/already connected/);
 rooms.disconnect(a.room,b.player);now+=61000;rooms.sweep();assert.equal(a.room.players.size,1);
 const replacement=rooms.join(a.room.code,null,{});assert.notEqual(replacement.player.id,b.player.id);
 rooms.disconnect(a.room,a.player);rooms.disconnect(a.room,replacement.player);now+=16*60000;rooms.sweep();assert.equal(rooms.rooms.size,1);assert.equal(rooms.rooms.get(PUBLIC_ROOM),a.room);
});
function waitFor(ws,predicate){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',receive);reject(Error('Message timed out'));},2500);function receive(raw){const value=JSON.parse(raw);if(predicate(value)){clearTimeout(timer);ws.off('message',receive);resolve(value);}}ws.on('message',receive);});}
test('multiple real WebSocket clients share one room, movement, and quest progress',async t=>{
 const server=createCoopServer();server.http.listen(0,'127.0.0.1');await once(server.http,'listening');t.after(()=>server.close());
 const url=`ws://127.0.0.1:${server.http.address().port}/coop`;
 const a=new WebSocket(url);await once(a,'open');let welcome=waitFor(a,m=>m.type==='welcome');a.send(JSON.stringify({type:'join'}));const aw=await welcome;
 const b=new WebSocket(url);await once(b,'open');welcome=waitFor(b,m=>m.type==='welcome');b.send(JSON.stringify({type:'join',room:aw.room}));await welcome;
 assert.equal(aw.arrival,true);
 const flightSeen=waitFor(b,m=>m.type==='state'&&m.players.find(p=>p.id===aw.id)?.arrival?.phase==='parachute');
 const flight={phase:'parachute',elapsed:1,pilot:{x:47,z:40},steering:.3,heading:.6,vx:2,vz:-3,turnRate:.1,from:{x:47,y:42,z:40},landing:{x:48,z:40}};
 a.send(JSON.stringify({type:'position',position:{...aw.position,x:48,z:40,arrival:flight}}));const observed=await flightSeen;assert.deepEqual(observed.players.find(p=>p.id===aw.id).arrival,flight);
 const third=new WebSocket(url);await once(third,'open');welcome=waitFor(third,m=>m.type==='welcome');third.send(JSON.stringify({type:'join'}));const thirdWelcome=await welcome;assert.equal(thirdWelcome.room,aw.room);assert.equal(thirdWelcome.arrival,true);
 for(let stage=0;stage<3;stage++){
   const moved=waitFor(a,m=>m.type==='state'&&m.players.find(p=>p.id===aw.id)?.x===QUEST_STOPS[stage].x);
   a.send(JSON.stringify({type:'position',position:position(QUEST_STOPS[stage])}));await moved;
   const aState=waitFor(a,m=>m.type==='state'&&m.stage===stage+1),bState=waitFor(b,m=>m.type==='state'&&m.stage===stage+1);
   a.send(JSON.stringify({type:'advance',stage,stop:QUEST_STOPS[stage].id}));const [s1,s2]=await Promise.all([aState,bState]);assert.equal(s1.stage,s2.stage);if(stage===0)assert.equal(s1.carrier,aw.id);
 }
 const disconnected=waitFor(b,m=>m.type==='state'&&m.players.length===2);a.close();await disconnected;
 const resumed=new WebSocket(url);await once(resumed,'open');const ready=waitFor(resumed,m=>m.type==='state'&&m.stage===3&&m.players.length===3);resumed.send(JSON.stringify({type:'join',token:aw.token}));await ready;third.close();
});
