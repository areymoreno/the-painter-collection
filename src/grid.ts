import { brandById, containerOf, rangeAccent } from './brands'
import { HAIR_COLOR, type Brush, type Item, isBrush } from './brushes'
import { type Paint, isMetallic, luminance } from './paints'

const BASE_SPACING = 132 // distancia entre centros de tapón (px CSS, zoom 1)
const CAP_RATIO = 0.43 // radio del tapón / spacing
const ROW_RATIO = Math.sqrt(3) / 2 // empaquetado hexagonal
const MIN_ZOOM = 0.35
const MAX_ZOOM = 2.6
const FRICTION = 0.92

const mod = (n: number, m: number) => ((n % m) + m) % m

interface Cell {
  col: number
  row: number
  paint: Item
}

export class InfiniteGrid {
  private ctx: CanvasRenderingContext2D
  private paints: Item[] = []
  private cols = 1
  private dpr = 1
  private w = 0
  private h = 0

  // Cámara: punto del mundo en el centro de la pantalla
  private camX = 0
  private camY = 0
  private zoom = 1
  private velX = 0
  private velY = 0
  private keys = new Set<string>()

  private pointers = new Map<number, { x: number; y: number }>()
  private dragMoved = 0
  private lastMove = 0
  private pinchDist = 0
  // Pulsación larga en pantallas táctiles: muestra el nombre sin abrir la ficha
  private longPressTimer = 0
  private longPressed = false

  /** Se llama al empezar a arrastrar la cuadrícula (p. ej. para plegar la cabecera). */
  onPanStart: (() => void) | null = null

  private hover: Cell | null = null
  private hoverAnim = new Map<string, number>()
  private highlight: ((p: Item) => boolean) | null = null
  private badge: ((p: Item) => 'own' | 'wish' | 'low' | undefined) | null = null

  private sprites = new Map<Item, HTMLCanvasElement>()
  private spriteRadius = 0
  private dirty = true

  constructor(
    private canvas: HTMLCanvasElement,
    private onSelect: (p: Item) => void,
    private onHover: (p: Item | null, x: number, y: number) => void,
  ) {
    this.ctx = canvas.getContext('2d')!
    this.resize()
    window.addEventListener('resize', () => this.resize())
    this.bindInput()
    requestAnimationFrame(this.frame)
  }

  setPaints(list: Item[]) {
    this.paints = list
    this.cols = Math.max(1, Math.ceil(Math.sqrt(list.length * 1.4)))
    this.hover = null
    this.dirty = true
  }

  /** Marca en la esquina de cada tapón (lo tengo / lo quiero). */
  setBadge(fn: ((p: Item) => 'own' | 'wish' | 'low' | undefined) | null) {
    this.badge = fn
    this.dirty = true
  }

  /** Fuerza un redibujado (p. ej. tras cambiar la colección). */
  invalidate() {
    this.dirty = true
  }

  setHighlight(fn: ((p: Item) => boolean) | null) {
    this.highlight = fn
    this.dirty = true
  }

  /** Centra la cámara en la aparición más cercana de una pintura. */
  focus(p: Item) {
    const idx = this.paints.indexOf(p)
    if (idx < 0) return
    const s = BASE_SPACING
    const rs = s * ROW_RATIO
    // Celdas donde aparece: row*cols + col ≡ idx (mod N). Para cada fila cercana buscamos su col.
    const N = this.paints.length
    const r0 = Math.round(this.camY / rs)
    let best: { x: number; y: number; d: number } | null = null
    for (let row = r0 - 12; row <= r0 + 12; row++) {
      const off = row & 1 ? s / 2 : 0
      const c0 = Math.round((this.camX - off) / s)
      const base = mod(idx - row * this.cols - c0, N)
      for (const col of [c0 + base, c0 + base - N]) {
        const x = col * s + off
        const y = row * rs
        const d = Math.hypot(x - this.camX, y - this.camY)
        if (!best || d < best.d) best = { x, y, d }
      }
    }
    if (best) this.animateTo(best.x, best.y)
  }

