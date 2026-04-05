import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import GUI from 'lil-gui'
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT
// ─────────────────────────────────────────────────────────────────────────────

const TITLE = 'THE FUTURE OF TEXT LAYOUT'

const COL1 = `Pretext measures strings with the browser canvas font engine, then lays out lines with pure arithmetic—no getBoundingClientRect, no layout thrash. That makes paragraphs a first-class part of the scene: you can thread them through 3D, bend them around obstacles, or keep them crisp beside WebGL. As you move the pointer, each row asks for the free width left and right of the exclusion disk, then layoutNextLine fills those bands so words hop across the gap. Mixed scripts stay coherent: العربية والعبرية والتايلاندية في سطر واحد. Emoji ride along too 🌊. The layout recomputes every frame from the same prepared handle, so only the cheap breaking pass runs while you explore the space. Pretext measures strings with the browser canvas font engine, then lays out lines with pure arithmetic—no getBoundingClientRect, no layout thrash. That makes paragraphs a first-class part of the scene: you can thread them through 3D, bend them around obstacles, or keep them crisp beside WebGL. As you move the pointer, each row asks for the free width left and right of the exclusion disk, then layoutNextLine fills those bands so words hop across the gap. Mixed scripts stay coherent: العربية والتايلاندية في سطر واحد. Emoji ride along too 🌊. The layout recomputes every frame from the same prepared handle, so only the cheap breaking pass runs while you explore the space. The web renders text through a pipeline that was designed thirty years ago for static documents. A browser loads a font, shapes the text into glyphs, measures their combined width, determines where lines break, and positions each line vertically.`

const COL2 = `Where a line would pass through the cursor, Pretext first lays the segment that fits in the left band, then continues on the same baseline in the right band—exactly the floated-figure pattern from the library docs, but with a round cutout instead of a rectangle. You should see words reflow and re-wrap as the hole moves, not whole lines sliding as a block. If the circle covers an entire row inside this column, that row is skipped and the story resumes when vertical space clears. Typography stays tied to one font string for both measurement and drawing so widths stay honest. Try parking the cursor over the gutter: both columns pinch at different heights and the rhythm shifts. AGI 春天到了。يبدأ الرحلة. Numbers 3.14159 and dashes—em—work as usual. Where a line would pass through the cursor, Pretext first lays the segment that fits in the left band, then continues on the same baseline in the right band—exactly the floated-figure pattern from the library docs, but with a round cutout instead of a rectangle. You should see words reflow and re-wrap as the hole moves, not whole lines sliding as a block. If the circle covers an entire row inside this column, that row is skipped and the story resumes when vertical space clears. Typography stays tied to one font string for both measurement and drawing so widths stay honest. Try parking the cursor over the gutter: both columns pinch at different heights and the rhythm shifts. AGI 春天到了。Numbers 3.14159 and dashes—em—work as usual.`

// ─────────────────────────────────────────────────────────────────────────────
// PRESETS
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS = {
  ember: {
    bgColor: '#000000', gridColor: '#ff3333', gridOpacity: 0.55,
    textColor: '#f5f0e8',
    bloomStrength: 1.0, bloomRadius: 0.7, bloomThreshold: 0.3,
    roomVisible: true, sceneType: 'ember',
  },
  forest: {
    bgColor: '#010a03', gridColor: '#33ff66', gridOpacity: 0.0,
    textColor: '#d8f5e0',
    bloomStrength: 0.8, bloomRadius: 0.8, bloomThreshold: 0.35,
    roomVisible: false, sceneType: 'forest',
  },
  ocean: {
    bgColor: '#000810', gridColor: '#2266ff', gridOpacity: 0.5,
    textColor: '#d8ecf8',
    bloomStrength: 1.1, bloomRadius: 0.8, bloomThreshold: 0.3,
    roomVisible: true, sceneType: 'ocean',
  },
  neon: {
    bgColor: '#050010', gridColor: '#cc22ff', gridOpacity: 0.6,
    textColor: '#f0d8ff',
    bloomStrength: 1.5, bloomRadius: 0.9, bloomThreshold: 0.25,
    roomVisible: true, sceneType: 'neon',
  },
  celestial: {
    bgColor: '#020104', gridColor: '#ddaa33', gridOpacity: 0.0,
    textColor: '#f8f0d8',
    bloomStrength: 1.2, bloomRadius: 0.9, bloomThreshold: 0.3,
    roomVisible: false, sceneType: 'celestial',
  },
  garden: {
    bgColor: '#030208', gridColor: '#ff88aa', gridOpacity: 0.0,
    textColor: '#f0ffe8',
    bloomStrength: 0.9, bloomRadius: 0.85, bloomThreshold: 0.3,
    roomVisible: false, sceneType: 'garden',
  },
}

