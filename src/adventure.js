// Small, versioned local progression. Rewards are earned once, never purchased.
export const GOALS=[
  {id:'explorer',title:'Discover 3 city places',key:'places',target:3,reward:'Precision steering'},
  {id:'collector',title:'Collect 25 city coins',key:'coins',target:25,reward:'Start Skyway with a shield'},
  {id:'courier',title:'Finish the parcel delivery',key:'delivery',target:3,reward:'Reinforced bicycle · 4 hearts'},
  {id:'climber',title:'Ride 3 km in one Skyway run',key:'distance',target:3000,reward:'Checkpoint bonus doubled'},
  {id:'local',title:'Discover 10 city places',key:'places',target:10,reward:'Expedition purple paint'},
  {id:'summit',title:'Ride 6 km in one Skyway run',key:'distance',target:6000,reward:'Summit gold paint'},
];
export function createAdventure(saved={}){
  const state={};for(const key of ['places','coins','delivery','distance'])state[key]=Number.isFinite(saved?.[key])?Math.max(0,saved[key]):0;
  state.unlocked=GOALS.filter(g=>state[g.key]>=g.target).map(g=>g.id);return state;
}
export function advanceAdventure(state,metrics){
  for(const key of ['places','coins','delivery','distance'])if(Number.isFinite(metrics[key]))state[key]=Math.max(state[key],metrics[key]);
  const fresh=GOALS.filter(g=>state[g.key]>=g.target&&!state.unlocked.includes(g.id));
  state.unlocked.push(...fresh.map(g=>g.id));return fresh;
}
export function adventureUpgrades(state){return {handling:state.unlocked.includes('explorer'),shield:state.unlocked.includes('collector'),hearts:state.unlocked.includes('courier')?4:3,bonus:state.unlocked.includes('climber')?2:1};}
