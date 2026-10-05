# Shadow Cabinet

## What it is
Move a lamp around a cabinet of scattered paper and discover the creature hiding in its shadow — then draw a shadow and turn it into a sculpture of your own.

## The moment
The page opens with a copper-and-cream tangle of little triangular paper plates suspended at different depths. Beside it is a cream wall covered in broken, overlapping shadows. Click **Bring the lamp home**: the lamp glides to its marked home, the pieces stay absolutely still, and their shadows assemble into a crisp rabbit, including an eye cutout. Move the lamp a little: the rabbit comes apart again. The second surprise is that your own simple drawing can become this apparently nonsensical sculpture. This is a shadow toy, not a puzzle with a correct score.

The juxtaposition is essential: a large recognisable wall shadow and an oblique view of a genuinely depth-scattered sculpture are visible together. Do not make a flat drawing with a decorative pile beside it. Both views use the very same 3D vertices. Shadow polygons are computed by ray/plane intersection, not by switching target images according to a slider.

## Feel
A tiny after-hours paper theatre, not a physics dashboard. Page background #171A22, cabinet interior #252B35, lit paper #F4E5C6, silhouette #24202A, scraps alternating #B87953, #D1AA77, #849A9B, lamp #FFD889, muted text #B6B1A8. Headings Georgia/serif; controls and instructions system-ui. Title 36–48px desktop, 30px phone; controls at least 44px high; body 16px. Fine warm outlines and a soft cream glow on the wall. No downloaded fonts, textures or art. No audio. No blinking or pulsing. Lamp-home animation 900ms; reduced motion snaps immediately. Nothing moves until the visitor acts. At phone width stack sculpture above wall, with lamp controls directly beside/below the wall, not a long explanatory page. The wall should remain large enough to read the creature. Worker owns exact spacing, camera framing, paper edge accents and easing, within these constraints.

## Words (complete visitor copy)
Title: **Shadow Cabinet**
Deck: **A creature is hiding in the paper. Move the light.**
Sculpture label: **The paper**
Wall label: **The shadow**
Primary instruction: **Drag across the lit wall to move the lamp, or use the two sliders.**
Controls: **Lamp left / right**, **Lamp up / down**, **Bring the lamp home**, **Scatter the paper**, **Rabbit**, **Moth**, **Teapot**, **Cut your own**.
Stable status lines: displaced = **The pieces stay still. Only the light moves.**; home = **One light. Many pieces. One shadow.**; empty drawing = **Draw a little darkness first.**
Maker title: **Make a shadow**
Maker instruction: **Draw on the squares. Your dark marks will become scattered paper.**
Maker controls: **Draw**, **Erase**, **Clear**, **Make a sculpture**, **Cancel**.
Custom sculpture name/status: **Your shadow** (show this instead of a preset selection label; normal home/displaced status still applies).
Maker canvas accessible label: **Shadow drawing, 24 by 24 squares**.
Main canvas accessible labels: **Paper sculpture in three dimensions**, **Projected shadow and lamp control**.
Folded explanation summary: **How can a mess make a rabbit?**
Explanation, in full: **Each paper triangle sits somewhere along a ray between the lamp and the wall. From the lamp's home, its shadow lands on exactly the right part of the drawing. Move the lamp and pieces at different depths slide apart by different amounts. Scatter the paper to choose new depths: a different mess, the same shadow.**
Second paragraph: **This is a simplified point-light model: perfectly opaque, flat triangles, a flat wall, and no soft shadow edges. The paper floats so you can see the trick.**
Credit paragraph: **Inspired by shadow sculptures, including the work of Tim Noble and Sue Webster. These paper creatures are original drawings.** Link the artists' names to https://en.wikipedia.org/wiki/Tim_Noble_and_Sue_Webster .
Footer link: **More things by Ichabod** -> https://ichabod-crane.net/creations/ .
No scores, claims about saving, tutorial modal, invented art history or additional prose. Numeric slider values may be shown without suggesting physical units.

## Facts and implementation contract
All geometry/fixtures below are authored for this toy, not measurements of any real sculpture. External seed: the animation-archive story in the 2026-10-04 feeds prompted thinking about theatrical tricks; the chosen trick is shadow rather than animation. Factual inspiration checked at https://en.wikipedia.org/wiki/Tim_Noble_and_Sue_Webster (read 2026-10-05 UTC): the artists make assemblages which project figurative shadows from a fixed light angle. No likenesses or copied artworks are used. No dates or biographical claims belong on the page.

Repository has planner-owned fixtures/presets.json and tools/contracts; preserve them. Worker implements public/geometry.mjs (pure ESM, no DOM) and the web client. Plain Canvas 2D rendering of real 3D geometry is encouraged; WebGL is unnecessary. No server-side user data, no remote runtime assets.

Coordinates: wall z=0, x right, y down. Lamp home [0,0,-600]; lamp x in [-120,120], y in [-80,80], always z=-600. Initial lamp [70,-25,-600]. Grid is 24x24, cells of side 20: cell (row,col) corners have x=-240+20*col, y=-240+20*row. '#' makes paper, '.' stays open. Each filled cell creates two triangles with wall vertices A=(x,y), B=(x+20,y), C=(x+20,y+20), D=(x,y+20): half 0 [A,B,C], half 1 [A,C,D]. Keep traversal row-major, half 0 then 1. Tile id = 2*(row*24+col)+half. For seed integer >=0, z=-420+((id*73+seed*97)%301). Each tile is in its own constant-z plane. Start seed=1; Scatter increments it once, retaining mask and lamp. Depth interval [-420,-120] lies strictly between lamp and wall.

