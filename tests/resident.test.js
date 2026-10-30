import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createResident,stepResident,residentRoute} from '../server/resident.js';
import {createPrivateServer} from '../server/private.js';
import {canOccupy} from '../src/movement.js';

test('resident arrives, lands, walks home and continues the same life after serialization',()=>{
  const s=createResident(0);s.obstacles=[];
  for(let i=0;i<2500;i++)stepResident(s,.1,i*100);
  assert.equal(s.arrival.phase,'landed');
  assert.equal(s.welcome.phase,'settled');
  assert.ok(s.events.some(e=>e.message.includes('Reached Casa Aurora')));
  assert.ok(s.visit>=2);
  const restored=JSON.parse(JSON.stringify(s)),before={...restored.player};
  for(let i=0;i<100;i++)stepResident(restored,.1,250000+i*100);
  assert.equal(restored.arrival.phase,'landed');
  assert.ok(restored.visit>=s.visit);
  assert.ok(restored.player.walked>=before.walked);
});
test('walking route detours around a wall and remains on safe ground',()=>{
  const obstacles=[{minX:22,maxX:24,minZ:-90,maxZ:-70}];
  const path=residentRoute({x:28,z:-82},{x:18,z:-82},obstacles);
  assert.ok(path.length>10);
  for(const point of path)assert.ok(canOccupy(point.x,point.z,obstacles,.6));
});
test('server persists progress and refuses corrupt saves rather than restarting',async()=>{
  const dataDir=mkdtempSync(join(tmpdir(),'porto-resident-'));
  let server=createPrivateServer({dataDir});
  server.state.arrival.phase='landed';server.state.player.x=19;server.state.player.z=-83;server.state.visit=4;
  await server.close();
  assert.equal(JSON.parse(readFileSync(join(dataDir,'resident.json'))).visit,4);
  server=createPrivateServer({dataDir});assert.equal(server.state.arrival.phase,'landed');assert.equal(server.state.player.x,19);assert.equal(server.state.visit,4);await server.close();
  writeFileSync(join(dataDir,'resident.json'),'{invalid');
  assert.throws(()=>createPrivateServer({dataDir}));
});

test('navigation fits a narrow doorway on an odd-numbered grid line',()=>{
  const obstacles=[
    {minX:23.35,maxX:23.65,minZ:-88,maxZ:-84.3},
    {minX:23.35,maxX:23.65,minZ:-81.7,maxZ:-78},
    {minX:13.85,maxX:14.15,minZ:-88,maxZ:-78},
    {minX:14,maxX:23.65,minZ:-88.14,maxZ:-87.86},
    {minX:14,maxX:23.65,minZ:-78.14,maxZ:-77.86}
  ];
  const route=residentRoute({x:28,z:-82},{x:19,z:-83},obstacles);
  assert.ok(route.length);
  assert.ok(route.some(p=>p.x===24&&p.z===-83));
  const s=createResident();s.obstacles=obstacles;s.arrival.phase='landed';s.player={...s.player,x:28,z:-82};s.visit=4;
  for(let i=0;i<300;i++)stepResident(s,.1,i*100);
  assert.equal(s.welcome.phase,'settled');
});
