import test from 'node:test';
import assert from 'node:assert/strict';
import { RiderCombat } from '../src/rider-combat.js';

const player=()=>({x:47,z:66,yaw:0,speed:3,walked:0,mode:'cycling'});
function strike(combat,p,type='kick',side=1){assert.ok(combat.start(type,side,p));let hits=0;for(let i=0;i<30;i++)hits+=Number(combat.update(1/60,p,[]));return hits;}
test('combat hits only in range on the chosen side and only once per swing',()=>{
  const c=new RiderCombat(),p=player();
  c.rivals=[{...c.rivals[0],x:45.6,z:66,speed:0}];
  assert.equal(strike(c,p),1);assert.equal(c.hits,1);assert.equal(p.attack,null);
  const miss=new RiderCombat();miss.rivals=[{...miss.rivals[0],x:48.4,z:66}];
  assert.equal(strike(miss,p),0);
  const far=new RiderCombat();far.rivals=[{...far.rivals[0],x:42,z:66}];assert.equal(strike(far,p),0);
});
test('cooldowns, pauses, dismounts, and reset do not leak attacks',()=>{
  const c=new RiderCombat(),p=player();
  assert.ok(c.start('punch',-1,p));assert.equal(c.start('kick',1,p),false);
  c.update(0,p,[]);assert.equal(c.attack.time,0);
  p.mode='walking';c.update(.05,p,[]);assert.equal(p.attack,null);assert.equal(c.start('kick',1,p),false);
  c.reset();assert.equal(c.cooldown,0);assert.equal(c.hits,0);
  p.mode='cycling';p.speed=0;assert.equal(c.start('punch',1,p),false);
});
test('hit direction follows heading and knockback cannot enter obstacles',()=>{
  const c=new RiderCombat(),p=player();p.yaw=Math.PI;
  c.rivals=[{...c.rivals[0],x:48.4,z:66}];assert.equal(strike(c,p,'punch',1),1);
  const r=c.rivals[0];r.knock=10;r.x=48.4;
  c.update(.05,p,[{minX:49.1,maxX:51,minZ:60,maxZ:70}]);
  assert.equal(r.x,48.4);
});
