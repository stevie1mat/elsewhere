import * as T from 'three';

// All ornaments join existing material batches; no per-frame work or extra
// texture downloads. Facade decorations stay above pedestrian head height.
export function enrichCity(w) {
  const foliage=(x,y,z,size=.35,material=w.m.leaves)=>{
    const g=new T.IcosahedronGeometry(size,1);g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));g.scale(1,.65,1);
    w.mesh(g,material,x,y,z);
  };
  for(const b of w.cityBuildings){
    if(b.architecture)continue;
    const {x,z,width,depth,height,shop,front}=b;
    w.elevationOffset=b.base||0;
    const variant=Math.abs(Math.round(x*7+z*11))%3;
    const east=x+width/2,south=z+depth/2;
    // Flower boxes and climbing foliage on alternating existing balconies.
    for(let zz=z-depth/2+2.2,index=0;zz<z+depth/2-1;zz+=3.6,index++){
      if(index%2===variant%2){
        w.box(.42,.3,1.5,east+1.05,3.65,zz,w.m.terra);
        for(let j=-1;j<=1;j++){
          foliage(east+1.08,3.92,zz+j*.46,.31);
          foliage(east+1.13,4.03,zz+j*.46,.2,j===0?w.m.trim:w.m.flower);
        }
      }
    }
    // Give formerly blank rear and side walls windows, sills, and shutters.
    for(let y=4.7;y<height-1.4;y+=3.25){
      for(let dx=-width/2+3;dx<width/2-2;dx+=5){
        w.box(1.5,1.9,.16,x+dx,y,z-depth/2-.12,w.m.glass);
        w.box(2.1,.16,.42,x+dx,y-1,z-depth/2-.2,w.m.trim);
        w.box(.42,1.9,.2,x+dx-1,y,z-depth/2-.14,w.m.sage);
      }
      for(let dz=-depth/2+3;dz<depth/2-2;dz+=5){
        w.box(.16,1.9,1.5,x-width/2-.12,y,z+dz,w.m.glass);
        w.box(.42,.16,2.1,x-width/2-.2,y-1,z+dz,w.m.trim);
      }
    }
    // Rainwater pipes anchor the scale of each facade.
    for(const dz of [-depth/2+.65,depth/2-.65]){
      w.cylinder(.055,.055,height-.5,east+.22,(height-.5)/2+.25,z+dz,w.m.dark,6);
      for(const y of [1.2,height*.5,height-1])w.box(.18,.08,.18,east+.22,y,z+dz,w.m.dark);
    }
    if(front==='south'&&shop){
      const aw=Math.min(width-2,10);
      w.box(aw,.12,1.8,x,2.75,south+.8,w.m.sage);
      for(let dx=-aw/2+.2;dx<aw/2;dx+=.8){
        w.box(.34,.035,1.83,x+dx,2.83,south+.8,w.m.trim);
        w.box(.34,.28,.08,x+dx,2.64,south+1.7,w.m.trim);
      }
    }
    if(variant===0){
      // Roof terraces: a timber pergola, seating, and planted parapets.
      const y=height+.4;
      for(const dx of [-2,2])for(const dz of [-2,2])w.box(.13,2.3,.13,x+dx,y+1.15,z+dz,w.m.wood);
      for(let dx=-2.2;dx<=2.2;dx+=.55)w.box(.14,.18,4.6,x+dx,y+2.35,z,w.m.wood);
      w.box(2.8,.16,.7,x,y+.55,z+1,w.m.teak);
      for(const dx of [-1,1])w.box(.12,.5,.6,x+dx,y+.25,z+1,w.m.dark);
      for(const dx of [-width/2+2,width/2-2]){
        w.box(1.2,.6,2.6,x+dx,y+.3,z,w.m.terra);
        for(const dz of [-.8,0,.8])foliage(x+dx,y+.95,z+dz,.75);
      }
    }else{
      // Dormer windows and chimney caps break up repeated roof silhouettes.
      const rise=Math.min(width*.16,3.4),y=height+.4+rise*.57;
      for(const dz of [-depth*.23,depth*.23]){
        w.box(1.4,1.35,1.7,x+width*.21,y,z+dz,w.m.cream);
        w.box(.15,.85,1.05,x+width*.21+.78,y+.1,z+dz,w.m.glass);
        w.box(1.8,.16,2,x+width*.21,y+.76,z+dz,w.m.tile);
      }
    }
  }
  w.elevationOffset=0;
  // Planted beds on existing park lawns, outside paths and quest stops.
  for(const [x,z] of [[-89,61],[-89,101],[-191,61],[-166,117]]){
    w.box(4.6,.4,2.2,x,.2,z,w.m.terra);
    w.box(4.3,.1,1.9,x,.43,z,w.m.wood);
    for(let j=0;j<9;j++){
      const xx=x-1.8+(j%5)*.9,zz=z+(j<5?-.45:.45);
      foliage(xx,.85,zz,.65);foliage(xx,1.08,zz,.3,j%3?w.m.flower:w.m.trim);
    }
    w.obstacle(x,z,4.6,2.2);
  }
}
