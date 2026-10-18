import * as T from 'three';

// Continuous eroded landforms replace the isolated seven-sided cones.
export function createHighlands() {
  const geometry = new T.PlaneGeometry(2300, 1800, 150, 120);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position, colors = [];
  const noise = (x,z) => Math.sin(x*.009+Math.sin(z*.006)*2)*.5+Math.sin(z*.013+x*.004)*.28+Math.sin(x*.031-z*.023)*.14+Math.sin(x*.071+z*.057)*.06;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i);
    const edge=Math.pow(Math.max(0,1-Math.pow(x/1150,4)),2)*Math.pow(Math.max(0,1-Math.pow(z/900,4)),2);
    const ridge=.58+.42*Math.sin(x*.003+z*.0015+1);
    p.setY(i,-7+edge*(100+ridge*180+noise(x,z)*85));
  }
  geometry.computeVertexNormals();
  for(let i=0;i<p.count;i++) {
    const slope=1-geometry.attributes.normal.getY(i),h=p.getY(i);
    const c=new T.Color(0x65836d).lerp(new T.Color(0xb2aaa0),T.MathUtils.smoothstep(slope,.15,.6));
    c.lerp(new T.Color(0x7b94a2),T.MathUtils.smoothstep(h,130,300)*.4);
    c.multiplyScalar(.94+noise(p.getX(i)*2,p.getZ(i)*2)*.09);colors.push(c.r,c.g,c.b);
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));
  mesh.name='Continuous coastal highlands';mesh.position.set(-1700,0,-1550);mesh.receiveShadow=true;
  return mesh;
}