  private animateTo(x: number, y: number) {
    const sx = this.camX
    const sy = this.camY
    const t0 = performance.now()
    const dur = 600
    this.velX = this.velY = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur)
      const e = 1 - (1 - k) ** 3
      this.camX = sx + (x - sx) * e
      this.camY = sy + (y - sy) * e
      this.dirty = true
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
    this.dirty = true
  }

  // ---------- Entrada ----------

  private bindInput() {
    const c = this.canvas

    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId)
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      this.dragMoved = 0
      this.velX = this.velY = 0
      if (this.pointers.size === 2) this.pinchDist = this.pointerSpread()
      c.classList.add('dragging')

      clearTimeout(this.longPressTimer)
      this.longPressed = false
      if (e.pointerType !== 'mouse' && this.pointers.size === 1) {
        this.setHover(null)
        const { clientX: x, clientY: y } = e
        this.longPressTimer = window.setTimeout(() => {
          const cell = this.dragMoved < 6 ? this.cellAt(x, y) : null
          if (!cell) return
          this.longPressed = true
          this.setHover(cell)
          this.onHover(cell.paint, x, y - 36) // por encima del dedo
          navigator.vibrate?.(10)
        }, 450)
      }
    })

    c.addEventListener('pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId)
      if (!prev) {
        this.updateHover(e.clientX, e.clientY)
        return
      }
      if (this.longPressed) return
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      prev.x = e.clientX
      prev.y = e.clientY

      if (this.pointers.size === 2) {
        const d = this.pointerSpread()
        const [a, b] = [...this.pointers.values()]
        this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinchDist)
        this.pinchDist = d
        this.dragMoved += 10
      }

      this.camX -= dx / this.zoom / this.pointers.size
      this.camY -= dy / this.zoom / this.pointers.size
      const wasStill = this.dragMoved < 6
      this.dragMoved += Math.abs(dx) + Math.abs(dy)
      if (this.dragMoved >= 6) {
        clearTimeout(this.longPressTimer)
        if (wasStill) this.onPanStart?.()
      }

      const now = performance.now()
      const dt = Math.max(1, now - this.lastMove)
      this.lastMove = now
      // velocidad en px de mundo por frame (~16ms)
      this.velX = (-dx / this.zoom) * (16 / dt)
      this.velY = (-dy / this.zoom) * (16 / dt)
      this.dirty = true
      this.setHover(null)
    })

    const end = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return
      this.pointers.delete(e.pointerId)
      if (this.pointers.size === 0) c.classList.remove('dragging')
      if (performance.now() - this.lastMove > 80) this.velX = this.velY = 0
      clearTimeout(this.longPressTimer)
      if (this.longPressed) return // la etiqueta queda visible hasta el siguiente toque
      if (this.dragMoved < 6 && e.type === 'pointerup') {
        const cell = this.cellAt(e.clientX, e.clientY)
        if (cell) this.onSelect(cell.paint)
      }
      if (e.pointerType === 'mouse') this.updateHover(e.clientX, e.clientY)
    }
    c.addEventListener('contextmenu', (e) => e.preventDefault())
    c.addEventListener('pointerup', end)
    c.addEventListener('pointercancel', end)
    c.addEventListener('pointerleave', (e) => {
      // En táctil el puntero "sale" al levantar el dedo: no ocultar la etiqueta de la pulsación larga
      if (e.pointerType === 'mouse' && this.pointers.size === 0) this.setHover(null)
    })

    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.h : 1
        if (e.ctrlKey || e.metaKey) {
          this.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * unit * 0.01))
        } else {
          const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit
          const dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * unit
          this.camX += dx / this.zoom
          this.camY += dy / this.zoom
          this.velX = this.velY = 0
        }
        this.dirty = true
        this.updateHover(e.clientX, e.clientY)
      },
      { passive: false },
    )

    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        this.keys.add(e.key)
      } else if (e.key === '+' || e.key === '=') {
        this.zoomAt(this.w / 2, this.h / 2, 1.2)
      } else if (e.key === '-') {
        this.zoomAt(this.w / 2, this.h / 2, 1 / 1.2)
      }
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.key))
    window.addEventListener('blur', () => this.keys.clear())
  }

  private pointerSpread() {
    const [a, b] = [...this.pointers.values()]
    return Math.hypot(a.x - b.x, a.y - b.y) || 1
  }

  private zoomAt(sx: number, sy: number, factor: number) {
    const before = this.screenToWorld(sx, sy)
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor))
    const after = this.screenToWorld(sx, sy)
    this.camX += before.x - after.x
    this.camY += before.y - after.y
    this.dirty = true
  }

  private screenToWorld(sx: number, sy: number) {
    return {
      x: (sx - this.w / 2) / this.zoom + this.camX,
      y: (sy - this.h / 2) / this.zoom + this.camY,
    }
  }

  private paintAt(col: number, row: number): Item {
    return this.paints[mod(row * this.cols + col, this.paints.length)]
  }

  private cellAt(sx: number, sy: number): Cell | null {
    if (!this.paints.length) return null
    const { x, y } = this.screenToWorld(sx, sy)
    const s = BASE_SPACING
    const rs = s * ROW_RATIO
    const r0 = Math.round(y / rs)
    let best: Cell | null = null
    let bestD = s * CAP_RATIO
    for (let row = r0 - 1; row <= r0 + 1; row++) {
      const off = row & 1 ? s / 2 : 0
      const c0 = Math.round((x - off) / s)
      for (let col = c0 - 1; col <= c0 + 1; col++) {
        const d = Math.hypot(col * s + off - x, row * rs - y)
        if (d < bestD) {
          bestD = d
          best = { col, row, paint: this.paintAt(col, row) }
        }
      }
    }
    return best
  }

  private updateHover(sx: number, sy: number) {
    if (this.pointers.size) return
    const cell = this.cellAt(sx, sy)
    this.setHover(cell)
    this.onHover(cell?.paint ?? null, sx, sy)
  }

  private setHover(cell: Cell | null) {
    const same = cell && this.hover && cell.col === this.hover.col && cell.row === this.hover.row
    if (same || (!cell && !this.hover)) return
    this.hover = cell
    this.canvas.classList.toggle('hovering', !!cell)
    if (!cell) this.onHover(null, 0, 0)
    this.dirty = true
  }

  // ---------- Render ----------

  private frame = () => {
    // Flechas del teclado
    if (this.keys.size) {
      const sp = 14 / this.zoom
      if (this.keys.has('ArrowLeft')) this.velX = -sp
      if (this.keys.has('ArrowRight')) this.velX = sp
      if (this.keys.has('ArrowUp')) this.velY = -sp
      if (this.keys.has('ArrowDown')) this.velY = sp
    }
    // Inercia
    if (!this.pointers.size && (Math.abs(this.velX) > 0.01 || Math.abs(this.velY) > 0.01)) {
      this.camX += this.velX
      this.camY += this.velY
      this.velX *= FRICTION
      this.velY *= FRICTION
      this.dirty = true
    }
    // Animación de hover
    for (const [k, v] of this.hoverAnim) {
      const target = this.hover && `${this.hover.col},${this.hover.row}` === k ? 1 : 0
      const nv = v + (target - v) * 0.25
      if (Math.abs(nv - target) < 0.01) {
        if (target === 0) this.hoverAnim.delete(k)
        else this.hoverAnim.set(k, 1)
      } else {
        this.hoverAnim.set(k, nv)
        this.dirty = true
      }
    }
    if (this.hover) {
      const k = `${this.hover.col},${this.hover.row}`
      if (!this.hoverAnim.has(k)) {
        this.hoverAnim.set(k, 0)
        this.dirty = true
      }
    }

    if (this.dirty) {
      this.dirty = false
      this.draw()
    }
    requestAnimationFrame(this.frame)
  }

  private draw() {
    const { ctx, dpr } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#15130f'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    if (!this.paints.length) return

    const z = this.zoom
    const s = BASE_SPACING * z
    const rs = s * ROW_RATIO
    const r = BASE_SPACING * CAP_RATIO * z
    this.ensureSprites(r * dpr)

    // origen del mundo en pantalla
    const ox = this.w / 2 - this.camX * z
    const oy = this.h / 2 - this.camY * z
    const rowMin = Math.floor(-oy / rs) - 1
    const rowMax = Math.ceil((this.h - oy) / rs) + 1

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingQuality = 'high'

    const lifted: { x: number; y: number; p: Item; t: number }[] = []
    for (let row = rowMin; row <= rowMax; row++) {
      const off = row & 1 ? s / 2 : 0
      const colMin = Math.floor((-ox - off) / s) - 1
      const colMax = Math.ceil((this.w - ox - off) / s) + 1
      const y = oy + row * rs
      for (let col = colMin; col <= colMax; col++) {
        const x = ox + off + col * s
        const p = this.paintAt(col, row)
        const t = this.hoverAnim.get(`${col},${row}`) ?? 0
        if (t > 0) {
          lifted.push({ x, y, p, t })
          continue
        }
        this.drawCap(p, x, y, r, 1)
      }
    }
    for (const l of lifted) this.drawCap(l.p, l.x, l.y - l.t * r * 0.08, r * (1 + l.t * 0.12), 1)
  }

  private drawCap(p: Item, x: number, y: number, r: number, scale: number) {
    let sprite = this.sprites.get(p)
    if (!sprite) {
      sprite = renderSprite(p, this.spriteRadius)
      this.sprites.set(p, sprite)
    }
    const dim = this.highlight && !this.highlight(p)
    const size = (sprite.width / this.spriteRadius) * r * scale
    this.ctx.globalAlpha = dim ? 0.14 : 1
    this.ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
    const status = this.badge?.(p)
    if (status) this.drawBadge(status, x + r * scale * 0.68, y - r * scale * 0.68, r * scale * 0.2)
    this.ctx.globalAlpha = 1
  }

  private drawBadge(status: 'own' | 'wish' | 'low', x: number, y: number, br: number) {
    const g = this.ctx
    g.save()
    g.shadowColor = 'rgba(0,0,0,0.5)'
    g.shadowBlur = br * 0.6
    g.fillStyle = status === 'own' ? '#2bb673' : status === 'low' ? '#e8590c' : '#f0a92e'
    g.beginPath()
    g.arc(x, y, br, 0, Math.PI * 2)
    g.fill()
    g.restore()
    g.strokeStyle = 'rgba(255,255,255,0.9)'
    g.fillStyle = '#ffffff'
    g.lineWidth = Math.max(1.2, br * 0.22)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.beginPath()
    if (status === 'low') {
      // !
      g.fillRect(x - br * 0.11, y - br * 0.55, br * 0.22, br * 0.62)
      g.beginPath()
      g.arc(x, y + br * 0.42, br * 0.13, 0, Math.PI * 2)
      g.fill()
    } else if (status === 'own') {
      // ✓
      g.moveTo(x - br * 0.45, y + br * 0.02)
      g.lineTo(x - br * 0.12, y + br * 0.36)
      g.lineTo(x + br * 0.48, y - br * 0.34)
      g.stroke()
    } else {
      // ♥
      const s = br * 0.5
      g.moveTo(x, y + s * 0.9)
      g.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.7, y - s * 1.3, x, y - s * 0.45)
      g.bezierCurveTo(x + s * 0.7, y - s * 1.3, x + s * 1.6, y - s * 0.1, x, y + s * 0.9)
      g.fill()
    }
  }

  /** Los sprites se crean al dibujarse y se descartan cuando el tamaño cambia de escalón. */
  private ensureSprites(devRadius: number) {
    const step = Math.pow(1.25, Math.ceil(Math.log(devRadius) / Math.log(1.25)))
    if (step === this.spriteRadius) return
    this.sprites.clear()
    this.spriteRadius = step
  }
}

