// Offline conversion: node scripts/prepare-run.mjs /path/to/m_run_neutral_01.max.fbx
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
const bytes=readFileSync(process.argv[2]);
const source=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const glb=readFileSync(new URL('../public/assets/people/traveler-man.glb',import.meta.url));
const doc=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)));
const nodes=doc.nodes.map(n=>{const b=new T.Bone();b.name=n.name||'';if(n.translation)b.position.fromArray(n.translation);if(n.rotation)b.quaternion.fromArray(n.rotation);if(n.scale)b.scale.fromArray(n.scale);return b;});
doc.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));
const rig=new T.Group();doc.scenes[0].nodes.forEach(i=>rig.add(nodes[i]));
const original=source.animations[0];
const tracks=original.tracks.filter(t=>t.name.endsWith('.quaternion')&&rig.getObjectByName(t.name.split('.')[0])&&!t.name.includes('Footsteps')).map(t=>t.clone());
const hip=original.tracks.find(t=>t.name==='Bip01.position').clone();
// Remove horizontal root travel but retain the authored hip bounce and flight phase.
for(let i=0;i<hip.values.length;i+=3){hip.values[i]=0;hip.values[i+2]=0;}
tracks.push(hip);
const clip=new T.AnimationClip('Run',original.duration,tracks),mixer=new T.AnimationMixer(rig);mixer.clipAction(clip).play();
let min=Infinity;
for(let i=0;i<120;i++){mixer.setTime(clip.duration*i/120);rig.updateMatrixWorld(true);for(const side of ['L','R'])for(const part of ['Foot','Toe0']){const b=rig.getObjectByName(`Bip01_${side}_${part}`);if(b)min=Math.min(min,b.getWorldPosition(new T.Vector3()).y);}}
for(let i=1;i<hip.values.length;i+=3)hip.values[i]+=5-min;
const json=T.AnimationClip.toJSON(clip);delete json.uuid;
writeFileSync(new URL('../public/assets/people/run-neutral.json',import.meta.url),JSON.stringify(json));
console.log(`Converted ${tracks.length} tracks, ${clip.duration.toFixed(3)}s loop; floor correction ${(5-min).toFixed(2)}cm`);
