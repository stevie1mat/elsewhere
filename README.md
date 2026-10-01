# Elsewhere — Porto Sol

## Deploy to Vercel

Import `stevie1mat/elsewhere` into Vercel. This repository contains the game at its root, so leave Root Directory at the repository root (`.`). The included `vercel.json` selects Vite, runs `npm run build`, and publishes `dist`. No environment variables or backend services are required.

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

- **W/S**: pedal / reverse; **A/D**: steer; **Shift**: pedal faster; **Space**: brake.
- Click the scene to capture the mouse. **Esc** releases it.
- **Q/E** or **left/right arrows** also steer. Up/down arrows pedal/reverse.
- Drag the scene to orbit the camera when mouse capture is unavailable. **C** centers the camera behind the bike.
- **P** hides the interface; **R** returns to the waterfront.
- Touch screens have movement buttons and drag-to-look controls.
- Select a landmark to highlight it on the map; riding close discovers it.
- The sun button switches between golden hour and blue hour.
- The camera button downloads a PNG of the current scene.
- Settings include graphics quality, camera smoothing, and a locally saved favorite spot.
- Ocean ambience is synthesized locally and starts only when enabled.

## What's built

An original coastal neighborhood with shopfronts, balconies, café tables, a garden, fountain, pier, sailboats, palms, animated pedestrians, distant terrain, and water. The bicycle controller handles acceleration, steering, braking, reversing, and collision clearance at walls and land/pier boundaries. The camera follows the visible rider and pulls forward around scenery. Static geometry is merged by material; detailed trees use instancing.

You control the 3D cyclist, with wheel rotation and pedaling driven by actual distance traveled. The rider reuses the male Rocketbox traveler from `../game`; the bicycle is procedural geometry. The cyclist is the player avatar, viewed in third person.

This is the **world and cycling** milestone. Cars, building interiors, AI prompts, generated worlds, accounts, and multiplayer are not implemented. No API key, remote AI call, or paid service is needed. The initial local asset download is substantial because this version retains the source game's high-resolution textures. Use Balanced graphics if High runs slowly.

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
- `src/movement.js`: bicycle controller and traversable boundaries.
- `src/main.js`: rendering loop, controls, map, discovery UI, saved settings.
- `src/style.css`: responsive interface.
- `tests/movement.test.js`: standalone movement checks.

## Asset credits

- Ground textures, sky/HDR environment, and tree: **Poly Haven**, CC0. Details: [`public/assets/hd/CREDITS.md`](public/assets/hd/CREDITS.md).
- Human models, textures, and walking animation: **Microsoft Rocketbox**, MIT. Details: [`public/assets/people/CREDITS.md`](public/assets/people/CREDITS.md); original license: [`public/assets/people/LICENSE.txt`](public/assets/people/LICENSE.txt).
- Buildings, props, city layout, palm geometry, terrain, and interface were created for this project.

Three.js is MIT licensed. Vite is MIT licensed. This is an original environment; no GTA assets are used.
