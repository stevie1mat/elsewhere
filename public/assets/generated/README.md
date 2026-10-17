# Coastal vegetation

`coastal-vegetation.png` was generated using the built-in image generation tool, then copied into this project with its original alpha channel. Used as instanced crossed-plane foliage in `src/porto-outskirts.js`. Buildings, terrain and collision remain 3D geometry.

## Final generation prompt

Use case: photorealistic-natural. Asset type: transparent vegetation sprite atlas for a Mediterranean coastal 3D game. Create ONE square PNG atlas, actual transparent alpha background, four separate full plants in an exact 2 by 2 grid with generous empty transparent margins inside each quadrant. Upper left: mature olive tree with gnarled trunk and silver-green leaves. Upper right: tall narrow Mediterranean cypress. Lower left: dense flowering oleander shrub with pink flowers. Lower right: clump of coastal dry grasses and small white wildflowers. Each plant centered in its own quadrant, roots/base at 92% of quadrant height, entire silhouette visible, no overlap across quadrants. Front orthographic view, photorealistic botanical detail, neutral diffuse daylight, natural muted greens, no ground plane, no baked cast shadows, no scenery, no text, no labels, no borders. These will be alpha-cutout sprites in a real-time game; preserve fine leaf silhouettes and true transparent negative space.

The generated layout varies from a uniform grid; UV regions are adjusted to the output. The atlas is not a replacement for close-up volumetric tree models.