const settings = {
  preset: 'ember',
  ...PRESETS.ember,
  circleRadius: 130,
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — renderer, scene, camera
// ─────────────────────────────────────────────────────────────────────────────

const scene = new THREE.Scene()
scene.background = new THREE.Color(settings.bgColor)

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 0, 6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1

const overlay = document.getElementById('text-overlay')
document.body.insertBefore(renderer.domElement, overlay)
document.body.style.cursor = 'none'

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  settings.bloomStrength, settings.bloomRadius, settings.bloomThreshold,
)
composer.addPass(bloomPass)
composer.addPass(new OutputPass())

// ─────────────────────────────────────────────────────────────────────────────
// WIREFRAME ROOM
// ─────────────────────────────────────────────────────────────────────────────

const gridMatRefs = []
const roomObjects = []
const ROOM_W = 16, ROOM_H = 10, ROOM_D = 22

function makeGridMat(relOpacity) {
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(settings.gridColor),
    transparent: true,
    opacity: relOpacity * settings.gridOpacity,
    vertexColors: false,
  })
  gridMatRefs.push({ mat, relOpacity })
  return mat
}

function addGrid(size, divs, relOpacity, position, rotX = 0, rotZ = 0) {
  const g = new THREE.GridHelper(size, divs)
  g.material = makeGridMat(relOpacity)
  g.position.copy(position)
  g.rotation.x = rotX
  g.rotation.z = rotZ
  scene.add(g)
  roomObjects.push(g)
  return g
}

addGrid(ROOM_W, 26, 1.0,  new THREE.Vector3(0,          -ROOM_H/2, -ROOM_D/2+1))
addGrid(ROOM_W, 16, 0.45, new THREE.Vector3(0,           ROOM_H/2, -ROOM_D/2+1))
addGrid(ROOM_W, 18, 0.35, new THREE.Vector3(0,           0,        -ROOM_D+1),    Math.PI/2, 0)
addGrid(ROOM_D, 22, 0.45, new THREE.Vector3(-ROOM_W/2,   0,        -ROOM_D/2+1),  0,         Math.PI/2)
addGrid(ROOM_D, 22, 0.45, new THREE.Vector3( ROOM_W/2,   0,        -ROOM_D/2+1),  0,         Math.PI/2)

// ─────────────────────────────────────────────────────────────────────────────
// THEME SCENE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

let themeObjects = []
let themeAnimFn  = null

function clearThemeObjects() {
  for (const obj of themeObjects) {
    scene.remove(obj)
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
      else obj.material.dispose()
    }
  }
  themeObjects = []
  themeAnimFn  = null
}

// ── Ember: floating sparks rising through the wireframe room ──
function buildEmberScene() {
  const count = 220
  const pos   = new Float32Array(count * 3)
  const vels  = []
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * ROOM_W
    pos[i*3+1] = (Math.random() - 0.5) * ROOM_H
    pos[i*3+2] = -Math.random() * ROOM_D
    vels.push({
      x: (Math.random() - 0.5) * 0.013,
      y: Math.random() * 0.045 + 0.008,
    })
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: '#ff5500', size: 0.09, transparent: true, opacity: 0.88,
  }))
  scene.add(pts)
  themeObjects.push(pts)

  themeAnimFn = () => {
    const a = pts.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      a.array[i*3]   += vels[i].x
      a.array[i*3+1] += vels[i].y
      if (a.array[i*3+1] > ROOM_H / 2) {
        a.array[i*3+1] = -ROOM_H / 2
        a.array[i*3]   = (Math.random() - 0.5) * ROOM_W
      }
    }
    a.needsUpdate = true
  }
}

