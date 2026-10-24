import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { type Brand, brandById, rangeAccent } from './brands'
import { type Brush, HAIR_COLOR, type Item, brushBrandById, isBrush } from './brushes'
import { type Paint, isMetallic, isWash, luminance } from './paints'

// Escala: 1 unidad ≈ 1.5 cm.
const CM = 1 / 1.5

// Bote con tapa abatible (Warhammer Colour, P3): cuerpo transparente que deja ver
// la pintura, collarín y tapa de plástico.
const BODY_R = 1.18
const BASE_BODY_TOP = 1.36
const BASE_COLLAR_TOP = 1.68
const LID_R = 1.17
const DOME_R = 1.09
const DOME_H = 0.88

// Frascos cuentagotas (~17 ml). Vallejo es más alto y estrecho, con tapón escalonado.
type DropperStyle = 'generic' | 'vallejo'

interface DropperShape {
  r: number
  bodyH: number
  labelY: number
  labelH: number
  /** Perfil del tapón [radio, altura]; el segundo punto marca el radio del tramo estriado */
  cap: [number, number][]
  ribH: number
}

const DROPPERS: Record<DropperStyle, DropperShape> = {
  generic: {
    r: 0.86,
    bodyH: 2.9,
    labelY: 0.32,
    labelH: 2.2,
    cap: [
      [0.47, 0],
      [0.5, 0.03],
      [0.5, 0.5],
      [0.47, 0.56],
      [0.36, 0.75],
      [0.09, 1.46],
      [0.05, 1.5],
      [0, 1.5],
    ],
    ribH: 0.44,
  },
  vallejo: {
    r: 0.83,
    bodyH: 3.55,
    labelY: 0.14,
    labelH: 2.8,
    cap: [
      [0.5, 0],
      [0.53, 0.03],
      [0.53, 0.64],
      [0.5, 0.68],
      [0.44, 0.72],
      [0.26, 0.98],
      [0.22, 1.02],
      [0.22, 1.3],
      [0.18, 1.38],
      [0, 1.4],
    ],
    ribH: 0.58,
  },
}

/** Altura extra del cuerpo respecto al bote normal: Shade/Contrast +1 cm, Technical +2 cm. */
function extraHeight(p: Paint): number {
  if (p.brand !== 'citadel') return 0
  if (p.range === 'Technical') return 2 * CM
  if (p.range === 'Shade' || p.range === 'Contrast') return 1 * CM
  return 0
}

const v2 = (pts: [number, number][]) => pts.map(([x, y]) => new THREE.Vector2(x, y))

