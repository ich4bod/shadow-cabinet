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
const maker = document.querySelector('#maker');
const drawing = document.querySelector('#drawing');
const openMaker = document.querySelector('#open-maker');
const makeSculpture = document.querySelector('#make-sculpture');
const drawingStatus = document.querySelector('#drawing-status');
let draft = [];
let drawingMode = 'draw';
let drawingPointer = null;
let lastDrawingPoint = null;
let pendingDrawingFrame = 0;

function setDrawingMode(mode) {
  drawingMode = mode;
  document.querySelector('#draw-mode').setAttribute('aria-pressed', String(mode === 'draw'));
  document.querySelector('#erase-mode').setAttribute('aria-pressed', String(mode === 'erase'));
}
function resetDraft() {
  draft = Array.from({ length: 24 }, () => Array(24).fill(false));
  stopDrawing();
  updateDraft();
}
function updateDraft() {
  const empty = !draft.some((row) => row.some(Boolean));
  makeSculpture.disabled = empty;
  drawingStatus.textContent = empty ? 'Draw a little darkness first.' : '';
  if (!pendingDrawingFrame) pendingDrawingFrame = requestAnimationFrame(paintDrawing);
}
function paintDrawing() {
  pendingDrawingFrame = 0;
  const ctx = drawing.getContext('2d');
  ctx.fillStyle = '#F4E5C6';
  ctx.fillRect(0, 0, 480, 480);
  ctx.fillStyle = '#24202A';
  draft.forEach((row, r) => row.forEach((filled, c) => {
    if (filled) ctx.fillRect(c * 20, r * 20, 20, 20);
  }));
  ctx.beginPath();
  for (let i = 0; i <= 24; i += 1) {
    ctx.moveTo(i * 20, 0); ctx.lineTo(i * 20, 480);
    ctx.moveTo(0, i * 20); ctx.lineTo(480, i * 20);
  }
  ctx.strokeStyle = '#B8795355';
  ctx.lineWidth = 1;
  ctx.stroke();
}
function drawingPoint(event) {
  const box = drawing.getBoundingClientRect();
  return [Math.max(0, Math.min(479.999, (event.clientX - box.left) / box.width * 480)),
    Math.max(0, Math.min(479.999, (event.clientY - box.top) / box.height * 480))];
}
// Traverse grid boundaries along the actual segment, even if a fast pointer
// only delivered its endpoints. Exact corner crossings enter the diagonal cell.
function paintSegment(from, to) {
  let col = Math.floor(from[0] / 20);
  let row = Math.floor(from[1] / 20);
  const endCol = Math.floor(to[0] / 20);
  const endRow = Math.floor(to[1] / 20);
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const txStep = dx === 0 ? Infinity : 20 / Math.abs(dx);
  const tyStep = dy === 0 ? Infinity : 20 / Math.abs(dy);
  let tx = dx === 0 ? Infinity : ((col + (sx > 0 ? 1 : 0)) * 20 - from[0]) / dx;
  let ty = dy === 0 ? Infinity : ((row + (sy > 0 ? 1 : 0)) * 20 - from[1]) / dy;
  draft[row][col] = drawingMode === 'draw';
  while (col !== endCol || row !== endRow) {
    if (tx < ty) { col += sx; tx += txStep; }
    else if (ty < tx) { row += sy; ty += tyStep; }
    else { col += sx; row += sy; tx += txStep; ty += tyStep; }
    draft[row][col] = drawingMode === 'draw';
  }
  updateDraft();
}
function continueDrawing(event) {
  const point = drawingPoint(event);
  paintSegment(lastDrawingPoint || point, point);
  lastDrawingPoint = point;
}
function stopDrawing() {
  const pointer = drawingPointer;
  drawingPointer = null;
  lastDrawingPoint = null;
  if (pointer !== null && drawing.hasPointerCapture(pointer)) drawing.releasePointerCapture(pointer);
}
drawing.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || drawingPointer !== null) return;
  drawingPointer = event.pointerId;
  drawing.setPointerCapture(event.pointerId);
  continueDrawing(event);
});
drawing.addEventListener('pointermove', (event) => {
  if (event.pointerId === drawingPointer) continueDrawing(event);
});
drawing.addEventListener('pointerup', (event) => {
  if (event.pointerId !== drawingPointer) return;
  continueDrawing(event);
  stopDrawing();
});
drawing.addEventListener('pointercancel', (event) => {
  if (event.pointerId === drawingPointer) stopDrawing();
});
drawing.addEventListener('lostpointercapture', stopDrawing);
openMaker.addEventListener('click', () => {
  resetDraft();
  setDrawingMode('draw');
  maker.showModal();
});
document.querySelector('#draw-mode').addEventListener('click', () => setDrawingMode('draw'));
document.querySelector('#erase-mode').addEventListener('click', () => setDrawingMode('erase'));
document.querySelector('#clear-drawing').addEventListener('click', resetDraft);
document.querySelector('#cancel-maker').addEventListener('click', () => maker.close());
// Native Escape closes the dialog without touching the existing sculpture.
maker.addEventListener('close', () => {
  stopDrawing();
  openMaker.focus();
});
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
  document.querySelector('#custom-name').hidden = preset !== 'custom';
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
  // Freeze an in-flight home reveal at its current light before changing paper.
  glide = null;
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
makeSculpture.addEventListener('click', () => {
  if (makeSculpture.disabled) return;
  rows = draft.map((row) => row.map((filled) => filled ? '#' : '.').join(''));
  preset = 'custom';
  seed = 1;
  tiles = makeTiles(rows, seed);
  setLamp(HOME[0], HOME[1]);
  maker.close();
});
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