// ── Forest: wireframe pine trees + floating firefly particles ──
function buildForestScene() {
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 14
    const z = -Math.random() * 17 - 3
    const h = 2.5 + Math.random() * 2.5

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.13, h * 0.35, 6),
      new THREE.MeshBasicMaterial({ color: '#1a0802', wireframe: true, transparent: true, opacity: 0.65 }),
    )
    trunk.position.set(x, -ROOM_H/2 + h * 0.175, z)
    scene.add(trunk)
    themeObjects.push(trunk)

    // Three stacked cones for canopy
    for (let j = 0; j < 3; j++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(h * (0.36 - j * 0.06), h * (0.44 - j * 0.1), 7),
        new THREE.MeshBasicMaterial({
          color: j === 0 ? '#0a3a15' : '#0d4a1c',
          wireframe: true, transparent: true, opacity: 0.6 - j * 0.08,
        }),
      )
      cone.position.set(x, -ROOM_H/2 + h * (0.48 + j * 0.22), z)
      scene.add(cone)
      themeObjects.push(cone)
    }
  }

  // Ground grid
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22, 18, 18),
    new THREE.MeshBasicMaterial({ color: '#0a2a10', wireframe: true, transparent: true, opacity: 0.4 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -ROOM_H/2, -ROOM_D/2)
  scene.add(ground)
  themeObjects.push(ground)

  // Fireflies
  const count = 170
  const pos   = new Float32Array(count * 3)
  const vels  = []
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 15
    pos[i*3+1] = (Math.random() - 0.5) * ROOM_H * 0.85
    pos[i*3+2] = -Math.random() * 18 - 1
    vels.push({
      x: (Math.random() - 0.5) * 0.013,
      y: (Math.random() - 0.5) * 0.009,
    })
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: '#88ffaa', size: 0.07, transparent: true, opacity: 0.8,
  }))
  scene.add(pts)
  themeObjects.push(pts)

  themeAnimFn = () => {
    const a = pts.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      a.array[i*3]   += vels[i].x
      a.array[i*3+1] += vels[i].y
      if (Math.abs(a.array[i*3])   > 8)           vels[i].x *= -1
      if (Math.abs(a.array[i*3+1]) > ROOM_H * 0.44) vels[i].y *= -1
    }
    a.needsUpdate = true
  }
}

// ── Ocean: animated sine-wave floor plane + rising bubbles ──
function buildOceanScene() {
  const segX = 28, segZ = 28
  const waveGeo = new THREE.PlaneGeometry(22, 22, segX, segZ)
  const waveMat = new THREE.MeshBasicMaterial({
    color: '#1144aa', wireframe: true, transparent: true, opacity: 0.5,
  })
  const wavePlane = new THREE.Mesh(waveGeo, waveMat)
  wavePlane.rotation.x = -Math.PI / 2
  wavePlane.position.set(0, -ROOM_H/2 - 0.5, -ROOM_D/2)
  scene.add(wavePlane)
  themeObjects.push(wavePlane)

  // Store original XY for wave calc
  const rawPos  = waveGeo.attributes.position.array
  const baseXY  = new Float32Array(rawPos.length / 3 * 2)
  const nVerts  = rawPos.length / 3
  for (let i = 0; i < nVerts; i++) {
    baseXY[i*2]   = rawPos[i*3]
    baseXY[i*2+1] = rawPos[i*3+1]
  }

  // Bubbles
  const count = 130
  const bpos  = new Float32Array(count * 3)
  const bvels = []
  for (let i = 0; i < count; i++) {
    bpos[i*3]   = (Math.random() - 0.5) * 15
    bpos[i*3+1] = -ROOM_H/2 + Math.random() * ROOM_H
    bpos[i*3+2] = -Math.random() * 18 - 1
    bvels.push({ vy: 0.012 + Math.random() * 0.014, vx: (Math.random() - 0.5) * 0.004 })
  }
  const bgeo = new THREE.BufferGeometry()
  bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3))
  const bubbles = new THREE.Points(bgeo, new THREE.PointsMaterial({
    color: '#88ccff', size: 0.06, transparent: true, opacity: 0.7,
  }))
  scene.add(bubbles)
  themeObjects.push(bubbles)

  let waveTime = 0
  themeAnimFn = () => {
    waveTime += 0.018
    for (let i = 0; i < nVerts; i++) {
      const bx = baseXY[i*2], by = baseXY[i*2+1]
      rawPos[i*3+2] = Math.sin(bx * 0.45 + waveTime) * 0.38
                    + Math.sin(by * 0.42 + waveTime * 0.9) * 0.24
    }
    waveGeo.attributes.position.needsUpdate = true

    const bp = bubbles.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      bp.array[i*3]   += bvels[i].vx
      bp.array[i*3+1] += bvels[i].vy
      if (bp.array[i*3+1] > ROOM_H / 2) bp.array[i*3+1] = -ROOM_H / 2
    }
    bp.needsUpdate = true
  }
}