/** Perfil de arco (cuarto de círculo) para redondear esquinas del torno. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 8): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}


export class PotViewer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private pot = new THREE.Group()
  /** Tapa (con su bisagra) o tapón del frasco */
  private opener = new THREE.Group()
  private builtKey = ''

  private paintMat: THREE.MeshPhysicalMaterial
  private labelMat: THREE.MeshBasicMaterial
  private paperMat: THREE.MeshStandardMaterial
  private handleMat: THREE.MeshPhysicalMaterial
  private ferruleMat: THREE.MeshStandardMaterial
  private hairMat: THREE.MeshStandardMaterial
  private brushLabelMat: THREE.MeshBasicMaterial
  private plasticMat: THREE.MeshPhysicalMaterial

  private running = false
  private raf = 0
  private ro: ResizeObserver

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.NeutralToneMapping
    host.appendChild(this.renderer.domElement)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    this.camera.position.set(2.6, 2.9, 9.8)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 1.25, 0)
    this.controls.enableDamping = false
    this.controls.enablePan = false
    this.controls.minDistance = 3.5
    this.controls.maxDistance = 40
    this.controls.maxPolarAngle = Math.PI * 0.62

    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(3, 7, 4)
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 0.25))

    // La pintura vista a través del plástico transparente brillante
    this.paintMat = new THREE.MeshPhysicalMaterial({
      roughness: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.7,
    })
    this.labelMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false })
    this.paperMat = new THREE.MeshStandardMaterial({ roughness: 0.75 })
    this.handleMat = new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 })
    this.ferruleMat = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.22 })
    this.hairMat = new THREE.MeshStandardMaterial({ roughness: 0.85 })
    this.brushLabelMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false })
    this.plasticMat = new THREE.MeshPhysicalMaterial({
      roughness: 0.5,
      transmission: 0.35,
      thickness: 0.35,
      ior: 1.45,
      side: THREE.DoubleSide,
    })

    this.scene.add(this.pot)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
  }

  private clearPot() {
    this.pot.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) o.geometry.dispose()
    })
    this.pot.clear()
    this.opener = new THREE.Group()
  }

  // ---------- Bote con tapa abatible ----------

  /** Devuelve la altura total del modelo. */
  private buildJar(extra: number): number {
    const plastic = this.plasticMat
    const BODY_TOP = BASE_BODY_TOP + extra
    const COLLAR_TOP = BASE_COLLAR_TOP + extra

    // Cuerpo: perfil de torno con la base y el hombro redondeados
    const body = new THREE.Mesh(
      new THREE.LatheGeometry(
        v2([
          [0, 0],
          ...arc(BODY_R - 0.14, 0.14, 0.14, -Math.PI / 2, 0),
          ...arc(BODY_R - 0.08, BODY_TOP - 0.08, 0.08, 0, Math.PI / 2, 4),
          [1.0, BODY_TOP],
        ]),
        96,
      ),
      this.paintMat,
    )
    this.pot.add(body)

    // Texto impreso sobre el plástico
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY_R + 0.004, BODY_R + 0.004, 1.12, 96, 1, true, -Math.PI, Math.PI * 2),
      this.labelMat,
    )
    label.position.y = BODY_TOP / 2 + 0.02
    this.pot.add(label)

    // Collarín fijo, sobre el que se asienta la tapa
    const collar = new THREE.Mesh(
      new THREE.LatheGeometry(
        v2([
          [1.08, BODY_TOP - 0.04],
          [LID_R + 0.01, BODY_TOP],
          [LID_R + 0.01, COLLAR_TOP - 0.04],
          [LID_R - 0.02, COLLAR_TOP],
          [0.98, COLLAR_TOP],
          [0.96, BODY_TOP],
        ]),
        96,
      ),
      plastic,
    )
    this.pot.add(collar)

    // Tapa: cúpula escalonada que pivota sobre la bisagra trasera
    this.opener.position.set(0, COLLAR_TOP + 0.03, -DOME_R)
    this.pot.add(this.opener)
    const lid = new THREE.Group()
    lid.position.z = DOME_R
    this.opener.add(lid)

    const dome = new THREE.Mesh(
      new THREE.LatheGeometry(
        v2([
          [0, 0.04],
          [0.96, 0.04],
          [DOME_R - 0.02, 0],
          [DOME_R, 0.03],
          [DOME_R - 0.03, 0.4],
          ...arc(DOME_R - 0.33, 0.4, 0.3, 0, Math.PI / 2, 10),
          [0.7, 0.71],
          [0.68, 0.74],
          ...arc(0.56, 0.78, 0.1, 0, Math.PI / 2, 6),
          [0, DOME_H],
        ]),
        96,
      ),
      plastic,
    )
    lid.add(dome)

    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.12), plastic)
    hinge.position.set(0, -0.04, -0.02)
    this.opener.add(hinge)

    return COLLAR_TOP + DOME_H
  }

  // ---------- Frasco cuentagotas ----------

  private buildDropper(style: DropperStyle): number {
    const d = DROPPERS[style]
    const neckY = d.bodyH + 0.55

    // Cuerpo con hombro hasta el cuello
    const body = new THREE.Mesh(
      new THREE.LatheGeometry(
        v2([
          [0, 0],
          ...arc(d.r - 0.1, 0.1, 0.1, -Math.PI / 2, 0, 6),
          [d.r, d.bodyH],
          ...arc(d.r - 0.3, d.bodyH, 0.3, 0, Math.PI / 2 - 0.35, 8),
          [0.44, neckY - 0.12],
          [0.42, neckY],
        ]),
        96,
      ),
      this.paintMat,
    )
    this.pot.add(body)

    // Etiqueta de papel que envuelve el frasco
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(d.r + 0.006, d.r + 0.006, d.labelH, 96, 1, true, -Math.PI, Math.PI * 2),
      this.paperMat,
    )
    label.position.y = d.labelY + d.labelH / 2
    this.pot.add(label)

    // Tapón: tramo estriado + cono
    this.opener.position.y = neckY - 0.08
    this.pot.add(this.opener)
    const cap = new THREE.Mesh(new THREE.LatheGeometry(v2(d.cap), 64), this.plasticMat)
    this.opener.add(cap)

    const capR = d.cap[1][0]
    const ribH = d.ribH
    const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, ribH, 0.05), this.plasticMat, 44)
    const m = new THREE.Matrix4()
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2
      m.makeRotationY(-a).setPosition(Math.cos(a) * (capR + 0.005), 0.05 + ribH / 2, Math.sin(a) * (capR + 0.005))
      ribs.setMatrixAt(i, m)
    }
    this.opener.add(ribs)

    return neckY - 0.08 + d.cap[d.cap.length - 1][1]
  }

  show(it: Item) {
    if (isBrush(it)) this.showBrush(it)
    else this.showPaint(it)
    this.start()
  }

  private showPaint(p: Paint) {
    const brand = brandById(p.brand)
    const color = new THREE.Color(p.hex)
    const metal = isMetallic(p)
    this.paintMat.color.copy(color)
    this.paintMat.metalness = metal ? 0.9 : 0
    this.paintMat.roughness = metal ? 0.3 : 0.5
    this.paintMat.transparent = isWash(p)
    this.paintMat.opacity = isWash(p) ? 0.9 : 1

    // Plástico de la tapa/tapón según la marca
    const dark = luminance(brand.cap) < 0.1
    // Las Tone Pro llevan la tapa de plástico esmerilado más claro y translúcido
    const tonePro = p.brand === 'citadel' && p.range === 'Tone Pro'
    this.plasticMat.color.set(tonePro ? '#c3c6ca' : brand.cap)
    this.plasticMat.transmission = brand.container === 'pot' && !dark ? (tonePro ? 0.55 : 0.35) : 0.05
    this.plasticMat.roughness = brand.container === 'pot' ? 0.5 : 0.4

    const extra = extraHeight(p)
    const style: DropperStyle = p.brand === 'vallejo' ? 'vallejo' : 'generic'
    const key = `${brand.container}|${extra}|${style}`
    if (key !== this.builtKey) {
      this.builtKey = key
      this.clearPot()
      this.pot.rotation.z = 0
      const height = brand.container === 'pot' ? this.buildJar(extra) : this.buildDropper(style)
      this.frame(height)
    }

    if (brand.container === 'pot') {
      this.labelMat.map?.dispose()
      this.labelMat.map =
        p.brand !== 'citadel' ? printedLabel(p, brand) : p.range === 'Tone Pro' ? toneProLabel(p) : warhammerLabel(p)
      this.labelMat.needsUpdate = true
    } else {
      this.paperMat.map?.dispose()
      this.paperMat.map = p.brand === 'vallejo' ? vallejoLabel(p) : paperLabel(p, brand)
      this.paperMat.needsUpdate = true
    }
  }

  // ---------- Pincel ----------

  private showBrush(b: Brush) {
    this.resize() // el visor cambia de tamaño para los pinceles
    this.handleMat.color.set(b.handle)
    this.ferruleMat.color.set(b.ferrule)
    this.hairMat.color.set(HAIR_COLOR[b.hair])

    this.builtKey = `brush|${b.brand}|${b.id}`
    this.clearPot()
    this.buildBrush(b)
    // Inclinado en diagonal para que quepa entero en el encuadre
    this.pot.rotation.z = -0.78
    this.pot.updateMatrixWorld(true)
    const sphere = new THREE.Box3().setFromObject(this.pot).getBoundingSphere(new THREE.Sphere())
    const dir = this.camera.position.clone().sub(this.controls.target).normalize()
    const vfov = THREE.MathUtils.degToRad(this.camera.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect)
    const dist = (sphere.radius * 0.95) / Math.sin(Math.min(vfov, hfov) / 2)
    this.controls.target.copy(sphere.center)
    this.camera.position.copy(sphere.center).addScaledVector(dir, dist)

    this.brushLabelMat.map?.dispose()
    this.brushLabelMat.map = handleLabel(b)
    this.brushLabelMat.needsUpdate = true
  }

  /** Pincel de pie: mango lacado, virola y pelo. Medidas en mm. */
  private buildBrush(b: Brush) {
    const mm = CM / 10
    const P = (pts: [number, number][]) => v2(pts.map(([r, y]) => [r * mm, y * mm]))
    const HANDLE = 140
    const FERRULE = 22

    // Mango: tramo recto central para la rotulación
    const handle = new THREE.Mesh(
      new THREE.LatheGeometry(
        P([
          [0, 0],
          ...arc(1.6, 1.4, 1.4, -Math.PI / 2, 0, 5),
          [3.1, 8],
          [3.8, 32],
          [3.8, 104],
          [3.4, 128],
          [3.15, HANDLE],
          [0, HANDLE],
        ]),
        48,
      ),
      this.handleMat,
    )
    this.pot.add(handle)

    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(3.83 * mm, 3.83 * mm, 70 * mm, 48, 1, true, -Math.PI, Math.PI * 2),
      this.brushLabelMat,
    )
    label.position.y = 68 * mm
    this.pot.add(label)

    // Virola con engarce
    const top = Math.max(1.4, b.width / 2 + 0.4)
    const ferrule = new THREE.Mesh(
      new THREE.LatheGeometry(
        P([
          [3.25, HANDLE - 0.5],
          [3.3, HANDLE + 3],
          [3.05, HANDLE + 4],
          [3.2, HANDLE + 5],
          [top + 0.3, HANDLE + FERRULE - 2],
          [top, HANDLE + FERRULE],
          [0, HANDLE + FERRULE],
        ]),
        48,
      ),
      this.ferruleMat,
    )
    if (b.shape === 'flat') ferrule.scale.set(1, 1, 0.75)
    this.pot.add(ferrule)

    // Pelo
    const w = b.width / 2
    const L = b.length
    const tuftProfile: [number, number][] =
      b.shape === 'round'
        ? [
            [w, 0],
            [w * 1.18, L * 0.3],
            [w * 0.9, L * 0.62],
            [w * 0.35, L * 0.9],
            [0.05, L],
            [0, L],
          ]
        : b.shape === 'drybrush'
          ? [
              [w, 0],
              [w * 1.08, L * 0.55],
              ...arc(0, L - w * 0.5, w * 1.04, 0, Math.PI / 2, 8).map(([x, y]) => [x, Math.min(y, L)] as [number, number]),
            ]
          : [
              [w, 0],
              [w * 1.05, L * 0.75],
              [w * 0.92, L * 0.97],
              [w * 0.6, L],
              [0, L],
            ]
    const hair = new THREE.Mesh(new THREE.LatheGeometry(P(tuftProfile), 40), this.hairMat)
    hair.position.y = (HANDLE + FERRULE) * mm
    if (b.shape === 'flat') hair.scale.set(1, 1, 0.3)
    this.pot.add(hair)
  }

  /** Encuadra un modelo de la altura dada manteniendo el ángulo de la cámara. */
  private frame(height: number) {
    const dir = this.camera.position.clone().sub(this.controls.target).normalize()
    this.controls.target.set(0, height * 0.48, 0)
    this.camera.position.copy(this.controls.target).addScaledVector(dir, 7.9 + height * 0.9)
  }

  start() {
    if (this.running) return
    this.running = true
    this.resize()
    const loop = () => {
      if (!this.running) return
      this.raf = requestAnimationFrame(loop)
      this.tick()
    }
    loop()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private tick() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.host
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }
}

