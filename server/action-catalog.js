export const ACTIVITY_ACTIONS=['visit','rest','sleep','eat','observe','reflect','exercise','work','interact'];
export const ACTION_SUPPORT={
 visit:'Walk to landmark; observe on arrival.',
 interact:'Choose objectId and verb from perceived or remembered objects. Navigate to approach, align, sit or lie_down with a procedural body pose, then stand up. Sitting restores energy (~0.132/s net); lying restores ~0.692/s. No imported transition clips.',
 rest:'Standing rest restores energy (~0.132/s net); use interact with a seat to recover while sitting.',
 sleep:'Navigate to registered home bed and lie down; fails without a usable bed.',
 eat:'Unavailable: no usable food prop/eating interaction. Does not consume food or change hunger.',
 work:'Timed money/energy simulation; no physical work task.',
 observe:'Geometric field of view, range and collision occlusion for registered objects. No camera pixels or audio.',
 reflect:'Timed reflection simulation.',exercise:'Timed needs simulation; no exercise animation.'
};
