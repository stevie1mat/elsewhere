// One authoritative landscape for rendering, movement, landing and co-op.
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function groundElevation(x,z){
  if(x < -480 || x > 64 || z < -400 || z > 360)return 0;
  return 32*smooth(235,475,-x);
}
export function shorelineX(z){
  if(z < -400 || z > 360)return 64;
  // Harbor mouth remains at the old pier; headlands curve outward to either side.
  return 64+58*smooth(55,170,Math.abs(z+36))*Math.sin(Math.PI*(z+400)/760);
}
