import { HOME, makeTiles, project } from './geometry.mjs';

const presets = await fetch('/fixtures/presets.json').then((response) => {
  if (!response.ok) throw new Error('Could not load paper masks.');
  return response.json();
});
const paper = document.querySelector('#paper');
const wall = document.querySelector('#wall');
const xRange = document.querySelector('#lamp-x');
const yRange = document.querySelector('#lamp-y');
const status = document.querySelector('#status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let preset = 'rabbit';
let seed = 1;
let rows = [...presets.find((item) => item.id === preset).rows];
let tiles = makeTiles(rows, seed);
let lamp = [70, -25, -600];
let pendingFrame = 0;
let glide = null;
let draggingPointer = null;

function syncControls() {
  xRange.value = lamp[0];
  yRange.value = lamp[1];
  status.textContent = lamp[0] === 0 && lamp[1] === 0
    ? 'One light. Many pieces. One shadow.'
    : 'The pieces stay still. Only the light moves.';
  for (const button of document.querySelectorAll('[data-preset]')) {
    button.setAttribute('aria-pressed', String(button.dataset.preset === preset));
  }
}

function scheduleDraw() {
  if (!pendingFrame) pendingFrame = requestAnimationFrame(drawFrame);
}

function canvasContext(canvas) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(720 * dpr);
  const height = Math.round(600 * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function polygon(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
}

function paintWall() {
  const ctx = canvasContext(wall);
  ctx.fillStyle = '#F4E5C6';
  ctx.fillRect(0, 0, 720, 600);
  ctx.fillStyle = '#24202A';
  // One nonzero-winding path gives the opaque union, including shared edges:
  // filling triangles separately would antialias seams through solid cells.
  // Every subpath is still projected from current 3D vertices/current lamp.
  ctx.beginPath();
  for (const tile of tiles) {
    tile.vertices.forEach((vertex, index) => {
      const [x, y] = project(vertex, lamp);
      if (index === 0) ctx.moveTo(360 + x, 300 + y);
      else ctx.lineTo(360 + x, 300 + y);
    });
    ctx.closePath();
  }
  ctx.fill();
  // Home and lamp markers use the control mapping, not geometric projection.
  ctx.beginPath();
  ctx.arc(360, 300, 15, 0, Math.PI * 2);
  ctx.strokeStyle = '#B87953';
  ctx.lineWidth = 2;
  ctx.stroke();
  const markerX = (lamp[0] / 240 + .5) * 720;
  const markerY = (lamp[1] / 160 + .5) * 600;
  ctx.beginPath();
  ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD889';
  ctx.fill();
  ctx.strokeStyle = '#24202A';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Parallel oblique camera: depth shears right and upward. The midpoint of
// the paper depth range (-270) is centered at (360,300), with scale 1.25.
// View direction is (-.75,.28,1); dot-product depth sorts far to near.
function paperPoint([x, y, z]) {
  return [360 + 1.25 * (x + .75 * (z + 270)),
    300 + 1.25 * (y - .28 * (z + 270))];
}
function cameraDepth(tile) {
  return tile.vertices.reduce((sum, [x, y, z]) => sum - .75 * x + .28 * y + z, 0) / 3;
}
function paintPaper() {
  const ctx = canvasContext(paper);
  ctx.fillStyle = '#252B35';
  ctx.fillRect(0, 0, 720, 600);
  // A quiet cabinet floor gives the suspended depth a visual reference.
  ctx.strokeStyle = '#786454';
  ctx.lineWidth = 1;
  polygon(ctx, [[46, 520], [585, 520], [674, 474], [135, 474]]);
  ctx.stroke();
  const colors = ['#B87953', '#D1AA77', '#849A9B'];
  const sorted = [...tiles].sort((a, b) => cameraDepth(b) - cameraDepth(a));
  for (const tile of sorted) {
    polygon(ctx, tile.vertices.map(paperPoint));
    ctx.fillStyle = colors[tile.id % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#F4E5C680';
    ctx.lineWidth = .65;
    ctx.stroke();
  }
}

function drawFrame(now) {
  pendingFrame = 0;
  if (glide) {
    const progress = Math.min((now - glide.start) / 900, 1);
    const eased = 1 - (1 - progress) ** 3;
    lamp = progress === 1 ? [...HOME]
      : [glide.from[0] * (1 - eased), glide.from[1] * (1 - eased), -600];
    if (progress === 1) glide = null;
    syncControls();
  }
  paintPaper();
  paintWall();
  if (glide) scheduleDraw();
}

function setLamp(x, y) {
  glide = null;
  lamp = [Math.max(-120, Math.min(120, Math.round(x))),
    Math.max(-80, Math.min(80, Math.round(y))), -600];
  syncControls();
  scheduleDraw();
}
xRange.addEventListener('input', () => setLamp(Number(xRange.value), lamp[1]));
yRange.addEventListener('input', () => setLamp(lamp[0], Number(yRange.value)));
function movePointer(event) {
  const box = wall.getBoundingClientRect();
  setLamp(((event.clientX - box.left) / box.width - .5) * 240,
    ((event.clientY - box.top) / box.height - .5) * 160);
}
wall.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || draggingPointer !== null) return;
  draggingPointer = event.pointerId;
  wall.setPointerCapture(event.pointerId);
  movePointer(event);
});
wall.addEventListener('pointermove', (event) => {
  if (event.pointerId === draggingPointer) movePointer(event);
});
function stopPointer(event) {
  if (event.pointerId !== draggingPointer) return;
  draggingPointer = null;
  if (wall.hasPointerCapture(event.pointerId)) wall.releasePointerCapture(event.pointerId);
}
wall.addEventListener('pointerup', stopPointer);
wall.addEventListener('pointercancel', stopPointer);
wall.addEventListener('lostpointercapture', () => { draggingPointer = null; });

document.querySelector('#home').addEventListener('click', () => {
  if (reducedMotion.matches) setLamp(0, 0);
  else {
    glide = { from: [...lamp], start: performance.now() };
    scheduleDraw();
  }
});
document.querySelector('#scatter').addEventListener('click', () => {
  // Scattering changes only the paper depths, never the mask or current lamp.
  seed += 1;
  tiles = makeTiles(rows, seed);
  scheduleDraw();
});
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    preset = button.dataset.preset;
    rows = [...presets.find((item) => item.id === preset).rows];
    seed = 1;
    tiles = makeTiles(rows, seed);
    setLamp(70, -25);
  });
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches && glide) setLamp(0, 0);
});
window.addEventListener('resize', scheduleDraw);
Object.defineProperty(window, 'shadowCabinet', {
  value: Object.freeze({
    snapshot() {
      // Fresh JSON-safe data only: mutating a returned object cannot edit state.
      return JSON.parse(JSON.stringify({
        preset, seed, lamp, rows, tiles,
        shadows: tiles.map((tile) => tile.vertices.map((vertex) => project(vertex, lamp))),
      }));
    },
  }),
  writable: false,
  configurable: false,
});
syncControls();
scheduleDraw();
