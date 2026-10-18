# Elsewhere — Porto Sol & Mumbai lanes

## Deploy to Vercel

Import `stevie1mat/elsewhere` into Vercel. This repository contains the game at its root, so leave Root Directory at the repository root (`.`). The included `vercel.json` selects Vite, runs `npm run build`, and publishes `dist`. Solo play needs no environment variables or backend services. Online co-op additionally needs the server and `VITE_COOP_URL` described below.

A standalone, third-person coastal cycling world built with Three.js and Vite. This project lives **beside** `../game`, not inside it. Reused assets are copied into this project's `public/assets`; the original game is not modified or needed at runtime.

## Run

Requires Node 22.12+ (or a compatible recent Node release).

```sh
npm install
npm run dev -- --port 5174
```

Open **http://127.0.0.1:5174/** and select **Ride into Porto Sol**.

On this Mac, the default Homebrew Node currently fails because of a missing `libsimdjson.26.dylib`. The installed Node 22 works:

```sh
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run dev -- --port 5174
```

## Explore

### Skyway Ride

Map marker **11**, on the northern shoreline at `(55, -380)`, starts an endless cycling challenge. Approach the stone gateway and press **F** (or Start ride). A challenge bicycle is provided; your previous position and bicycle are restored on exit.

- Automatic forward movement with gradual acceleration; **A/D** or arrows switch among three lanes with lateral momentum; **Space** jumps using 9.81 m/s² gravity; **S / down arrow** brakes; **Esc** exits; **R** retries. On-screen buttons support lane changes and jumping on touch.
- The free-roam approach is blocked before the rising deck: enter with **F** rather than riding underneath the bridge. Rider IK is solved at neutral height before applying the bridge elevation and slope; banking is limited to gentle turns.
- The elevated circuit crosses the sea and climbs over the mountain landscape, looping continuously with newly generated obstacle rows. Each row has a clear lane; speed gradually increases to a cap.
- Distance gives 3 points/m, coins 25, gems 200. Green shields absorb one collision. Three lives, brief collision protection, and a best score saved in this browser.
- This is a local challenge within the shared island, not synchronized competitive multiplayer. While riding, your room presence remains at the gate. Rewards are challenge-only.
- Geometry is static and pickups/obstacles use four fixed instanced pools; old rows are discarded. `tests/skyway.test.js` checks bounded long-run state, pickups, jumps, lives, and circuit continuity.