// ---------- Dibujo del tapón visto desde arriba ----------

const SPRITE_PAD = 1.35

export function renderSprite(p: Item, r: number): HTMLCanvasElement {
  if (isBrush(p)) return renderBrushTip(p, r)
  const container = containerOf(p)
  if (container === 'spray') return renderSprayTop(p, r)
  if (container === 'jar') return renderScrewCap(p, r)
  if (container === 'tin') return renderTinLid(p, r)
  return container === 'dropper' ? renderDropperCap(p, r) : renderCap(p, r)
}

export function renderCap(p: Paint, r: number): HTMLCanvasElement {
  const size = Math.ceil(r * 2 * SPRITE_PAD)
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')!
  const c = size / 2
  g.translate(c, c)
  const circle = (rad: number) => {
    g.beginPath()
    g.arc(0, 0, rad, 0, Math.PI * 2)
  }

  // Sombra
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.6)'
  g.shadowBlur = r * 0.22
  g.shadowOffsetY = r * 0.1
  g.fillStyle = '#111'
  circle(r)
  g.fill()
  g.restore()

  // Hombro del bote: la pintura vista a través del plástico
  g.fillStyle = p.hex
  circle(r)
  g.fill()
  if (isMetallic(p)) {
    const metal = g.createConicGradient(0.6, 0, 0)
    for (let i = 0; i <= 8; i++) {
      metal.addColorStop(i / 8, i % 2 ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')
    }
    g.fillStyle = metal
    g.fill()
  }
  const shoulder = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.5, 0, 0, r)
  shoulder.addColorStop(0, 'rgba(255,255,255,0.18)')
  shoulder.addColorStop(0.85, 'rgba(0,0,0,0.05)')
  shoulder.addColorStop(1, 'rgba(0,0,0,0.45)')
  g.fillStyle = shoulder
  g.fill()

  // Plástico gris esmerilado, ligeramente teñido por la pintura
  // Las Tone Pro tienen la tapa de un esmerilado más claro
  const plastic =
    p.brand !== 'citadel' ? brandById(p.brand).cap : p.range === 'Tone Pro' ? '#d2d5d9' : '#a9a8a4'
  const frost = mix(p.hex, plastic, 0.68)
  const frostDark = mix(p.hex, mix(plastic, '#000000', 0.45), 0.7)
  const frostLight = mix(p.hex, mix(plastic, '#ffffff', 0.3), 0.78)

  // Collarín
  const collar = r * 0.8
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.35)'
  g.shadowBlur = r * 0.05
  g.fillStyle = frostDark
  circle(collar)
  g.fill()
  g.restore()

  // Cúpula de la tapa
  const dome = r * 0.74
  const dg = g.createRadialGradient(-dome * 0.35, -dome * 0.4, dome * 0.05, 0, 0, dome)
  dg.addColorStop(0, frostLight)
  dg.addColorStop(0.65, frost)
  dg.addColorStop(1, frostDark)
  g.fillStyle = dg
  circle(dome)
  g.fill()

  // Escalón y botón central
  g.lineWidth = r * 0.025
  g.strokeStyle = 'rgba(0,0,0,0.18)'
  circle(r * 0.56)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.arc(0, 0, r * 0.585, Math.PI * 1.05, Math.PI * 1.75)
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.25)'
  g.beginPath()
  g.arc(0, 0, dome - r * 0.02, Math.PI * 1.1, Math.PI * 1.7)
  g.stroke()

  // Textura esmerilada
  let seed = p.id * 9301 + 49297
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < 70; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
    const a = rnd() * Math.PI * 2
    const d = Math.sqrt(rnd()) * dome
    g.beginPath()
    g.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.06 * (0.4 + rnd()), 0, Math.PI * 2)
    g.fill()
  }

  // Marca de gama sobre el hombro
  g.fillStyle = rangeAccent(p)
  g.strokeStyle = 'rgba(0,0,0,0.4)'
  g.lineWidth = r * 0.015
  g.beginPath()
  g.arc(0, r * 0.9, r * 0.05, 0, Math.PI * 2)
  g.fill()
  g.stroke()

  // Texto
  if (r >= 26) {
    g.fillStyle = luminance(plastic) < 0.1 ? 'rgba(240,238,232,0.9)' : 'rgba(28,27,25,0.88)'
    g.textAlign = 'center'
    g.textBaseline = 'middle'

    let fs = r * 0.17
    const maxW = r * 1.0
    let lines: string[] = []
    for (; fs > r * 0.09; fs *= 0.92) {
      g.font = `800 ${fs}px Inter, system-ui, sans-serif`
      lines = wrap(g, p.name.toUpperCase(), maxW)
      if (lines.length <= 3 && lines.every((l) => g.measureText(l).width <= maxW)) break
    }
    const lh = fs * 1.05
    const y0 = -((lines.length - 1) * lh) / 2
    lines.forEach((l, i) => g.fillText(l, 0, y0 + i * lh))

    g.font = `700 ${r * 0.085}px Inter, system-ui, sans-serif`
    g.globalAlpha = 0.6
    g.fillText(p.range.toUpperCase(), 0, r * 0.645)
    g.globalAlpha = 1
  }

  return cv
}

