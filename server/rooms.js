import {groundElevation} from './shared/landscape.js';
import { randomBytes } from 'node:crypto';
import { activeStop,canInteract } from './shared/quest.js';
import { SPAWN,onLand,inSwimArea } from './shared/movement.js';

const token=()=>randomBytes(16).toString('hex');
export const PUBLIC_ROOM='0000000000000000';
export function validPosition(p){
  return p && ['x','z','yaw','walked','speed'].every(k=>Number.isFinite(p[k])) && (onLand(p.x,p.z,p.mode==='walking'?.35:.95)||(p.mode==='walking'&&inSwimArea(p.x,p.z)&&Math.abs(p.speed)<=3)) && Math.abs(p.speed)<=15.1 && Math.abs(p.yaw)<1e8 && Math.abs(p.walked)<1e9;
}
export class Rooms {
  constructor(now=Date.now){this.now=now;this.room={code:PUBLIC_ROOM,stage:0,carrier:null,players:new Map(),updated:this.now()};this.rooms=new Map([[PUBLIC_ROOM,this.room]]);}
  join(_code,resume,peer){
    this.sweep();
    const room=this.room;
    let p=typeof resume==='string'?room.players.get(resume):null;
    if(p?.peer)throw Object.assign(Error('This rider is already connected in another tab.'),{code:'RIDER_CONNECTED'});
    const isNew=!p;
    if(isNew){
      const offset=[...room.players.values()].filter(player=>player.peer).length%8;
      p={token:token(),id:token().slice(0,8),position:{x:SPAWN.x+offset*1.5,z:SPAWN.z,yaw:SPAWN.yaw,walked:0,speed:0},lastSeen:this.now(),peer:null};
      room.players.set(p.token,p);
    }
    p.peer=peer;p.lastSeen=this.now();p.position.arrival={phase:'balloon',elapsed:0};room.updated=this.now();
    if(room.stage>0&&room.stage<3&&!room.carrier)room.carrier=p.id;
    return {room,player:p,isNew};
  }
  snapshot(room){return {type:'state',room:room.code,stage:room.stage,carrier:room.carrier,players:[...room.players.values()].filter(p=>p.peer).map(p=>({id:p.id,...p.position}))};}
  position(room,p,value) {
    if(!validPosition(value))return false;
    const swimming=value.mode==='walking'&&!onLand(value.x,value.z,.35)&&inSwimArea(value.x,value.z);
    if(value.y!=null&&(!Number.isFinite(value.y)||value.y<(swimming?-2.7:0)||value.y>groundElevation(value.x,value.z)+3))return false;
    if(value.vy!=null&&(!Number.isFinite(value.vy)||Math.abs(value.vy)>12))return false;
    const bike=value.bike;
    const walking=value.mode==='walking'&&(bike==null||(['x','z','yaw','walked'].every(k=>Number.isFinite(bike[k]))
      &&onLand(bike.x,bike.z)&&Math.abs(bike.yaw)<1e8&&Math.abs(bike.walked)<1e9));
    if(value.mode==='walking'&&!walking)return false;
    const arrival=value.arrival;
    if(arrival?.canopy&&(!['x','y','z','vx','vy','vz'].every(k=>Number.isFinite(arrival.canopy[k]))||Math.abs(arrival.canopy.x)>600||Math.abs(arrival.canopy.z)>600||arrival.canopy.y<0||arrival.canopy.y>120||['vx','vy','vz'].some(k=>Math.abs(arrival.canopy[k])>25)))return false;
    for(const [key,limit] of [['heading',Math.PI+.001],['vx',20],['vz',20],['turnRate',1]])if(arrival?.[key]!=null&&(!Number.isFinite(arrival[key])||Math.abs(arrival[key])>limit))return false;
    if(arrival?.steering!=null&&(!Number.isFinite(arrival.steering)||Math.abs(arrival.steering)>1))return false;
    if(arrival?.pilot&&(!Number.isFinite(arrival.pilot.x)||!Number.isFinite(arrival.pilot.z)||!onLand(arrival.pilot.x,arrival.pilot.z)))return false;
    if(arrival!=null&&(!['balloon','parachute','landed'].includes(arrival.phase)||!Number.isFinite(arrival.elapsed)||arrival.elapsed<0||arrival.elapsed>86400))return false;
    if(arrival?.from&&(!['x','y','z'].every(k=>Number.isFinite(arrival.from[k]))||Math.abs(arrival.from.x)>500||Math.abs(arrival.from.z)>500||arrival.from.y<0||arrival.from.y>120))return false;
    if(arrival?.landing&&(!Number.isFinite(arrival.landing.x)||!Number.isFinite(arrival.landing.z)||!onLand(arrival.landing.x,arrival.landing.z)))return false;
    p.position={x:value.x,z:value.z,yaw:value.yaw,walked:value.walked,speed:value.speed,arrival:arrival?{phase:arrival.phase,elapsed:arrival.elapsed,...(arrival.from?{from:{x:arrival.from.x,y:arrival.from.y,z:arrival.from.z}}:{}),...(arrival.landing?{landing:{x:arrival.landing.x,z:arrival.landing.z}}:{})}:null,
      mode:walking?'walking':'cycling',bike:walking&&bike?{x:bike.x,z:bike.z,yaw:bike.yaw,walked:bike.walked}:null};
    if(arrival?.pilot)p.position.arrival.pilot={x:arrival.pilot.x,z:arrival.pilot.z};
    if(arrival?.canopy)p.position.arrival.canopy=Object.fromEntries(['x','y','z','vx','vy','vz'].map(k=>[k,arrival.canopy[k]]));
    p.position.y=value.y??0;p.position.vy=value.vy??0;p.position.swimming=swimming;p.position.grounded=!swimming&&p.position.y<=groundElevation(value.x,value.z)+.08;
    if(arrival?.steering!=null)p.position.arrival.steering=arrival.steering;
    for(const key of ['heading','vx','vz','turnRate'])if(arrival?.[key]!=null)p.position.arrival[key]=arrival[key];
    p.lastSeen=this.now();room.updated=this.now();return true;
  }
  advance(room,p,message){
    if(message.stage!==room.stage||message.stop!==activeStop({stage:room.stage})?.id)throw Error('Your quest has already changed. Follow the current gold marker.');
    if(this.now()-p.lastSeen>=10000||!canInteract({stage:room.stage},p.position))throw Error('Stop beside the gold marker first.');
    room.stage++;if(room.stage===1)room.carrier=p.id;if(room.stage===3)room.carrier=null;room.updated=this.now();
  }
  disconnect(room,p,leave=false){
    p.peer=null;p.lastSeen=this.now();room.updated=this.now();
    if(leave){room.players.delete(p.token);if(room.carrier===p.id)room.carrier=[...room.players.values()][0]?.id??null;}
  }
  sweep(){
    const now=this.now();
    const r=this.room;
    for(const [key,p] of r.players)if(!p.peer&&now-p.lastSeen>60000){r.players.delete(key);if(r.carrier===p.id)r.carrier=[...r.players.values()].find(player=>player.peer)?.id??null;}
  }
}