// ── Neon: rotating wireframe polyhedra drifting through the room ──
function buildNeonScene() {
  const shapes = []
  const geoFns = [
    () => new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.3, 0),
    () => new THREE.OctahedronGeometry(0.28 + Math.random() * 0.35),
    () => new THREE.TetrahedronGeometry(0.32 + Math.random() * 0.38),
  ]
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? '#cc22ff' : '#ff44bb',
      wireframe: true, transparent: true, opacity: 0.55,
    })
    const mesh = new THREE.Mesh(geoFns[i % 3](), mat)
    mesh.position.set(
      (Math.random() - 0.5) * 13,
      (Math.random() - 0.5) * 7,
      -Math.random() * 16 - 2,
    )
    mesh.userData.rot = {
      x: (Math.random() - 0.5) * 0.018,
      y: (Math.random() - 0.5) * 0.025,
      z: (Math.random() - 0.5) * 0.012,
    }
    scene.add(mesh)
    themeObjects.push(mesh)
    shapes.push(mesh)
  }

  themeAnimFn = () => {
    for (const s of shapes) {
      s.rotation.x += s.userData.rot.x
      s.rotation.y += s.userData.rot.y
      s.rotation.z += s.userData.rot.z
    }
  }
}

// ── Celestial: star field + slowly rotating gold torus rings ──
function buildCelestialScene() {
  // Star field
  const count = 1400
  const spos  = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    spos[i*3]   = (Math.random() - 0.5) * 90
    spos[i*3+1] = (Math.random() - 0.5) * 60
    spos[i*3+2] = -Math.random() * 65 - 5
  }
  const sgeo  = new THREE.BufferGeometry()
  sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3))
  const stars = new THREE.Points(sgeo, new THREE.PointsMaterial({
    color: '#ffffd8', size: 0.05, transparent: true, opacity: 0.9,
  }))
  scene.add(stars)
  themeObjects.push(stars)

  // Gold torus rings
  const rings = []
  const cols  = ['#ddaa33', '#ffcc55', '#bb8822']
  for (let i = 0; i < 3; i++) {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(1.8 + i * 0.9, 0.028, 8, 64),
      new THREE.MeshBasicMaterial({ color: cols[i], transparent: true, opacity: 0.72 }),
    )
    torus.position.set((i - 1) * 4.8, (Math.random() - 0.5) * 2, -7 - i * 3.5)
    torus.rotation.x = Math.PI * 0.3 + i * 0.28
    torus.rotation.y = i * 0.55
    scene.add(torus)
    themeObjects.push(torus)
    rings.push(torus)
  }

  themeAnimFn = () => {
    stars.rotation.y += 0.0003
    for (let i = 0; i < rings.length; i++) {
      rings[i].rotation.z += 0.003 + i * 0.001
      rings[i].rotation.x += 0.0008
    }
  }
}