// ---------- Tapón de frasco cuentagotas visto desde arriba ----------

export function renderDropperCap(p: Paint, r: number): HTMLCanvasElement {
  const size = Math.ceil(r * 2 * SPRITE_PAD)
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')!
  const c = size / 2
  g.translate(c, c)
  const circle = (rad: number) => {
    g.beginPath()
    g.arc(0, 0, rad, 0, Math.PI * 2)
  }
  const cap = brandById(p.brand).cap

  // Sombra
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.6)'
  g.shadowBlur = r * 0.22
  g.shadowOffsetY = r * 0.1
  g.fillStyle = '#111'
  circle(r)
  g.fill()
  g.restore()

  // Hombro del frasco con la pintura dentro
  g.fillStyle = p.hex
  circle(r)
  g.fill()
  if (isMetallic(p)) {
    const metal = g.createConicGradient(0.6, 0, 0)
    for (let i = 0; i <= 8; i++) {
      metal.addColorStop(i / 8, i % 2 ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')
    }
    g.fillStyle = metal
    g.fill()
  }
  const shoulder = g.createRadialGradient(0, 0, r * 0.55, 0, 0, r)
  shoulder.addColorStop(0, 'rgba(255,255,255,0.2)')
  shoulder.addColorStop(0.7, 'rgba(0,0,0,0)')
  shoulder.addColorStop(1, 'rgba(0,0,0,0.4)')
  g.fillStyle = shoulder
  g.fill()
  // Reflejo del plástico
  g.strokeStyle = 'rgba(255,255,255,0.35)'
  g.lineWidth = r * 0.05
  g.lineCap = 'round'
  g.beginPath()
  g.arc(0, 0, r * 0.9, Math.PI * 1.08, Math.PI * 1.42)
  g.stroke()

  // Tapón: anillo estriado + cono hasta la punta
  const capR = r * 0.56
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.45)'
  g.shadowBlur = r * 0.08
  g.shadowOffsetY = r * 0.03
  g.fillStyle = mix(cap, '#000000', 0.15)
  circle(capR)
  g.fill()
  g.restore()

  g.strokeStyle = mix(cap, '#000000', 0.35)
  g.lineWidth = Math.max(0.6, r * 0.018)
  g.lineCap = 'butt'
  for (let i = 0; i < (brandById(p.brand).capStyle === 'flip' ? 0 : 48); i++) {
    const a = (i / 48) * Math.PI * 2
    g.beginPath()
    g.moveTo(Math.cos(a) * capR * 0.86, Math.sin(a) * capR * 0.86)
    g.lineTo(Math.cos(a) * capR * 0.99, Math.sin(a) * capR * 0.99)
    g.stroke()
  }

  const capStyle = brandById(p.brand).capStyle ?? 'cone'
  const dome = (rad: number, light = 0.55) => {
    const gr = g.createRadialGradient(-rad * 0.3, -rad * 0.35, rad * 0.02, 0, 0, rad)
    gr.addColorStop(0, mix(cap, '#ffffff', light))
    gr.addColorStop(0.55, cap)
    gr.addColorStop(1, mix(cap, '#000000', 0.3))
    g.fillStyle = gr
    circle(rad)
    g.fill()
  }

  if (capStyle === 'flip') {
    // Tapa abatible plana (Kimera): disco liso con la pestaña de apertura
    dome(capR * 0.95, 0.25)
    g.strokeStyle = 'rgba(0,0,0,0.12)'
    g.lineWidth = Math.max(0.5, r * 0.012)
    circle(capR * 0.7)
    g.stroke()
    g.fillStyle = mix(cap, '#000000', 0.12)
    g.beginPath()
    g.roundRect(-capR * 0.22, capR * 0.82, capR * 0.44, capR * 0.2, capR * 0.06)
    g.fill()
  } else if (capStyle === 'stepped') {
    // Tapón escalonado: tramo ancho, hombro y boquilla cilíndrica (Vallejo, AK, Army Painter)
    dome(capR * 0.84, 0.35)
    g.save()
    g.shadowColor = 'rgba(0,0,0,0.35)'
    g.shadowBlur = r * 0.05
    dome(capR * 0.46)
    g.restore()
    g.strokeStyle = 'rgba(0,0,0,0.15)'
    g.lineWidth = Math.max(0.5, r * 0.012)
    circle(capR * 0.46)
    g.stroke()
    g.fillStyle = mix(cap, '#ffffff', 0.4)
    circle(capR * 0.2)
    g.fill()
  } else {
    dome(capR * 0.84)
    // Aristas del cono
    g.strokeStyle = 'rgba(0,0,0,0.08)'
    g.lineWidth = Math.max(0.5, r * 0.01)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      g.beginPath()
      g.moveTo(Math.cos(a) * capR * 0.15, Math.sin(a) * capR * 0.15)
      g.lineTo(Math.cos(a) * capR * 0.84, Math.sin(a) * capR * 0.84)
      g.stroke()
    }
    // Punta (la boquilla larga de Monument se ve como un anillo más)
    if (capStyle === 'nozzle') {
      g.fillStyle = mix(cap, '#ffffff', 0.18)
      circle(capR * 0.3)
      g.fill()
      g.strokeStyle = 'rgba(255,255,255,0.18)'
      g.stroke()
    }
    g.fillStyle = mix(cap, '#ffffff', 0.3)
    circle(capR * 0.14)
    g.fill()
    g.strokeStyle = 'rgba(0,0,0,0.2)'
    g.stroke()
  }

  // Marca de gama
  g.fillStyle = rangeAccent(p)
  g.strokeStyle = 'rgba(0,0,0,0.4)'
  g.lineWidth = r * 0.015
  g.beginPath()
  g.arc(0, r * 0.9, r * 0.05, 0, Math.PI * 2)
  g.fill()
  g.stroke()

  // Nombre curvado sobre el hombro
  if (r >= 26) {
    g.fillStyle = luminance(p.hex) > 0.4 ? 'rgba(20,19,18,0.9)' : 'rgba(255,255,255,0.95)'
    const name = p.name.toUpperCase()
    const textR = r * 0.77
    let fs = r * 0.17
    g.font = `800 ${fs}px Inter, system-ui, sans-serif`
    const maxArc = Math.PI * 1.25
    while (g.measureText(name).width / textR > maxArc && fs > r * 0.08) {
      fs *= 0.92
      g.font = `800 ${fs}px Inter, system-ui, sans-serif`
    }
    arcText(g, name, textR, true)
    g.font = `700 ${r * 0.09}px Inter, system-ui, sans-serif`
    g.globalAlpha = 0.75
    arcText(g, (p.code ? `${p.code} · ${p.range}` : p.range).toUpperCase(), r * 0.75, false)
    g.globalAlpha = 1
  }

  return cv
}

