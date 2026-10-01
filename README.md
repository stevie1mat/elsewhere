# Elsewhere — Porto Sol

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

**The Last Light — Chapter 01:** Follow the gold marker to Inês outside Café Luma. Stop your bicycle and press **F** (or tap the interaction button) to collect a parcel. Find the postcard beside the garden path, then deliver the parcel to Tomás on the pier. Completing the story equips Sunset Gold bike paint. The parcel is visible on your bike while carrying it; quest progress and the reward save automatically in this browser. Closing a conversation leaves the objective available. The map’s gold line points toward the objective, rather than providing street-by-street navigation.

- **W/S**: pedal / reverse; **A/D**: steer; **Shift**: pedal faster; **Space**: brake.
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
- `src/cyclist.js`: bicycle geometry, rider pose, pedaling, and player avatar.
- `src/quest.js` and `src/quest-world.js`: delivery story, saved progression, characters, and objective markers.
- `src/movement.js`: bicycle controller and traversable boundaries.
- `src/main.js`: rendering loop, controls, map, discovery UI, saved settings.
- `src/style.css`: responsive interface.
- `tests/movement.test.js`: standalone movement checks.

## Asset credits

- Ground textures, sky/HDR environment, and tree: **Poly Haven**, CC0. Details: [`public/assets/hd/CREDITS.md`](public/assets/hd/CREDITS.md).
- Human models, textures, and walking animation: **Microsoft Rocketbox**, MIT. Details: [`public/assets/people/CREDITS.md`](public/assets/people/CREDITS.md); original license: [`public/assets/people/LICENSE.txt`](public/assets/people/LICENSE.txt).
- Buildings, props, city layout, palm geometry, terrain, and interface were created for this project.

Three.js is MIT licensed. Vite is MIT licensed. This is an original environment; no GTA assets are used.


## Two-player co-op

Run the game with `npm run dev` and, in a second terminal, run `npm run multiplayer`. On this Mac, prefix each command with `PATH=/opt/homebrew/opt/node@22/bin:$PATH` if needed. The local client connects to `ws://127.0.0.1:8787/coop` automatically. Open the game in two tabs, choose **Ride together**, create a room in one, and join with its 16-character room code in the other. A copied invite link shows **Join your friend & ride** on the opening screen. That button connects to the invited room and enters the world. The address bar updates to the actual connected room; leaving removes the room parameter.

Each player rides their own bicycle. The other rider appears in blue, with a blue dot on the map. Both riders must stop within four metres of the current objective; either can confirm its dialogue. Quest progress is shared, the first rider to accept carries the parcel, and both earn Sunset Gold. Co-op uses a fresh room quest and never overwrites the browser's solo quest. Riders do not collide with each other.

A dropped connection retries automatically. Disconnected riders keep their slot for one minute while their friend remains online. Empty rooms last 15 minutes. Rejoin the same room in the same tab to resume; the code and reconnect token are stored in session storage. Leave room to return to solo play. Room state is held in memory, so a server restart loses room progress. This first version is intended for private invitations, not competitive play: it validates room membership, finite positions, quest order and both riders' proximity, but does not simulate movement authoritatively.

### Hosting alongside Vercel

The frontend remains a normal Vercel Vite deployment. Host `server/index.js` as one continuously running Node 22 service with WebSocket support. A Dockerfile is provided at `server/Dockerfile`, using the repository root as build context. Alternatively install with `npm ci --omit=dev` and run `npm run multiplayer`.

Set these **server** variables:

- `HOST=0.0.0.0` to accept the hosting platform's traffic.
- `PORT` to the platform's assigned port (default 8787).
- `ALLOWED_ORIGINS=https://your-game.vercel.app` (comma-separated exact origins for any additional frontend domains). Unset accepts all origins for local development.

The service provides `/health` for health checks and `/coop` for WebSocket connections. Terminate TLS at the hosting platform. Run **one instance**: rooms currently live in one process, without shared storage or multi-instance routing.

Set **Vercel's** public build variable `VITE_COOP_URL=wss://your-server-domain/coop`, then redeploy the frontend. This is a public endpoint, not a secret. `.env.example` documents it. A production site without this setting remains solo-only and explains that co-op is not configured; it does not simulate an online connection. Localhost invite links work only on the same computer. Two different computers require a reachable hosted server and frontend URL.

`npm test` includes a real two-WebSocket-client test that shares positions, completes all quest steps, rejects a third rider, and reconnects with the completed quest intact.
