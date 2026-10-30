import test from 'node:test';
import assert from 'node:assert/strict';
import {createResident,applyResidentDecision,stepResident,residentRoute} from '../server/resident.js';
import {createResidentBrain} from '../server/groq.js';
import {validateDecision} from '../server/decision-contract.js';
import {ensureMind} from '../server/resident-mind.js';
import {SERVICES,commandContext} from '../server/resident-commands.js';
import {parseHumanCommand} from '../server/human-command.js';
import {restoreLife,lifeStep} from '../server/shared/settling-story.js';
import {activeStop} from '../server/shared/quest.js';
import {installObjective} from '../server/task-verification.js';
import {skywayPose,SKYWAY_LENGTH} from '../server/shared/skyway-path.js';
import * as T from 'three';
import {SKYWAY_POINTS} from '../server/shared/skyway.js';
const ready=()=>{const s=createResident(0);s.arrival.phase='landed';s.obstacles=[];s.objects=SERVICES.map(o=>({...o}));s.ai={enabled:true,connected:true};Object.assign(s.player,{x:30,z:-14});ensureMind(s);return s;};
const command=(action,extra={})=>({action,destination:'here',seconds:15,goal:action,intention:action,reply:'Executing',changePlan:true,...extra});
const act=(s,action,extra={},now=1000)=>applyResidentDecision(s,command(action,extra),now);
const advance=(s,seconds)=>{for(let i=0;i<seconds*20;i++)stepResident(s,.05,2000+i*50);};
const point=(x,z)=>({objectId:'point',parameters:{x,z}});

