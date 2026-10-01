import { randomBytes } from 'node:crypto';
import { activeStop,canInteract } from './shared/quest.js';
import { SPAWN,onLand } from './shared/movement.js';

const token=()=>randomBytes(16).toString('hex');
export function validPosition(p){
  return p && ['x','z','yaw','walked','speed'].every(k=>Number.isFinite(p[k])) && onLand(p.x,p.z) && Math.abs(p.speed)<=10.1 && Math.abs(p.yaw)<1e8 && Math.abs(p.walked)<1e9;
}
export class Rooms {
  constructor(now=Date.now){this.rooms=new Map();this.now=now;}
  join(code,resume,peer){
    this.sweep();
    let room;
    if(!code){
      if(this.rooms.size>=100)throw Error('The server is full. Try again later.');
      code=randomBytes(8).toString('hex');room={code,stage:0,carrier:null,players:new Map(),updated:this.now()};this.rooms.set(code,room);
    }else {room=this.rooms.get(code);if(!room)throw Error('Room not found or expired. Ask your friend for a new invite.');}
    let p=typeof resume==='string'?room.players.get(resume):null;
    if(p?.peer)throw Object.assign(Error('This rider is already connected in another tab.'),{code:'RIDER_CONNECTED'});
    if(!p){
      if(room.players.size>=2)throw Error('This room already has two riders.');
      p={token:token(),id:token().slice(0,8),position:{x:SPAWN.x+room.players.size*2,z:SPAWN.z,yaw:SPAWN.yaw,walked:0,speed:0},lastSeen:this.now(),peer:null};
      room.players.set(p.token,p);
    }
    p.peer=peer;p.lastSeen=this.now();room.updated=this.now();
    if(room.stage>0&&room.stage<3&&!room.carrier)room.carrier=p.id;
    return {room,player:p};
  }
  snapshot(room){return {type:'state',room:room.code,stage:room.stage,carrier:room.carrier,players:[...room.players.values()].filter(p=>p.peer).map(p=>({id:p.id,...p.position}))};}
  position(room,p,value){if(!validPosition(value))return false;p.position={x:value.x,z:value.z,yaw:value.yaw,walked:value.walked,speed:value.speed};p.lastSeen=this.now();room.updated=this.now();return true;}
  advance(room,p,message){
    if(message.stage!==room.stage||message.stop!==activeStop({stage:room.stage})?.id)throw Error('Your quest has already changed. Follow the current gold marker.');
    const players=[...room.players.values()].filter(p=>p.peer);
    if(players.length!==2)throw Error('Wait for your friend to join before completing this step.');
    if(!players.every(p=>this.now()-p.lastSeen<10000&&canInteract({stage:room.stage},p.position)))throw Error('Both riders need to stop beside this gold marker.');
    room.stage++;if(room.stage===1)room.carrier=p.id;if(room.stage===3)room.carrier=null;room.updated=this.now();
  }
  disconnect(room,p,leave=false){
    p.peer=null;p.lastSeen=this.now();room.updated=this.now();
    if(leave){room.players.delete(p.token);if(room.carrier===p.id)room.carrier=[...room.players.values()][0]?.id??null;}
  }
  sweep(){
    const now=this.now();
    for(const [code,r] of this.rooms){
      const occupied=[...r.players.values()].some(p=>p.peer);
      if(!occupied&&now-r.updated>15*60*1000){this.rooms.delete(code);continue;}
      if(occupied)for(const [key,p] of r.players)if(!p.peer&&now-p.lastSeen>60000){r.players.delete(key);if(r.carrier===p.id)r.carrier=[...r.players.values()][0]?.id??null;}
    }
  }
}