// ── Garden: flower stems swaying, petals drifting, butterfly particles ──
function buildGardenScene() {
  // Grassy ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24, 20, 20),
    new THREE.MeshBasicMaterial({ color: '#1a3a12', wireframe: true, transparent: true, opacity: 0.4 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -ROOM_H / 2, -ROOM_D / 2)
  scene.add(ground)
  themeObjects.push(ground)

  // Flowers with stems
  const flowers = []
  const petalColors = ['#ff6688', '#ffaa55', '#ff44aa', '#ffdd66', '#ff88cc', '#ee5577', '#ffcc88', '#ff77bb']
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 15
    const z = -Math.random() * 17 - 2
    const h = 1.2 + Math.random() * 2.0

    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, h, 5),
      new THREE.MeshBasicMaterial({ color: '#2a6a22', wireframe: true, transparent: true, opacity: 0.6 }),
    )
    stem.position.set(x, -ROOM_H / 2 + h / 2, z)
    scene.add(stem)
    themeObjects.push(stem)

    // Flower head — icosahedron for round bloom
    const bloom = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16 + Math.random() * 0.18, 1),
      new THREE.MeshBasicMaterial({
        color: petalColors[i % petalColors.length],
        wireframe: true, transparent: true, opacity: 0.75,
      }),
    )
    bloom.position.set(x, -ROOM_H / 2 + h, z)
    scene.add(bloom)
    themeObjects.push(bloom)
    flowers.push({ stem, bloom, baseY: -ROOM_H / 2 + h, speed: 0.6 + Math.random() * 0.7, amp: 0.06 + Math.random() * 0.06 })

    // Leaf on stem
    if (Math.random() > 0.4) {
      const leaf = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 5),
        new THREE.MeshBasicMaterial({ color: '#3a8a30', wireframe: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      )
      leaf.position.set(x + 0.1, -ROOM_H / 2 + h * 0.5, z)
      leaf.rotation.y = Math.random() * Math.PI
      leaf.rotation.z = 0.4
      scene.add(leaf)
      themeObjects.push(leaf)
    }
  }

  // Floating petals drifting down
  const petalCount = 180
  const ppos = new Float32Array(petalCount * 3)
  const pvels = []
  for (let i = 0; i < petalCount; i++) {
    ppos[i * 3]     = (Math.random() - 0.5) * 18
    ppos[i * 3 + 1] = (Math.random() - 0.5) * ROOM_H
    ppos[i * 3 + 2] = -Math.random() * 19 - 1
    pvels.push({
      vx: (Math.random() - 0.5) * 0.012,
      vy: -(0.004 + Math.random() * 0.009),
      drift: Math.random() * Math.PI * 2,
    })
  }
  const pgeo = new THREE.BufferGeometry()
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3))
  const petals = new THREE.Points(pgeo, new THREE.PointsMaterial({
    color: '#ffaacc', size: 0.065, transparent: true, opacity: 0.8,
  }))
  scene.add(petals)
  themeObjects.push(petals)

  // Butterfly-like sparkles (brighter, scattered)
  const bfCount = 40
  const bfpos = new Float32Array(bfCount * 3)
  const bfdata = []
  for (let i = 0; i < bfCount; i++) {
    bfpos[i * 3]     = (Math.random() - 0.5) * 14
    bfpos[i * 3 + 1] = -ROOM_H / 2 + 1 + Math.random() * (ROOM_H - 2)
    bfpos[i * 3 + 2] = -Math.random() * 15 - 2
    bfdata.push({
      cx: bfpos[i * 3], cy: bfpos[i * 3 + 1],
      rx: 0.8 + Math.random() * 1.5, ry: 0.4 + Math.random() * 0.8,
      speed: 0.008 + Math.random() * 0.012, phase: Math.random() * Math.PI * 2,
    })
  }
  const bfgeo = new THREE.BufferGeometry()
  bfgeo.setAttribute('position', new THREE.BufferAttribute(bfpos, 3))
  const butterflies = new THREE.Points(bfgeo, new THREE.PointsMaterial({
    color: '#ffee88', size: 0.09, transparent: true, opacity: 0.9,
  }))
  scene.add(butterflies)
  themeObjects.push(butterflies)

  let t = 0
  themeAnimFn = () => {
    t += 0.016

    // Sway flowers
    for (const f of flowers) {
      f.bloom.position.y = f.baseY + Math.sin(t * f.speed) * f.amp
      f.bloom.rotation.z = Math.sin(t * f.speed * 0.7) * 0.12
      f.bloom.rotation.x = Math.sin(t * f.speed * 0.5) * 0.06
    }

    // Drift petals
    const pa = petals.geometry.attributes.position
    for (let i = 0; i < petalCount; i++) {
      pvels[i].drift += 0.02
      pa.array[i * 3]     += pvels[i].vx + Math.sin(pvels[i].drift) * 0.003
      pa.array[i * 3 + 1] += pvels[i].vy
      if (pa.array[i * 3 + 1] < -ROOM_H / 2) {
        pa.array[i * 3 + 1] = ROOM_H / 2
        pa.array[i * 3]     = (Math.random() - 0.5) * 18
      }
    }
    pa.needsUpdate = true

    // Butterflies — gentle figure-8 orbits
    const ba = butterflies.geometry.attributes.position
    for (let i = 0; i < bfCount; i++) {
      const d = bfdata[i]
      d.phase += d.speed
      ba.array[i * 3]     = d.cx + Math.sin(d.phase) * d.rx
      ba.array[i * 3 + 1] = d.cy + Math.sin(d.phase * 2) * d.ry
    }
    ba.needsUpdate = true
  }
}