test('dismount preserves the bicycle and remount navigates back after save/restore',()=>{
 let s=ready();s.player.mode='cycling';assert.equal(act(s,'dismount').started,true);assert.equal(s.player.mode,'walking');assert.ok(s.player.bike);
 s.player.x+=8;s=JSON.parse(JSON.stringify(s));assert.equal(act(s,'mount_bicycle').started,true);assert.ok(s.route.length);advance(s,15);
 assert.equal(s.player.mode,'cycling');assert.equal(s.player.bike,null);assert.equal(s.lastCommand.action,'mount_bicycle');assert.equal(s.commandTask.status,'achieved');
});
test('furniture use automatically dismounts and parks rather than sitting on an invisible bicycle',()=>{
 const s=ready();s.player.mode='cycling';s.objects.push({id:'seat',type:'bench',name:'Bench',x:35,y:.6,z:-14,yaw:0,approach:{x:35,z:-15},affordances:['sit']});
 assert.equal(act(s,'interact',{objectId:'seat',verb:'sit'}).started,true);advance(s,8);
 assert.equal(s.player.mode,'walking');assert.ok(s.player.bike);assert.equal(s.player.interactionPose.kind,'sit');
 act(s,'stand_up');assert.equal(s.player.interactionPose,undefined);assert.equal(s.route.length,0);assert.equal(s.rest,0);
});
test('stop cancels route, reward timers, queued actions and remains stopped until a human instruction',async()=>{
 const s=ready();s.activity={kind:'work'};s.rest=30;s.route=[{x:35,z:-14}];s.pendingDecision=command('visit',{destination:'coast'});s.script={status:'running'};
 const wallet=s.wallet;act(s,'stop');assert.equal(s.awaitingInstruction,true);assert.equal(s.script.status,'cancelled');assert.equal(s.pendingDecision,undefined);
 advance(s,40);assert.equal(s.wallet,wallet);assert.equal(s.player.x,30);assert.equal(s.route.length,0);
 let calls=0;const brain=createResidentBrain({client:{configured:true,complete:async()=>{calls++;throw Error();}}});brain.initialize(s);await brain.update(s);assert.equal(calls,0);brain.stop();
});
test('run and accelerated bicycle navigation move at appropriate speeds and collision bounds',()=>{
 const run=ready();act(run,'run',point(30,-70));advance(run,2);assert.ok(run.player.z<-22);assert.equal(run.player.speed,4.8);
 const bike=ready();bike.player.mode='cycling';act(bike,'ride',point(30,-70));advance(bike,3);assert.ok(bike.player.z<-24);assert.ok(bike.player.speed>3);assert.equal(bike.player.mode,'cycling');
});
test('riding can first retrieve a parked bicycle without losing the requested destination',()=>{
 const s=ready();s.player.bike={x:35,z:-14,yaw:0,walked:0};act(s,'ride',point(35,-40));advance(s,30);
 assert.equal(s.player.mode,'cycling');assert.ok(Math.hypot(s.player.x-35,s.player.z+40)<1);assert.equal(s.commandTask.status,'achieved');
});
test('jump obeys gravity and finishes grounded; city bicycles cannot jump',()=>{
 const s=ready();act(s,'jump');stepResident(s,.1,2000);assert.ok(s.player.y>0);assert.equal(s.player.grounded,false);advance(s,3);assert.equal(s.player.grounded,true);assert.equal(s.player.y,0);
 s.player.mode='cycling';assert.match(act(s,'jump').error,/Get off/);
});
test('swim reaches water using shared foot/water physics rather than teleporting',()=>{
 const s=ready();Object.assign(s.player,{x:60,z:0});act(s,'swim',point(85,0));advance(s,20);assert.ok(s.player.x>65);assert.equal(s.player.swimming,true);assert.ok(s.player.y<0);
});
test('scan rotates and records an object originally behind the resident',()=>{
 const s=ready();s.player.yaw=0;s.objects.push({id:'behind',name:'Behind bench',type:'bench',x:30,y:.6,z:-5,yaw:0,approach:{x:30,z:-6},affordances:['sit']});act(s,'scan');advance(s,9);
 assert.ok(s.observations.some(o=>o.objects.some(x=>x.id==='behind')));assert.equal(s.lastCommand.action,'scan');
});
test('meals charge once, show consumption, and reduce hunger; water reduces thirst for free',()=>{
 const s=ready();Object.assign(s.player,{x:35,z:12});s.needs.hunger=90;s.needs.thirst=90;
 assert.equal(act(s,'eat').started,true);assert.equal(s.wallet,16);assert.equal(s.player.consuming,'eat');advance(s,16);assert.ok(s.needs.hunger<80);assert.equal(s.player.consuming,undefined);
 Object.assign(s.player,{x:35,z:14});assert.equal(act(s,'drink').started,true);advance(s,16);assert.ok(s.needs.thirst<40);assert.equal(s.wallet,16);
});
test('unregistered food and unaffordable purchases do not grant benefits',()=>{
 const s=ready();s.objects=[];assert.match(act(s,'eat').error,/No usable food/);s.objects=SERVICES;s.wallet=0;Object.assign(s.player,{x:35,z:12});assert.match(act(s,'eat').error,/€4/);assert.equal(s.player.consuming,undefined);
});
test('personal story executes each real transition, inventory delivery, wages and persisted choices',()=>{
 const s=ready();s.life=restoreLife(null);
 while(lifeStep(s.life)){const step=lifeStep(s.life);Object.assign(s.player,{x:step.x,z:step.z});assert.equal(act(s,'story_choice',{parameters:{choice:0}}).started,true);s.life=JSON.parse(JSON.stringify(s.life));}
 assert.equal(s.life.complete,true);assert.equal(s.wallet,32);assert.ok(!s.inventory.includes('Bag of warm bread'));assert.ok(s.inventory.includes('Small plant'));assert.equal(s.life.decorated,true);const wallet=s.wallet;assert.ok(act(s,'story_choice').error);assert.equal(s.wallet,wallet);
});
test('parcel quest takes the parcel, reads the clue, delivers, and applies the reward once',()=>{
 const s=ready();for(let i=0;i<3;i++){const stop=activeStop(s.parcelQuest||{stage:0});Object.assign(s.player,{x:stop.x,z:stop.z});assert.equal(act(s,'quest').started,true);}
 assert.equal(s.parcelQuest.stage,3);assert.equal(s.player.paintColor,0xcaa24d);assert.deepEqual(s.questInventory,[]);assert.ok(act(s,'quest').error);
 assert.ok(residentRoute({x:50,z:-35},{x:103,z:-35},[],2).length,'pier is reachable beyond the mainland grid boundary');
});
test('NPC greetings have cooldowns and shopping debits real wallet funds',()=>{
 const s=ready();Object.assign(s.player,{x:35,z:12});s.needs.social=80;act(s,'talk',{objectId:'ines',verb:'hello'},1000);const social=s.needs.social;act(s,'talk',{objectId:'ines',verb:'hello'},1001);assert.equal(s.needs.social,social);
 Object.assign(s.player,{x:27,z:77});act(s,'buy',{parameters:{value:'mug'}});assert.equal(s.wallet,16);assert.ok(s.inventory.includes('Blue mug'));
});
test('appearance commands persist and invalid values fail without mutation',()=>{
 const s=ready();act(s,'change_appearance',{parameters:{value:'sage'}});act(s,'change_appearance',{parameters:{value:'helmet_off'}});act(s,'change_appearance',{parameters:{value:'paint:#aabbcc'}});
 assert.equal(s.player.look.outfit,'sage');assert.equal(s.player.look.helmet,false);assert.equal(s.player.paintColor,0xaabbcc);assert.ok(act(s,'change_appearance',{parameters:{value:'nonexistent'}}).error);
});
test('Skyway runs real challenge state, supports inputs, and banks rewards once on exit after restore',()=>{
 let s=ready();Object.assign(s.player,{x:55,z:-374,mode:'cycling'});assert.equal(act(s,'enter_skyway').started,true);act(s,'skyway_input',{verb:'left'});advance(s,3);assert.equal(s.skyway.lane,0);assert.ok(s.skyway.distance>0);assert.ok(s.player.y>0);
 s=JSON.parse(JSON.stringify(s));advance(s,1);s.skyway.coins=5;s.skyway.gems=2;act(s,'exit_skyway');assert.equal(s.skyway,undefined);assert.equal(s.skywayRewards.coins,5);assert.equal(s.arcade.pickups.coins,5);assert.equal(s.player.z,-374);assert.ok(act(s,'exit_skyway').error);assert.equal(s.arcade.pickups.coins,5);
});
test('server Skyway curve samples agree with existing renderer path',()=>{
 const curve=new T.CatmullRomCurve3(SKYWAY_POINTS.map(p=>new T.Vector3(...p)),true,'centripetal');
 for(const u of [.01,.15,.33,.77,.99]){const expected=curve.getPointAt(u),actual=skywayPose(u*SKYWAY_LENGTH);assert.ok(Math.hypot(expected.x-actual.x,expected.y-actual.y,expected.z-actual.z)<.05);}
});
test('road pickups and combat rehydrate after save; nitro purchases and collision hits are real',()=>{
 let s=ready();s.player.mode='cycling';advance(s,.1);s.arcade.pickups.coins=10;s.arcade.pickups.nitro=0;act(s,'buy',{parameters:{value:'nitro'}});assert.equal(s.arcade.pickups.coins,0);assert.equal(s.arcade.pickups.nitro,50);
 s=JSON.parse(JSON.stringify(s));s.player.speed=3;assert.equal(act(s,'attack',{verb:'kick_right'}).started,true);advance(s,.2);assert.ok(s.player.attack);act(s,'boost');advance(s,1);assert.ok(s.arcade.pickups.nitro<50);
});
test('schema rejects misleading remote local actions and malformed coordinates',()=>{
 assert.throws(()=>validateDecision(command('observe',{destination:'coast'})),/destination/);assert.throws(()=>validateDecision(command('walk',{objectId:'point',parameters:{x:NaN,z:0}})),/command x/);assert.throws(()=>validateDecision(command('walk',{objectId:'point'})),/point/);
 for(const name of ['stop','dismount','mount_bicycle','stand_up','drink','ride','scan'])assert.equal(validateDecision(command(name)).action,name);
});
test('human controls execute without model generation even while the worker is disconnected',async()=>{
 const s=ready();s.ai.connected=false;let calls=0;const brain=createResidentBrain({client:{configured:true,complete:async()=>{calls++;throw Error('not needed');}}});brain.initialize(s);
 await brain.chat(s,'run to 30,-30');advance(s,5);assert.ok(s.player.z<-27);assert.equal(calls,0);await brain.chat(s,'stop');assert.equal(s.awaitingInstruction,true);
 s.player.mode='cycling';await brain.chat(s,'get off the bike');assert.equal(s.player.mode,'walking');assert.equal(calls,0);brain.stop();
});
test('replacing a numeric task with an explicit physical task archives the stale target',()=>{
 const s=ready();installObjective(s,{goal:'Social',objective:{metric:'social',direction:'increase',amount:4,interaction:'none'}},0);
 installObjective(s,{goal:'Get bicycle',objective:{metric:'none',direction:'increase',amount:0,interaction:'none'}},1000,true);assert.equal(s.task,undefined);assert.equal(s.taskHistory[0].status,'superseded');
 assert.equal(parseHumanCommand(s,'where is the bicycle?'),null);assert.equal(commandContext(s).body.mode,'walking');
});
