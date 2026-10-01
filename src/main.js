import * as THREE from 'three';
import { World } from './world.js';
import { SPAWN, LANDMARKS, createPlayer, stepPlayer, validateSavedPosition } from './movement.js';
import './style.css';

const icons = {
  logo:'<path d="M6 17V7h13M6 12h9M6 18h13"/><circle cx="20" cy="4" r="1.2" fill="currentColor" stroke="none"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon:'<path d="M20.3 15.3A8.5 8.5 0 0 1 8.7 3.7a8.5 8.5 0 1 0 11.6 11.6Z"/>',
  volume:'<path d="M11 4 6 8H3v8h3l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted:'<path d="M11 4 6 8H3v8h3l5 4V4Zm5 5 5 6m0-6-5 6"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="#213a36"/><circle cx="16" cy="17" r="3" fill="#213a36"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  camera:'<path d="M8 5 6 8H3v12h18V8h-3l-2-3H8Z"/><circle cx="12" cy="13" r="3"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2.5m0 3h.01"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector('#app').innerHTML = `
  <div id="viewport" aria-label="Porto Sol 3D world"></div><div id="vignette"></div>
  <div class="ui" id="ui">
    <header class="topbar"><div class="brand"><span class="brand-symbol">${icon('logo')}</span><span class="wordmark">elsewhere</span><span class="edition">world 001</span></div>
      <div class="top-actions"><button class="weather" id="time-toggle" aria-label="Switch to blue hour" title="Change time of day">${icon('sun')}<span id="time-label">Golden hour</span><span class="separator"></span><span class="temp">22°</span></button>
      <button class="icon-button" id="sound-toggle" aria-label="Enable ocean ambience" aria-pressed="false" title="Ocean ambience">${icon('muted')}</button>
      <button class="icon-button" id="photo" aria-label="Save a photo" title="Save a photo">${icon('camera')}</button>
      <button class="icon-button" id="settings-button" aria-label="Open settings" title="Settings">${icon('settings')}</button></div>
    </header>
    <div class="place-label"><i class="dot"></i><span>Porto Sol</span><span> / &nbsp; The southern coast</span></div>
    <section class="intro" id="intro"><div class="eyebrow"><span class="rule"></span>A place to just be</div><h1>Take the<br><em>scenic route.</em></h1><p>Salt in the air. Sun on the pavement.<br>A little coastal world, yours to ride.</p>
      <button class="enter" id="enter" disabled><span>Preparing your world</span>${icon('arrow')}</button>
      <div class="loading-line" id="loading-line"><div id="progress"></div></div><div class="loading-status" id="loading-status">Unpacking the neighborhood…</div>
      <div class="intro-note">No destination required. Just a little curiosity.</div>
    </section>
    <section class="journey" aria-label="Places to discover"><div class="journey-head"><span>Around the neighborhood</span><strong id="discovered-count">0 / 3</strong></div>
      ${LANDMARKS.map(l=>`<button class="destination" data-destination="${l.id}"><span class="destination-number">${l.number}</span><span>${l.name}</span><span class="distance" id="distance-${l.id}"></span></button>`).join('')}
      <p class="journey-hint" id="journey-hint">Choose a place to mark it on your map.</p>
    </section>
    <aside class="map-card" aria-label="Neighborhood map"><div class="map-header"><span>YOUR LITTLE CORNER</span><small>EXPLORE</small></div><div class="map-frame"><canvas id="map" width="356" height="344" aria-label="Map showing your location and landmarks"></canvas><div class="map-north"><span>↑</span>N</div></div><div class="map-footer"><span class="live"><i></i><span id="zone">Seafront promenade</span></span><span class="performance" id="performance"></span></div></aside>
    <div class="crosshair"></div><div class="look-hint">Click the scene to look around · Esc releases your cursor</div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <div class="discovery" id="discovery"><small>A little discovery</small><h2 id="discovery-name"></h2><p id="discovery-description"></p></div>
    <footer class="bottom-bar"><div class="world-tag">An open-world sketch <span>v0.1</span></div><div class="controls"><div class="control"><kbd>W / S</kbd><span>Pedal / reverse</span></div><div class="control"><kbd>A / D</kbd><span>Steer</span></div><div class="control"><kbd>⇧</kbd><span>Pedal faster</span></div><div class="control"><kbd>Space</kbd><span>Brake</span></div><div class="control"><kbd>Mouse</kbd><span>Orbit</span></div><div class="control"><kbd>P</kbd><span>Hide UI</span></div><div class="control"><button class="icon-button" id="help-button" aria-label="Cycling controls" style="width:26px;height:26px">${icon('help')}</button></div></div><div class="bottom-note">BUILT FOR RIDING</div></footer>
    <div class="touch-controls"><div class="dpad"><button data-key="KeyW" aria-label="Pedal forward">↑</button><button data-key="KeyA" aria-label="Steer left">←</button><button data-key="KeyS" aria-label="Reverse">↓</button><button data-key="KeyD" aria-label="Steer right">→</button></div><div class="touch-actions"><button data-key="ShiftLeft" aria-label="Pedal faster">Fast</button><button data-key="Space" aria-label="Brake">Brake</button></div></div>
  </div>
  <button class="photo-exit" id="photo-exit">Show interface · P</button>
  <dialog id="settings"><div class="dialog-title"><h2>Make yourself at home.</h2><button class="icon-button" data-close aria-label="Close settings">${icon('close')}</button></div>
    <div class="settings-row"><div>Time of day<small>A different kind of atmosphere.</small></div><div class="segmented"><button data-time="day" class="active">Golden</button><button data-time="night">Blue hour</button></div></div>
    <div class="settings-row"><div>Graphics<small>Lower detail, a lighter footprint.</small></div><div class="segmented"><button data-quality="balanced">Balanced</button><button data-quality="high" class="active">High</button></div></div>
    <div class="settings-row"><div>Camera smoothing<small>A smooth camera following your bicycle.</small></div><button class="text-button" id="bob-toggle" aria-pressed="true">On</button></div>
    <div class="settings-row"><div>Your favorite spot<small>Saved only on this browser.</small></div><button class="text-button" id="save-spot">Save spot</button></div>
    <div class="settings-row"><div>Back to the waterfront</div><button class="text-button" id="reset">Return to start</button></div>
    <h3>About this little world</h3><p>Ride your bicycle through Porto Sol in third person. Explore the café, pier, and garden. Buildings are exterior scenery.</p>
    <p class="credits">Local assets reused from the original game.<br>Scenery textures & tree: <a href="https://polyhaven.com/license" target="_blank" rel="noopener">Poly Haven · CC0</a><br>Animated pedestrians: <a href="https://github.com/microsoft/Microsoft-Rocketbox" target="_blank" rel="noopener">Microsoft Rocketbox · MIT</a></p>
  </dialog>
  <dialog id="help"><div class="dialog-title"><h2>A little room to roam.</h2><button class="icon-button" data-close aria-label="Close controls">${icon('close')}</button></div><div class="keys">
    <div class="key-row"><span>Pedal / reverse</span><kbd>W S / ↑ ↓</kbd></div><div class="key-row"><span>Orbit camera</span><kbd>Mouse / drag</kbd></div><div class="key-row"><span>Steer</span><kbd>A D / Q E / ← →</kbd></div><div class="key-row"><span>Pedal faster</span><kbd>Shift</kbd></div><div class="key-row"><span>Brake</span><kbd>Space</kbd></div><div class="key-row"><span>Release cursor</span><kbd>Esc</kbd></div><div class="key-row"><span>Hide interface</span><kbd>P</kbd></div><div class="key-row"><span>Return to start</span><kbd>R</kbd></div><div class="key-row"><span>Center camera behind bike</span><kbd>C</kbd></div>
    </div><p>On a touch screen, use the arrows to pedal and steer, and drag to orbit the camera. Ride near a landmark to discover it.</p></dialog>`;

const $ = s => document.querySelector(s);
const viewport = $('#viewport');
const player = createPlayer();
let started=false, ready=false, selected=null, elapsed=0, night=false, bob=!matchMedia('(prefers-reduced-motion: reduce)').matches, soundOn=false, quality='high';
let orbitYaw=0;
const cameraRay=new THREE.Raycaster(), cameraAim=new THREE.Vector3(), cameraDesired=new THREE.Vector3();
let renderer, scene, camera, world, audioContext, audioGain, toastTimer, discoveryTimer;
const keys=new Set(), discovered=new Set();
const storage={get(key){try{return JSON.parse(localStorage.getItem(`elsewhere:${key}`));}catch{return null;}},set(key,value){try{localStorage.setItem(`elsewhere:${key}`,JSON.stringify(value));return true;}catch{return false;}}};
const savedDiscoveries=storage.get('discoveries');
if(Array.isArray(savedDiscoveries))savedDiscoveries.filter(id=>LANDMARKS.some(l=>l.id===id)).forEach(id=>discovered.add(id));
const prefs=storage.get('preferences');if(prefs){night=prefs.night===true;quality=prefs.quality==='balanced'?'balanced':'high';bob=typeof prefs.bob==='boolean'?prefs.bob:bob;}
function savePrefs(){storage.set('preferences',{night,quality,bob});}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function releaseKeys(){keys.clear();player.vx=player.vz=player.speed=0;}
function modalOpen(){return !!document.querySelector('dialog[open]');}
function updateDiscoveries(){
  $('#discovered-count').textContent=`${discovered.size} / 3`;
  document.querySelectorAll('.destination').forEach(button=>{const id=button.dataset.destination;button.classList.toggle('visited',discovered.has(id));button.classList.toggle('active',id===selected);button.setAttribute('aria-pressed',String(id===selected));button.querySelector('.destination-number').textContent=discovered.has(id)?'✓':LANDMARKS.find(l=>l.id===id).number;});
}
function reset(){Object.assign(player,createPlayer());orbitYaw=0;releaseKeys();toast('Back where the sea meets the street.');}
function setNight(value){night=value;world?.setNight(night);$('#time-label').textContent=night?'Blue hour':'Golden hour';$('#time-toggle').querySelector('svg').outerHTML=icon(night?'moon':'sun');$('#time-toggle').setAttribute('aria-label',night?'Switch to golden hour':'Switch to blue hour');document.querySelectorAll('[data-time]').forEach(b=>b.classList.toggle('active',(b.dataset.time==='night')===night));savePrefs();}
function setQuality(value){quality=value;if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.25:1));renderer.shadowMap.enabled=quality==='high';renderer.setSize(innerWidth,innerHeight);}document.querySelectorAll('[data-quality]').forEach(b=>b.classList.toggle('active',b.dataset.quality===quality));savePrefs();}
function setBob(){ $('#bob-toggle').textContent=bob?'On':'Off';$('#bob-toggle').setAttribute('aria-pressed',String(bob)); }

function initialize(){
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.25:1));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=quality==='high';renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
  renderer.domElement.setAttribute('aria-label','Third-person cycling in Porto Sol');renderer.domElement.tabIndex=0;viewport.appendChild(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.08,3500);camera.rotation.order='YXZ';
  const manager=new THREE.LoadingManager();let failed=0;
  manager.onProgress=(_,loaded,total)=>{$('#progress').style.width=`${loaded/total*100}%`;$('#loading-status').textContent=`Bringing Porto Sol to life · ${Math.round(loaded/total*100)}%`;};
  manager.onError=()=>{failed++;};
  const finish=()=>{if(ready)return;ready=true;$('#enter').disabled=false;$('#enter span').textContent='Ride into Porto Sol';$('#progress').style.width='100%';$('#loading-line').hidden=true;$('#loading-status').textContent=failed?'Ready to explore. Some detail assets could not load.':'Ready when you are. Headphones optional.';};
  manager.onLoad=finish;
  world=new World(scene,renderer,manager);
  const saved=validateSavedPosition(storage.get('spot'),world.obstacles);if(saved)Object.assign(player,saved);
  setNight(night);setQuality(quality);setBob();updateDiscoveries();
  setTimeout(()=>{if(!ready){finish();$('#loading-status').textContent='You can explore while the remaining details load.';}},25000);
  let previous=performance.now(),frames=0,frameClock=0,uiClock=0;
  function frame(now){
    const dt=Math.min((now-previous)/1000,.05);previous=now;
    if(!document.hidden){
      elapsed+=dt;const active=started&&!modalOpen();
      if(active){
        stepPlayer(player,{forward:(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),right:(keys.has('KeyD')||keys.has('KeyE')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('KeyQ')||keys.has('ArrowLeft')?1:0),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight'),brake:keys.has('Space')},dt,world.obstacles);

      }
      world.cyclist?.update(player);
      // Orbit around the visible rider; the bike's heading is independent of the mouse.
      const viewYaw=player.yaw+orbitYaw, distance=5.8;
      cameraAim.set(player.x,1.15,player.z);
      cameraDesired.set(player.x-Math.sin(viewYaw)*distance*Math.cos(player.pitch),1.15+Math.sin(player.pitch)*distance,player.z+Math.cos(viewYaw)*distance*Math.cos(player.pitch));
      if(!started||!bob)camera.position.copy(cameraDesired);
      else camera.position.lerp(cameraDesired,1-Math.exp(-9*dt));
      const direction=camera.position.clone().sub(cameraAim), cameraDistance=direction.length();
      cameraRay.set(cameraAim,direction.normalize());cameraRay.far=cameraDistance;
      const hit=cameraRay.intersectObjects(world.cameraColliders,false)[0];
      if(hit)camera.position.copy(cameraAim).addScaledVector(direction,Math.max(.25,hit.distance-.3));
      camera.lookAt(cameraAim);
      world.update(elapsed,modalOpen()?0:dt,camera);renderer.render(scene,camera);
      uiClock+=dt;frameClock+=dt;frames++;
      if(frameClock>1){$('#performance').textContent=`${Math.round(Math.abs(player.speed)*3.6)} km/h · ${Math.round(frames/frameClock)} fps`;frameClock=0;frames=0;}
      if(uiClock>.12){updateHUD();uiClock=0;}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();releaseKeys();toast('Graphics paused. Waiting for the browser to restore the scene…');});
  renderer.domElement.addEventListener('webglcontextrestored',()=>toast('Graphics restored. Welcome back.'));
  addControls();
  if(import.meta.env.DEV){window.__ELSEWHERE__={getState:()=>({player:{...player},ready,started,night,quality,selected,discovered:[...discovered],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,obstacles:world.obstacles.length}),landmarks:LANDMARKS};}
}

function updateHUD(){
  for(const landmark of LANDMARKS){const distance=Math.hypot(player.x-landmark.x,player.z-landmark.z);$(`#distance-${landmark.id}`).textContent=`${Math.round(distance)}m`;
    if(started&&distance<landmark.radius&&!discovered.has(landmark.id)){
      discovered.add(landmark.id);storage.set('discoveries',[...discovered]);updateDiscoveries();
      $('#discovery-name').textContent=landmark.name;$('#discovery-description').textContent=landmark.subtitle;$('#discovery').classList.add('visible');
      clearTimeout(discoveryTimer);discoveryTimer=setTimeout(()=>$('#discovery').classList.remove('visible'),4500);
      if(discovered.size===LANDMARKS.length)$('#journey-hint').textContent='Every corner found. Stay a little longer.';
    }
  }
  $('#zone').textContent=player.x>64?'The old pier':player.x<-36&&player.z>50?'Jardim do Sol':player.x>35?'Seafront promenade':'Old town';
  drawMap();
}
function drawMap(){
  const canvas=$('#map'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#29474b';ctx.fillRect(0,0,w,h);
  const scale=1.13, ox=152,oz=173;
  const px=x=>ox+x*scale,pz=z=>oz+z*scale;
  const rect=(x,z,ww,dd,color)=>{ctx.fillStyle=color;ctx.fillRect(px(x),pz(z),ww*scale,dd*scale);};
  rect(-120,-140,184,260,'#68786c');rect(-120,-140,156,260,'#526457');rect(-31.5,-140,15,260,'#a4ad92');rect(-120,33,184,14,'#a4ad92');rect(64,-42,53,12,'#b4b294');rect(-101.5,53,65,60,'#415c44');rect(-59.5,53,5,60,'#9aa784');rect(-101.5,67.5,65,5,'#9aa784');
  for(const b of world.obstacles){if(b.maxX-b.minX>10&&b.maxZ-b.minZ>10)rect(b.minX,b.minZ,b.maxX-b.minX,b.maxZ-b.minZ,'#c2baa0');}
  ctx.strokeStyle='#a0b9aa25';ctx.lineWidth=1;for(let x=0;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  if(selected){const dest=LANDMARKS.find(l=>l.id===selected);ctx.beginPath();ctx.setLineDash([4,5]);ctx.strokeStyle='#e6ecbc70';ctx.moveTo(px(player.x),pz(player.z));ctx.lineTo(px(dest.x),pz(dest.z));ctx.stroke();ctx.setLineDash([]);}
  for(const landmark of LANDMARKS){ctx.beginPath();ctx.arc(px(landmark.x),pz(landmark.z),selected===landmark.id?10:7,0,Math.PI*2);ctx.fillStyle=selected===landmark.id?'#e7edbb':'#203c35';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#d3dcaf';ctx.stroke();ctx.fillStyle=selected===landmark.id?'#243c33':'#e5ebc5';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(discovered.has(landmark.id)?'✓':landmark.number.replace('0',''),px(landmark.x),pz(landmark.z)+.5);}
  ctx.save();ctx.translate(px(player.x),pz(player.z));ctx.rotate(player.yaw);ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(-10,-29);ctx.quadraticCurveTo(0,-34,10,-29);ctx.closePath();ctx.fillStyle='#f3f4d42b';ctx.fill();ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();ctx.fillStyle='#f7f7e4';ctx.shadowColor='#f5ffd4';ctx.shadowBlur=8;ctx.fill();ctx.restore();
}

function addControls(){
  const canvas=renderer.domElement;let dragging=false,lastX=0,lastY=0;
  const look=(dx,dy)=>{orbitYaw+=dx*.0023;player.pitch=Math.max(.05,Math.min(.85,player.pitch+dy*.0023));};
  async function lockLook(){if(document.pointerLockElement||!started||modalOpen())return;try{await canvas.requestPointerLock();}catch{toast('Drag the scene to look around. A and D steer the bike.');}}
  $('#enter').addEventListener('click',()=>{if(!ready)return;started=true;$('#intro').classList.add('hidden');$('#intro').inert=true;$('#ui').classList.add('playing','unlocked');canvas.focus();if(!matchMedia('(pointer:coarse)').matches)lockLook();});
  canvas.addEventListener('pointerdown',event=>{if(!started||modalOpen())return;canvas.focus();dragging=true;lastX=event.clientX;lastY=event.clientY;if(event.pointerType!=='mouse'){canvas.setPointerCapture(event.pointerId);}else if(!document.pointerLockElement)lockLook();});
  canvas.addEventListener('pointermove',event=>{if(!started||modalOpen())return;if(document.pointerLockElement===canvas)look(event.movementX,event.movementY);else if(dragging){look(event.clientX-lastX,event.clientY-lastY);lastX=event.clientX;lastY=event.clientY;}});
  const stopDrag=()=>{dragging=false;};window.addEventListener('pointerup',stopDrag);window.addEventListener('pointercancel',stopDrag);
  document.addEventListener('pointerlockchange',()=>{$('#ui').classList.toggle('unlocked',document.pointerLockElement!==canvas);releaseKeys();dragging=false;});
  document.addEventListener('pointerlockerror',()=>toast('Mouse capture is unavailable. Drag to look, or use A / D to steer.'));
  window.addEventListener('keydown',event=>{
    if(modalOpen()||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
    if(event.code==='KeyP'&&!event.repeat){document.body.classList.toggle('photo-hidden');event.preventDefault();return;}
    if(event.code==='Escape'){document.body.classList.remove('photo-hidden');releaseKeys();return;}
    if(!started)return;
    if(event.code==='KeyC'&&!event.repeat){orbitYaw=0;return;}
    if(event.code==='KeyR'&&!event.repeat){reset();return;}
    if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();if(event.code!=='Space'||!event.repeat)keys.add(event.code);}
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>{releaseKeys();dragging=false;audioContext?.suspend();});window.addEventListener('focus',()=>{if(soundOn)audioContext?.resume();});
  document.addEventListener('visibilitychange',()=>{releaseKeys();if(document.hidden)audioContext?.suspend();else if(soundOn)audioContext?.resume();});
  document.querySelectorAll('[data-key]').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(button.dataset.key));});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}

function openDialog(id){if(document.pointerLockElement)document.exitPointerLock();releaseKeys();$(id).showModal();}
$('#settings-button').onclick=()=>openDialog('#settings');$('#help-button').onclick=()=>openDialog('#help');
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',()=>renderer?.domElement.focus());});
$('#time-toggle').onclick=()=>setNight(!night);document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>setNight(b.dataset.time==='night'));
document.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>setQuality(b.dataset.quality));
$('#bob-toggle').onclick=()=>{bob=!bob;setBob();savePrefs();};$('#reset').onclick=()=>{reset();$('#settings').close();};
$('#save-spot').onclick=()=>{const saved=storage.set('spot',{x:player.x,z:player.z,yaw:player.yaw,pitch:player.pitch});toast(saved?'Your spot is saved. We’ll bring you back here.':'Your browser could not save this spot.');$('#settings').close();};
$('#photo-exit').onclick=()=>document.body.classList.remove('photo-hidden');
document.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>{selected=selected===b.dataset.destination?null:b.dataset.destination;updateDiscoveries();$('#journey-hint').textContent=selected?'Marker set. The dotted line points toward your destination.':'Choose a place to mark it on your map.';});
$('#photo').onclick=()=>{
  if(!renderer)return;renderer.render(scene,camera);
  renderer.domElement.toBlob(blob=>{if(!blob){toast('Photo couldn’t be saved. Please try again.');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`porto-sol-${night?'blue-hour':'golden-hour'}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('A little piece of Porto Sol, saved.');},'image/png');
};
$('#sound-toggle').onclick=async()=>{
  try{
    if(!audioContext){audioContext=new AudioContext();const length=audioContext.sampleRate*4,buffer=audioContext.createBuffer(1,length,audioContext.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<length;i++){last=(last+Math.random()*.035-.0175)*.99;data[i]=last*4;}
      const noise=audioContext.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=850;audioGain=audioContext.createGain();audioGain.gain.value=0;
      const lfo=audioContext.createOscillator();lfo.frequency.value=.11;const depth=audioContext.createGain();depth.gain.value=.018;lfo.connect(depth);depth.connect(audioGain.gain);lfo.start();noise.connect(filter);filter.connect(audioGain);audioGain.connect(audioContext.destination);noise.start();}
    soundOn=!soundOn;await audioContext.resume();audioGain.gain.setTargetAtTime(soundOn?.075:0,audioContext.currentTime,.5);if(!soundOn)setTimeout(()=>{if(!soundOn)audioContext.suspend();},900);
    $('#sound-toggle').innerHTML=icon(soundOn?'volume':'muted');$('#sound-toggle').setAttribute('aria-pressed',String(soundOn));$('#sound-toggle').setAttribute('aria-label',soundOn?'Mute ocean ambience':'Enable ocean ambience');
  }catch{toast('Audio is unavailable in this browser.');}
};

try{initialize();}catch(error){console.error(error);document.querySelector('#app').innerHTML=`<main class="fatal"><div><span class="eyebrow">A small detour</span><h1>The world couldn’t open.</h1><p>This experience needs WebGL 2. Try a recent Chrome, Edge, Firefox, or Safari with hardware acceleration enabled.</p><button class="enter" id="retry">Try again ${icon('arrow')}</button></div></main>`;$('#retry').onclick=()=>location.reload();}
