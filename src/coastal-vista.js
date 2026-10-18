import * as T from 'three';

// Scenic architecture stays beyond the playable shore. Everything joins the
// world's existing material batches, with no extra collision or update work.
export function coastalVista(w, terrain) {
  const p = terrain.attributes.position;
  const heightAt = (x, z) => {
    const col = Math.max(0, Math.min(220, Math.round((x + 550) / 5)));
    const row = Math.max(0, Math.min(100, Math.round((z + 230) / 4.6)));
    return p.getY(row * 221 + col);
  };
  const walls = [w.m.cream, w.m.peach, w.mat(0xe8bc7c), w.mat(0xe4d1ac)];
  const stone = w.mat(0xb8ab8e), cypress = w.mat(0x344f38);
  const roof = (x, y, z, width, depth) => {
    for (const side of [-1, 1]) {
      const g = new T.BoxGeometry(width / 2 + .7, .4, depth + 1.1);
      g.rotateZ(side * -.36);
      w.mesh(g, w.m.tile, x + side * width / 4, y, z);
    }
  };
  for (let row = 0; row < 5; row++) {
    const z = 156 - row * 36;
    for (let col = 0; col < 12; col++) {
      const x = -255 + col * 35 + (row % 2) * 15;
      const base = heightAt(x, z), wx = x - 240, wz = z - 730;
      if (base < 8) continue;
      const width = 13 + (col % 3) * 2, depth = 13, h = 9 + ((row + col) % 3) * 3;
      w.box(width + 5, 4, depth + 6, wx, base - 1, wz, stone);
      w.box(width, h, depth, wx, base + h / 2, wz, walls[(col + row) % walls.length]);
      roof(wx, base + h + 1, wz, width, depth);
      for (let floor = 0; floor < Math.floor(h / 3.5); floor++) {
        for (const dx of [-width * .3, 0, width * .3]) {
          const y = base + 2 + floor * 3.5;
          w.box(1.5, 2.1, .18, wx + dx, y, wz + depth / 2 + .1, w.m.dark);
          for (const side of [-1, 1]) w.box(.5, 2.1, .25, wx + dx + side, y, wz + depth / 2 + .2, w.m.sage);
          w.box(2.6, .18, .6, wx + dx, y - 1.1, wz + depth / 2 + .25, w.m.trim);
        }
      }
      w.box(1, 2.5, 1, wx + 3, base + h + 2, wz - 2, w.m.cream);
      const tx = wx + width / 2 + 5;
      w.cylinder(.3, .5, 3, tx, base + 1.5, wz, w.m.wood);
      const crown = new T.SphereGeometry(1, 7, 6); crown.scale(1.7, 6, 1.7);
      w.mesh(crown, cypress, tx, base + 7, wz);
    }
  }
  // A campanile gives the hillside a distinct focal point.
  const x = -310, z = -735, base = heightAt(x + 240, z + 730);
  w.box(20, 14, 28, x - 15, base + 7, z, w.m.cream);
  roof(x - 15, base + 15, z, 20, 28);
  w.box(7, 34, 7, x, base + 17, z, walls[2]);
  for (const y of [base + 4, base + 23, base + 32]) w.box(8, .65, 8, x, y, z, w.m.trim);
  for (const side of [-1, 1]) {
    w.box(2.6, 5, .2, x, base + 28, z + side * 3.55, w.m.dark);
    w.box(.2, 5, 2.6, x + side * 3.55, base + 28, z, w.m.dark);
  }
  w.mesh(new T.ConeGeometry(6, 7, 4), w.m.tile, x, base + 37.5, z, Math.PI / 4);
  // Successively cooler ridges create depth behind the terraced village.
  for (let layer = 0; layer < 3; layer++) {
    const geo = new T.PlaneGeometry(2300, 470, 115, 24); geo.rotateX(-Math.PI / 2);
    const vertices = geo.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const px = vertices.getX(i), pz = vertices.getZ(i);
      const ridge = Math.pow(Math.max(0, 1 - Math.abs(pz) / 235), 1.25);
      const peak = 125 + layer * 45 + 62 * Math.sin(px * .009 + layer * 2) + 32 * Math.sin(px * .023) + 14 * Math.sin(px * .057 + pz * .025);
      vertices.setY(i, ridge * peak - 8);
    }
    geo.computeVertexNormals();
    w.mesh(geo, w.mat([0x75888b, 0x8a9da3, 0xa0afb4][layer]), -220, 0, -1080 - layer * 230);
  }
}
