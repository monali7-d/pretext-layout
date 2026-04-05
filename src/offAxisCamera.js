import * as THREE from 'three'

/**
 * Off-axis perspective + parallax layer system.
 *
 * 1. Camera shifts position based on mouse (off-axis frustum)
 * 2. Scene objects translate based on their depth layer (parallax sliding)
 *
 * This creates the "window into a world" effect where elements at
 * different depths slide at different speeds.
 */
export class OffAxisCamera {
  constructor(camera, {
    screenWidth = 8,
    screenHeight = 5,
    viewDistance = 8,
    sensitivity = 1.5,
    smoothing = 0.07,
    near = 0.1,
    far = 100,
  } = {}) {
    this.camera = camera
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.viewDistance = viewDistance
    this.sensitivity = sensitivity
    this.smoothing = smoothing
    this.near = near
    this.far = far

    // Mouse position normalized -1..1
    this.targetMouse = { x: 0, y: 0 }
    this.currentMouse = { x: 0, y: 0 }

    // Parallax layers: { object, basePosition, depthFactor }
    this.layers = []

    this._bind()
  }

  _bind() {
    const onMove = (cx, cy) => {
      this.targetMouse.x = ((cx / window.innerWidth) - 0.5) * 2
      this.targetMouse.y = -((cy / window.innerHeight) - 0.5) * 2
    }

    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY))
    window.addEventListener('touchmove', (e) => {
      onMove(e.touches[0].clientX, e.touches[0].clientY)
    }, { passive: true })
  }

  /**
   * Register an object for parallax sliding.
   * depthFactor: 0 = stationary, 1 = moves a lot (foreground)
   */
  addLayer(object, depthFactor = 0.5) {
    this.layers.push({
      object,
      baseX: object.position.x,
      baseY: object.position.y,
      depthFactor,
    })
  }

  /** Current smoothed mouse -1..1 */
  get mouse() {
    return this.currentMouse
  }

  update() {
    // Smooth mouse
    this.currentMouse.x += (this.targetMouse.x - this.currentMouse.x) * this.smoothing
    this.currentMouse.y += (this.targetMouse.y - this.currentMouse.y) * this.smoothing

    const mx = this.currentMouse.x * this.sensitivity
    const my = this.currentMouse.y * this.sensitivity

    // ── 1. Off-axis camera ──
    const eyeX = mx * (this.screenWidth * 0.3)
    const eyeY = my * (this.screenHeight * 0.3)
    const eyeZ = this.viewDistance

    this.camera.position.set(eyeX, eyeY, eyeZ)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(eyeX, eyeY, 0)

    // Off-axis frustum
    const halfW = this.screenWidth * 0.5
    const halfH = this.screenHeight * 0.5
    const n = this.near
    const f = this.far
    const s = n / eyeZ

    const left   = (-halfW - eyeX) * s
    const right  = ( halfW - eyeX) * s
    const top    = ( halfH - eyeY) * s
    const bottom = (-halfH - eyeY) * s

    this.camera.projectionMatrix.makePerspective(left, right, top, bottom, n, f)
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert()

    // ── 2. Parallax layer sliding ──
    // Each layer slides opposite to mouse, proportional to depthFactor
    for (const layer of this.layers) {
      const slideX = -mx * layer.depthFactor * 2.5
      const slideY = -my * layer.depthFactor * 0.8
      layer.object.position.x = layer.baseX + slideX
      layer.object.position.y = layer.baseY + slideY
    }
  }
}