// ---------- Etiquetas ----------

const CONDENSED = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif'

function texture(cv: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function fitFont(g: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number, min = 40) {
  g.font = `${weight} ${size}px ${CONDENSED}`
  while (g.measureText(text).width > maxW && size > min) {
    size -= 4
    g.font = `${weight} ${size}px ${CONDENSED}`
  }
}

// La etiqueta del bote da la vuelta completa (360°) con la cara frontal en el centro.
// 4096 px ≈ 2π·R de ancho → 1 unidad ≈ 552 px, así que el alto (1.12) ≈ 620 px.
const JAR_W = 4096
const JAR_H = 620

/** Rotulación de los botes Warhammer Colour, impresa directamente sobre el plástico. */
function warhammerLabel(p: Paint): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = JAR_W
  cv.height = JAR_H
  const g = cv.getContext('2d')!
  const ink = luminance(p.hex) > 0.4 ? '#1b1a19' : '#ffffff'
  const red = '#c8161d'

  const blockW = 900
  const x0 = JAR_W / 2 - blockW / 2 - 60

  g.fillStyle = ink
  g.textBaseline = 'alphabetic'

  // Logotipo: W grande + resto de la palabra
  g.font = `900 230px ${CONDENSED}`
  const wW = g.measureText('W').width
  g.font = `900 150px ${CONDENSED}`
  const restW = g.measureText('ARHAMMER').width
  const sx = blockW / (wW + restW)
  g.save()
  g.translate(x0, 200)
  g.scale(sx, 1)
  g.font = `900 230px ${CONDENSED}`
  g.fillText('W', 0, 56)
  g.font = `900 150px ${CONDENSED}`
  g.fillText('ARHAMMER', wW, 0)
  g.restore()

  // Barra roja "COLOUR"
  const barX = x0 + wW * sx + 6
  g.fillStyle = red
  g.fillRect(barX, 214, x0 + blockW - barX, 74)
  g.fillStyle = '#ffffff'
  g.font = `800 70px ${CONDENSED}`
  g.textAlign = 'right'
  g.fillText('COLOUR', x0 + blockW - 16, 276)

  // Gama y nombre
  g.fillStyle = ink
  g.textAlign = 'center'
  const cx = x0 + blockW / 2 + 30
  g.font = `700 78px ${CONDENSED}`
  g.fillText(p.range.toUpperCase(), cx, 380)

  const name = p.name.toUpperCase()
  fitFont(g, name, 700, 104, blockW, 48)
  g.fillText(name, cx, 500)

  // Texto vertical lateral
  g.save()
  g.translate(x0 + blockW + 50, 70)
  g.rotate(Math.PI / 2)
  g.textAlign = 'left'
  g.font = `800 76px ${CONDENSED}`
  g.fillText('PAINT / PEINTURE', 0, 0)
  g.restore()

  return texture(cv)
}

