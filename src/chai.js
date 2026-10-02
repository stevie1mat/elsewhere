export const CHAI_SPAWN=Object.freeze({x:-20,z:85,yaw:0,pitch:.23});
export const CHAI_STALL=Object.freeze({id:'stall',name:'Asha’s chai stall',x:-20,z:82,radius:5,number:'01',subtitle:'Fresh ginger chai. A steady hand earns a better tip.'});
export const CHAI_CUSTOMERS=Object.freeze([
  {id:'garage',name:'Night-shift mechanics',x:39,z:-35,radius:4,number:'02',subtitle:'Two mechanics, one well-earned tea break.'},
  {id:'market',name:'Flower market',x:-84,z:-70,radius:4,number:'03',subtitle:'The flower seller is waiting for a hot cup.'},
]);
export const CHAI_LANDMARKS=[CHAI_STALL,...CHAI_CUSTOMERS];
export const CHAI_ROADS=[...[-90,-20,45].map(x=>({x,z:-3,w:13,d:220})),...[-108,-35,40,102].map(z=>({x:-22.5,z,w:148,d:13}))];
export const CHAI_POTHOLES=[{x:-20,z:51,r:1.35},{x:-18,z:8,r:1.2},{x:15,z:-35,r:1.6},{x:-65,z:40,r:1.3},{x:-90,z:-50,r:1.4},{x:45,z:19,r:1.5}];
export function createChai(){return {phase:'pickup',order:0,volume:100,heat:92,tilt:0,velocity:0,elapsed:0,lastSpeed:0,score:0,delivered:0,lastTip:0};}
export function chaiTarget(s){return s.phase==='riding'?CHAI_CUSTOMERS[s.order%CHAI_CUSTOMERS.length]:CHAI_STALL;}
export function canServe(s,p){const t=chaiTarget(s);return Math.hypot(p.x-t.x,p.z-t.z)<t.radius&&Math.abs(p.speed)<.4;}
export function serveChai(s,p){
  if(!canServe(s,p))return false;
  if(s.phase==='riding'){
    s.lastTip=Math.round(s.volume*.65+s.heat*.35);s.score+=s.lastTip;s.delivered++;s.order++;s.phase='delivered';
  }else{Object.assign(s,{phase:'riding',volume:100,heat:92,tilt:0,velocity:0,elapsed:0,lastSpeed:0});}
  return true;
}
export function stepChai(s,p,delta){
  if(s.phase!=='riding')return;
  const dt=Math.min(.05,Math.max(0,delta));if(!dt)return;
  const acceleration=(p.speed-s.lastSpeed)/dt;s.lastSpeed=p.speed;
  const bump=CHAI_POTHOLES.some(h=>Math.hypot(p.x-h.x,p.z-h.z)<h.r);
  const force=p.steering*p.speed*p.speed*.016+acceleration*.017+(bump?Math.sin(s.elapsed*38)*Math.abs(p.speed)*.22:0);
  s.velocity+=(force-s.tilt*11-s.velocity*4)*dt;s.tilt+=s.velocity*dt;
  const harshTurn=Math.max(0,Math.abs(p.steering)*p.speed*p.speed-18);
  const shock=Math.max(0,Math.abs(acceleration)-8);
  const loss=(Math.max(0,Math.abs(s.tilt)-.12)*18+harshTurn*.08+shock*.22+(bump?Math.max(0,Math.abs(p.speed)-2)*2.5:0))*dt;
  s.volume=Math.max(0,s.volume-loss);s.elapsed+=dt;s.heat=Math.max(25,s.heat-dt*.13);
  if(s.volume<15||s.heat<38)s.phase='failed';
}
