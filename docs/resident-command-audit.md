# Resident commands — implemented 2026-10-30

The earlier audit has been implemented as a shared, persistent server command layer. There are now 40 actions (29 additions). Existing browser state machines were moved into `server/shared` and re-exported for the browser, so story, challenge, combat and pickup rules have one implementation.

| Area | Executable commands |
|---|---|
| Navigation | `visit`, `walk`, `run`, `ride`, `move`, `reverse`, `brake`, `boost`, `jump`, `swim` |
| Bicycle | `collect_bicycle`, `dismount`, `mount_bicycle`, `collect_challenge_bicycle` |
| Activities / body | `stop`, `wait`, `stand_up`, `rest`, `sleep`, `interact`, `exercise`, `reflect` |
| Perception | `look`, `scan`, `observe` |
| Services / social / story | `eat`, `drink`, `talk`, `story_choice`, `quest`, `buy`, `work` |
| Appearance | `change_appearance` |
| Arcade | `enter_skyway`, `exit_skyway`, `skyway_input`, `attack` |
| Media | `phone`, `stop_phone`, `media_control` |

Navigation accepts landmark IDs, registered object IDs, or `objectId=point` with `parameters.x,z`. Other parameters are yaw (radians), choice (zero-based), and value (product/outfit/gear/paint). Commands still pass shared validation; unknown targets, missing funds, unavailable objects, invalid values and collision failures return errors.

## Human controls that need no model generation

Examples: “collect the bicycle”, “get off the bike”, “get on the bike”, “stop”, “stand up”, “run to the beach”, “ride to the cafe”, “walk to 30,-30”, “look around”, “jump”, “drink water”, “eat a meal”, “talk to Rui”, “choose option 1”, “continue the delivery quest”, “buy a mug”, “wear sage”, “remove helmet”, “enter skyway”, “kick right”, “pause the video”.

These explicit controls execute through authenticated chat even when the model worker is offline. They do not bypass the game's manual pause or landing/geometry checks. Open-ended requests and autonomous decisions still use the model.

## State and completion

- Bicycle parking stores its real position; remounting routes back within reach. Furniture interactions dismount first.
- Running uses its own speed. Bicycle navigation uses shared acceleration/collision physics. Jumping/swimming use shared movement physics.
- `stop` cancels queued actions and reward timers and waits for another human instruction. Interrupted work earns no completion pay. Airborne bodies still settle under gravity.
- `scan` rotates and records registered visible objects, not camera imagery.
- Registered meal/water services have world props and a held-bowl/cup pose. Meals cost €4 once; water is free. Need changes occur while consuming; interruption does not invent completion or refund consumed food.
- Story choices, parcel stages, inventory, friends, purchases, wardrobe and paint are server state. Skyway and road/combat state rehydrate across save/restore; rewards bank only once on exit.
- Command receipts and command tasks expose actual state evidence in model context. Replacing a numeric task with a new nonnumeric human request archives the stale numeric target.
- Local activities require `here`; a remote destination no longer silently runs in place. Arrival and bicycle ownership are reported from state changes.
- Browser rendering follows server appearance, story, pickups, combat and Skyway state. Stop-phone stops embedded playback. Media control requests are separate from browser playback confirmation.

## Deliberate limits

`work` remains the original simulated timed shift; the story and parcel commands provide actual inventory/delivery progression separately. `exercise` now has a procedural exercise pose, with simulated need effects. Generic invented jobs, paid bicycle rental negotiations and driving decorative cars have no implementation. Camera images/audio/video understanding are not supplied to the resident. Media playback remains subject to the viewer's browser restrictions and is only verified by browser reports.

The hosted server and frontend must both update. Reloading the city registers the meal/water objects and loads the new visuals. A running Mac worker must restart to load the expanded schema, although direct human controls do not need it.