// ---------- Pincel visto desde la punta ----------

export function renderBrushTip(b: Brush, r: number): HTMLCanvasElement {
  const size = Math.ceil(r * 2 * SPRITE_PAD)
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')!
  const c = size / 2
  g.translate(c, c)
  const circle = (rad: number) => {
    g.beginPath()
    g.arc(0, 0, rad, 0, Math.PI * 2)
  }

  // Sombra
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.6)'
  g.shadowBlur = r * 0.22
  g.shadowOffsetY = r * 0.1
  g.fillStyle = '#111'
  circle(r)
  g.fill()
  g.restore()

  // Mango lacado
  const lacquer = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r)
  lacquer.addColorStop(0, mix(b.handle, '#ffffff', 0.25))
  lacquer.addColorStop(0.7, b.handle)
  lacquer.addColorStop(1, mix(b.handle, '#000000', 0.4))
  g.fillStyle = lacquer
  circle(r)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.22)'
  g.lineWidth = r * 0.04
  g.lineCap = 'round'
  g.beginPath()
  g.arc(0, 0, r * 0.92, Math.PI * 1.1, Math.PI * 1.45)
  g.stroke()

  // Virola metálica
  const flat = b.shape === 'flat'
  const fr = r * 0.54
  const metal = g.createConicGradient(0.4, 0, 0)
  for (let i = 0; i <= 8; i++) {
    metal.addColorStop(i / 8, i % 2 ? mix(b.ferrule, '#ffffff', 0.55) : mix(b.ferrule, '#000000', 0.35))
  }
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.5)'
  g.shadowBlur = r * 0.06
  g.fillStyle = metal
  g.beginPath()
  g.ellipse(0, 0, fr, flat ? fr * 0.62 : fr, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.strokeStyle = 'rgba(0,0,0,0.35)'
  g.lineWidth = Math.max(0.6, r * 0.02)
  g.beginPath()
  g.ellipse(0, 0, fr * 0.8, (flat ? fr * 0.62 : fr) * 0.8, 0, 0, Math.PI * 2)
  g.stroke()

  // Pelo: el tamaño depende del diámetro real del penacho
  const hair = HAIR_COLOR[b.hair]
  const tw = Math.min(fr * 0.78, r * (0.1 + b.width / 30))
  const th = flat ? tw * 0.3 : tw
  const tuft = g.createRadialGradient(0, 0, 0, 0, 0, tw)
  tuft.addColorStop(0, b.shape === 'drybrush' ? mix(hair, '#ffffff', 0.15) : mix(hair, '#000000', 0.35))
  tuft.addColorStop(0.6, hair)
  tuft.addColorStop(1, mix(hair, '#000000', 0.25))
  g.fillStyle = tuft
  g.beginPath()
  g.ellipse(0, 0, tw, th, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = mix(hair, '#000000', 0.3)
  g.lineWidth = Math.max(0.5, r * 0.008)
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2
    g.beginPath()
    g.moveTo(Math.cos(a) * tw * 0.15, Math.sin(a) * th * 0.15)
    g.lineTo(Math.cos(a) * tw * 0.95, Math.sin(a) * th * 0.95)
    g.stroke()
  }

  // Marca de gama
  g.fillStyle = rangeAccent(b)
  g.strokeStyle = 'rgba(0,0,0,0.4)'
  g.lineWidth = r * 0.015
  g.beginPath()
  g.arc(0, r * 0.9, r * 0.05, 0, Math.PI * 2)
  g.fill()
  g.stroke()

  if (r >= 26) {
    g.fillStyle = luminance(b.handle) > 0.4 ? 'rgba(20,19,18,0.9)' : 'rgba(255,255,255,0.95)'
    const name = b.name.toUpperCase()
    const textR = r * 0.77
    let fs = r * 0.15
    g.font = `800 ${fs}px Inter, system-ui, sans-serif`
    while (g.measureText(name).width / textR > Math.PI * 1.2 && fs > r * 0.08) {
      fs *= 0.92
      g.font = `800 ${fs}px Inter, system-ui, sans-serif`
    }
    arcText(g, name, textR, true)
    g.font = `700 ${r * 0.09}px Inter, system-ui, sans-serif`
    g.globalAlpha = 0.75
    arcText(g, `TALLA ${b.size} · ${b.range}`.toUpperCase(), r * 0.75, false)
    g.globalAlpha = 1
  }

  return cv
}

