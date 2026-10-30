// Commands share one schema across hosted and local inference.
export const COMMAND_SUPPORT={
 stop:'Cancel route, queued steps, pose and activity; remain stopped until a new human instruction. No completed-work reward.',
 wait:'Wait here for seconds, then reconsider.',stand_up:'Leave chair/bed using its saved safe exit.',
 dismount:'Stop, get off and park the bicycle in world space.',mount_bicycle:'Walk back to the saved parked bicycle and mount within reach.',
 walk:'Walk to destination, registered objectId, or objectId=point with parameters.x,z.',
 run:'Run to destination/object/point.',ride:'Ride an owned bicycle to destination/object/point using acceleration and collision checks.',
 move:'Move using verb=forward/backward/left/right for seconds.',reverse:'Reverse for seconds.',brake:'Brake to a stop.',boost:'Ride forward using owned nitro for seconds; requires nitro.',
 jump:'Jump on foot using gravity, or jump a Skyway barrier. Cannot jump an ordinary city bicycle.',
 swim:'Swim toward a point (objectId=point, parameters.x,z), or forward for seconds. Uses water movement; dismount first.',
 look:'Turn to parameters.yaw (radians), verb=left/right/behind, or face a registered objectId.',scan:'Rotate through a full circle and record visible registered objects.',
 drink:'Go to the registered cafe water service and drink from a cup. Free; measured thirst relief.',
 talk:'Visit the named NPC from available NPC context, verb=hello for a greeting. Without hello presents the current story dialogue.',
 story_choice:'Go to current personal story step; execute parameters.choice (zero-based). Server owns items, friends, money and progress.',
 quest:'Go to the active parcel quest step and perform its real take/read/deliver transition.',
 buy:'At the market buy parameters.value=plant or mug using wallet funds; or value=nitro using road coins.',
 change_appearance:'parameters.value=original/ocean/terracotta/sage/midnight, helmet_on/off, backpack_on/off, sunglasses_on/off, or paint:#RRGGBB.',
 collect_challenge_bicycle:'Go to Coral challenge bicycle pickup, collect/exchange it and apply coral paint.',
 enter_skyway:'Travel to Skyway entrance and enter with an owned bicycle. Server runs the existing challenge simulation.',
 exit_skyway:'Leave the active challenge at the city entrance, banking its coins/gems once.',
 skyway_input:'Control active challenge with verb=left/right/jump/brake/forward for seconds.',
 attack:'While riding, verb=kick_left/kick_right/punch_left/punch_right. Uses real combat hit/cooldown checks.',
 media_control:'Request browser media playback with verb=play/pause/stop. A selected result and active phone session are required for play. Only browser playback reports prove success.',
 stop_phone:'Put phone away, end its activity and request browser playback stop.'
};
export const COMMAND_ACTIONS=Object.keys(COMMAND_SUPPORT);
export const NAVIGATION_ACTIONS=['visit','walk','run','ride','collect_bicycle','collect_challenge_bicycle','enter_skyway','eat','drink','work','talk','story_choice','quest','buy','mount_bicycle'];
export const LOCAL_ACTIONS=['rest','observe','reflect','exercise','phone','interact','sleep',...COMMAND_ACTIONS.filter(a=>!NAVIGATION_ACTIONS.includes(a))];
export const PARAMETER_SCHEMA={type:'object',additionalProperties:false,required:['x','z','yaw','choice','value'],properties:{x:{type:'number',minimum:-650,maximum:400},z:{type:'number',minimum:-500,maximum:500},yaw:{type:'number',minimum:-6.284,maximum:6.284},choice:{type:'integer',minimum:0,maximum:10},value:{type:'string',maxLength:64}}};
export function validateParameters(d){
 if(d.parameters===undefined){if(d.objectId==='point')throw Error('A point requires parameters.x and z.');return;}
 const p=d.parameters;if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!Object.hasOwn(PARAMETER_SCHEMA.properties,k)))throw Error('Invalid command parameters.');
 for(const k of ['x','z','yaw'])if(p[k]!==undefined&&(!Number.isFinite(p[k])||p[k]<PARAMETER_SCHEMA.properties[k].minimum||p[k]>PARAMETER_SCHEMA.properties[k].maximum))throw Error('Invalid command '+k+'.');
 if(p.choice!==undefined&&(!Number.isInteger(p.choice)||p.choice<0||p.choice>10))throw Error('Invalid dialogue choice.');
 if(p.value!==undefined&&(typeof p.value!=='string'||p.value.length>64))throw Error('Invalid command value.');
 if(d.objectId==='point'&&(!Number.isFinite(p.x)||!Number.isFinite(p.z)))throw Error('A point requires x and z.');
}