function buildThemeScene(sceneType) {
  clearThemeObjects()
  roomObjects.forEach(g => { g.visible = settings.roomVisible })
  switch (sceneType) {
    case 'ember':     buildEmberScene();     break
    case 'forest':    buildForestScene();    break
    case 'ocean':     buildOceanScene();     break
    case 'neon':      buildNeonScene();      break
    case 'celestial': buildCelestialScene(); break
    case 'garden':    buildGardenScene();    break
  }
}

buildThemeScene(settings.sceneType)

// ─────────────────────────────────────────────────────────────────────────────
// 2D TEXT OVERLAY CANVAS
// ─────────────────────────────────────────────────────────────────────────────

const ctx = overlay.getContext('2d')

function resizeOverlay() {
  overlay.width  = window.innerWidth
  overlay.height = window.innerHeight
}
resizeOverlay()

// ─────────────────────────────────────────────────────────────────────────────
// PRETEXT
// ─────────────────────────────────────────────────────────────────────────────

function bodyFont()   { return `${Math.max(12, Math.floor(window.innerWidth / 95))}px "Helvetica Neue", Arial, sans-serif` }
function titleFont()  { return `bold ${Math.max(16, Math.floor(window.innerWidth / 56))}px "Helvetica Neue", Arial, sans-serif` }
function lineHeight() { return Math.max(18, Math.floor(window.innerWidth / 58)) }

let prep1    = prepareWithSegments(COL1, bodyFont())
let prep2    = prepareWithSegments(COL2, bodyFont())
let lastFont = bodyFont()

// ─────────────────────────────────────────────────────────────────────────────
// MOUSE + OFF-AXIS CAMERA
// ─────────────────────────────────────────────────────────────────────────────

let mouseX = 0.5, mouseY = 0.5
let camTargetX = 0, camTargetY = 0
let camCurrX   = 0, camCurrY   = 0

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX / window.innerWidth
  mouseY = e.clientY / window.innerHeight
  camTargetX =  (mouseX - 0.5) * 1.8
  camTargetY = -(mouseY - 0.5) * 1.1
})

// Off-axis frustum constants (virtual screen in world units at z=0)
const OA_HW   = 7.5    // half-width of virtual screen
const OA_HH   = 4.8    // half-height
const OA_EYEZ = 6      // camera z distance
const OA_NEAR = 0.1
const OA_FAR  = 100

