# Shadow Cabinet

Move a lamp around a cabinet of scattered paper and discover the creature hiding in its shadow — then draw a shadow and turn it into a sculpture of your own.

This repository currently implements the pure geometry model. The interactive paper theatre is not yet built or deployed. The original Rabbit, Moth and Teapot masks are in `fixtures/presets.json`; the full design and implementation contract is in `BRIEF.md`.

## Model

`public/geometry.mjs` is DOM-free ESM, usable in browsers and Node. It exports:

- `HOME`: the fixed lamp home `[0, 0, -600]`.
- `project(vertex, lamp)`: intersect a lamp-to-vertex ray with the wall at z=0.
- `unproject(wallXY, z, lamp)`: place a wall point on its lamp ray at a chosen depth.
- `makeTiles(rows, seed)`: turn a valid 24×24 mask of `#` and `.` into row-major pairs of triangles, using a nonnegative safe-integer seed.

Each triangle lies in its own constant-depth plane between z=-420 and z=-120. Its vertices are inverse-generated from the drawing using the home lamp. Changing the seed changes the paper depths but preserves the home shadow. Moving the lamp changes the projected shadow without moving the paper. This is a simplified point-light model with opaque, flat triangles, a flat wall and no soft shadow edges.

## Geometry test

From the repository root, run:

```sh
node tools/geometry-contract.mjs
```

Expected stdout: `geometry pass`. This independent contract checks the three original masks, ray projection and its inverse, triangle counts and depths, deterministic generation, home-shadow invariance and input validation.

Data is disposable; this toy stores no visitor data.
