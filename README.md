# Elsewhere — Porto Sol & Mumbai lanes

## Run privately

Requires Node 22.12+. From this directory:

```sh
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install
npm start
```

Open **http://localhost:8788** and enter **279279**. `npm start`, `npm run dev`,
`npm run preview`, and `npm run private` all build and launch the same private
single-resident server. There is no public multiplayer connection or launch mode.
The server stays active when the browser closes; Ctrl+C saves and stops it.

Host the whole project as a Node service with a persistent disk. A static-only
Vercel deployment does not run the private server or background simulation.

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
npm run preview
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

Porto visitors start directly in the balloon journey as soon as the world loads.
The opening slideshow and its replay menu option are disabled. After landing,
Mara welcomes the player and guides them to their first room.

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

## Porto Sol art-direction rebuild

The visual target is saved in `docs/porto-sol-art-direction.png`. This is an aspirational concept illustration; the running world remains procedural 3D.

The western village now climbs a 32 m hillside with stone lanes, smaller homes, planted balconies, roof terraces, a church tower and a lookout. The waterfront has a curved promenade with café seating, low stone parapets and rocky edges. Arcaded storefronts, flowering pergolas and additional small houses fill out the original center. The elevated Skyway is visible during its challenge; entering at its existing marker still works.

`server/shared/landscape.js` defines ground elevation and the shore for both client and server. Walking, cycling, jumps, parachute landing, parked bicycles, pickup rendering and multiplayer validation use the new terrain. The map follows the curved shoreline. Restart the multiplayer service when deploying these shared-rule changes alongside the frontend.

`tests/landscape.test.js` checks slope travel at multiple frame rates, hillside jumping and co-op validation, parachute landing, shoreline geometry and elevated pickups. The quest route test builds the updated obstacles and checks reachable approaches to all destinations and pickups.

### First day in Porto Sol

The opening balloon now approaches from open water over 24 seconds before flight controls unlock. After landing, Mara appears nearby with a gold marker. Press **F** (or **Meet Mara**) to begin the walk to Casa Aurora. She follows a collision-checked route, walks slower than the player, and waits when the player is more than seven metres away. At the furnished room, press **F** to leave the visible suitcase. Completion is saved locally as `elsewhere:first-home`, and Casa Aurora remains marked on the map. The welcome chapter takes visual priority over the collection HUD until the suitcase is stored.

### Settling-in story campaign

After storing the suitcase, an eleven-stop personal campaign takes priority over the optional parcel quest and collection HUD. Four chapters cover a message home and first meal, paid bakery work, furnishing the room, and a neighbourhood supper followed by an ending at home. Press F at the gold world/map marker, choose a response, and review memories, possessions, neighbours, and earnings in the Journal. The bread must be collected and delivered before Rui pays €18; the market offers a €6 plant, a €4 mug, or saving the money. Unpacking adds the photograph, recipe notebook, and chosen furnishing to the room. Supper changes the town to blue hour, and finishing the story returns it to morning and free exploration.

Personal choices are persisted as `elsewhere:settling-story` and replayed on load to derive money, possessions, and milestones rather than trusting saved totals. This campaign is local to each player; the earlier co-op parcel quest remains optional after the ending.


## Android and iOS

The Capacitor projects bundle the game and its assets for local play. Touch devices
start with Balanced graphics unless a saved preference overrides it. Saves remain
local to each app installation; browser saves do not transfer automatically.
The provisional bundle identifier is `com.promptdrive.elsewhere` and the app name
is Elsewhere. Choose the final identifier before distributing releases.

Requires Node 22.12+, Java 21, Android SDK 36 for Android, and a compatible Xcode
installation for iOS. Install dependencies with `npm ci`.

- `npm run mobile:sync`: build the web game and copy it into both native projects.
- `npm run mobile:android`: sync and open Android Studio.
- `npm run mobile:apk`: sync and build an installable debug APK at
  `android/app/build/outputs/apk/debug/app-debug.apk`.
