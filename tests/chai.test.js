import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createChai,serveChai,stepChai,chaiTarget,CHAI_SPAWN,CHAI_STALL,CHAI_CUSTOMERS} from '../src/chai.js';
import {ChaiWorld} from '../src/chai-world.js';
import {canOccupy} from '../src/movement.js';

test('chai pickup, delivery, repeat orders, and refill require stopping at the right place',()=>{
 const s=createChai();assert.equal(serveChai(s,{x:0,z:0,speed:0}),false);
 assert.equal(serveChai(s,{...CHAI_STALL,speed:2}),false);
 assert.ok(serveChai(s,{...CHAI_STALL,speed:0}));assert.equal(s.phase,'riding');
 assert.equal(serveChai(s,{...CHAI_STALL,speed:0}),false);
 assert.ok(serveChai(s,{...chaiTarget(s),speed:0}));assert.equal(s.delivered,1);assert.ok(s.score>90);
 assert.ok(serveChai(s,{...CHAI_STALL,speed:0}));assert.equal(chaiTarget(s).id,CHAI_CUSTOMERS[1].id);
 s.volume=1;stepChai(s,{speed:0,steering:0,x:0,z:0},.02);assert.equal(s.phase,'failed');
 assert.ok(serveChai(s,{...CHAI_STALL,speed:0}));assert.equal(s.volume,100);
});
test('careful riding preserves tea; sharp turns, braking, potholes, and cooling have consequences',()=>{
 const run=(hz,p)=>{const s=createChai();serveChai(s,{...CHAI_STALL,speed:0});s.lastSpeed=p.speed;for(let i=0;i<hz*12;i++)stepChai(s,p,1/hz);return s;};
 const gentle=run(60,{x:0,z:0,speed:4,steering:0});assert.equal(gentle.volume,100);
 const fast=run(60,{x:0,z:0,speed:10,steering:1});assert.ok(fast.volume<gentle.volume-40);
 const bump=run(60,{x:-20,z:51,speed:6,steering:0});assert.ok(bump.volume<50);
 const higher=run(120,{x:0,z:0,speed:10,steering:1});assert.ok(Math.abs(fast.volume-higher.volume)<1);
 const s=createChai();serveChai(s,{...CHAI_STALL,speed:0});s.lastSpeed=10;stepChai(s,{x:0,z:0,speed:0,steering:0},1/60);assert.ok(s.volume<98);
 s.heat=38.001;stepChai(s,{x:0,z:0,speed:0,steering:0},.05);assert.equal(s.phase,'failed');
});
function layout(render=false){
 const w=Object.create(ChaiWorld.prototype),m=new T.MeshStandardMaterial();
 Object.assign(w,{obstacles:[],treePositions:[],lights:[],birds:[],cameraColliders:[],batches:new Map(),seed:427,scene:new T.Scene(),m:new Proxy({},{get:()=>m})});
 w.sign=()=>{};if(!render){w.box=()=>{};w.cylinder=()=>{};w.mesh=g=>g.dispose();}
 w.ground();w.neighborhood();w.garden();w.details();return w;
}
test('chai stall and customers have connected bicycle approaches and traffic stays clear of buildings',()=>{
 const w=layout(),queue=[[CHAI_SPAWN.x,CHAI_SPAWN.z]],seen=new Set([queue[0].join(',')]);
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;if(!seen.has(key)&&canOccupy(nx,nz,w.obstacles)&&canOccupy(x+dx*.5,z+dz*.5,w.obstacles)){seen.add(key);queue.push([nx,nz]);}}}
 for(const p of [CHAI_STALL,...CHAI_CUSTOMERS])assert.ok(seen.has(`${p.x},${p.z}`),p.name+' is accessible');
 w.traffic=[];w.actor=()=>new T.Group();w.makeTraffic();
 for(const v of w.traffic)for(let i=0;i<200;i++){const p=v.path.getPointAt(i/200);assert.ok(canOccupy(p.x,p.z,w.obstacles,1.8),`traffic at ${p.x.toFixed(1)},${p.z.toFixed(1)} clears buildings`);}
});
test('detailed street and animal geometry bake successfully',()=>{
 const w=layout(true);w.bake();assert.ok(w.cameraColliders.length>0);w.traffic=[];w.animals=[];w.makeTraffic();w.makeAnimals();w.makeCup();
 assert.equal(w.animals.length,4);assert.equal(w.traffic.length,6);assert.equal(w.pigeons.length,9);
 w.walkers=[];w.streetTime=0;w.updateStreet(.016,{...CHAI_SPAWN});assert.equal(w.dynamicObstacles.length,10);
 for(const b of w.dynamicObstacles)assert.ok(Number.isFinite(b.minX)&&b.minX<b.maxX);
});
