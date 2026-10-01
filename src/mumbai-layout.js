// An original, playable lane layout inspired by the supplied church photographs.
export const MUMBAI_SPAWN = Object.freeze({x:0,z:65,yaw:0,pitch:.3});
export const MUMBAI_LANDMARKS = Object.freeze([
  {id:'church',name:'Church headquarters',subtitle:'Blue walls, a quiet courtyard, and the start of your ride.',x:0,z:55,radius:12,number:'01'},
  {id:'market',name:'Marigold lane',subtitle:'Turquoise shutters under a canopy of trees.',x:-48,z:20,radius:10,number:'02'},
  {id:'temple',name:'Temple junction',subtitle:'The colorful gateway on Shrinagar Complex Road.',x:-65,z:20,radius:10,number:'03'},
]);
export const MUMBAI_ROADS = Object.freeze([
  {x:0,z:-5,w:8,d:210}, {x:-65,z:-5,w:8,d:210},
  {x:-32.5,z:-106,w:73,d:8}, {x:-32.5,z:20,w:73,d:8}, {x:-32.5,z:96,w:73,d:8},
]);
