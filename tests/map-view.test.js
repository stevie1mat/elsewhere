import test from 'node:test';
import assert from 'node:assert/strict';
import { mapProjection,panMap,zoomMap } from '../src/map-view.js';
const player={x:47,z:66};
test('zoom follows the rider and reset restores neighborhood framing',()=>{
 const view={zoom:1,center:null};const overview=mapProjection(view,player,356,344);
 assert.equal(overview.ox,152);assert.equal(overview.oz,173);
 zoomMap(view,player,356,344,3);const close=mapProjection(view,player,356,344);
 assert.equal(close.center.x,player.x);assert.equal(close.center.z,player.z);
 zoomMap(view,player,356,344,99);assert.equal(view.zoom,6);
 zoomMap(view,player,356,344,-1);assert.equal(view.zoom,1);
});
test('dragging moves the map and detaches following until recentered',()=>{
 const view={zoom:2,center:null};const before=mapProjection(view,player,900,700);
 panMap(view,player,900,700,80,-40);const after=mapProjection(view,{x:90,z:-20},900,700);
 assert.ok(Math.abs(after.ox-before.ox-80)<1e-8);
 assert.ok(Math.abs(after.oz-before.oz+40)<1e-8);
 view.center=null;assert.equal(mapProjection(view,{x:90,z:-20},900,700).center.x,90);
});
test('wheel zoom keeps the world point beneath the cursor stationary',()=>{
 const view={zoom:1,center:null},anchor={x:210,y:430};
 const a=mapProjection(view,player,1000,800);
 const point={x:(anchor.x-a.ox)/a.scale,z:(anchor.y-a.oz)/a.scale};
 zoomMap(view,player,1000,800,2.7,anchor);
 const b=mapProjection(view,player,1000,800);
 assert.ok(Math.abs(point.x*b.scale+b.ox-anchor.x)<1e-8);
 assert.ok(Math.abs(point.z*b.scale+b.oz-anchor.y)<1e-8);
});