// ---------- Tarro con tapón de rosca y lata vistos desde arriba ----------

function spriteCanvas(r: number) {
  const size = Math.ceil(r * 2 * SPRITE_PAD)
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')!
  g.translate(size / 2, size / 2)
  const circle = (rad: number) => {
    g.beginPath()
    g.arc(0, 0, rad, 0, Math.PI * 2)
  }
  // Sombra bajo el envase
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.6)'
  g.shadowBlur = r * 0.22
  g.shadowOffsetY = r * 0.1
  g.fillStyle = '#111'
  circle(r)
  g.fill()
  g.restore()
  return { cv, g, circle }
}

function rangeDot(g: CanvasRenderingContext2D, p: Paint, r: number) {
  g.fillStyle = rangeAccent(p)
  g.strokeStyle = 'rgba(0,0,0,0.4)'
  g.lineWidth = r * 0.015
  g.beginPath()
  g.arc(0, r * 0.9, r * 0.05, 0, Math.PI * 2)
  g.fill()
  g.stroke()
}

/** Tarro de cristal (Tamiya, Mr. Hobby, AK Real Colors): hombro del color y tapón de rosca liso. */
export function renderScrewCap(p: Paint, r: number): HTMLCanvasElement {
  const { cv, g, circle } = spriteCanvas(r)
  const cap = brandById(p.brand).cap

  // Hombro de cristal con la pintura
  g.fillStyle = p.hex
  circle(r)
  g.fill()
  const glass = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r)
  glass.addColorStop(0, 'rgba(255,255,255,0.25)')
  glass.addColorStop(1, 'rgba(0,0,0,0.35)')
  g.fillStyle = glass
  g.fill()

  // Tapón: canto estriado y cara plana
  const capR = r * 0.8
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.45)'
  g.shadowBlur = r * 0.07
  g.fillStyle = mix(cap, '#000000', 0.2)
  circle(capR)
  g.fill()
  g.restore()
  g.strokeStyle = mix(cap, '#000000', 0.4)
  g.lineWidth = Math.max(0.6, r * 0.015)
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2
    g.beginPath()
    g.moveTo(Math.cos(a) * capR * 0.9, Math.sin(a) * capR * 0.9)
    g.lineTo(Math.cos(a) * capR, Math.sin(a) * capR)
    g.stroke()
  }
  const face = g.createRadialGradient(-capR * 0.3, -capR * 0.35, capR * 0.05, 0, 0, capR * 0.9)
  face.addColorStop(0, mix(cap, '#ffffff', 0.35))
  face.addColorStop(0.7, cap)
  face.addColorStop(1, mix(cap, '#000000', 0.2))
  g.fillStyle = face
  circle(capR * 0.88)
  g.fill()

  rangeDot(g, p, r)
  if (r >= 26) {
    // Texto sobre el tapón (código grande y nombre)
    const ink = luminance(cap) > 0.4 ? 'rgba(25,24,22,0.9)' : 'rgba(255,255,255,0.92)'
    g.fillStyle = ink
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `900 ${r * 0.26}px Inter, system-ui, sans-serif`
    g.fillText(p.code ?? '', 0, -r * 0.14)
    let fs = r * 0.13
    g.font = `700 ${fs}px Inter, system-ui, sans-serif`
    const lines = wrap(g, p.name.toUpperCase(), r * 1.15)
    while (lines.length > 2 && fs > r * 0.08) {
      fs *= 0.9
      g.font = `700 ${fs}px Inter, system-ui, sans-serif`
      lines.splice(0, lines.length, ...wrap(g, p.name.toUpperCase(), r * 1.15))
    }
    lines.slice(0, 2).forEach((l, i) => g.fillText(l, 0, r * 0.14 + i * fs * 1.1))
  }
  return cv
}

