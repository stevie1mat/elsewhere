export const QUEST_STOPS = [
  { id:'cafe', x:35, z:12, title:'A parcel with no address', objective:'Meet Inês outside Café Luma.', speaker:'Inês · Café Luma', action:'Talk to Inês', confirm:'Take the parcel', text:'You look like someone who takes the scenic route. Could you deliver this parcel? The lighthouse keeper left it here years ago. There’s no address—just a postcard tucked beneath the blue tile in Jardim do Sol. Find it, and you’ll know who it belongs to.', item:'A sealed parcel', hint:'Ride west along the cross street, then turn into the garden.' },
  { id:'garden', x:-57, z:76, title:'Beneath the blue tile', objective:'Find the blue tile beside the garden path.', speaker:'A weathered postcard', action:'Read the postcard', confirm:'Keep the clue', text:'“When the lighthouse went dark, you kept a light for me. Meet me where the old pier reaches the sea. — A.” On the back, a newer note reads: “Tomás still waits there every afternoon.” The parcel suddenly feels a little less anonymous.', item:'Postcard: find Tomás at the old pier', hint:'Return to the seafront, then follow the wooden pier east.' },
  { id:'pier', x:103, z:-35, title:'Someone still remembers', objective:'Deliver the parcel to Tomás on the old pier.', speaker:'Tomás · The old pier', action:'Talk to Tomás', confirm:'Deliver the parcel', text:'That handwriting… my sister was the lighthouse keeper. Inside is the little brass bell she promised to return. I thought she’d forgotten. Thank you for bringing it all this way. Let me give your bike her favourite colour—the gold of the last light on the water.', item:'Reward: Sunset Gold bicycle paint', hint:'One small delivery. A whole coast of stories.' },
];

export function restoreQuest(value) {
  return { stage:value?.version===1 && Number.isInteger(value.stage) && value.stage>=0 && value.stage<=3 ? value.stage : 0, version:1 };
}
export function activeStop(quest) { return QUEST_STOPS[quest.stage] ?? null; }
export function canInteract(quest,player) {
  const stop=activeStop(quest);
  return !!stop && Number.isFinite(player.speed) && Math.abs(player.speed)<.7 && Math.hypot(player.x-stop.x,player.z-stop.z)<4;
}
export function advanceQuest(quest,player,stopId) {
  if(!canInteract(quest,player)||activeStop(quest)?.id!==stopId)return quest;
  return {...quest,stage:quest.stage+1};
}
