# Shadow Cabinet

Move a lamp around a cabinet of scattered paper and discover the creature hiding in its shadow — then draw a shadow and turn it into a sculpture of your own.

The interactive two-view paper theatre implements Rabbit, Moth and Teapot, wall dragging, keyboard lamp sliders, a home reveal and depth scattering. Custom drawing is not yet implemented. This is a local HTTP preview, not a public deployment. The original masks are in `fixtures/presets.json`; the full design and implementation contract is in `BRIEF.md`.

## Local HTTP preview

The Alpine nginx image serves HTTP on port **80**. Build or rebuild after any asset change, then recreate the detached preview exactly as follows:

```sh
cd /home/ichabod/apps/shadow-cabinet
docker build -t shadow-cabinet:preview .
docker rm -f shadow-cabinet-preview 2>/dev/null || true
docker run -d --name shadow-cabinet-preview --network ichabod-proxy \
  --cpus=0.50 --memory=512m --pids-limit=256 \
  --restart unless-stopped --log-opt max-size=10m --log-opt max-file=3 \
  shadow-cabinet:preview
```

There are no Traefik routing labels and no published host port. The image has a real `/healthz` HTTP healthcheck using Alpine's `wget`. Check readiness before using the browser contract:

```sh
docker exec shadow-cabinet-preview wget -qO- http://127.0.0.1:80/healthz
docker inspect --format '{{.State.Health.Status}}' shadow-cabinet-preview
tools/run-browser http://shadow-cabinet-preview 2
```

Expected outputs: `ok`, `healthy`, and `browser stage 2 pass`. The browser runs on `ichabod-proxy` and reaches the preview by its container name. The app fetches only its bundled local mask fixture; it uses no external runtime assets. The read-only `window.shadowCabinet.snapshot()` reports fresh copies of current geometry and projections for inspection.

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