/** Lata metálica (Revell): tapa plateada con anillos y una muestra del color en el centro. */
export function renderTinLid(p: Paint, r: number): HTMLCanvasElement {
  const { cv, g, circle } = spriteCanvas(r)
  const metal = g.createConicGradient(0.5, 0, 0)
  for (let i = 0; i <= 8; i++) metal.addColorStop(i / 8, i % 2 ? '#eef0f2' : '#9da2a8')
  g.fillStyle = metal
  circle(r)
  g.fill()
  for (const [k, a] of [
    [0.93, 0.35],
    [0.8, 0.25],
    [0.62, 0.2],
  ]) {
    g.strokeStyle = `rgba(0,0,0,${a})`
    g.lineWidth = r * 0.025
    circle(r * k)
    g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.6)'
    g.lineWidth = r * 0.012
    g.beginPath()
    g.arc(0, 0, r * k - r * 0.02, Math.PI * 1.1, Math.PI * 1.7)
    g.stroke()
  }
  g.fillStyle = p.hex
  circle(r * 0.5)
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.3)'
  g.lineWidth = r * 0.02
  g.stroke()

  rangeDot(g, p, r)
  if (r >= 26) {
    g.fillStyle = luminance(p.hex) > 0.4 ? 'rgba(20,19,18,0.9)' : 'rgba(255,255,255,0.95)'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let fs = r * 0.13
    g.font = `800 ${fs}px Inter, system-ui, sans-serif`
    let lines = wrap(g, p.name.toUpperCase(), r * 0.85)
    while (lines.length > 3 && fs > r * 0.07) {
      fs *= 0.9
      g.font = `800 ${fs}px Inter, system-ui, sans-serif`
      lines = wrap(g, p.name.toUpperCase(), r * 0.85)
    }
    lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * fs * 1.1))
    g.fillStyle = 'rgba(30,30,30,0.75)'
    g.font = `700 ${r * 0.09}px Inter, system-ui, sans-serif`
    arcText(g, `REVELL · ${p.range}`.toUpperCase(), r * 0.71, true)
  }
  return cv
}