- `npm run mobile:ios`: sync and open the Xcode project. Select your signing team
  and a connected iPhone to run it. Use Archive for a signed distribution build.

On this Mac, use the working Node installation and Java 21 when building Android:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME="$HOME/Library/Android/sdk"
npm run mobile:apk
```

An iOS simulator build without signing:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/ios-simulator CODE_SIGNING_ALLOWED=NO build
```

For multiplayer, set `VITE_COOP_URL=wss://your-server.example/coop` before syncing.
Packaged builds do not fall back to a development server at localhost. The Node
multiplayer server must be hosted separately; it is not included in the app.

These are development builds with template app icons and launch screens. Test
controls, notches, audio interruptions, camera export, memory use, and sustained
frame rate on real phones before release. Android store distribution needs a
signed release AAB; iPhone distribution needs Apple signing and provisioning.

### Initial mobile build verification

Android `assembleDebug` and the unsigned iOS simulator build both succeeded.
The APK contains the current production web bundle (approximately 113 MiB).
No physical-device gameplay testing has been performed yet.

The game suite reports 113 passing tests and 8 existing failures covering the
camera proxy, runner speed/jumping, walking/animation/co-op positions, elevated
parachute landing, and urban saved positions. These same gameplay failures were
reproduced against the unchanged Git HEAD. The sandbox additionally blocks the
WebSocket integration test; it passes when local listening is allowed.


## Private persistent resident

Run `npm start` (builds automatically) and open
`http://localhost:8788`. The access code is **279279**, checked on the server;
HTTP-only session cookies protect both game assets and the saved-life API.
Login attempts are limited. Sessions expire after seven days and require login
again after a server restart. Use this private server rather than a public static
host for the protected game.

The first authenticated city load supplies collision geometry. After that, the
server independently advances the balloon, parachute landing, and a walking/rest
routine between city landmarks, including Casa Aurora. The browser observes the
same resident on every reload and across tabs. The intention bubble and activity
history reflect actual server actions. With `GROQ_API_KEY` configured, Groq chooses the resident's next destination or
rest activity using the current location, ongoing goal, recent events and chat.
The thought bubble shows its chosen intention. A chat panel lets you ask about
its activity and suggest future goals. Replies do not directly execute actions.
Without a key, the existing rules-based routine remains available and the UI
labels it accordingly. Semantic memory and autonomous construction are not yet
implemented.

State, route, arrival, and the last 500 activity entries are atomically saved every
five seconds and on graceful shutdown to `.private-data/resident.json`. Keep that
directory on a persistent disk and back it up. Set `PRIVATE_DATA_DIR` to choose a
persistent volume. Do not run multiple server instances against the same save.
Corrupt or incompatible saves stop startup rather than silently resetting life.
No Supabase project is connected yet.

The character keeps acting with the browser closed **while this server is
running**. A stopped server or sleeping computer pauses the simulation; restarting
resumes saved progress and records the interruption without inventing activities.
For continuous operation, deploy the private server on an always-on Node host
with a persistent volume. Set `HOST=0.0.0.0` for hosting and `COOKIE_SECURE=true`
behind HTTPS. `PORT` defaults to 8788. `PRIVATE_ACCESS_CODE` overrides the code.
All standard launch commands use this private server.


## Groq connection

