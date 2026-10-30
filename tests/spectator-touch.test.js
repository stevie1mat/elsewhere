import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSpectatorCamera} from '../src/spectator-camera.js';
test('touch orbit, two-finger pinch and zoom buttons change the observer camera without moving resident',()=>{
 const original=globalThis.document,buttons=new Map();const controls={set innerHTML(v){},querySelector(selector){if(!buttons.has(selector))buttons.set(selector,{});return buttons.get(selector);}};
 globalThis.document={createElement:()=>controls,querySelector:()=>({append(){}})};
 try{
  const camera=new THREE.PerspectiveCamera(),canvas=new EventTarget();canvas.setPointerCapture=()=>{};const view=createSpectatorCamera(camera,canvas),resident={x:0,y:0,z:0};view.update(resident,'landed');const initial=camera.position.clone();
  const dispatch=(type,id,x,y)=>{const event=new Event(type);Object.assign(event,{pointerId:id,clientX:x,clientY:y,button:0,shiftKey:false});canvas.dispatchEvent(event);};
  dispatch('pointerdown',1,100,100);dispatch('pointermove',1,130,110);view.update(resident,'landed');assert.ok(camera.position.distanceTo(initial)>1);
  dispatch('pointerup',1,130,110);view.locate();view.update(resident,'landed');const origin=new THREE.Vector3(0,1,0),before=camera.position.distanceTo(origin);
  dispatch('pointerdown',1,100,100);dispatch('pointerdown',2,200,100);dispatch('pointermove',2,300,100);view.update(resident,'landed');assert.ok(camera.position.distanceTo(origin)<before*.8,'pinch apart zooms in');
  dispatch('pointercancel',2,300,100);dispatch('pointerup',1,100,100);const afterPinch=camera.position.clone();buttons.get('[aria-label="Zoom camera out"]').onclick();view.update(resident,'landed');assert.ok(camera.position.distanceTo(afterPinch)>1);assert.deepEqual(resident,{x:0,y:0,z:0});
 }finally{globalThis.document=original;}
});
