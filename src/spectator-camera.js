import * as THREE from 'three';
// The view belongs to the observer. It never inherits the resident's heading
// or position after the initial framing (or an explicit Locate click).
export function createSpectatorCamera(camera,canvas){
  const target=new THREE.Vector3();let yaw=.7,pitch=.72,distance=26,phase=null,pose=null,drag=null;
  const controls=document.createElement('div');controls.id='spectator-controls';
  controls.innerHTML='<button type="button">◎ Locate resident</button><div class="spectator-zoom"><button type="button" aria-label="Zoom camera in">＋ Zoom in</button><button type="button" aria-label="Zoom camera out">− Zoom out</button></div><small>Drag to orbit · Shift/right-drag to pan · scroll to zoom. Touch: one finger orbits; two fingers pan and pinch to zoom.</small>';
  document.querySelector('#app').append(controls);
  function locate(close=false){if(close){distance=8;pitch=.45;}if(pose)target.set(pose.x,(pose.y||0)+1,pose.z);}
  controls.querySelector('button').onclick=()=>locate();
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const pointers=new Map();let gesture=null;
  const zoom=factor=>{distance=Math.max(6,Math.min(180,distance*factor));};
  const pan=(dx,dy)=>{const scale=distance*.0018;target.x+=(Math.cos(yaw)*dx-Math.sin(yaw)*dy)*scale;target.z-=(Math.sin(yaw)*dx+Math.cos(yaw)*dy)*scale;};
  const gestureNow=()=>{const [a,b]=[...pointers.values()];return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)}:null;};
  controls.querySelector('[aria-label="Zoom camera in"]').onclick=()=>zoom(.8);controls.querySelector('[aria-label="Zoom camera out"]').onclick=()=>zoom(1.25);
  canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2};gesture=gestureNow();canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size>=2){const next=gestureNow();if(gesture){pan(next.x-gesture.x,next.y-gesture.y);if(next.d>0&&gesture.d>0)zoom(gesture.d/next.d);}gesture=next;return;}
    if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    if(drag.pan)pan(dx,dy);else{yaw-=dx*.005;pitch=Math.max(.15,Math.min(1.4,pitch+dy*.004));}
  });
  const release=e=>{pointers.delete(e.pointerId);gesture=null;const remaining=[...pointers.values()][0];drag=remaining?{...remaining,pan:false}:null;};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(6,Math.min(180,distance*Math.exp(e.deltaY*.001)));},{passive:false});
  return {locate,update(next,arrivalPhase){pose=next;if(phase===null||phase!==arrivalPhase){phase=arrivalPhase;locate();}
    camera.position.set(target.x+Math.sin(yaw)*distance*Math.cos(pitch),target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(target);
  }};
}
