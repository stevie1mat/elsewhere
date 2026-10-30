import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Explorer} from './explorer.js';
import {buildCafeTable} from './cafe-table.js';
import {ResidentMotion} from './resident-motion.js';
export function mountTrainingScene(host,onStatus=()=>{}){
 const scene=new T.Scene();scene.background=new T.Color('#eae6f4');
 const camera=new T.PerspectiveCamera(42,1,.1,120);camera.position.set(42,18,24);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Isolated practice scene with the resident, bicycle, café table, chairs and meal counter');
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(32.5,.5,13);controls.minDistance=8;controls.maxDistance=38;controls.maxPolarAngle=Math.PI*.47;controls.enableDamping=true;
 scene.add(new T.HemisphereLight(0xffffff,0x87829b,2.6));const sun=new T.DirectionalLight(0xffeddb,3.2);sun.position.set(28,25,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.1,far:60});sun.target.position.set(32,0,13);scene.add(sun,sun.target);
 const slab=new T.Mesh(new T.BoxGeometry(14,.35,16),new T.MeshStandardMaterial({color:0xe0d7c7,roughness:.95}));slab.position.set(33,-.23,13);slab.receiveShadow=true;scene.add(slab);
 const grid=new T.GridHelper(14,14,0xbfb5cf,0xd1c6d9);grid.position.set(33,-.045,13);scene.add(grid);
 let props=null,rider=null,current=null,motion=null,lastTime=performance.now(),disposed=false;
 const mats={teak:new T.MeshStandardMaterial({color:0x98704b,roughness:.82}),dark:new T.MeshStandardMaterial({color:0x30484a,roughness:.6}),trim:new T.MeshStandardMaterial({color:0xe4d0ac})};
 function setScene(config){
  if(props){props.removeFromParent();props.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
  props=new T.Group();scene.add(props);
  const mesh=(geometry,material,x,y,z)=>{const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;props.add(o);return o;};
  const w={m:mats,interactionObjects:[],obstacle(){},box:(a,h,b,x,y,z,m)=>mesh(new T.BoxGeometry(a,h,b),m,x,y,z),cylinder:(a,b,h,x,y,z,m,n=12)=>mesh(new T.CylinderGeometry(a,b,h,n),m,x,y,z)};
  buildCafeTable(w,config.table.x,config.table.z,{chairs:config.table.chairs});
  const service=config.objects.find(o=>o.id==='cafe-meal');
  if(service){const x=service.x+1.2,z=service.z;w.box(.65,.06,.65,x,.85,z,mats.teak);w.box(.12,.85,.12,x,.425,z,mats.dark);const bowl=mesh(new T.SphereGeometry(.18,12,8,0,Math.PI*2,0,Math.PI/2),mats.trim,x,1,z);bowl.rotation.x=Math.PI;}
  if(config.id==='blocked_route'){const material=new T.MeshStandardMaterial({color:0xca6a54,roughness:.8});for(const o of config.obstacles.filter(o=>o.minX===33.9))w.box(o.maxX-o.minX,1.2,o.maxZ-o.minZ,(o.minX+o.maxX)/2,.6,(o.minZ+o.maxZ)/2,material);}
  for(const x of [26,40])w.box(.12,.15,16,x,0,13,mats.trim);for(const z of [5,21])w.box(14,.15,.12,33,0,z,mats.trim);
  current={...config.start,y:0,mode:'cycling',speed:0,walked:0,grounded:true,bike:null};motion=new ResidentMotion(current,performance.now());
 }
 async function avatar(){
  onStatus('Loading existing character…');const gltf=await new GLTFLoader().loadAsync('/assets/people/traveler-man.glb');
  const loader=new T.TextureLoader(),textures={};await Promise.all(['body','head','opacity'].map(async part=>{const t=await loader.loadAsync('/assets/people/m002_'+part+'_color.webp');t.flipY=true;t.colorSpace=T.SRGBColorSpace;textures[part]=t;}));
  if(disposed)return;
  gltf.scene.traverse(o=>{if(!o.isMesh)return;const prep=old=>{const part=old.name.includes('opacity')?'opacity':old.name.includes('head')?'head':'body';return new T.MeshStandardMaterial({map:textures[part],name:part,roughness:.88,side:part==='opacity'?T.DoubleSide:T.FrontSide,alphaTest:part==='opacity'?.45:0});};o.material=Array.isArray(o.material)?o.material.map(prep):prep(o.material);o.castShadow=true;o.frustumCulled=false;});
  rider=new Explorer(gltf.scene,gltf.animations.find(a=>a.name==='Walk'));scene.add(rider.group);onStatus('Drag to orbit · Scroll to zoom');
 }
 avatar().catch(()=>onStatus('Character asset could not load. Refresh to retry.'));
 const resize=new ResizeObserver(()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,Math.max(300,r.height));camera.aspect=r.width/Math.max(300,r.height);camera.updateProjectionMatrix();});resize.observe(host);
 function frame(time){if(disposed)return;const dt=Math.min(.05,(time-lastTime)/1000);lastTime=time;
  if(rider&&current){const p=motion.sample(time);if(p.look&&JSON.stringify(p.look)!==rider.trainingLook){rider.applyLook(p.look);rider.trainingLook=JSON.stringify(p.look);}if(p.paintColor!==undefined){rider.cycle.paintColor=p.paintColor;rider.cycle.frameMaterial.color.set(p.paintColor);}rider.update(p,dt);if(p.mode==='walking'&&p.bike)rider.cycle.group.position.y=.015;}
  controls.update();renderer.render(scene,camera);requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 return {setScene,receive(player){if(!motion)return;current=player;motion.receive(player,performance.now());},dispose(){disposed=true;resize.disconnect();controls.dispose();renderer.dispose();}};
}
