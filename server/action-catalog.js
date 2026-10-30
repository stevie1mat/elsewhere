export const ACTIVITY_ACTIONS=['visit','rest','sleep','eat','observe','reflect','exercise','work'];
export const ACTION_SUPPORT={
  visit:'Walking/navigation and observation are implemented; visit alone does not execute the next desired activity.',
  rest:'Standing rest only. Sitting, seat alignment and transitions are not implemented.',
  sleep:'Unavailable: bed interaction, lying-down pose, sleep animation and getting-up transition are not implemented. The bed model already exists in Casa Aurora.',
  eat:'Timed need/money simulation only; no food props or eating animation.',
  work:'Timed money/energy simulation only; no task-specific animation.',
  observe:'Recorded position/activity only; no visual or audio sensing.',
  reflect:'Timed reflection simulation.',exercise:'Timed needs simulation only; no exercise-specific animation.'
};
