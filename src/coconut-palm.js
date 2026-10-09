import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Actual folded leaflets leave open sky between the pinnae, even in shadows.
// Each tree is baked into four shared material batches by World.
export function coconutPalmGeometry(height, seed = 1) {
  let state = seed >>> 0;
  const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
  const v = (x, y, z) => new T.Vector3(x, y, z);
  const parts = { bark: [], foliage: [], stems: [], fruit: [] };
  const tint = (geometry, color, variation = .08) => {
    const base = new T.Color(color), colors = [];
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      const shade = .96 + random() * variation;
      colors.push(base.r * shade, base.g * shade, base.b * shade);
    }
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    return geometry;
  };
  const tube = (points, radius, color, bucket = 'stems', segments = 16) => {
    const curve = new T.CatmullRomCurve3(points);
    parts[bucket].push(tint(new T.TubeGeometry(curve, segments, radius, 5, false), color));
  };
  const lean = v(.3 + random() * .3, 0, (random() - .5) * .55);
  const center = t => lean.clone().multiplyScalar(t * t).add(v(.055 * Math.sin(t * 4), height * t, 0));
  const crown = center(1);
  // Flared foot, tapered irregular shaft, and raised annular leaf scars.
  const positions = [], colors = [], uvs = [], indices = [];
  const rings = Math.ceil(height * 32), sides = 24;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings, p = center(t);
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * Math.PI * 2;
      const scar = Math.pow(.5 + .5 * Math.cos(t * height * 39 + .25 * Math.sin(a * 3)), 10);
      const radius = .17 + .12 * Math.exp(-t * 18) + .04 * (1 - t) + scar * .012 + .005 * Math.sin(a * 7 + t * 45);
      positions.push(p.x + Math.cos(a) * radius, p.y, p.z + Math.sin(a) * radius);
      uvs.push(i / sides, t);
      const shade = .78 + random() * .22 - scar * .24;
      const color = new T.Color(0xa39880).multiplyScalar(shade);
      colors.push(color.r, color.g, color.b);
      if (j < rings && i < sides) { const k = j * (sides + 1) + i; indices.push(k, k + sides + 1, k + 1, k + 1, k + sides + 1, k + sides + 2); }
    }
  }
  const trunk = new T.BufferGeometry();
  trunk.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  trunk.setAttribute('normal', new T.Float32BufferAttribute(new Float32Array(positions.length), 3));
  trunk.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  trunk.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  trunk.setIndex(indices); trunk.computeVertexNormals(); parts.bark.push(trunk);

  const leafPositions = [], leafColors = [], leafUV = [], leafIndices = [];
  const phase = random() * Math.PI * 2;
  for (let f = 0; f < 23; f++) {
    const tier = f < 9 ? 0 : f < 17 ? 1 : 2;
    const angle = phase + f * 2.39996 + (random() - .5) * .3;
    const radial = v(Math.cos(angle), 0, Math.sin(angle));
    const across = v(-Math.sin(angle), 0, Math.cos(angle));
    const length = (tier === 2 ? 2.1 : 3.3) * (.88 + random() * .24);
    const rise = [1.0, 1.7, 2.3][tier], drop = [2.15, 1.8, 1.1][tier];
    const base = crown.clone().addScaledVector(radial, .08).add(v(0, (f % 3) * .065, 0));
    const rachis = t => base.clone().addScaledVector(radial, length * t)
      .addScaledVector(across, .15 * Math.sin(t * 2.5 + f) * t)
      .add(v(0, rise * Math.sin(t * Math.PI * .8) - drop * t * t, 0));
    tube(Array.from({ length: 13 }, (_, j) => rachis(j / 12)), .014, tier === 0 ? 0x788141 : 0x8b9c4a);
    // Overlapping woody petiole sheaths anchor each frond to the crown.
    tube([crown.clone().add(v(0, -.28, 0)), base, rachis(.13)], .044, 0x857449, 'bark', 6);
    const count = tier === 2 ? 27 : 38;
    for (let n = 0; n < count; n++) for (const side of [-1, 1]) {
      const t = .13 + n / count * .85 + random() * .006;
      const root = rachis(t);
      const reach = (.18 + .69 * Math.pow(Math.sin(Math.PI * t), .75)) * (tier === 2 ? .73 : 1) * (.85 + random() * .25);
      const sweep = .18 + .3 * t;
      const width = (.034 + .022 * Math.sin(t * Math.PI)) * (.85 + random() * .3);
      const color = new T.Color([0x47702c, 0x588338, 0x769443][tier]).multiplyScalar(.78 + random() * .4);
      const start = leafPositions.length / 3;
      // A central fold catches sunlight; narrowing tips twist and droop.
      for (let j = 0; j <= 4; j++) {
        const u = j / 4;
        const p = root.clone().addScaledVector(across, side * reach * u)
          .addScaledVector(radial, sweep * u)
          .add(v(0, .09 * Math.sin(u * Math.PI) - (.22 + t * .22) * u * u, 0));
        const halfWidth = width * Math.sin(Math.PI * Math.pow(u, .65));
        for (const edge of [-1, 0, 1]) {
          const q = p.clone().addScaledVector(radial, halfWidth * edge);
          q.y += edge === 0 ? halfWidth * .45 : edge * side * u * .014;
          leafPositions.push(q.x, q.y, q.z); leafUV.push(u, (edge + 1) / 2);
          const shade = edge === 0 ? 1.1 : edge === -1 ? .86 : 1;
          leafColors.push(color.r * shade, color.g * shade, color.b * shade);
        }
      }
      for (let j = 0; j < 4; j++) for (let strip = 0; strip < 2; strip++) {
        const k = start + j * 3 + strip;
        leafIndices.push(k, k + 3, k + 1, k + 1, k + 3, k + 4);
      }
    }
  }
  const leaves = new T.BufferGeometry();
  leaves.setAttribute('position', new T.Float32BufferAttribute(leafPositions, 3));
  leaves.setAttribute('uv', new T.Float32BufferAttribute(leafUV, 2));
  leaves.setAttribute('color', new T.Float32BufferAttribute(leafColors, 3));
  leaves.setIndex(leafIndices); leaves.computeVertexNormals(); parts.foliage.push(leaves);
  // Compact clusters of full-sized, slightly pointed green/gold coconuts.
  for (let cluster = 0; cluster < 3; cluster++) {
    const a = phase + cluster * 2.1;
    const stem = crown.clone().add(v(Math.cos(a) * .26, -.2, Math.sin(a) * .26));
    tube([crown, stem, stem.clone().add(v(0, -.35, 0))], .026, 0x938347);
    for (let n = 0; n < 3; n++) {
      const angle = a + n * 2.3;
      const p = stem.clone().add(v(Math.cos(angle) * .18, -.18 - (n % 2) * .22, Math.sin(angle) * .18));
      const fruit = new T.SphereGeometry(1, 12, 10);
      fruit.scale(.145 + random() * .025, .22, .16); fruit.rotateZ((random() - .5) * .8); fruit.translate(p.x, p.y, p.z);
      parts.fruit.push(tint(fruit, n === 1 ? 0x999448 : 0x738345, .16));
    }
  }
  return Object.fromEntries(Object.entries(parts).map(([name, geometries]) => {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());
    return [name, merged];
  }));
}
