import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {groundElevation,shorelineX,createPlayer,stepPlayer,onLand,URBAN_BOUNDS} from '../src/movement.js';
import {createArrival,arrivalPose,dropArrival,stepArrival} from '../src/arrival.js';
import {Rooms} from '../server/rooms.js';
import {terrainPatch,curvedHarbor} from '../src/landscape-builders.js';
import {RoadPickups} from '../src/road-pickups.js';

test('hill walking and cycling follow the rendered slope at different frame rates',()=>{
  for(const mode of ['walking','cycling'])for(const hz of [30,60,120]){
    const p={...createPlayer(),mode,x:-285,z:-158,y:groundElevation(-285,-158),yaw:-Math.PI/2};
    for(let i=0;i<hz*8;i++)stepPlayer(p,{forward:1},1/hz,[]);
    assert.ok(p.x< -300);assert.ok(p.y>groundElevation(-285,-158));
    assert.ok(Math.abs(p.y-groundElevation(p.x,p.z))<.001);assert.ok(p.grounded);
    p.yaw=Math.PI/2;
    for(let i=0;i<hz*8;i++)stepPlayer(p,{forward:1},1/hz,[]);
    assert.ok(Math.abs(p.y-groundElevation(p.x,p.z))<.001);
  }
});
test('jumping on a hillside lands at terrain height and remains valid in co-op',()=>{
  const rooms=new Rooms(),{room,player}=rooms.join(null,null,{});
  const p={...createPlayer(),mode:'walking',x:-410,z:-158,y:groundElevation(-410,-158)};
  const start=p.y;let apex=start;
  for(let i=0;i<180;i++){stepPlayer(p,{jump:i===0},1/60,[]);apex=Math.max(apex,p.y);assert.ok(rooms.position(room,player,p));}
  assert.ok(apex-start>1.36);assert.equal(p.y,start);assert.ok(player.position.grounded);
  assert.equal(rooms.position(room,player,{...p,y:start+8}),false);
});
test('balloon and parachute stay above and land on elevated terrain',()=>{
  const p={...createPlayer(),x:-410,z:-158,mode:'walking'},a=createArrival(p);
  a.elapsed=10;a.pilot={x:p.x,z:p.z};
  assert.ok(arrivalPose(a,p).y>groundElevation(p.x,p.z)+40);
  assert.ok(dropArrival(a,p,(x,z)=>onLand(x,z)));
  for(let i=0;i<240;i++)stepArrival(a,.05,{player:p,canLand:(x,z)=>onLand(x,z)});
  assert.equal(a.phase,'landed');assert.equal(p.y,groundElevation(p.x,p.z));assert.ok(p.grounded);
});
test('curved shore and rendered terrain agree with shared movement rules',()=>{
  assert.equal(shorelineX(-36),64);assert.ok(shorelineX(200)>90);
  assert.ok(onLand(shorelineX(200)-2,200));assert.ok(!onLand(shorelineX(200)+2,200));
  assert.ok(!onLand(80,100,.35,URBAN_BOUNDS));
  let geometry;
  terrainPatch({mesh(g){geometry=g;}},100,20,-350,-158,.055,{});
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-groundElevation(p.getX(i)-350,p.getZ(i)-158)-.055)<.00001);
  geometry.dispose();
});
test('new harbor top faces upward and all generated geometry is finite',()=>{
  const geometries=[];
  const w={m:{pavement:{},cream:{},trim:{}},mesh(g){geometries.push(g);},box(){},obstacle(){},lamp(){},bench(){},palm(){},table(){},umbrella(){},planter(){},mat(){return {};}};
  curvedHarbor(w);
  const top=geometries[0],normals=top.attributes.normal;
  for(let i=0;i<normals.count;i++)assert.ok(normals.getY(i)>=0);
  for(const g of geometries){g.computeBoundingBox();assert.ok(Number.isFinite(g.boundingBox.min.x));g.dispose();}
});
test('hillside collectibles use height relative to the ground',()=>{
  const s=new RoadPickups([],()=>.5),p={...createPlayer(),x:-410,z:-158,y:groundElevation(-410,-158)};
  s.items=[{x:p.x,z:p.z,type:'coin',cooldown:0}];
  assert.equal(s.update(.05,p).length,1);
  s.items[0].cooldown=0;p.y+=3;assert.equal(s.update(.05,p).length,0);
});