/** Logotipo WARHAMMER (W grande); devuelve la x donde termina la W. */
function drawWarhammer(g: CanvasRenderingContext2D, x0: number, baseline: number, width: number): number {
  g.font = `900 230px ${CONDENSED}`
  const wW = g.measureText('W').width
  g.font = `900 150px ${CONDENSED}`
  const restW = g.measureText('ARHAMMER').width
  const sx = width / (wW + restW)
  g.save()
  g.translate(x0, baseline)
  g.scale(sx, 1)
  g.font = `900 230px ${CONDENSED}`
  g.fillText('W', 0, 56)
  g.font = `900 150px ${CONDENSED}`
  g.fillText('ARHAMMER', wW, 0)
  g.font = `700 40px ${CONDENSED}`
  g.fillText('™', wW + restW + 4, -100)
  g.restore()
  return x0 + wW * sx
}

/** Etiqueta de las Tone Pro: banda negra, barra del color y selector de tono 1–5. */
function toneProLabel(p: Paint): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = JAR_W
  cv.height = JAR_H
  const g = cv.getContext('2d')!
  const white = '#f4f2ee'

  // Banda negra alrededor de todo el bote (por encima y por debajo asoma la pintura)
  g.fillStyle = '#111112'
  g.fillRect(0, 0, JAR_W, JAR_H)

  const blockW = 860
  const x0 = JAR_W / 2 - blockW / 2 - 60
  g.fillStyle = white
  g.textBaseline = 'alphabetic'
  const afterW = drawWarhammer(g, x0, 170, blockW)

  // Barra del color de la pintura con «TONE │ PRO» (como la de «COLOUR»)
  const barX = afterW + 6
  g.fillStyle = p.hex
  g.fillRect(barX, 184, x0 + blockW - barX, 74)
  // Texto «TONE | PRO» con el separador dibujado para que no se salga de la barra
  g.fillStyle = luminance(p.hex) > 0.55 ? '#111112' : white
  g.font = `800 70px ${CONDENSED}`
  g.textAlign = 'right'
  const right = x0 + blockW - 16
  const proW = g.measureText('PRO').width
  const sepGap = 24
  g.fillText('PRO', right, 246)
  g.fillRect(right - proW - sepGap - 3, 196, 6, 50)
  g.fillText('TONE', right - proW - sepGap * 2 - 6, 246)

  // Nombre sin el número de tono
  const m = p.name.match(/^(.*?)\s+(\d)$/)
  const family = (m ? m[1] : p.name).toUpperCase()
  const tone = m ? Number(m[2]) : 0
  g.fillStyle = white
  g.textAlign = 'left'
  fitFont(g, `${family}™`, 800, 100, blockW, 48)
  g.fillText(`${family}™`, x0, 368)

  // Selector de tonos 1–5, con el actual relleno del color
  const r = 62
  const gap = (blockW - 2 * r - 12) / 4
  for (let i = 1; i <= 5; i++) {
    const cx = x0 + r + 6 + (i - 1) * gap
    const cy = 500
    g.beginPath()
    g.arc(cx, cy, r, 0, Math.PI * 2)
    if (i === tone) {
      g.fillStyle = p.hex
      g.fill()
    }
    g.lineWidth = 7
    g.strokeStyle = white
    g.stroke()
    g.fillStyle = i === tone && luminance(p.hex) > 0.55 ? '#111112' : white
    g.font = `500 92px ${CONDENSED}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(String(i), cx, cy + 5)
    g.textBaseline = 'alphabetic'
  }

  // Texto vertical lateral
  g.save()
  g.fillStyle = white
  g.translate(x0 + blockW + 60, 40)
  g.rotate(Math.PI / 2)
  g.textAlign = 'left'
  g.font = `800 70px ${CONDENSED}`
  g.fillText('PAINT / PEINTURE', 0, 0)
  g.restore()

  return texture(cv)
}

/** Texto impreso sobre botes de otras marcas (P3): nombre de marca, gama y pintura. */
function printedLabel(p: Paint, brand: Brand): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = JAR_W
  cv.height = JAR_H
  const g = cv.getContext('2d')!
  const ink = luminance(p.hex) > 0.4 ? '#1b1a19' : '#ffffff'
  const cx = JAR_W / 2
  const blockW = 900

  g.fillStyle = ink
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  fitFont(g, brand.name.toUpperCase(), 900, 130, blockW)
  g.fillText(brand.name.toUpperCase(), cx, 190)

  g.fillStyle = rangeAccent(p)
  g.fillRect(cx - blockW / 2, 230, blockW, 14)

  g.fillStyle = ink
  g.font = `700 72px ${CONDENSED}`
  g.fillText(p.range.toUpperCase(), cx, 350)
  const name = p.name.toUpperCase()
  fitFont(g, name, 700, 104, blockW, 48)
  g.fillText(name, cx, 480)

  return texture(cv)
}

/** Etiqueta de papel que envuelve el frasco cuentagotas (360°, frente en el centro). */
function paperLabel(p: Paint, brand: Brand): THREE.CanvasTexture {
  // Perímetro 2π·0.866 ≈ 5.44 u, alto 2.2 u → 2048 × 828 px
  const W = 2048
  const H = 828
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')!
  const darkCap = luminance(brand.cap) < 0.1
  const paper = darkCap ? '#1c1c1d' : '#f5f3ee'
  const ink = darkCap ? '#f5f3ee' : '#1b1a19'
  const accent = rangeAccent(p)

  g.fillStyle = paper
  g.fillRect(0, 0, W, H)

  // Franja de color de la pintura y filete de la gama
  g.fillStyle = p.hex
  g.fillRect(0, H * 0.7, W, H * 0.3)
  g.fillStyle = accent
  g.fillRect(0, H * 0.67, W, H * 0.03)

  const cx = W / 2
  const blockW = 560
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.fillStyle = ink

  const brandText = brand.name.toUpperCase()
  fitFont(g, brandText, 900, 96, blockW)
  g.fillText(brandText, cx, 130)

  g.fillStyle = accent
  g.fillRect(cx - 60, 160, 120, 8)

  g.fillStyle = ink
  fitFont(g, p.range.toUpperCase(), 700, 56, blockW)
  g.fillText(p.range.toUpperCase(), cx, 240)

  // Nombre en una o dos líneas
  const words = p.name.toUpperCase().split(' ')
  let lines = [words.join(' ')]
  g.font = `800 92px ${CONDENSED}`
  if (g.measureText(lines[0]).width > blockW && words.length > 1) {
    let best = 1
    let bestW = Infinity
    for (let i = 1; i < words.length; i++) {
      const w = Math.max(
        g.measureText(words.slice(0, i).join(' ')).width,
        g.measureText(words.slice(i).join(' ')).width,
      )
      if (w < bestW) {
        bestW = w
        best = i
      }
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]
  }
  let fs = 92
  while (lines.some((l) => g.measureText(l).width > blockW) && fs > 44) {
    fs -= 4
    g.font = `800 ${fs}px ${CONDENSED}`
  }
  const y0 = lines.length === 1 ? 380 : 340
  lines.forEach((l, i) => g.fillText(l, cx, y0 + i * fs * 1.02))

  if (p.code) {
    g.font = `700 52px ${CONDENSED}`
    g.globalAlpha = 0.75
    g.fillText(p.code, cx, 520)
    g.globalAlpha = 1
  }

  // Texto del contenido sobre la franja de color
  g.fillStyle = luminance(p.hex) > 0.4 ? '#1b1a19' : '#ffffff'
  g.font = `700 44px ${CONDENSED}`
  g.fillText('ACRYLIC PAINT', cx, H * 0.83)

  return texture(cv)
}

/** Rotulación a lo largo del mango (marca, nombre y talla). */
function handleLabel(b: Brush): THREE.CanvasTexture {
  // Perímetro 2π·3.83 mm ≈ 24 mm; alto 70 mm → 512 × 1494 px
  const W = 512
  const H = 1494
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')!
  g.fillStyle = luminance(b.handle) > 0.4 ? '#1b1a19' : mix(b.ferrule, '#ffffff', 0.3)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  // Texto girado: se lee desde el extremo del mango hacia la punta
  g.translate(W / 2, H / 2)
  g.rotate(-Math.PI / 2)
  const parts = [brushBrandById(b.brand).name, b.name]
  if (!b.name.endsWith(` ${b.size}`)) parts.push(b.size)
  const text = parts.join('  ·  ').toUpperCase()
  let fs = 86
  g.font = `700 ${fs}px ${CONDENSED}`
  while (g.measureText(text).width > H * 0.92 && fs > 30) {
    fs -= 4
    g.font = `700 ${fs}px ${CONDENSED}`
  }
  g.fillText(text, 0, 0)
  return texture(cv)
}

function mix(a: string, b: string, t: number): string {
  const c = new THREE.Color(a).lerp(new THREE.Color(b), t)
  return `#${c.getHexString()}`
}

