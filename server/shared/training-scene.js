export const TRAINING_ACTIONS=['mount_bicycle','buy','eat','dismount','interact','stand_up','walk','visit','stop','wait','look','scan'];
import {SERVICES} from './services.js';
export const TRAINING_SCENARIOS=[
 {id:'bike_ready',name:'Bicycle available',description:'Start on foot with a parked bicycle nearby.'},
 {id:'bike_moved',name:'Bicycle moved',description:'The parked bicycle is in a different position.'},
 {id:'bike_missing',name:'Bicycle missing',description:'No parked bicycle is available.'},
 {id:'bike_blocked',name:'Bicycle blocked',description:'A barrier prevents reaching the parked bicycle.'},
 {id:'normal',name:'Ready to eat',description:'Bicycle, food, chairs and €20 are available.'},
 {id:'moved_objects',name:'Moved objects',description:'The counter and table are in different practice positions.'},
 {id:'no_chair',name:'Missing chair',description:'Food is available, but there is no usable chair.'},
 {id:'no_food',name:'Missing food',description:'The meal service is unavailable.'},
 {id:'no_money',name:'Insufficient money',description:'The practice wallet has €0.'},
 {id:'blocked_route',name:'Blocked counter',description:'A barrier prevents reaching the meal counter.'}
];
export const TRAINING_PROMPTS=[
 'You are riding a bicycle and feel hungry. Have a meal while seated at the nearby table.',
 'Stop riding and have lunch sitting down.',
 'Please have your meal seated at the table.'
];
export const TRAINING_BOUNDS={minX:26,maxX:40,minZ:5,maxZ:21};
export function trainingScene(id='normal'){
 if(!TRAINING_SCENARIOS.some(s=>s.id===id))throw Error('Unknown training scenario.');
 if(id.startsWith('bike_')){const bike=id==='bike_missing'?null:{x:id==='bike_moved'?29:35,z:id==='bike_moved'?17:12,yaw:0,walked:0};const b=TRAINING_BOUNDS;const obstacles=[{minX:b.minX-1,maxX:b.minX,minZ:4,maxZ:22},{minX:b.maxX,maxX:b.maxX+1,minZ:4,maxZ:22},{minX:26,maxX:40,minZ:4,maxZ:5},{minX:26,maxX:40,minZ:21,maxZ:22}];if(id==='bike_blocked')obstacles.push({minX:33.7,maxX:36.3,minZ:10.7,maxZ:13.3});return {id,bounds:b,table:null,objects:bike?[{id:'parked-bike',type:'bicycle',name:'Your parked bicycle',x:bike.x,y:0,z:bike.z,approach:{x:bike.x,z:bike.z},affordances:['mount_bicycle']}]:[],obstacles,start:{x:32,z:9,yaw:0,mode:'walking'},bike,wallet:20};}
 const tableX=id==='moved_objects'?34:30;
 const chairs=id==='no_chair'?[]:[-1.2,1.2].map(dz=>({id:`chair:${tableX}:16:${dz}`,name:'Café chair',type:'chair',x:tableX,y:.52,z:16+dz,yaw:dz>0?0:Math.PI,approach:{x:tableX+1.4,z:16+dz},affordances:['sit']}));
 const objects=[...chairs,...(id==='no_food'?[]:[{...SERVICES[0],approach:{...SERVICES[0].approach}}])];
 if(id==='moved_objects'){const counter=objects.find(o=>o.type==='food');Object.assign(counter,{x:29,z:10,approach:{x:29,z:10}});}
 const b=TRAINING_BOUNDS;
 const obstacles=[{minX:b.minX-1,maxX:b.minX,minZ:b.minZ-1,maxZ:b.maxZ+1},{minX:b.maxX,maxX:b.maxX+1,minZ:b.minZ-1,maxZ:b.maxZ+1},{minX:b.minX,maxX:b.maxX,minZ:b.minZ-1,maxZ:b.minZ},{minX:b.minX,maxX:b.maxX,minZ:b.maxZ,maxZ:b.maxZ+1},
 {minX:tableX-.7,maxX:tableX+.7,minZ:15.3,maxZ:16.7},...chairs.map(c=>({minX:c.x-.325,maxX:c.x+.325,minZ:c.z-.3,maxZ:c.z+.3}))];
 if(id==='blocked_route')obstacles.push({minX:33.9,maxX:36.1,minZ:10.9,maxZ:13.1});
 return {id,bounds:b,table:{x:tableX,z:16,chairs:chairs.length>0},objects,obstacles,start:{x:32,z:9,yaw:Math.PI},wallet:id==='no_money'?0:20};
}
