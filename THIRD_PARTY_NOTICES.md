# Third-party software and design references

Yuka (MIT), by Mugen87 and contributors, is vendored in `server/vendor/yuka.module.js` with its license in `server/vendor/YUKA-LICENSE.txt`.
Source: https://github.com/Mugen87/yuka/blob/master/build/yuka.module.js (downloaded 2026-10-30). Its Vision and Vector3 classes supply geometric range and field-of-view checks. Our adapter additionally checks the game's 2D collision boxes for occlusion; this is not image recognition.

The completed interaction recipe cache follows the skill-library idea described by Voyager (https://github.com/MineDojo/Voyager). No Voyager code or Minecraft runtime is included. The AI chooses goals and object affordances; the application supplies bounded execution primitives and outcome measurements.

Current sitting/lying poses are procedural adaptations of this game's existing rig and IK. No TalkingHead, Quaternius, or Generative Agents code/assets have been imported. Imported animation libraries require compatible rig retargeting before use here.
