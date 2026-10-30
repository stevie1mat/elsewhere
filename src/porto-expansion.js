import {expandOutskirts,OUTSKIRT_ROADS} from './porto-outskirts.js';
import {PORTO_ROADS} from '../server/shared/roads.js';
export {PORTO_ROADS};

export function expandPorto(w) {
  for(const road of PORTO_ROADS.slice(2,7)){
    w.box(road.w,.04,road.d,road.x,.01,road.z,w.m.road);
    if(road.d>road.w){
      for(let z=-250;z<194;z+=10){if([-232,-158,40,136].every(c=>Math.abs(z-c)>11))w.box(.13,.01,4,road.x,.04,z,w.m.stripe);}
    }else{
      for(let x=-230;x<62;x+=10){if([-218,-142,-24].every(c=>Math.abs(x-c)>11))w.box(4,.01,.13,x,.04,road.z,w.m.stripe);}
    }
  }
  const colors=[w.m.peach,w.m.sage,w.m.cream,w.m.blue];
  // New blocks leave continuous streets at x=-218/-142 and z=-232/-158/40/136.
  for(const [i,z] of [-204,-183,-117,-72,-25,87].entries()){
    for(const [j,x] of [-184,-111].entries()){
      if((x===-111&&z>-150&&z<30)||(x===-184&&z===87))continue; // Keep original neighborhood intact.
      const north=z< -158;
      w.building(x,z, north?24:30,north?14:26,7.5+(i%3)*3.2,colors[(i+j)%4],
        north&&j===0?(i===0?'CASA DO MAR':'OFICINA'):undefined,'south');
    }
  }
  for(const [i,x] of [-76,-49,9].entries())w.building(x,-197,22,32,10.5+i*3.2,colors[i],['PADARIA NORTE','GALERIA','CAFÉ MARÉ'][i],'south');
  for(const [i,x] of [-180,-106,-65,10].entries())w.building(x,171,26,26,7.5+(i%2)*3.2,colors[i],i===3?'MERCADO SUL':undefined,'south');
  // Southern park: open paths connect both west roads with the old garden.
  w.box(76,.045,67,-179,.008,88,w.m.grass);
  w.box(5,.06,67,-179,.02,88,w.m.pavement);
  w.box(76,.06,5,-179,.022,103,w.m.pavement);
  w.cylinder(3.5,3.8,.5,-195,.25,78,w.m.cream,24);
  w.cylinder(3.2,3.2,.05,-195,.53,78,w.m.glass,24);w.obstacle(-195,78,7.6,7.6);
  for(const x of [-204,-155])for(const z of [62,88,116]){
    w.treePositions.push({x,z,scale:6+w.random()*2});w.obstacle(x,z,.8,.8);
  }
  for(const x of [-199,-160])w.bench(x,107);
  for(const z of [-242,-218,-183,154,185]){
    w.palm(40,z,6.7+w.random());w.lamp(60,z);w.bench(56,z,Math.PI/2);
  }
  for(const z of [-244,-190,-125,-60,8,80,158,190])w.lamp(-150,z);
  for(const [label,x,z] of [['BAIRRO DO MAR',31,-166],['PARQUE DAS PALMEIRAS',-179,122],['MERCADO SUL',31,148]]){
    w.sign(label,x,2.2,z,5,.65);for(const dx of [-2.2,2.2])w.box(.1,2.4,.1,x+dx,1.2,z,w.m.dark);
  }
  for(let z=-257;z<198;z+=4){
    if(z>-139&&z<121)continue;
    w.cylinder(.035,.035,.9,63.5,.45,z,w.m.dark,6);w.box(.035,.04,3.9,63.5,.9,z+1.95,w.m.dark);
  }
  expandOutskirts(w);
}
