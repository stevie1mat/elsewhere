// Shared café furniture: the city and training pad use the same asset builder.
export function buildCafeTable(w,x,z,{chairs=true}={}){
    w.cylinder(.7, .7, .09, x, .79, z, w.m.teak, 20); w.cylinder(.05, .08, .76, x, .38, z, w.m.dark, 8);
    w.cylinder(.34, .34, .06, x, .035, z, w.m.dark, 12);
    for (const dz of (chairs?[-1.2, 1.2]:[])) {
      w.interactionObjects?.push({id:`chair:${x}:${z}:${dz}`,name:'Café chair',type:'chair',x,y:.52+(w.elevationOffset||0),z:z+dz,yaw:dz>0?0:Math.PI,approach:{x:x+1.4,z:z+dz},affordances:['sit']});
      w.box(.62, .08, .6, x, .48, z + dz, w.m.teak); w.box(.64, .7, .065, x, .8, z + dz + Math.sign(dz) * .25, w.m.teak);
      for (const dx of [-.23, .23]) for (const q of [-.2, .2]) w.box(.045, .47, .045, x + dx, .23, z + dz + q, w.m.dark); w.obstacle(x, z + dz, .65, .6);
    }
    w.cylinder(.07, .09, .2, x, .93, z, w.m.trim, 8); w.obstacle(x, z, 1.4, 1.4);
}