/** Etiqueta de papel de Vallejo: códigos arriba, recuadro negro con la gama y el logotipo AV. */
function vallejoLabel(p: Paint): THREE.CanvasTexture {
  // Perímetro 2π·0.836 ≈ 5.25 u, alto 2.8 u → 2048 × 1092 px
  const W = 2048
  const H = 1092
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')!
  const ink = '#111111'
  const cx = W / 2

  g.fillStyle = '#fbfbf9'
  g.fillRect(0, 0, W, H)

  // Línea superior: gama · código · nombre
  g.fillStyle = ink
  g.textBaseline = 'alphabetic'
  g.font = `700 64px ${CONDENSED}`
  g.textAlign = 'center'
  const code = p.code ?? ''
  g.fillText(code, cx, 100)
  const codeW = g.measureText(code).width
  g.font = `700 56px ${CONDENSED}`
  g.textAlign = 'left'
  g.fillText(p.name.toUpperCase(), cx + codeW / 2 + 36, 100)
  g.textAlign = 'right'
  g.fillText(p.range.toUpperCase(), cx - codeW / 2 - 36, 100)

  // Recuadro negro con la gama en dos líneas
  const boxW = 470
  const boxX = cx - boxW / 2
  g.fillStyle = ink
  g.fillRect(boxX, 135, boxW, 400)
  const words = p.range.toUpperCase().split(' ')
  const lines = words.length > 1 ? [words.slice(0, -1).join(' '), words[words.length - 1]] : [words[0], '']
  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  lines.forEach((l, i) => {
    if (!l) return
    let fs = 150
    const serif = (n: number) => `900 ${n}px Georgia, "Times New Roman", serif`
    g.font = serif(fs)
    while (g.measureText(l).width > boxW - 50 && fs > 50) g.font = serif((fs -= 6))
    g.fillText(l, cx, 280 + i * 145)
  })
  g.font = `700 38px Georgia, serif`
  g.fillText('®', boxX + boxW - 30, 188)
  g.font = `700 54px Georgia, "Times New Roman", serif`
  g.fillText('acrylic-colors', cx, 512)

  // Letra pequeña a los lados del recuadro
  g.fillStyle = 'rgba(17,17,17,0.55)'
  let seed = 11
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const len = 70 + rnd() * 60
      const x = side < 0 ? boxX - 30 - len : boxX + boxW + 30
      g.fillRect(x, 155 + i * 42, len, 14)
    }
  }

  // Logotipo AV y «vallejo»
  const lw = 200
  g.fillStyle = ink
  g.fillRect(cx - lw / 2, 600, lw, 165)
  g.fillStyle = '#ffffff'
  g.font = `900 italic 130px ${CONDENSED}`
  g.fillText('AV', cx, 728)
  g.fillStyle = ink
  g.font = `700 76px Georgia, "Times New Roman", serif`
  g.fillText('vallejo', cx, 850)

  return texture(cv)
}
