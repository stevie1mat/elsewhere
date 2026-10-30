import {COMMAND_ACTIONS,COMMAND_SUPPORT} from './command-catalog.js';
export const ACTIVITY_ACTIONS=['visit','collect_bicycle','rest','sleep','eat','observe','reflect','exercise','work','interact','phone',...COMMAND_ACTIONS];
export const ACTION_SUPPORT={
 ...COMMAND_SUPPORT,
 phone:'Take out your phone and search YouTube via Invidious using mediaQuery. Browser viewer must open player and allow playback; no audio or video content is perceived by the AI. Choose queries yourself, explain the reason. No guaranteed mood benefit.',
 collect_bicycle:'Go to Porto Cycle House (destination=bikes), collect the free loan bicycle using the real pickup interaction, and mount it. Requires walking, no owned bicycle, grounded and clear space at the shop. Does not charge money or simulate an NPC rental.',
 visit:'Walk to landmark; observe on arrival.',
 interact:'Choose objectId and verb from perceived or remembered objects. Navigate to approach, align, sit or lie_down with a procedural body pose, then stand up. Sitting restores energy (~0.132/s net); lying restores ~0.692/s. No imported transition clips.',
 rest:'Standing rest restores energy (~0.132/s net); use interact with a seat to recover while sitting.',
 sleep:'Navigate to registered home bed and lie down; fails without a usable bed.',
 eat:'Go to the cafe meal service, pay €4 and consume a meal with a held bowl. parameters.value=seated picks up the meal then navigates to a registered cafe chair, sits and eats; missing chair is a blocker. Measured hunger/thirst relief; interruption does not refund food.',
 work:'Timed money/energy simulation; no physical work task.',
 observe:'Geometric field of view, range and collision occlusion for registered objects. No camera pixels or audio.',
 reflect:'Timed reflection simulation.',exercise:'In-place procedural squat exercise; simulated energy/stress changes, not a physical work job.'
};
