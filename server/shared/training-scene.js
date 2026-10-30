export const TRAINING_ACTIONS=['eat','dismount','interact','stand_up','walk','visit','stop','wait','look','scan'];
import {SERVICES} from './services.js';
export const TRAINING_SCENARIOS=[
 {id:'normal',name:'Ready to eat',description:'Bicycle, food, chairs and €20 are available.'},
 {id:'no_chair',name:'Missing chair',description:'Food is available, but there is no usable chair.'},
 {id:'no_food',name:'Missing food',description:'The meal service is unavailable.'},
 {id:'no_money',name:'Insufficient money',description:'The practice wallet has €0.'},
 {id:'blocked_route',name:'Blocked counter',description:'A barrier prevents reaching the meal counter.'}
];
export const TRAINING_PROMPTS=[
 'Get off the bicycle, collect a meal, sit on a chair and eat it.',
 'You should get down from your bike and sit on the chair when eating.',
 'Please park your bike and have your meal seated at the table.'
];
export const TRAINING_BOUNDS={minX:26,maxX:40,minZ:5,maxZ:21};
export function trainingScene(id='normal'){
 if(!TRAINING_SCENARIOS.some(s=>s.id===id))throw Error('Unknown training scenario.');
 const chairs=id==='no_chair'?[]:[-1.2,1.2].map(dz=>({id:`chair:30:16:${dz}`,name:'Café chair',type:'chair',x:30,y:.52,z:16+dz,yaw:dz>0?0:Math.PI,approach:{x:31.4,z:16+dz},affordances:['sit']}));
 const objects=[...chairs,...(id==='no_food'?[]:[{...SERVICES[0],approach:{...SERVICES[0].approach}}])];
 const b=TRAINING_BOUNDS;
 const obstacles=[{minX:b.minX-1,maxX:b.minX,minZ:b.minZ-1,maxZ:b.maxZ+1},{minX:b.maxX,maxX:b.maxX+1,minZ:b.minZ-1,maxZ:b.maxZ+1},{minX:b.minX,maxX:b.maxX,minZ:b.minZ-1,maxZ:b.minZ},{minX:b.minX,maxX:b.maxX,minZ:b.maxZ,maxZ:b.maxZ+1},
 {minX:29.3,maxX:30.7,minZ:15.3,maxZ:16.7},...chairs.map(c=>({minX:c.x-.325,maxX:c.x+.325,minZ:c.z-.3,maxZ:c.z+.3}))];
 if(id==='blocked_route')obstacles.push({minX:33.9,maxX:36.1,minZ:10.9,maxZ:13.1});
 return {id,bounds:b,table:{x:30,z:16,chairs:chairs.length>0},objects,obstacles,start:{x:32,z:9,yaw:Math.PI},wallet:id==='no_money'?0:20};
}