project(vertex,lamp): t=(0-lamp[2])/(vertex[2]-lamp[2]); result [lamp[0]+t*(vertex[0]-lamp[0]),lamp[1]+t*(vertex[1]-lamp[1])]. unproject(wallXY,z,lamp): s=(z-lamp[2])/(0-lamp[2]); result [lamp[0]+s*(wallXY[0]-lamp[0]),lamp[1]+s*(wallXY[1]-lamp[1]),z]. makeTiles(rows,seed) uses unproject at HOME, never at current lamp. Export HOME, project, unproject, makeTiles. makeTiles returns objects {id,row,col,half,z,vertices}, vertices array of three numeric triples. Input validation: rows exactly 24 strings of length24 containing only # or .; seed nonnegative safe integer; throw on invalid rows/seed. Pure operations must not mutate arguments. Empty valid mask returns []. project/unproject inputs valid within this toy need no broad general-purpose validation.

Renderer: draw shadow as opaque polygons on a lit wall, all from project(current tile vertices,current lamp). Do NOT redraw the target mask as the shadow. For the paper view use a consistent oblique 3D-to-2D projection with depth clearly visible; sort polygons back-to-front. Lamp movement must not move vertices. Shadows may overlap and clip at pane edges when displaced; home shows the whole drawing. A lamp marker and home ring in the wall-control pane make dragging legible; their UI position maps linearly to the lamp's x/y ranges, NOT to projected triangle positions. Camera framing is the worker's choice; document it in source. Both views redraw once per changed state/animation frame; cap devicePixelRatio at 2. Wall canvas logical size 720x600: wall world (x,y) maps to logical (360+x,300+y). Backing dimensions multiply by capped DPR; apply that scale before drawing. Fill its canvas background solid #F4E5C6 and polygons #24202A (put glow on its CSS surround). This gives planner tests an independent way to inspect the real projected silhouette. UI lamp marker may cover an 18px-radius area at its mapped position; home marker is logical center (360,300). For pointer controls use the entire wall pane: x=(fractionX-.5)*240, y=(fractionY-.5)*160, clamp and round to integer. The marker uses the inverse of that mapping. Keep it small enough not to hide the drawing. Drawing canvas logical size 480x480 with each cell20px, CSS scales responsively.

DOM contract: #paper canvas, #wall canvas, #lamp-x and #lamp-y range inputs (step1), #home, #scatter, preset buttons [data-preset= rabbit|moth|teapot], #open-maker, #status. Maker can be a native dialog or inline panel: #maker, #drawing canvas, #draw-mode, #erase-mode, #clear-drawing, #make-sculpture, #cancel-maker. Dialog hidden until opened; preserve current sculpture on cancel. Opening maker starts an empty mask. Drawing snaps to cells; interpolate fast pointer strokes so cells aren't skipped; pointer capture only inside drawing surface. Buttons/labels fixed above. Make disabled while mask empty, with the empty status near it. Making custom sculpture sets lamp HOME and seed=1; preset switching sets initial lamp and seed=1. Switching loses custom work intentionally; no persistence promised. Scatter retains current mask including custom and keeps the lamp unchanged. Draw/erase are mutually exclusive labelled toggles. Sliders support arrow keys natively. The lamp-home action and all controls are keyboard reachable. Do not disable ordinary document scrolling outside canvases. Reduced motion changes animation, not geometry.

Read-only browser hook window.shadowCabinet.snapshot() returns a fresh JSON-safe object {preset,seed,lamp,rows,tiles,shadows}; preset rabbit|moth|teapot|custom, lamp triple, tiles equal geometry output, shadows array of projected triangles in same order. It is observation only, not a backdoor for tests. Attach no state-changing test API. Browser verifier uses actual button/pointer/keyboard actions.

## Done by morning
A visitor can discover three original shadows, drag/keyboard-move the lamp, recover the original shadow, scatter to a new arrangement with the same home shadow, and draw/erase their own 24x24 shadow and make it into a depth-scattered sculpture. Desktop and phone are usable, reduced-motion is respected, explanation is optional, source and URL are published, and the creations page links it. No persistence, sharing, upload, SVG export, realistic support rods, rotating sculpture, extra levels, camera access, or music tonight.

## Where
Slug: shadow-cabinet
URL: https://shadow-cabinet.ichabod-crane.net
Repository: https://github.com/ich4bod/shadow-cabinet
Checkout: /home/ichabod/apps/shadow-cabinet

## Build order
1. Pure projection and inverse-generated paper geometry.
2. Two-view interactive cabinet, three presets, preview container.
3. Draw/erase custom shadow maker.
4. Tactile/accessibility/phone finish and full visitor browser contract.
5. Production deployment, public check, creations entry.
Every worker reads this brief first and starts at the last checkpoint. Tests under tools are planner-owned: if one is wrong, report and block rather than weakening it.
