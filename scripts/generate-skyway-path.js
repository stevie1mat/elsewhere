// Regenerate the server's arc-length samples after changing shared SKYWAY_POINTS.
import * as T from 'three';
import {writeFileSync} from 'node:fs';
import {SKYWAY_POINTS} from '../server/shared/skyway.js';
const curve=new T.CatmullRomCurve3(SKYWAY_POINTS.map(p=>new T.Vector3(...p)),true,'centripetal');
const points=Array.from({length:2049},(_,i)=>{const p=curve.getPointAt(i/2048),t=curve.getTangentAt(i/2048);return [p.x,p.y,p.z,Math.atan2(t.x,-t.z)].map(n=>Math.round(n*10000)/10000);});
writeFileSync(new URL('../server/shared/skyway-path.js',import.meta.url),'// Arc-length samples of the renderer’s existing centripetal curve.\nexport const SKYWAY_LENGTH='+curve.getLength()+';\nconst samples='+JSON.stringify(points)+';\nexport function skywayPose(distance,lane=1){const u=((distance/SKYWAY_LENGTH)%1+1)%1*(samples.length-1),i=Math.floor(u),t=u-i,a=samples[i],b=samples[i+1];const yaw=a[3]+Math.atan2(Math.sin(b[3]-a[3]),Math.cos(b[3]-a[3]))*t,o=(lane-1)*3.3;return {x:a[0]+(b[0]-a[0])*t+Math.cos(yaw)*o,y:a[1]+(b[1]-a[1])*t,z:a[2]+(b[2]-a[2])*t+Math.sin(yaw)*o,yaw};}\n');