Design reference: [Imangi's Temple Run 2](https://imangistudios.com/thegames/temple-run-2/) for the obstacle-avoidance/collection loop; the route, art, cycling controls, and implementation here are original.

**The Last Light — Chapter 01:** Follow the gold marker to Inês outside Café Luma. Stop your bicycle and press **F** (or tap the interaction button) to collect a parcel. Find the postcard beside the garden path, then deliver the parcel to Tomás on the pier. Completing the story equips Sunset Gold bike paint. The parcel is visible on your bike while carrying it; quest progress and the reward save automatically in this browser. Closing a conversation leaves the objective available. The map’s gold line points toward the objective, rather than providing street-by-street navigation.

- **X** (or the left-side button): stop and get off your bicycle. Walk back within 2.8m to remount; your bicycle is marked on the map. **W/S** walks forward/back, **A/D** turns, and **Shift** runs.
- **Wardrobe** on the left, or **V**: choose an outfit color, helmet, canvas backpack, and sunglasses. Your look saves in this browser and appears in cycling and walking modes. These controls apply to Porto Sol.
- **W/S**: move / reverse; **A/D**: turn; hold either **Shift** to run forward on foot (W optional), release to stop. On a bicycle Shift still speeds up pedaling with W. **Space**: jump on foot, brake on a bicycle.
- Walking uses acceleration, momentum, ground friction, reduced airborne steering, gravity and grounded jumping. Collision substeps prevent tunneling and allow sliding along walls; jumps synchronize to other players. Ground remains a flat collision plane (no rooftop climbing, swimming or rigid-body ragdolls).
- Click the scene to capture the mouse. **Esc** releases it.
- **Q/E** or **left/right arrows** also steer. Up/down arrows pedal/reverse.
- Drag the scene to orbit the camera when mouse capture is unavailable. **C** centers the camera behind the bike.
- **P** hides the interface; **R** returns to the waterfront.
- Touch screens have movement buttons and drag-to-look controls.
- Click **Expand ↗** or press **M** for the large map. Drag with the mouse to pan; scroll to zoom toward the cursor (1×–6×). **Follow** recenters on your cyclist; **Reset** or **0** restores the neighborhood view. **+ / −** also work while riding. **M** or **Esc** closes the large map.
- Select a landmark to highlight it on the map; riding close discovers it.
- The sun button switches between golden hour and blue hour.
- The camera button downloads a PNG of the current scene.
- Settings include graphics quality, camera smoothing, and a locally saved favorite spot.
- Ocean ambience is synthesized locally and starts only when enabled.

## What's built

An original coastal neighborhood with shopfronts, balconies, café tables, a garden, fountain, pier, sailboats, palms, animated pedestrians, distant terrain, and water. The bicycle controller handles acceleration, steering, braking, reversing, and collision clearance at walls and land/pier boundaries. The camera follows the visible rider and pulls forward around scenery. Static geometry is merged by material; detailed trees use instancing.

You control the 3D cyclist, with wheel rotation and pedaling driven by actual distance traveled. The rider reuses the male Rocketbox traveler from `../game`; the bicycle is procedural geometry. The cyclist is the player avatar, viewed in third person.

This is the **world and cycling** milestone. Cars, building interiors, AI prompts, generated worlds, accounts are not implemented. No API key, remote AI call, or paid service is needed. The initial local asset download is substantial because this version retains the source game's high-resolution textures. Use Balanced graphics if High runs slowly.

The mini-map's dotted line points toward a destination; it is not a pathfinding route. The world does not simulate pedestrian collisions. Saved spots, preferences, and discoveries stay in this browser's local storage.

## Checks

```sh
npm test
npm run build
npm run preview -- --port 5174
```

Tests cover cycling across frame rates, steering, braking, reverse, bike clearance, water boundaries, saved positions, and the actual rider rig following the player with hands and feet aligned.

## Source layout

- `src/world.js`: procedural scenery, lighting, ocean shader, asset loading, pedestrians.
- `src/explorer.js`: cycling/walking avatar, animated wardrobe accessories.
- `src/cyclist.js`: bicycle geometry, rider pose, pedaling, and player avatar.
- `src/quest.js` and `src/quest-world.js`: delivery story, saved progression, characters, and objective markers.
- `src/movement.js`: bicycle controller and traversable boundaries.
- `src/main.js`: rendering loop, controls, map, discovery UI, saved settings.
- `src/style.css`: responsive interface.
- `tests/movement.test.js`: standalone movement checks.

## Asset credits

- New scanned cobblestone, plaster, and worn timber surfaces: **Poly Haven**, CC0. Color, normal, and roughness maps are bundled at 1K; credits in [`public/assets/porto/CREDITS.md`](public/assets/porto/CREDITS.md).

- Ground textures, sky/HDR environment, and tree: **Poly Haven**, CC0. Details: [`public/assets/hd/CREDITS.md`](public/assets/hd/CREDITS.md).
- Human models, textures, and walking animation: **Microsoft Rocketbox**, MIT. Details: [`public/assets/people/CREDITS.md`](public/assets/people/CREDITS.md); original license: [`public/assets/people/LICENSE.txt`](public/assets/people/LICENSE.txt).
- Buildings, props, city layout, palm geometry, terrain, and interface were created for this project.

Three.js is MIT licensed. Vite is MIT licensed. This is an original environment; no GTA assets are used.


## Shared online world

Run the game with `npm run dev` and, in a second terminal, run `npm run multiplayer`. On this Mac, prefix each command with `PATH=/opt/homebrew/opt/node@22/bin:$PATH` if needed. The local client connects to `ws://127.0.0.1:8787/coop` automatically. Porto Sol has one public room: every visitor joins it automatically, with no room code, invite link, or **Ride together** action.

Players land on foot with no bicycle. Porto Cycle House (map marker 10, beside the café) provides a bicycle when the player presses F at its entrance. X dismounts or remounts an already-collected bicycle; it cannot summon a new one. Resetting or reloading starts on foot again. Other online players appear in the world and as blue dots on the map. Any player at the current objective can advance the shared quest for everyone. Riders do not collide with each other.

The normal HUD shows the map and a small top-right menu button. World settings, wardrobe, quest details, destinations, pickups and controls are inside that menu. Brief contextual interaction prompts still appear near objectives.

Every Porto Sol page load opens directly into a third-person balloon journey with the normal interface hidden. After ten seconds, **Drop to island** and piloting become available. A/D turn with angular inertia, W adds game-assisted forward thrust, and S slows relative to the wind rather than reversing. Wind and drag continue carrying the balloon when controls are released. Drag to orbit the camera. The seven-second parachute descent lands at the selected location, drifting to nearby clear ground if necessary. The balloon has a paneled fabric envelope, woven basket, steering wheel and twin flickering burner flames; the rider holds the wheel. The parachute has raised fabric panels, reinforced cords and a wearable pack/harness. Flight stages and landing locations are visible to other connected players. The entrance also runs offline; multiplayer connection failures do not block it. Reloading replays the journey; a network reconnection keeps the current flight stage.

Porto Sol now spans 543 × 758 world units, approximately 2.97 times its previous playable area. Vila Poente, Parque das Oliveiras and Costa Dourada add connected roads, 26 buildings, pitched roofs, planted park paths and a coastal promenade. Shared movement bounds, balloon limits, server validation and map framing use the enlarged island. AI-generated olive, cypress, oleander and grass cutouts are rendered as instanced crossed-plane vegetation; nearby architecture remains 3D. The original generated atlas and complete prompt are in `public/assets/generated/`.

A dropped connection retries automatically. Disconnected riders keep their identity for one minute. A reconnect token is stored in session storage. Shared world state is held in memory, so a server restart resets its progress. The server validates finite positions, quest order, and the acting rider's proximity, but does not simulate movement authoritatively.

### Hosting alongside Vercel

The frontend remains a normal Vercel Vite deployment. Host `server/index.js` as one continuously running Node 22 service with WebSocket support. The `server` folder is self-contained, with its own dependency manifest, lockfile, and shared game rules. The frontend imports those same rules so client and server stay consistent.

On Render, set **Root Directory** to `server`, **Dockerfile Path** to `./Dockerfile`, and **Docker Build Context Directory** to `.`. Set the health check path to `/health`.

To build locally from the repository root, run `docker build -t elsewhere-multiplayer ./server`. Alternatively, from inside `server`, run `npm ci --omit=dev` followed by `npm start`. The existing root-level `npm run multiplayer` command also works.

Set these **server** variables:

- `HOST=0.0.0.0` to accept the hosting platform's traffic.
- `PORT` to the platform's assigned port (default 8787).
- `ALLOWED_ORIGINS=https://your-game.vercel.app` (comma-separated exact origins for any additional frontend domains). Unset accepts all origins for local development.

The service provides `/health` for health checks and `/coop` for WebSocket connections. Terminate TLS at the hosting platform. Run **one instance**: rooms currently live in one process, without shared storage or multi-instance routing.

Set **Vercel's** public build variable `VITE_COOP_URL=wss://your-server-domain/coop`, then redeploy the frontend. This is a public endpoint, not a secret. `.env.example` documents it. A production site without this setting remains solo-only and explains that the shared world is not configured. Players on different computers need the same reachable hosted server and frontend URL.

`npm test` includes a real multi-client WebSocket test that shares positions, admits additional riders, completes all quest steps, and reconnects with the completed quest intact.


## Mumbai lanes (world 002)

Choose **Mumbai lanes** in the World selector, or open `http://127.0.0.1:5174/?world=mumbai`.
The new solo free ride starts outside the Church of God headquarters. Follow the lane to
Marigold lane and the colorful temple junction on Shrinagar Complex Road. Connected side
lanes form two rideable loops. The church facade, compound gate, covered entrance, grilles,
shutters, marigolds, parked scooters, rickshaw, utility wires, and tree canopy are procedural
interpretations of the user-supplied Street View screenshots. Distances and the surrounding
loop layout are artistic approximations, not surveyed geography. No Google imagery is bundled.

The original Porto Sol story and co-op remain available in Porto Sol. Mumbai has its own
saved spot, discoveries, and preferences. **R** returns to the church; the map, day/night,
photo export, graphics settings, and cycling controls work in both environments. Ocean audio
and the Porto Sol delivery story are omitted from Mumbai.

`src/mumbai-world.js` builds the scenery; `src/mumbai-layout.js` defines its roads, spawn,
and landmarks. `tests/mumbai.test.js` checks actual collision geometry for connected routes,
spawn clearance, perimeter walls, and successful mesh batching.


## Chai District (world 003)

Choose **Chai District** in the World selector, or open `/?world=chai`. This is a separate,
original solo delivery neighborhood. Stop at Asha’s stall and press **F** (or tap the pickup
button), follow the gold map marker to the mechanics, then stop and press **F** to serve.
Return to the stall for the flower-market order. Orders alternate, and the best delivery
score is saved locally. **R** or **Restart at the stall** starts a fresh run. Active deliveries
reset on reload; saved favorite spots do not override the delivery spawn.

The cup is mounted on the bicycle. Its tea level, temperature, slosh, and delivery score
react to riding: gentle turns preserve tea; fast turns, sharp braking, impacts, and marked
potholes spill it. Tea cools over time. Below 15% remaining or 38°C, return for a refill.
Menus and background tabs pause delivery time. There is no countdown that forces racing.

The district includes textured asphalt and weathered plaster, open shop shelves, shutters,
laundry, drainpipes, utility cables, steam from the tea pot, puddles, street lighting, parked
scooters, moving cars and auto rickshaws, 14 animated human models, two dogs, two cows, and
pigeons that scatter nearby. People, ground animals, and traffic have collision clearance;
vehicles yield near the bicycle. Traffic follows predefined loops, not a full traffic simulator.
Animals, vehicles, and architecture are original procedural models; human models and surface
assets retain the credits above. This is detailed real-time 3D, not a photogrammetric recreation.

### Porto expedition progression

On foot, moving off the Porto shoreline enters surface swimming: W/S propel,
A/D turn, Shift swims faster. Water drag eases acceleration and buoyancy keeps
the head above the surface. Swim back toward clear shore to return to walking.
Bicycles remain parked on land; swimming is bounded to the coastal play area,
with the lighthouse rocks excluded (the island is scenery, not a climbable area).
The lighthouse has a rocky base, striped tower, balcony rails and emissive lantern
lenses, merged into six material meshes without additional dynamic lights.
Restart an already-running multiplayer server after updating these shared movement
rules so remote swimmers are accepted and displayed correctly.

The Skyway now follows a 6.45 km closed sea-to-mountain route and continues endlessly.
Five regions have colored roadside pennants; the highland stretch adds instanced rock
formations and snow caps. Checkpoints every 750 m restore one heart (up to capacity),
grant a shield and award 500 bonus points. They are reward milestones, not respawn saves.
Each checkpoint shows a brief gold victory badge away from the center sightline.
Cruise speed rises by 2 m/s per checkpoint (12 to 26 m/s), with smooth acceleration.
Obstacle rows tighten from 46 to 32 m and gain more double barriers while retaining
one safe lane; difficulty caps at level 8 to preserve reaction time. The entrance and
route portals are open rounded arches, with the entry sign moved off to the side.

Expand the compact goal line below the collection counters to see six saved objectives.
Discover 3 places for improved Skyway steering; collect 25 city coins for a starting
shield; complete the existing parcel quest for a fourth heart; ride 3 km in one run for
double checkpoint bonuses; discover 10 places for purple paint; ride 6 km for gold paint.
Upgrades equip automatically on the next challenge run. Goals and unlocks are saved
locally in this browser, not synchronized as multiplayer rewards. City coins accumulate
across outings; run-distance records are saved at checkpoints, ride end, retry and exit.
The map-tracking button points to an undiscovered city landmark. Airborne flyovers no
longer unlock landmarks. New scenery uses shared instanced meshes and fixed item pools.

`src/chai.js` contains standalone delivery rules and the layout. `src/chai-world.js` builds and
animates the district. `tests/chai.test.js` checks pickup/delivery/refill, spilling and cooling,
frame-rate consistency, reachable customers, clear traffic paths, and scenery/animal geometry.
