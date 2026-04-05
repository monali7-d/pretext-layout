# Pretext Layout — Interactive 3D Text Interface

A full-screen, real-time text layout demo built with [pretext](https://github.com/chenglou/pretext) and Three.js. Move your cursor and watch text dynamically reflow around it — all at 60fps — inside a parallaxing 3D scene.

---

## What it does

- **Text reflows around your cursor** — an invisible exclusion disk follows your mouse. Every line of text recalculates its available width in real time, squeezing left or right around the cursor position. No DOM tricks, no layout thrash — pure arithmetic via pretext's `layoutNextLine`.
- **Dragon cursor** — your cursor is replaced by a 🐉 dragon emoji with live fire particles that trail as you move.
- **Off-axis 3D camera** — moving the mouse shifts the camera using a custom asymmetric frustum, creating a true "looking through a window" parallax effect. The 3D room appears to float behind the text layer.
- **6 fully 3D themes** — each with distinct geometry, particles, and animations.
- **Bloom post-processing** — UnrealBloomPass gives every scene a cinematic glow.

---

## Themes

| Theme | Scene |
|-------|-------|
| **Ember** | Wireframe room with orange sparks floating upward |
| **Forest** | Wireframe pine trees with swaying canopies + green firefly particles |
| **Ocean** | Sine-wave animated floor plane + rising blue bubble particles |
| **Neon** | Wireframe room with rotating icosahedra and octahedra |
| **Celestial** | Star field + slowly rotating gold torus rings |
| **Garden** | Swaying flowers with petals drifting down + butterfly sparkles in figure-8 orbits |

Switch themes from the **Controls panel** in the top-right corner.

---

## The Off-Axis Camera

Most 3D scenes use a standard symmetric perspective frustum — the camera looks straight ahead and the scene is centered. This project uses an **off-axis (asymmetric) frustum** instead.

### How it works

The idea is borrowed from VR and CAVE displays: imagine a physical window (screen) fixed in space. As your eye moves left, you see more of the right side of what's outside the window. The window edges stay fixed; only your viewpoint shifts.

In Three.js terms:
1. The camera position smoothly tracks the mouse: `eyeX = (mouseX - 0.5) * 1.8`
2. Instead of `camera.updateProjectionMatrix()`, we manually compute an asymmetric frustum each frame:

```js
const s      = near / eyeZ          // scale factor to near plane
const left   = (-halfW - eyeX) * s
const right  = ( halfW - eyeX) * s
const top    = ( halfH - eyeY) * s
const bottom = (-halfH - eyeY) * s

camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far)
camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
```

3. The camera always looks straight ahead (`lookAt(eyeX, eyeY, 0)`) — no rotation. The frustum skew does all the work.

### Why it feels different

With a normal camera, moving left rotates the view and objects slide across the screen. With off-axis, the virtual screen stays fixed while the eye shifts behind it. Objects further away move less than close ones, creating natural depth parallax. The 3D room feels like it exists *behind* the text, like a real window into another space.

---

## How pretext works

[pretext](https://github.com/chenglou/pretext) is a DOM-free text layout engine that measures strings using the browser's canvas font engine and breaks lines with pure arithmetic.

**`prepareWithSegments(text, font)`** — called once. Measures every word and segment. This is the expensive step (~few ms).

**`layoutNextLine(prepared, cursor, maxWidth)`** — called every frame for every line. Pure arithmetic, ~0.09ms per call. This is what makes 60fps reflow possible.

The exclusion disk algorithm computes the horizontal chord of the cursor circle at each line's vertical midpoint:

```js
const halfChord = Math.sqrt(R * R - dy * dy)
const circLeft  = cx - halfChord
const circRight = cx + halfChord
// Pick the wider of left/right available slots, or skip if fully blocked
```

---

## Tech Stack

| Library | Role |
|---------|------|
| [`@chenglou/pretext`](https://github.com/chenglou/pretext) | Sub-millisecond text layout engine |
| [Three.js](https://threejs.org) | 3D renderer, geometry, particles |
| `EffectComposer` + `UnrealBloomPass` | Bloom post-processing |
| [lil-gui](https://lil-gui.georgealways.com) | Control panel |
| [Vite](https://vitejs.dev) | Dev server + bundler |

---

## Running locally

```bash
git clone git@github.com:monali7-d/pretext-layout.git
cd pretext-layout
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Customising the text

Open `src/main.js` and edit the three constants near the top:

```js
const TITLE = 'YOUR HEADLINE HERE'
const COL1  = `Left column body text...`
const COL2  = `Right column body text...`
```

The page hot-reloads on save — changes appear instantly in the browser.

---

## Adding a new theme

1. Add a preset in the `PRESETS` object:
```js
mytheme: {
  bgColor: '#000000', gridColor: '#ffffff', gridOpacity: 0.0,
  textColor: '#ffffff',
  bloomStrength: 1.0, bloomRadius: 0.7, bloomThreshold: 0.3,
  roomVisible: false, sceneType: 'mytheme',
},
```

2. Add a build function (`buildGardenScene` is a good template):
```js
function buildMythemeScene() {
  // Create THREE objects, push each to themeObjects[], set themeAnimFn
  themeAnimFn = () => { /* runs every frame */ }
}
```

3. Register it in the switch statement:
```js
case 'mytheme': buildMythemeScene(); break
```

---

## Project structure

```
src/
  main.js           ← everything: Three.js, pretext, themes, camera, fire cursor
  offAxisCamera.js  ← standalone off-axis camera class (reference)
  textRenderer.js   ← standalone text rendering helpers (reference)
index.html          ← two-canvas setup (Three.js behind, 2D text overlay on top)
```
