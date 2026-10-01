# Airport travelers

Human geometry, photographic-style surface textures, and the source skeletal walking motion are from **Microsoft Rocketbox**, copyright Microsoft Corporation, under the included MIT license (`LICENSE.txt`).

Source repository: https://github.com/microsoft/Microsoft-Rocketbox
License: https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md

Source assets:
- `Assets/Avatars/Adults/Male_Adult_01/Export/Male_Adult_01.fbx`
- `Assets/Avatars/Adults/Female_Adult_01/Export/Female_Adult_01.fbx`
- The corresponding `Textures/m002_*` and `Textures/f001_*` body/head color and normal maps and opacity color maps.
- `Assets/Animations/all_animations_max_motextr_xy/m_walk_neutral_01.max.fbx`

Local adaptations: converted FBX geometry and skinning to GLB; grouped material draws; retained compatible joint rotations; removed horizontal root travel; baked sole contact into the hip height; converted 2048px TGA maps to lossless WebP without recoloring or resampling. Texture UVs retain the FBX convention (`flipY=true`). The runtime supplies PBR surface materials and shares models/textures between independently animated skeletons.

`scripts/prepare-people.mjs` performs the offline geometry/animation conversion using the source FBX files staged under `/private/tmp`; it is not needed to run the game. These are game-resolution human models, not scans of the person in the user's photograph.
