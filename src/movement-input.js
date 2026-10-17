// On foot Shift is also a run-forward control; bicycles still require pedaling.
export function movementInput(keys,mode){
  const sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
  const back=keys.has('KeyS')||keys.has('ArrowDown');
  const forward=keys.has('KeyW')||keys.has('ArrowUp')||(mode==='walking'&&sprint&&!back);
  return {
    forward:Number(forward)-Number(back),
    right:Number(keys.has('KeyD')||keys.has('KeyE')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('KeyQ')||keys.has('ArrowLeft')),
    sprint,brake:keys.has('Space')&&mode!=='walking',jump:keys.has('Space')&&mode==='walking',
  };
}
