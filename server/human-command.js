// Unambiguous human controls execute directly; open-ended goals still reach the AI.
import {LANDMARKS} from './shared/movement.js';
import {NPCS} from './resident-commands.js';
export const PLACE_ALIASES={home:['home','my room','your room','casa aurora'],cafe:['cafe','café','café luma'],garden:['garden','jardim do sol'],bikes:['bike shop','cycle shop','porto cycle house','bike rental','bicycle rental'],coast:['beach','coast','costa dourada'],pier:['pier','old pier'],skyway:['skyway'],north:['bairro do mar'],south:['mercado sul','south market'],palms:['parque das palmeiras'],olives:['parque das oliveiras'],village:['vila poente']};
export function requestedPlace(message){const text=message.toLowerCase();return LANDMARKS.find(l=>PLACE_ALIASES[l.id]?.some(alias=>new RegExp('(?:^|\\b)'+alias+'(?:\\b|$)','i').test(text)));}
export function parseHumanCommand(s,message){
 const raw=message.trim().toLowerCase().replace(/[.!?]+$/,'');
 const m=raw.replace(/^(?:(?:please|you should|can you|could you|lets|let's|i want you to)\s+)+/,'');
 if(/^(?:what|why|how|where|when|explain|tell me)\b/.test(m)||/\b(?:don't|dont|do not|never)\s+(?:walk|go|run|ride|swim|jump|take|collect|eat|drink)\b/.test(m))return null;
 if(/\b(?:raise|reduce|increase|decrease|lower|gain|restore)\b/.test(m)&&/\bby\s+(?:at least\s+)?\d+\b/.test(m))return null;
 const base={destination:'here',seconds:15,intention:message.slice(0,160),goal:message.slice(0,180),reply:'Executing your instruction.',changePlan:true,objectId:'',verb:'',parameters:{x:0,z:0,yaw:0,choice:0,value:''},nextSteps:[],objective:{metric:'none',direction:'increase',amount:0,interaction:'none'}};
 const make=(action,extra={})=>({...base,action,...extra});
 if(/^(?:please\s+)?(?:stop|cancel|halt)(?:\s+(?:now|walking|moving|riding|everything|the plan|this task))?$/.test(m))return make('stop');
 if(/^(?:get down from|get off|dismount|sit|eat|have|go|walk)\b/.test(m)&&/\b(?:eat|eating|food|meal|lunch|soup)\b/.test(m)&&!/\b(?:dont|don't|do not|never|not)\b/.test(m))return make('eat',{destination:'cafe',parameters:{...base.parameters,value:! /\bstanding\b/.test(m)&&(s.preferences?.seatedMeals||/\b(?:sit|sitting|chair|seated)\b/.test(m))?'seated':'standing'}});
 if(/^(?:please\s+)?(?:stand up|get up|leave the bed|get out of bed)(?:\s+now)?$/.test(m))return make('stand_up');
 if(/^(?:please\s+)?(?:dismount|get down from(?: the| your| my)? (?:bike|bicycle)|get off(?: the| your| my)? (?:bike|bicycle)|park(?: the| your| my)? (?:bike|bicycle))$/.test(m))return make('dismount');
 if(/^(?:please\s+)?(?:mount|remount|get on|return to)(?: the| your| my)? (?:bike|bicycle)$/.test(m))return make('mount_bicycle');
 if(/^(?:play|pause|stop) (?:the )?(?:video|music|playback)$/.test(m))return make('media_control',{verb:m.split(' ')[0]});
 if(/^(?:please\s+)?(?:put (?:the|your) phone away|stop (?:the )?(?:phone|youtube|music|video))$/.test(m))return make('stop_phone');
 if(/^(?:please\s+)?(?:look around|scan(?: the area| around)?)$/.test(m))return make('scan');
 const turn=/^(?:look|turn) (left|right|behind)$/.exec(m);if(turn)return make('look',{verb:turn[1]});
 if(s.skyway&&/^(?:move |go )?(left|right|jump|brake|forward)$/.test(m))return make('skyway_input',{verb:m.replace(/^(?:move |go )/,'')});
 if(/^(?:please\s+)?(?:boost|use nitro)$/.test(m))return make('boost');
 const attack=/^(kick|punch) (left|right)$/.exec(m);if(attack)return make('attack',{verb:attack[1]+'_'+attack[2]});
 if(/^(?:please\s+)?jump(?: now)?$/.test(m))return make('jump');
 if(/^(?:please\s+)?brake(?: now)?$/.test(m))return make('brake');
 if(/^(?:please\s+)?(?:reverse|back up)$/.test(m))return make('reverse');
 if(/^(?:please\s+)?(?:wait|wait here)(?: for (\d+) seconds?)?$/.test(m)){const seconds=Number(m.match(/\d+/)?.[0]||30);return make('wait',{seconds:Math.max(15,Math.min(180,seconds))});}
 if(/^(?:go (?:and )?)?(?:get|take|collect|pick up|rent) (?:me )?(?:(?:a|the|your|my) )?(?:(?:coral|challenge) )?(?:bike|bicycle|cycle)(?: now)?$/.test(m))return make(/\b(?:coral|challenge)\b/.test(m)?'collect_challenge_bicycle':'collect_bicycle',{destination:'bikes'});
 if(/^(?:please\s+)?(?:drink|have|take|get) (?:some |a cup of |a glass of )?water(?: now)?$/.test(m))return make('drink',{destination:'cafe'});
 if(/^(?:please\s+)?(?:eat|have|get|buy) (?:a |some )?(?:meal|food|lunch|soup)(?: now)?$/.test(m))return make('eat',{destination:'cafe'});
 if(/^(?:enter|start)(?: the)? skyway(?: ride)?$/.test(m))return make('enter_skyway',{destination:'skyway'});
 if(/^(?:exit|leave)(?: the)? skyway(?: ride)?$/.test(m))return make('exit_skyway');
 const appearance=/^(?:wear|change (?:outfit|clothes) to) (original|ocean|terracotta|sage|midnight)$/.exec(m);if(appearance)return make('change_appearance',{parameters:{...base.parameters,value:appearance[1]}});
 const gear=/^(?:put on|wear|remove|take off)(?: the| your| my)? (helmet|backpack|sunglasses)$/.exec(m);if(gear)return make('change_appearance',{parameters:{...base.parameters,value:gear[1]+(/^(remove|take off)/.test(m)?'_off':'_on')}});
 const buy=/^buy(?: a| some)? (plant|mug|nitro)$/.exec(m);if(buy)return make('buy',{parameters:{...base.parameters,value:buy[1]}});
 const choose=/^(?:choose|select)(?: option)? (\d+)$/.exec(m);if(choose)return make('story_choice',{parameters:{...base.parameters,choice:Math.max(0,Number(choose[1])-1)}});
 if(/^(?:accept|continue|advance)(?: the)? (?:story|dialogue)$/.test(m))return make('story_choice');
 if(/^(?:continue|advance|do|complete)(?: the)? (?:parcel quest|delivery quest)$/.test(m))return make('quest');
 const npc=NPCS.find(n=>m.includes(n.id)||m.includes(n.name.toLowerCase()));if(npc&&/^(?:talk to|greet|say hello to)\b/.test(m))return make('talk',{objectId:npc.id,verb:/^(greet|say hello)/.test(m)?'hello':''});
 if(/^(?:sit(?: down)?|lie down|sleep)(?: on| in| at)?(?: the| a| your)?(?: bench| chair| bed)?$/.test(m)){
  const lying=/^(lie|sleep)/.test(m),verb=lying?'lie_down':'sit';const o=(s.objects||[]).filter(o=>o.affordances.includes(verb)).sort((a,b)=>Math.hypot(a.approach.x-s.player.x,a.approach.z-s.player.z)-Math.hypot(b.approach.x-s.player.x,b.approach.z-s.player.z))[0];
  if(o)return make('interact',{objectId:o.id,verb,seconds:60});
 }
 const coords=/^(walk|run|ride|swim)(?: to)?\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(m);if(coords)return make(coords[1],{objectId:'point',parameters:{...base.parameters,x:Number(coords[2]),z:Number(coords[3])}});
 const place=requestedPlace(m);if(place&&/^(?:please\s+)?(?:let'?s |can (?:you|we) )?(?:go|walk|head|run|ride|visit|return)\b/.test(m))return make(/\brun\b/.test(m)?'run':/\bride\b/.test(m)?'ride':'walk',{destination:place.id});
 return null;
}
