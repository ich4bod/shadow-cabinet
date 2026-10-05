// Wall z=0, x right, y down. All paper is built for this fixed lamp home.
export const HOME = Object.freeze([0, 0, -600]);

/** Intersect the ray from lamp through vertex with the wall. */
export function project(vertex, lamp) {
  const t = (0 - lamp[2]) / (vertex[2] - lamp[2]);
  return [
    lamp[0] + t * (vertex[0] - lamp[0]),
    lamp[1] + t * (vertex[1] - lamp[1]),
  ];
}

/** Place a wall point along its lamp ray at the given depth. */
export function unproject(wallXY, z, lamp) {
  const s = (z - lamp[2]) / (0 - lamp[2]);
  return [
    lamp[0] + s * (wallXY[0] - lamp[0]),
    lamp[1] + s * (wallXY[1] - lamp[1]),
    z,
  ];
}

/** Turn a 24×24 mask into independently depth-scattered paper triangles. */
export function makeTiles(rows, seed) {
  if (!Array.isArray(rows) || rows.length !== 24) {
    throw new TypeError('Rows must be an array of 24 mask strings.');
  }
  for (let row = 0; row < 24; row += 1) {
    if (typeof rows[row] !== 'string' || !/^[#.]{24}$/.test(rows[row])) {
      throw new TypeError('Each mask row must contain exactly 24 # or . characters.');
    }
  }
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new RangeError('Seed must be a nonnegative safe integer.');
  }

  const tiles = [];
  for (let row = 0; row < 24; row += 1) {
    for (let col = 0; col < 24; col += 1) {
      if (rows[row][col] !== '#') continue;
      const x = -240 + 20 * col;
      const y = -240 + 20 * row;
      const a = [x, y];
      const b = [x + 20, y];
      const c = [x + 20, y + 20];
      const d = [x, y + 20];
      const halves = [[a, b, c], [a, c, d]];
      for (let half = 0; half < 2; half += 1) {
        const id = 2 * (row * 24 + col) + half;
        const z = -420 + ((id * 73 + seed * 97) % 301);
        tiles.push({
          id, row, col, half, z,
          vertices: halves[half].map((wallXY) => unproject(wallXY, z, HOME)),
        });
      }
    }
  }
  return tiles;
}