function updateCamera() {
  camCurrX += (camTargetX - camCurrX) * 0.055
  camCurrY += (camTargetY - camCurrY) * 0.055

  const ex = camCurrX, ey = camCurrY

  camera.position.set(ex, ey, OA_EYEZ)
  camera.lookAt(ex, ey, 0)   // straight ahead — frustum does the off-axis work

  const s = OA_NEAR / OA_EYEZ
  camera.projectionMatrix.makePerspective(
    (-OA_HW - ex) * s,  // left
    ( OA_HW - ex) * s,  // right
    ( OA_HH - ey) * s,  // top
    (-OA_HH - ey) * s,  // bottom
    OA_NEAR, OA_FAR,
  )
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRE PARTICLE SYSTEM (2D canvas)
// ─────────────────────────────────────────────────────────────────────────────

const fireParticles = []
let prevFireX = -999, prevFireY = -999

function spawnFire(cx, cy) {
  const moving = Math.hypot(cx - prevFireX, cy - prevFireY) > 1.5
  const n = moving ? 5 : 2
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2
    const r     = Math.random() * 16
    fireParticles.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -(Math.random() * 3.2 + 0.5),
      life: 1,
      decay: 0.022 + Math.random() * 0.025,
      size: 6 + Math.random() * 10,
    })
  }
  prevFireX = cx
  prevFireY = cy
  if (fireParticles.length > 220) fireParticles.splice(0, fireParticles.length - 220)
}

function drawFire(ctx2d) {
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i]
    p.x   += p.vx
    p.y   += p.vy
    p.vy  *= 0.96
    p.vx  *= 0.98
    p.life -= p.decay
    if (p.life <= 0) { fireParticles.splice(i, 1); continue }

    const t     = 1 - p.life
    const alpha = p.life * p.life * 0.85
    const g     = Math.round(220 * Math.max(0, 1 - t * 1.6))
    const b     = Math.round(60  * Math.max(0, 1 - t * 2.5))

    ctx2d.save()
    ctx2d.globalAlpha  = alpha
    ctx2d.shadowColor  = '#ff6600'
    ctx2d.shadowBlur   = 12
    ctx2d.beginPath()
    ctx2d.arc(p.x, p.y, Math.max(0.5, p.size * p.life), 0, Math.PI * 2)
    ctx2d.fillStyle = `rgb(255,${g},${b})`
    ctx2d.fill()
    ctx2d.restore()
  }
}

