import {localContext} from './local-context.js';
import {availableTrainingTasks,TRAINING_CHOICE_PROMPT} from './training-choice.js';
export const practiceRequest=goal=>'Practice task (isolated scene): '+goal+' Choose ONE atomic action using current state and the last result. Check whether it advanced the user goal; revise failed actions. Explain actual missing requirements. Do not claim completion before observation confirms it.';
export function trainingInput(s){
 const context={trainingLab:true,goal:s.ai.goal,money:s.wallet,needs:s.needs,perception:{position:{x:s.player.x,z:s.player.z}},commands:{body:{mode:s.player.mode,pose:s.player.interactionPose?.kind||null,parkedBicycle:s.player.bike||null}},trainingInventory:{paid:!!s.mealOrder?.paid,carried:!!s.player.carriedMeal,consuming:!!s.player.consuming},trainingObjects:s.objects.map(o=>({id:o.id,name:o.name,type:o.type,affordances:o.affordances,approach:o.approach,distance:Math.round(Math.hypot(s.player.x-o.approach.x,s.player.z-o.approach.z)*10)/10,inReach:Math.hypot(s.player.x-o.approach.x,s.player.z-o.approach.z)<=1.1})),executionFeedback:s.executionFeedback||[],trainingMemory:s.trainingLessons||[],teacherExamples:s.trainingExamples||[]};
 context.trainingAvailableActions=availableTrainingTasks(context);return structuredClone(localContext(context,''));
}
export const trainingPrompt=(world,request)=>'<|im_start|>system\n'+TRAINING_CHOICE_PROMPT+'<|im_end|>\n<|im_start|>user\n'+JSON.stringify({world,request})+'<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n';
export const trainingFingerprint=s=>JSON.stringify([Math.round(s.player.x*2)/2,Math.round(s.player.z*2)/2,s.player.mode,s.player.interactionPose?.kind||null,s.wallet,!!s.mealOrder?.paid,!!s.player.carriedMeal,!!s.player.consuming]);
