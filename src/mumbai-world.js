import * as T from 'three';
import { World } from './world.js';
import { MUMBAI_ROADS } from './mumbai-layout.js';

export class MumbaiWorld extends World {
  constructor(scene,renderer,manager){super(scene,renderer,manager,'mumbai');}
  mesh(geometry,...args){
    // Extruded pediments and faceted crowns are non-indexed; batches need one format.
    if(geometry.index){const original=geometry;geometry=geometry.toNonIndexed();original.dispose();}
    super.mesh(geometry,...args);
  }
  materials(){
    super.materials();
    Object.assign(this.m,{cobalt:this.mat(0x486ab0),plaster:this.mat(0xb8aa8c),turquoise:this.mat(0x138f83),shutter:this.mat(0x7c8989,.72,.25),marigold:this.mat(0xffbc16),rose:this.mat(0xc9938d),wire:this.mat(0x292924)});
    this.m.road.color.set(0xd5cfc3);
  }
  ground(){
    this.box(184,3,260,-28,-1.53,-10,this.m.plaster);
    this.box(184,.06,260,-28,-.03,-10,this.m.pavement);
    for(const r of MUMBAI_ROADS)this.box(r.w,.04,r.d,r.x,.015,r.z,this.m.road);
    // Perimeter walls also close off the coastal world's pier boundary.
    for(const [x,z,w,d] of [[-116,-10,1,255],[60,-10,1,255],[-28,-136,176,1],[-28,116,176,1]]){
      this.box(w,2.6,d,x,1.3,z,this.m.plaster);this.obstacle(x,z,w,d);
    }
  }
  neighborhood(){
    this.church();
    this.temple();
    // Continuous residential blocks frame three connected east–west lanes.
    for(const [a,b] of [[-101,15],[25,91]]){
      for(let z=a+8;z<b-4;z+=14){
        this.home(-89,z,39,12,5+this.random()*4,true);
        if(z<32||z>75)this.home(25,z,39,12,6+this.random()*5,false);
        this.home(-32.5,z,54,12,4.5+this.random()*4,true);
      }
    }
    // A turquoise shop and hanging flowers facing Marigold lane.
    this.box(10,4,8,-48,2,10,this.m.turquoise);
    this.sign('FLOWERS · फूल',-48,3.4,14.12,8,.65,0,'#157c71');
    for(let x=-52;x<-44;x+=.45){
      for(let y=1.2;y<3;y+=.18)this.mesh(new T.SphereGeometry(.11,5,4),this.m.marigold,x,y,14.25);
    }
    this.obstacle(-48,10,10,8);
  }
  home(x,z,w,d,h,east){
    const colors=[this.m.cream,this.m.plaster,this.m.sage,this.m.peach];
    this.box(w,h,d,x,h/2,z,colors[Math.floor(this.random()*colors.length)]);this.obstacle(x,z,w,d);
    this.box(w+.35,.22,d+.35,x,h,z,this.m.trim);
    // Both street-facing elevations have grilles, balconies, AC boxes, and shutters.
    for(const side of [-1,1]){
      const face=x+side*(w/2+.08),angle=side*Math.PI/2;
      for(let y=4.5;y<h-1;y+=3){
        for(const dz of [-3.5,2.8]){
          this.box(.12,1.45,1.7,face,y,z+dz,this.m.glass);
          this.box(.65,.15,2.1,face+side*.2,y-.85,z+dz,this.m.trim);
          for(let k=-.6;k<=.6;k+=.3)this.box(.18,1.5,.045,face+side*.12,y,z+dz+k,this.m.dark);
          this.box(.6,.5,.85,face+side*.22,y-.8,z+dz+1.5,this.m.shutter);
        }
        this.box(.16,.15,d,face,y+1.2,z,this.m.trim);
      }
      for(const dz of [-3,2.8]){
        this.box(.12,2.7,3.2,face,1.4,z+dz,this.m.shutter);
        for(let y=.2;y<2.8;y+=.17)this.box(.15,.028,3.18,face+side*.02,y,z+dz,this.m.dark);
      }
      this.box(1,.12,d-.4,face+side*.4,3.1,z,this.m.tile);
      if(east&&this.random()>.7)this.sign('GENERAL STORES',face+side*.03,3.65,z,8,.6,angle,'#755a3f');
    }
    this.cylinder(.7,.7,1.25,x, h+.7,z,this.m.dark,10);
    // Patches of weathered plaster along the foot of the walls.
    for(let i=0;i<8;i++)this.box(.035,.2+this.random()*.6,.4+this.random(),x+w/2+.1,.35,z-d/2+this.random()*d,this.m.plaster);
  }
  church(){
    // A cream trapezoidal pediment edged in blue, as in the reference frontage.
    const pediment=(width,height,x,y,z,mat)=>{
      const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width*.28,height);shape.lineTo(-width*.28,height);shape.closePath();
      const geo=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false});geo.rotateY(-Math.PI/2);this.mesh(geo,mat,x,y,z);
    };
    pediment(6,4,10.1,9.5,54,this.m.cobalt);pediment(5.3,3.4,9.9,9.7,54,this.m.cream);
    this.box(.3,2.1,.18,9.65,11.4,54,this.m.rose);this.box(.3,.18,1.15,9.65,11.8,54,this.m.rose);
    // Covered entrance: shallow terracotta roof, corrugations, and slim posts.
    this.box(5.5,.18,12,8,3.8,54,this.m.tile);
    for(let z=48;z<60;z+=.3)this.box(5.5,.05,.04,8,3.91,z,this.m.trim);
    for(const z of [48.5,59.5])this.box(.13,3.8,.13,5.5,1.9,z,this.m.dark);
    this.box(25,10,26,23,5,54,this.m.cream);this.obstacle(23,54,25,26);
    this.box(.22,5.8,26,10.38,7.2,54,this.m.cobalt);
    this.box(25,.4,26.5,23,10,54,this.m.cobalt);
    for(let z=44;z<67;z+=5){
      this.box(.25,2.2,2.3,10.2,6.6,z,this.m.glass);
      this.box(.3,.25,2.7,10.1,5.4,z,this.m.trim);
      this.box(.28,.5,.4,10.2,9.3,z,this.m.trim);
    }
    this.box(6,15,6,22,7.5,51,this.m.cream);this.box(6.8,.4,6.8,22,15,51,this.m.trim);
    this.box(.3,1.4,1,18.9,13,51,this.m.glass);
    // Cross and headquarters signage on the lane-facing facade.
    this.box(.3,2.4,.22,10,8,54,this.m.rose);this.box(.3,.22,1.25,10,8.45,54,this.m.rose);
    this.sign('CHURCH OF GOD (FULL GOSPEL) IN INDIA',10.05,4.5,54,11,.85,-Math.PI/2,'#eee4cc','#253743');
    // The compound wall leaves the church gate visible from the starting lane.
    for(const [z,d] of [[37,15],[72,15]]){
      this.box(.55,2.1,d,5,1.05,z,this.m.plaster);this.obstacle(5,z,.55,d);
      for(let zz=z-d/2;zz<z+d/2;zz+=3)this.box(.65,2.3,.4,5,1.15,zz,this.m.cobalt);
    }
    this.box(.35,.9,10,5,3.1,54,this.m.rose);
    this.sign('CHURCH OF GOD · HEAD QUARTERS',4.78,3.1,54,9,.8,-Math.PI/2,'#c9938d','#292f36');
    for(const z of [48.5,59.5])this.box(.8,3.8,.8,5,1.9,z,this.m.dark);
    for(let z=49;z<59;z+=.32)this.box(.14,2.7,.07,5,1.35,z,this.m.dark);
    for(const y of [.3,2.4])this.box(.16,.1,10,5,y,54,this.m.dark);
    this.obstacle(5,54,.4,11);
    this.box(5,.2,12,8,.05,54,this.m.pavement);
  }
  temple(){
    // Colorful gateway at the lane junction, inspired by the additional photos.
    this.box(18,6,13,-84,3,20,this.m.cream);this.obstacle(-84,20,18,13);
    for(const z of [15,25]){
      this.box(1.5,7,1.5,-74,3.5,z,this.m.rose);
      for(let i=0;i<5;i++){
        const width=2.3-i*.3;
        this.box(width,.48,width,-74,7.2+i*.55,z,[this.m.turquoise,this.m.rose,this.m.cream][i%3]);
      }
      this.mesh(new T.SphereGeometry(.55,12,8),this.m.marigold,-74,10,z);
      this.obstacle(-74,z,1.5,1.5);
    }
    this.box(1.6,.75,11,-74,6,20,this.m.rose);
    this.box(1.75,.2,11.5,-74,6.5,20,this.m.turquoise);
    for(let z=16;z<25;z+=1){
      this.box(.2,1,.65,-73.1,7.2,z,this.m.turquoise);
      this.mesh(new T.SphereGeometry(.22,8,6),this.m.marigold,-72.95,7.25,z);
    }
    for(let z=15.8;z<24.5;z+=.3)this.box(.08,3,.055,-74,1.5,z,this.m.dark);
    this.obstacle(-74,20,.2,10);
    this.sign('SHRINAGAR COMPLEX ROAD',-73,5,20,9,.6,Math.PI/2,'#e0c48a','#4f3934');
    this.bench(-70,28,Math.PI/2);
    // A small delivery van, parked beyond the junction's turning space.
    this.car(-67,36,0xeee9d8);
    this.box(1.75,1.5,2.5,-67,1.9,37,this.m.white);
    this.sign('GOODS CARRIER',-67,2.1,35.7,1.6,.38,0,'#e5e1cd','#3b6b76');
  }
  waterfront(){} // Mumbai has a closed urban perimeter, without a coast or pier.
  garden(){
    for(const x of [-5.3,6.5,-70])for(let z=-96;z<100;z+=16){
      if(x===6.5&&z>30&&z<80)continue;
      this.treePositions.push({x,z,scale:10+this.random()*4});this.obstacle(x,z,.7,.7);
      // Small low-poly crown remains as a fallback if the detailed asset fails.
      this.cylinder(.16,.26,6,x,3,z,this.m.wood);
      for(let i=0;i<9;i++){
        const a=i*2.4,r=i===0?0:2.3;
        const crown=new T.IcosahedronGeometry(1.5+this.random()*.5,1);crown.scale(1,.55,1);
        this.mesh(crown,i%3===0?this.m.palm:this.m.leaves,x+Math.cos(a)*r,7.5+this.random()*1.6,z+Math.sin(a)*r);
      }
    }
  }
  scooter(x,z,angle,color){
    const paint=color;
    const part=(geo,mat,xx,y,zz)=>{geo.translate(xx,y,zz);geo.rotateY(angle);this.mesh(geo,mat,x,0,z);};
    const box=(w,h,d,xx,y,zz,mat)=>part(new T.BoxGeometry(w,h,d),mat,xx,y,zz);
    for(const zz of [-.65,.65]){const wheel=new T.CylinderGeometry(.26,.26,.15,12);wheel.rotateZ(Math.PI/2);part(wheel,this.m.tire,0,.27,zz);}
    box(.5,.45,.75,0,.6,.3,paint);box(.45,.12,.95,0,.86,.15,this.m.tire);
    box(.5,.65,.18,0,.65,-.55,paint);box(.42,.12,.7,0,.25,-.12,this.m.shutter);
    box(.72,.065,.07,0,1.12,-.56,this.m.chrome);box(.3,.17,.08,0,.96,-.67,this.m.lamp);
    for(const side of [-1,1]){box(.03,.28,.03,side*.34,1.25,-.56,this.m.chrome);box(.16,.1,.07,side*.34,1.41,-.56,this.m.chrome);}
    this.obstacle(x,z,1.7,1.7);
  }
  details(){
    for(let z=-92;z<93;z+=7){
      if(z>43&&z<65)continue;
      this.scooter(2.65,z,-.65,[this.m.dark,this.m.rose,this.m.turquoise,this.m.shutter][Math.floor(this.random()*4)]);
      if(z%3===0)this.scooter(-2.8,z,.65,this.m.dark);
    }
    this.car(-67,-42,0xc6c9bc);this.car(-62,65,0xb2bab5);
    // A black-and-yellow auto rickshaw tucked beside the side lane.
    this.box(1.6,1.1,2.7,-58,.65,23,this.m.dark);this.box(1.7,.22,2.3,-58,1.7,23,this.m.marigold);
    this.box(1.5,.65,.1,-58,1.25,21.7,this.m.glass);this.obstacle(-58,23,1.8,2.8);
    for(const x of [-58.7,-57.3])for(const z of [22.2,23.8])this.mesh(new T.SphereGeometry(.3,8,6),this.m.tire,x,.3,z);
    for(let z=-96;z<100;z+=28){
      this.lamp(-4.7,z);
      // Sagging utility cables follow the lane overhead.
      const points=[new T.Vector3(-4.7,6,z),new T.Vector3(-4.7,5.4,z+14),new T.Vector3(-4.7,6,z+28)];
      this.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.018,4,false),this.m.wire);
      this.cylinder(.06,.08,6,-4.7,3,z,this.m.dark);
      this.box(1.1,.025,.55,2.2,.045,z+4,this.m.dark);
      for(let dx=-.45;dx<=.45;dx+=.13)this.box(.035,.03,.55,2.2+dx,.065,z+4,this.m.shutter);
    }
    this.sign('MUKUND NAGAR',-5,2.3,24,3.6,.65,0,'#36545b');
  }
}