Put `GROQ_API_KEY=your_key` in the root `.env` (ignored by Git), then run
`npm start`. The private server loads this file; the browser never receives the
key. The default `GROQ_MODEL` is `openai/gpt-oss-20b` hosted by Groq. Override
`GROQ_MODEL` with a model supporting strict JSON schema outputs. See
[Groq structured outputs](https://console.groq.com/docs/structured-outputs).

`npm run groq:check` makes one real test request and reports the selected action.
It does not start the game server or change the saved life.

The server asks for a decision only when landed and finished walking/resting,
with at least five seconds between successful requests. One model request runs
at a time, including chat. On limits or failures, the resident waits and the UI
shows the error; retries back off and honor Groq's Retry-After header. Each provider call times out after 15 seconds, then immediately tries the other configured API. Quotas still depend on your Groq account.

The model can choose only validated destinations or a 15–180 second rest. All
movement and collision checks remain in the game simulation. The resident saves
its goal, activity history and last 100 chat messages locally on the server.
Recent events and conversation are included as context; no Supabase/vector
storage is connected yet. Existing saved lives resume their current activity
before asking Groq for the next one.


### Mistral backup and continuous activity

Set `MISTRAL_API_KEY` in the ignored root `.env`; optionally set `MISTRAL_MODEL`
(default `mistral-small-latest`). Restart the server once to load changed keys.
Groq is initially preferred. On a timeout, network failure, provider error or
invalid decision, the same request immediately tries Mistral. The last successful
provider remains preferred; if it fails, the client can switch back to the other
provider once its cooldown has expired. Each has an independent cooldown that
respects Retry-After. The activity panel shows the provider serving requests.
Both providers use the same saved state, conversation and action validation.

If neither API is available, the character continues its local walking/rest
routine. It tries AI again at an activity boundary after the retry cooldown;
rendering, simulation and persistence keep running throughout. Chat reports
unavailability instead of inventing an AI reply. `npm run groq:check -- --mistral`
tests only Mistral; `npm run groq:check -- --fallback` tests the combined client.
Mistral's initial live check returned HTTP 429; the backup cannot supply decisions
until that account's quota or access permits requests.


### Hosted frontend and Render backend

The Vercel API proxy defaults to `https://elsewhere-ocqx.onrender.com`.
Set Vercel's server-side `PRIVATE_SERVER_URL` to override that address.
The proxy forwards login/session cookies and the resident APIs; no AI keys go
into the frontend. Deploy the current private server on Render from the project
root (`npm ci`, then `npm start`), or build the root Docker context using
`server/Dockerfile`. Set `HOST=0.0.0.0`, `COOKIE_SECURE=true`, provider API keys,
and persistent storage settings in Render's environment. `/health` reports
`private-resident` for deployment checks. The previous multiplayer server does
not implement the private game API and must be redeployed.


### Render Docker compatibility

The Render Docker image now runs only the private API and autonomous simulation;
Vercel builds and serves the frontend separately. The server is self-contained,
including shared flight and movement rules, and needs no npm build or installed
packages. Existing Render settings with Root Directory `server`, Dockerfile
`Dockerfile`, and context `.` can stay as they are. The same Dockerfile also
accepts repository-root context with Dockerfile `server/Dockerfile`. Local
`npm start` still builds and serves the whole game.


## Supabase persistent life

Migration: `supabase/migrations/202610300001_resident_storage.sql` creates
`resident_saves`, `resident_events`, `resident_messages` and the atomic
`save_resident` RPC. RLS is enabled; browser roles cannot access these tables.
The Render server uses `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or the legacy
`SUPABASE_SERVICE_ROLE_KEY`). Never prefix these keys with VITE_ or commit them.
`RESIDENT_ID` defaults to `porto-main`; run only one simulation for that ID.

Before simulation starts, the server loads the cloud checkpoint. Existing local
progress migrates automatically when no newer cloud checkpoint exists. It saves
the full checkpoint every five seconds and on graceful shutdown, retaining an
atomic local backup. Events and conversations append idempotently in the same
transaction and remain archived after the in-memory history limits are reached.
An older checkpoint cannot replace a newer one. During an outage, an existing
local life keeps running; cloud saves retry. Without either a cloud load or an
existing local save, the server waits rather than creating a replacement life.
The brain view and authenticated `/api/resident` response expose cloud-save
status. Supabase persists the life across Render redeployments; it does not keep
a sleeping Render instance running.

`node scripts/check-supabase.js` verifies cloud access. The one-time
`scripts/migrate-render-save.js` copies the current hosted snapshot into an empty
cloud slot before redeployment; it reloads city geometry and replans the current
walk after restore because the public snapshot excludes routes/obstacles.