/** Bote de spray visto desde arriba: borde metálico, tapa del color y difusor. */
export function renderSprayTop(p: Paint, r: number): HTMLCanvasElement {
  const { cv, g, circle } = spriteCanvas(r)
  const metal = g.createConicGradient(0.3, 0, 0)
  for (let i = 0; i <= 8; i++) metal.addColorStop(i / 8, i % 2 ? '#e9ebee' : '#8d9298')
  g.fillStyle = metal
  circle(r)
  g.fill()
  // Citadel: tapa negra con el color en el hombro del bote; el resto, tapa del color
  const citadel = p.brand === 'citadel'
  const capR = citadel ? r * 0.72 : r * 0.84
  if (citadel) {
    g.fillStyle = p.hex
    circle(r * 0.88)
    g.fill()
  }
  const capColor = citadel ? '#1a1a1a' : p.hex
  const cap = g.createRadialGradient(-capR * 0.3, -capR * 0.35, capR * 0.1, 0, 0, capR)
  cap.addColorStop(0, mix(capColor, '#ffffff', 0.35))
  cap.addColorStop(0.7, capColor)
  cap.addColorStop(1, mix(capColor, '#000000', 0.35))
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.4)'
  g.shadowBlur = r * 0.06
  g.fillStyle = cap
  circle(capR)
  g.fill()
  g.restore()
  // Difusor
  g.fillStyle = '#f2f2ef'
  g.beginPath()
  g.roundRect(-r * 0.14, -r * 0.5, r * 0.28, r * 0.34, r * 0.06)
  g.fill()
  g.fillStyle = '#222'
  circle(r * 0.04)
  g.translate(0, -r * 0.42)
  g.fill()
  g.translate(0, r * 0.42)

  rangeDot(g, p, r)
  if (r >= 26) {
    g.fillStyle = !citadel && luminance(p.hex) > 0.4 ? 'rgba(20,19,18,0.9)' : 'rgba(255,255,255,0.95)'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let fs = r * 0.14
    g.font = `800 ${fs}px Inter, system-ui, sans-serif`
    let lines = wrap(g, p.name.toUpperCase(), r * 1.2)
    while (lines.length > 2 && fs > r * 0.08) {
      fs *= 0.9
      g.font = `800 ${fs}px Inter, system-ui, sans-serif`
      lines = wrap(g, p.name.toUpperCase(), r * 1.2)
    }
    lines.forEach((l, i) => g.fillText(l, 0, r * 0.18 + i * fs * 1.1))
    g.font = `700 ${r * 0.09}px Inter, system-ui, sans-serif`
    g.globalAlpha = 0.75
    g.fillText('SPRAY', 0, r * 0.58)
    g.globalAlpha = 1
  }
  return cv
}

/** Escribe texto a lo largo de un arco, centrado arriba (top) o abajo, siempre legible. */
function arcText(g: CanvasRenderingContext2D, text: string, radius: number, top: boolean) {
  const widths = [...text].map((ch) => g.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0) / radius
  g.save()
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  let a = top ? -Math.PI / 2 - total / 2 : Math.PI / 2 + total / 2
  ;[...text].forEach((ch, i) => {
    const half = widths[i] / radius / 2
    a += top ? half : -half
    g.save()
    g.rotate(a)
    g.translate(radius, 0)
    g.rotate(top ? Math.PI / 2 : -Math.PI / 2)
    g.fillText(ch, 0, 0)
    g.restore()
    a += top ? half : -half
  })
  g.restore()
}

/** Mezcla dos colores hex: t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (s: number) =>
    Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w
    if (g.measureText(t).width > maxW && cur) {
      lines.push(cur)
      cur = w
    } else cur = t
  }
  if (cur) lines.push(cur)
  return lines
}
