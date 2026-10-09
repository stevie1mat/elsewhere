import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function detailedCarGeometry(){
  const parts=Object.fromEntries(['paint','glass','rubber','alloy','trim','headlight','taillight','plate','accent'].map(k=>[k,[]]));
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  function add(g,key,x=0,y=0,z=0){if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));g.translate(x,y,z);parts[key].push(g);return g;}
  function box(w,h,d,x,y,z,key,r=.025){return add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),key,x,y,z);}
  function curve(points,r,key,segments=24){return add(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,r,6,false),key);}
  function surface(fn,rows,cols,key,exclude){
    const p=[],uv=[],indices=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){p.push(...fn(i/cols,j/rows));uv.push(i/cols,j/rows);}
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const a=j*(cols+1)+i,b=a+cols+1;
      for(const tri of [[a,b,a+1],[a+1,b,b+1]]){
        if(!exclude||!tri.some(n=>exclude(p[n*3],p[n*3+1],p[n*3+2])))indices.push(...tri);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(g,key);
  }
  const width=z=>.79+.18*Math.exp(-Math.pow((z+1.25)/.62,2))+.19*Math.exp(-Math.pow((z-1.24)/.66,2))-.06*Math.pow(Math.abs(z)/2.13,8);
  const deck=(x,z)=>.78+.13*Math.exp(-Math.pow((z-1.2)/.8,2))+.18*Math.pow(Math.abs(x)/width(z),3)*(Math.exp(-Math.pow((z+1.25)/.65,2))+Math.exp(-Math.pow((z-1.25)/.7,2)));
  // A continuous sculpted shell replaces the box body. Wheel openings are cut
  // out of the outer panels, with flared shoulders over the low-profile tires.
  surface((u,t)=>{
    const z=-2.12+4.24*t,a=u*Math.PI*2;
    const x=width(z)*Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.55);
    const y=Math.sin(a)>=0?.63+(deck(x,z)-.63)*Math.pow(Math.sin(a),.6):.63-.36*Math.pow(-Math.sin(a),.4);
    return [x,y,z];
  },120,48,'paint',(x,y,z)=>Math.abs(x)>.72&&[-1.28,1.28].some(c=>(z-c)**2+(y-.435)**2<.475**2));
  // Front and rear fascia close the shell with rounded, deeply recessed intakes.
  box(1.71,.36,.13,0,.51,-2.06,'paint',.055);box(1.72,.38,.14,0,.54,2.04,'paint',.06);
  box(1.91,.055,4.03,0,.27,0,'rubber',.02);
  const cabin=(u,t,lift=0)=>{
    const z=-1.05+2.3*t,arch=Math.pow(Math.sin(Math.PI*t),.75),a=u*Math.PI;
    return [.76*Math.cos(a)*(1-.09*arch),.82+.58*arch*Math.pow(Math.sin(a),.52)+lift,z];
  };
  surface((u,t)=>cabin(u,t),40,32,'glass');
  surface((u,t)=>cabin(.28+u*.44,.36+t*.5,.012),24,18,'paint');
  for(const side of [-1,1]){
    // Sweeping C-shaped intake surround, characteristic of a modern hypercar.
    const intake=new T.Shape();intake.moveTo(-.03,.43);intake.bezierCurveTo(.6,.4,.98,.54,.93,.93);intake.bezierCurveTo(.68,1.04,.25,.84,-.03,.43);
    const g=new T.ShapeGeometry(intake,24);g.rotateY(Math.PI/2);add(g,'rubber',side*.843,0,0);
    curve([v(side*.78,.4,-.58),v(side*.88,.42,.48),v(side*.93,.65,.91),v(side*.79,1.05,.91),v(side*.58,1.34,.5),v(side*.54,1.4,.05)],.027,'alloy',36);
    curve([v(side*.72,.87,-.99),v(side*.66,1.18,-.64),v(side*.52,1.36,-.2)],.029,'paint');
    curve([v(side*.76,.86,-.9),v(side*.78,.84,-.05),v(side*.76,.9,.63)],.013,'trim');
    curve([v(side*.793,.83,-.64),v(side*.84,.55,-.57),v(side*.85,.41,-.38),v(side*.84,.4,.3)],.006,'rubber');
    box(.022,.035,.16,side*.805,.8,-.24,'trim',.013);
    curve([v(side*.73,.94,-.7),v(side*.95,.96,-.75)],.024,'trim',3);
    const mirror=new T.SphereGeometry(1,20,12);mirror.scale(.145,.075,.13);add(mirror,'paint',side*.99,1.0,-.76);
    box(.21,.09,.015,side*.99,1.0,-.645,'glass',.025);
    for(const z of [-1.28,1.28]){
      const arch=new T.TorusGeometry(.479,.014,6,40,Math.PI);arch.rotateY(Math.PI/2);add(arch,'paint',side*.97,.435,z);
    }
    // Four individual LED elements behind each dark lamp housing.
    box(.43,.12,.08,side*.61,.77,-2.045,'rubber',.035);
    for(let i=0;i<4;i++)box(.068,.065,.018,side*(.46+i*.09),.78,-2.092,'headlight',.015);
    box(.39,.016,.025,side*.60,.718,-2.095,'headlight',.005);
    box(.51,.19,.055,side*.61,.43,-2.139,'rubber',.04);
    for(let row=0;row<4;row++)for(let col=0;col<10;col++){
      const hex=new T.TorusGeometry(.022,.003,3,6);add(hex,'trim',side*.61+(col-4.5)*.046+(row%2)*.02,.365+row*.042,-2.17);
    }
    box(.63,.032,.04,side*.49,.83,2.12,'taillight',.014);
    const exhaust=new T.CylinderGeometry(.068,.068,.16,16,1,true);exhaust.rotateX(Math.PI/2);add(exhaust,'alloy',side*.66,.35,2.095);
    for(let i=0;i<3;i++)box(.025,.1,.27,side*(.18+i*.16),.29,1.99,'rubber',.007);
  }
  // Horseshoe grille and mesh, with a slim chrome perimeter.
  const grille=new T.Shape();grille.moveTo(-.24,.3);grille.lineTo(-.24,.63);grille.bezierCurveTo(-.24,.9,.24,.9,.24,.63);grille.lineTo(.24,.3);grille.closePath();
  add(new T.ShapeGeometry(grille,24),'rubber',0,0,-2.151);
  curve([v(-.25,.3,-2.18),v(-.25,.64,-2.18),v(-.17,.8,-2.18),v(0,.85,-2.18),v(.17,.8,-2.18),v(.25,.64,-2.18),v(.25,.3,-2.18)],.022,'alloy',40);
  for(let row=0;row<10;row++)for(let col=0;col<9;col++){
    const x=(col-4)*.05+(row%2)*.022,y=.33+row*.047;
    if(y>.63&&x*x+(y-.63)**2>.21**2)continue;
    add(new T.TorusGeometry(.025,.003,3,6),'trim',x,y,-2.16);
  }
  // Warm accent sweeps across the hood without hiding its compound curvature.
  for(const side of [-1,1])surface((u,t)=>{
    const z=-1.99+t*.89,x=side*(.3+t*.25+u*.14*(1-t));const sine=Math.sqrt(1-Math.pow(Math.abs(x)/width(z),2/.55));return [x,.63+(deck(x,z)-.63)*Math.pow(sine,.6)+.006,z];
  },16,4,'accent');
  box(.43,.1,.02,0,.56,2.13,'plate',.01);
  for(let i=0;i<7;i++)box(1.15,.025,.06,0,.92+i*.002,1.17+i*.1,'rubber',.008);
  // Large split-spoke wheels, brake rotors and contrasting calipers.
  for(const side of [-1,1])for(const z of [-1.28,1.28]){
    const tire=new T.TorusGeometry(.348,.082,12,48);tire.rotateY(Math.PI/2);add(tire,'rubber',side*.93,.435,z);
    const liner=new T.CylinderGeometry(.325,.325,.14,32);liner.rotateZ(Math.PI/2);add(liner,'rubber',side*.94,.435,z);
    const rim=new T.TorusGeometry(.318,.016,8,40);rim.rotateY(Math.PI/2);add(rim,'alloy',side*1.015,.435,z);
    const disc=new T.CylinderGeometry(.267,.267,.01,32);disc.rotateZ(Math.PI/2);add(disc,'trim',side*.997,.435,z);
    box(.045,.22,.085,side*1.007,.435,z+.21,'accent',.024);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      for(const delta of [-.16,.16])curve([v(side*1.025,.435+Math.sin(a)*.065,z+Math.cos(a)*.065),v(side*1.025,.435+Math.sin(a+delta)*.3,z+Math.cos(a+delta)*.3)],.016,'alloy',1);
      add(new T.SphereGeometry(.011,6,4),'alloy',side*1.036,.435+Math.sin(a)*.044,z+Math.cos(a)*.044);
    }
    const hub=new T.CylinderGeometry(.07,.07,.035,16);hub.rotateZ(Math.PI/2);add(hub,'trim',side*1.023,.435,z);
  }
  return Object.fromEntries(Object.entries(parts).map(([key,list])=>{const g=mergeGeometries(list,false);list.forEach(p=>p.dispose());return [key,g];}));
}