function drawDragon(ctx2d, cx, cy) {
  ctx2d.save()
  ctx2d.font         = '38px serif'
  ctx2d.textBaseline = 'middle'
  ctx2d.textAlign    = 'center'
  ctx2d.shadowColor  = '#ff4400'
  ctx2d.shadowBlur   = 22
  ctx2d.fillText('🐉', cx, cy)
  ctx2d.restore()
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCLUSION DISK — computes available slot in a column around the cursor
// ─────────────────────────────────────────────────────────────────────────────

function getSlot(colX, colW, lineY, cx, cy, R, LH) {
  const midY = lineY + LH * 0.5
  const dy   = midY - cy
  if (Math.abs(dy) >= R) return { x: colX, w: colW }

  const halfChord = Math.sqrt(R * R - dy * dy)
  const circLeft  = cx - halfChord
  const circRight = cx + halfChord
  const colRight  = colX + colW
  const obsLeft   = Math.max(circLeft,  colX)
  const obsRight  = Math.min(circRight, colRight)

  if (obsLeft >= colRight || obsRight <= colX) return { x: colX, w: colW }

  const leftW  = obsLeft  - colX
  const rightW = colRight - obsRight
  const MIN    = 24

  if (leftW < MIN && rightW < MIN) return null
  if (leftW  < MIN) return { x: obsRight, w: rightW }
  if (rightW < MIN) return { x: colX,     w: leftW  }
  return leftW >= rightW ? { x: colX, w: leftW } : { x: obsRight, w: rightW }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER TEXT — called every frame
// ─────────────────────────────────────────────────────────────────────────────

function renderText() {
  const W  = overlay.width
  const H  = overlay.height
  const cx = mouseX * W
  const cy = mouseY * H
  const R  = settings.circleRadius
  const LH = lineHeight()

  const bf = bodyFont()
  if (bf !== lastFont) {
    prep1    = prepareWithSegments(COL1, bf)
    prep2    = prepareWithSegments(COL2, bf)
    lastFont = bf
  }

  ctx.clearRect(0, 0, W, H)

  const PAD    = Math.max(24, Math.floor(W * 0.038))
  const GAP    = Math.max(40, Math.floor(W * 0.055))
  const colW   = Math.floor((W - PAD * 2 - GAP) / 2)
  const col1X  = PAD
  const col2X  = PAD + colW + GAP
  const TOP    = Math.floor(H * 0.09)
  const TITLE_Y = Math.floor(H * 0.038)

  ctx.textBaseline = 'top'

  // Title
  ctx.font      = titleFont()
  ctx.fillStyle = settings.textColor
  const tSlot = getSlot(col1X, colW * 2 + GAP, TITLE_Y, cx, cy, R, LH * 1.3)
  if (tSlot && tSlot.w > 60) ctx.fillText(TITLE, tSlot.x, TITLE_Y)

  // Body
  ctx.font      = bf
  ctx.fillStyle = settings.textColor

  let cur1 = { segmentIndex: 0, graphemeIndex: 0 }
  for (let y = TOP; y + LH < H - PAD; y += LH) {
    const slot = getSlot(col1X, colW, y, cx, cy, R, LH)
    if (!slot) continue
    const line = layoutNextLine(prep1, cur1, slot.w)
    if (!line) break
    ctx.fillText(line.text, slot.x, y)
    cur1 = line.end
  }

  let cur2 = { segmentIndex: 0, graphemeIndex: 0 }
  for (let y = TOP; y + LH < H - PAD; y += LH) {
    const slot = getSlot(col2X, colW, y, cx, cy, R, LH)
    if (!slot) continue
    const line = layoutNextLine(prep2, cur2, slot.w)
    if (!line) break
    ctx.fillText(line.text, slot.x, y)
    cur2 = line.end
  }

  // Column divider
  const divX = col1X + colW + Math.floor(GAP / 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(divX, TITLE_Y)
  ctx.lineTo(divX, H - PAD)
  ctx.stroke()

  // Dragon cursor + fire (no visible circle ring)
  spawnFire(cx, cy)
  drawFire(ctx)
  drawDragon(ctx, cx, cy)
}

// ─────────────────────────────────────────────────────────────────────────────
// GUI
// ─────────────────────────────────────────────────────────────────────────────

const gui = new GUI({ title: 'Controls', width: 240 })

gui.add(settings, 'preset', Object.keys(PRESETS)).name('Theme').onChange(name => {
  Object.assign(settings, PRESETS[name])
  applySettings()
  buildThemeScene(settings.sceneType)
  gui.controllersRecursive().forEach(c => c.updateDisplay())
})

const sf = gui.addFolder('Scene')
sf.addColor(settings, 'bgColor').name('Background').onChange(applySettings)
sf.addColor(settings, 'gridColor').name('Grid').onChange(applySettings)
sf.add(settings, 'gridOpacity', 0, 1, 0.01).name('Grid opacity').onChange(applySettings)
sf.close()

const tf = gui.addFolder('Text')
tf.addColor(settings, 'textColor').name('Text color')
tf.add(settings, 'circleRadius', 40, 350, 1).name('Cursor radius')
tf.close()

const bf2 = gui.addFolder('Bloom')
bf2.add(settings, 'bloomStrength', 0, 3, 0.05).name('Strength').onChange(applySettings)
bf2.add(settings, 'bloomRadius',   0, 2, 0.05).name('Radius').onChange(applySettings)
bf2.add(settings, 'bloomThreshold', 0, 1, 0.05).name('Threshold').onChange(applySettings)
bf2.close()

function applySettings() {
  scene.background.set(settings.bgColor)
  bloomPass.strength  = settings.bloomStrength
  bloomPass.radius    = settings.bloomRadius
  bloomPass.threshold = settings.bloomThreshold
  gridMatRefs.forEach(({ mat, relOpacity }) => {
    mat.color.set(settings.gridColor)
    mat.opacity = relOpacity * settings.gridOpacity
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION LOOP
// ─────────────────────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate)
  updateCamera()
  if (themeAnimFn) themeAnimFn()
  renderText()
  composer.render()
}

animate()

// ─────────────────────────────────────────────────────────────────────────────
// RESIZE
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
  resizeOverlay()
  // camera projection is rebuilt every frame by updateCamera() — no updateProjectionMatrix() needed
})
