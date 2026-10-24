import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { type Brand, brandById, rangeAccent } from './brands'
import { type Brush, HAIR_COLOR, type Item, brushBrandById, isBrush } from './brushes'
import { type Paint, hexToHsl, isMetallic, isWash, luminance } from './paints'

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
type DropperStyle =
  | 'generic'
  | 'vallejo'
  | 'ak'
  | 'armypainter'
  | 'monument'
  | 'twothincoats'
  | 'scale75'
  | 'reaper'
  | 'greenstuffworld'
  | 'turbodork'
  | 'kimera'
  | 'p3'

interface DropperShape {
  r: number
  bodyH: number
  labelY: number
  labelH: number
  /** Perfil del tapón [radio, altura]; el segundo punto marca el radio del tramo estriado */
  cap: [number, number][]
  ribH: number
}

const DROPPERS = {
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
  // AK 3rd Gen: frasco como el de Vallejo, tapón alto de dos cuerpos con la parte superior roma
  ak: {
    r: 0.83,
    bodyH: 3.55,
    labelY: 0.14,
    labelH: 2.8,
    cap: [
      [0.5, 0],
      [0.53, 0.03],
      [0.53, 0.74],
      [0.5, 0.8],
      [0.42, 0.86],
      [0.4, 1.22],
      [0.36, 1.31],
      [0, 1.33],
    ],
    ribH: 0.68,
  },
  // Army Painter Fanatic: frasco más bajo y ancho; la etiqueta cubre casi todo el cuerpo
  armypainter: {
    r: 0.9,
    bodyH: 2.6,
    labelY: 0.12,
    labelH: 2.35,
    cap: [
      [0.52, 0],
      [0.55, 0.03],
      [0.55, 0.72],
      [0.52, 0.77],
      [0.42, 0.83],
      [0.24, 1.12],
      [0.2, 1.16],
      [0.2, 1.42],
      [0.16, 1.5],
      [0, 1.52],
    ],
    ribH: 0.66,
  },
  // Monument Pro Acryl: frasco corto y tapón negro alto con boquilla larga
  monument: {
    r: 0.82,
    bodyH: 2.1,
    labelY: 0.25,
    labelH: 1.6,
    cap: [
      [0.55, 0],
      [0.58, 0.03],
      [0.58, 0.8],
      [0.55, 0.86],
      [0.4, 0.98],
      [0.2, 1.3],
      [0.17, 1.34],
      [0.17, 1.6],
      [0.08, 1.75],
      [0.06, 1.9],
      [0, 1.92],
    ],
    ribH: 0.74,
  },
  // Two Thin Coats: frasco alto y estrecho con tapón cónico puntiagudo
  twothincoats: {
    r: 0.76,
    bodyH: 3.3,
    labelY: 0.1,
    labelH: 3.0,
    cap: [
      [0.5, 0],
      [0.53, 0.03],
      [0.53, 0.82],
      [0.5, 0.87],
      [0.4, 0.95],
      [0.12, 1.65],
      [0.06, 1.72],
      [0, 1.73],
    ],
    ribH: 0.76,
  },
} as Record<DropperStyle, DropperShape>

// Tapones escalonados reutilizados por varias marcas
const STEPPED_CAP: [number, number][] = [
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
]
const CONE_CAP: [number, number][] = [
  [0.47, 0],
  [0.5, 0.03],
  [0.5, 0.56],
  [0.47, 0.62],
  [0.36, 0.78],
  [0.09, 1.38],
  [0.05, 1.42],
  [0, 1.42],
]

Object.assign(DROPPERS, {
  scale75: { r: 0.82, bodyH: 3.2, labelY: 0.12, labelH: 2.9, cap: STEPPED_CAP, ribH: 0.58 },
  // Reaper: frasco de 15 ml, más bajo y redondeado, con tapón cónico blanco
  reaper: { r: 0.8, bodyH: 2.5, labelY: 0.2, labelH: 2.0, cap: CONE_CAP, ribH: 0.5 },
  greenstuffworld: { r: 0.82, bodyH: 3.2, labelY: 0.12, labelH: 2.95, cap: STEPPED_CAP, ribH: 0.58 },
  turbodork: { r: 0.9, bodyH: 3.3, labelY: 0.3, labelH: 2.6, cap: CONE_CAP, ribH: 0.5 },
  // Kimera: frasco de 30 ml, ancho, con tapa abatible plana
  kimera: {
    r: 1.02,
    bodyH: 3.0,
    labelY: 0.25,
    labelH: 2.45,
    cap: [
      [0.6, 0],
      [0.63, 0.03],
      [0.63, 0.62],
      [0.58, 0.72],
      [0, 0.74],
    ],
    ribH: 0,
  },
  p3: { r: 0.84, bodyH: 3.1, labelY: 0.25, labelH: 2.5, cap: STEPPED_CAP, ribH: 0.58 },
} satisfies Partial<Record<DropperStyle, DropperShape>>)

const DROPPER_STYLE: Partial<Record<string, DropperStyle>> = {
  scale75: 'scale75',
  reaper: 'reaper',
  greenstuffworld: 'greenstuffworld',
  turbodork: 'turbodork',
  kimera: 'kimera',
  p3: 'p3',
  vallejo: 'vallejo',
  ak: 'ak',
  armypainter: 'armypainter',
  monument: 'monument',
  twothincoats: 'twothincoats',
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
    // Sin tone mapping para que los colores impresos (p. ej. el naranja de AK) no se desaturen
    this.paperMat = new THREE.MeshStandardMaterial({ roughness: 0.75, envMapIntensity: 0.7, toneMapped: false, transparent: true })
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
    if (!ribH) return neckY - 0.08 + d.cap[d.cap.length - 1][1]
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
    const style: DropperStyle = DROPPER_STYLE[p.brand] ?? 'generic'
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
      this.paperMat.map =
        p.brand === 'vallejo'
          ? vallejoLabel(p)
          : p.brand === 'ak'
            ? akLabel(p)
            : p.brand === 'armypainter'
              ? armyPainterLabel(p)
              : p.brand === 'monument'
                ? monumentLabel(p)
                : p.brand === 'twothincoats'
                  ? twoThinCoatsLabel(p)
                  : (BRAND_LABELS[p.brand]?.(p) ?? paperLabel(p, brand))
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

/** Etiqueta de AK 3rd Gen: código y nombre arriba, círculo naranja con el logotipo y «ACRYLIC MODELLING COLORS». */
function akLabel(p: Paint): THREE.CanvasTexture {
  // Misma geometría que la de Vallejo: 2048 × 1092 px
  const W = 2048
  const H = 1092
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')!
  const ink = '#111111'
  const navy = '#1d2b45'
  const orange = '#f0560a'
  const cx = W / 2

  g.fillStyle = '#fbfbf9'
  g.fillRect(0, 0, W, H)

  // Código y nombre
  g.fillStyle = ink
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  const top = `${p.code ?? ''}  ${p.name.toUpperCase()}`.trim()
  fitFont(g, top, 800, 72, 1100, 40)
  g.fillText(top, cx, 105)

  // Círculo naranja con el lema alrededor
  const cy = 390
  const r = 185
  g.fillStyle = orange
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.fill()

  const motto = 'HIGH QUALITY ACRYLIC PAINTS DEVELOPED FOR ALL MODELLING GENRES • '
  g.fillStyle = '#6f6f6f'
  g.font = `700 34px ${CONDENSED}`
  g.textBaseline = 'middle'
  const ringR = r + 30
  const chars = [...motto]
  const step = (Math.PI * 2) / chars.length
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 + i * step
    g.save()
    g.translate(cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR)
    g.rotate(a + Math.PI / 2)
    g.fillText(ch, 0, 0)
    g.restore()
  })

  // Logotipo «AK» en blanco, inclinado
  g.fillStyle = '#ffffff'
  g.save()
  g.translate(cx, cy + 8)
  g.transform(1, 0, -0.12, 1, 0, 0)
  g.font = `900 190px ${CONDENSED}`
  g.fillText('AK', 0, 0)
  g.restore()

  // ACRYLIC MODELLING COLORS
  g.textBaseline = 'alphabetic'
  g.fillStyle = navy
  g.font = `900 120px ${CONDENSED}`
  g.fillText('ACRYLIC', cx, 735)
  g.font = `600 58px ${CONDENSED}`
  g.fillText('MODELLING', cx, 805)
  g.font = `900 96px ${CONDENSED}`
  g.fillText('COLORS', cx, 895)

  return texture(cv)
}

/** Lienzo de etiqueta con el tamaño proporcional al cilindro (2048 px = perímetro). */
function labelCanvas(style: DropperStyle) {
  const d = DROPPERS[style]
  const W = 2048
  const H = Math.round((W * d.labelH) / (2 * Math.PI * (d.r + 0.006)))
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  return { cv, g: cv.getContext('2d')!, W, H, cx: W / 2 }
}

const SERIF = 'Georgia, "Times New Roman", serif'

/** Parte un nombre en líneas que quepan en el ancho dado (como mucho `max` líneas). */
function wrapLines(g: CanvasRenderingContext2D, text: string, maxW: number, max = 3): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w
    if (g.measureText(t).width > maxW && cur && lines.length < max - 1) {
      lines.push(cur)
      cur = w
    } else cur = t
  }
  lines.push(cur)
  return lines
}

/** Army Painter Warpaints Fanatic: etiqueta negra, franja roja con el logotipo y hexágono del color. */
function armyPainterLabel(p: Paint): THREE.CanvasTexture {
  const { cv, g, W, H, cx } = labelCanvas('armypainter')
  const white = '#f6f4ef'
  g.fillStyle = '#0e0e0f'
  g.fillRect(0, 0, W, H)

  // Franja roja de pincel con «WARPAINTS fanatic»
  let seed = 3
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  g.fillStyle = '#8f1c22'
  g.beginPath()
  g.moveTo(cx - 340, 50)
  for (let x = cx - 340; x <= cx + 340; x += 34) g.lineTo(x, 44 + rnd() * 14)
  for (let x = cx + 340; x >= cx - 340; x -= 26) g.lineTo(x, 170 + rnd() * 26)
  g.closePath()
  g.fill()
  g.fillStyle = white
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.save()
  g.font = `900 120px ${SERIF}`
  const ww = g.measureText('WARPAINTS').width
  g.translate(cx, 150)
  g.scale(620 / ww, 1)
  g.fillText('WARPAINTS', 0, 0)
  g.restore()
  g.font = `700 64px ${SERIF}`
  g.textAlign = 'right'
  g.fillText('fanatic', cx + 300, 225)

  // Hexágono del color con el nombre
  const hy = 480
  const hr = 205
  const hex = new Path2D()
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3
    const x = cx + Math.cos(a) * hr
    const y = hy + Math.sin(a) * hr
    if (i) hex.lineTo(x, y)
    else hex.moveTo(x, y)
  }
  hex.closePath()
  const grad = g.createRadialGradient(cx, hy, 10, cx, hy, hr)
  grad.addColorStop(0, mix(p.hex, '#ffffff', 0.35))
  grad.addColorStop(1, p.hex)
  g.fillStyle = grad
  g.fill(hex)
  g.lineWidth = 9
  g.strokeStyle = mix(p.hex, '#000000', 0.35)
  g.stroke(hex)

  g.fillStyle = luminance(p.hex) > 0.3 ? '#151515' : white
  g.textAlign = 'center'
  let fs = 74
  g.font = `700 ${fs}px ${SERIF}`
  let lines = wrapLines(g, p.name, 300)
  while (lines.some((l) => g.measureText(l).width > 320) && fs > 40) {
    g.font = `700 ${(fs -= 4)}px ${SERIF}`
    lines = wrapLines(g, p.name, 300)
  }
  const lh = fs * 1.08
  lines.forEach((l, i) => g.fillText(l, cx, hy + fs * 0.35 + (i - (lines.length - 1) / 2) * lh))

  // Pie: marca y tipo
  g.fillStyle = white
  g.font = `900 64px ${CONDENSED}`
  g.textAlign = 'right'
  g.fillText(/wash/i.test(p.range) ? 'WASH' : /speed/i.test(p.range) ? 'SPEEDPAINT' : 'ACRYLIC', cx + 320, 810)
  g.textAlign = 'left'
  g.font = `600 32px ${SERIF}`
  g.fillText('THE', cx - 320, 735)
  g.font = `700 46px ${SERIF}`
  g.fillText('ARMY', cx - 320, 778)
  g.fillText('PAINTER', cx - 320, 820)

  // Trama de puntos en un tono oscuro del color
  g.fillStyle = mix(p.hex, '#000000', 0.55)
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 9; col++) {
      const rr = 3 + (col + row) * 1.1
      g.beginPath()
      g.arc(cx + 70 + col * 30, 560 + row * 30, Math.min(rr, 13), 0, Math.PI * 2)
      g.fill()
    }
  }
  return texture(cv)
}

/** Monument Pro Acryl: etiqueta negra con «PRO» y «ACRYL» en vertical, logotipo «m» y nombre. */
function monumentLabel(p: Paint): THREE.CanvasTexture {
  const { cv, g, W, H, cx } = labelCanvas('monument')
  const white = '#f7f6f2'
  const signature = /signature/i.test(p.range)
  g.fillStyle = '#121212'
  g.fillRect(0, 0, W, H)

  // Franja superior: dorada en la Signature Series, del color en el resto
  if (signature) {
    const gold = g.createLinearGradient(0, 0, 0, 64)
    gold.addColorStop(0, '#b8872f')
    gold.addColorStop(0.5, '#f1d07a')
    gold.addColorStop(1, '#b07c27')
    g.fillStyle = gold
  } else g.fillStyle = p.hex
  g.fillRect(0, 0, W, 64)

  // PRO y ACRYL en vertical a los lados
  g.fillStyle = white
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.save()
  g.translate(cx - 300, H / 2 + 30)
  g.rotate(-Math.PI / 2)
  g.font = `900 150px ${CONDENSED}`
  g.fillText('PRO', 0, 0)
  g.restore()
  g.save()
  g.translate(cx + 300, H / 2 + 30)
  g.rotate(Math.PI / 2)
  g.font = `900 150px ${CONDENSED}`
  g.fillText('ACRYL', 0, 0)
  g.restore()

  g.textBaseline = 'alphabetic'
  let y = 140
  if (signature) {
    g.font = `italic 700 92px ${SERIF}`
    g.fillText('Signature', cx, 150)
    g.font = `700 40px ${CONDENSED}`
    g.fillText('series', cx + 120, 192)
    y = 200
  }
  // Logotipo «m»
  g.font = `900 ${signature ? 150 : 190}px ${SERIF}`
  g.fillText('m', cx, y + (signature ? 120 : 170))

  // Nombre
  g.font = `800 76px ${CONDENSED}`
  const lines = wrapLines(g, p.name, 440, 2)
  let fs = 76
  while (lines.some((l) => g.measureText(l).width > 460) && fs > 40) g.font = `800 ${(fs -= 4)}px ${CONDENSED}`
  const ny = signature ? 470 : 480
  lines.forEach((l, i) => g.fillText(l, cx, ny + i * fs * 1.05 - (lines.length - 1) * fs * 0.4))
  return texture(cv)
}

/** Two Thin Coats: film transparente con el escudo de la academia y banda negra inferior. */
function twoThinCoatsLabel(p: Paint): THREE.CanvasTexture {
  const { cv, g, W, H, cx } = labelCanvas('twothincoats')
  const white = '#f7f6f2'
  const orange = '#e8892a'

  // Banda negra en la mitad inferior (el resto es transparente y deja ver la pintura)
  g.fillStyle = '#141414'
  g.fillRect(0, 600, W, H - 600)
  g.fillStyle = orange
  g.fillRect(0, 600, W, 8)

  // Insignia circular
  const by = 440
  g.fillStyle = orange
  g.beginPath()
  g.arc(cx, by, 268, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#fbf8f0'
  g.beginPath()
  g.arc(cx, by, 250, 0, Math.PI * 2)
  g.fill()
  const sky = g.createLinearGradient(0, by - 190, 0, by + 190)
  sky.addColorStop(0, '#a9d3ea')
  sky.addColorStop(1, '#f2ead8')
  g.fillStyle = sky
  g.beginPath()
  g.arc(cx, by, 192, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = orange
  g.lineWidth = 6
  g.stroke()

  // Estandarte y escudo estilizados
  g.fillStyle = '#5a7f3a'
  g.beginPath()
  g.moveTo(cx - 40, by - 150)
  g.lineTo(cx + 110, by - 120)
  g.lineTo(cx - 40, by - 70)
  g.closePath()
  g.fill()
  g.fillStyle = '#e39b3a'
  g.fillRect(cx - 46, by - 160, 10, 300)
  g.fillStyle = '#5b3c8f'
  g.beginPath()
  g.moveTo(cx - 110, by - 40)
  g.lineTo(cx + 40, by - 40)
  g.lineTo(cx + 40, by + 50)
  g.quadraticCurveTo(cx + 40, by + 130, cx - 35, by + 160)
  g.quadraticCurveTo(cx - 110, by + 130, cx - 110, by + 50)
  g.closePath()
  g.fill()
  g.fillStyle = '#d8d2e8'
  g.fillRect(cx - 42, by - 30, 14, 160)
  g.fillRect(cx - 100, by + 30, 130, 14)

  // Texto curvado de la insignia
  g.fillStyle = '#1a1a1a'
  g.font = `800 50px ${CONDENSED}`
  g.textBaseline = 'middle'
  const curved = (text: string, top: boolean) => {
    const r = 221
    const widths = [...text].map((ch) => g.measureText(ch).width)
    const total = widths.reduce((a, b) => a + b, 0) / r
    let a = top ? -Math.PI / 2 - total / 2 : Math.PI / 2 + total / 2
    ;[...text].forEach((ch, i) => {
      const half = widths[i] / r / 2
      a += top ? half : -half
      g.save()
      g.translate(cx + Math.cos(a) * r, by + Math.sin(a) * r)
      g.rotate(a + (top ? Math.PI / 2 : -Math.PI / 2))
      g.fillText(ch, 0, 0)
      g.restore()
      a += top ? half : -half
    })
  }
  curved('DUNCAN RHODES', true)
  curved('PAINTING ACADEMY', false)

  // Marca y nombre
  g.textBaseline = 'alphabetic'
  g.textAlign = 'center'
  g.fillStyle = white
  g.font = `800 80px ${CONDENSED}`
  g.fillText('TWO THIN COATS', cx - 30, 860)
  g.fillStyle = orange
  g.fillRect(cx - 290, 885, 520, 7)
  g.fillStyle = white
  const name = p.name.toUpperCase()
  fitFont(g, name, 800, 88, 540, 44)
  g.fillText(name, cx - 30, 985)

  // Contenido a la derecha
  g.textAlign = 'left'
  g.font = `800 44px ${CONDENSED}`
  g.fillText('15ML', cx + 290, 680)
  g.fillText('0.5FL.OZ', cx + 290, 730)
  g.fillText('AGES', cx + 290, 800)
  g.font = `800 80px ${CONDENSED}`
  g.fillText('14+', cx + 290, 875)
  return texture(cv)
}

// ---------- Etiquetas de Scale75, Reaper, Green Stuff World, Turbo Dork, Kimera y P3 ----------

/** Escribe un nombre en 1–2 líneas centradas, ajustando el tamaño al ancho. */
function nameLines(g: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, font: (n: number) => string, size: number, max = 2) {
  let fs = size
  g.font = font(fs)
  let lines = wrapLines(g, text, maxW, max)
  while (lines.some((l) => g.measureText(l).width > maxW) && fs > 30) {
    g.font = font((fs -= 4))
    lines = wrapLines(g, text, maxW, max)
  }
  lines.forEach((l, i) => g.fillText(l, cx, y + (i - (lines.length - 1) / 2) * fs * 1.05))
}

/** Scale75 Scalecolor: etiqueta negra, «SCALECOLOR» en letra rotulada, emblema y nombre abajo. */
function scale75Label(p: Paint): THREE.CanvasTexture {
  const { cv, g, W, H, cx } = labelCanvas('scale75')
  g.fillStyle = '#0d0d0d'
  g.fillRect(0, 0, W, H)
  // Textura de pinceladas grises
  let seed = 5
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  g.strokeStyle = 'rgba(255,255,255,0.05)'
  for (let i = 0; i < 40; i++) {
    g.lineWidth = 6 + rnd() * 20
    g.beginPath()
    const x = rnd() * W
    const y = rnd() * H
    g.moveTo(x, y)
    g.quadraticCurveTo(x + 80, y - 60, x + 200 + rnd() * 200, y + rnd() * 80)
    g.stroke()
  }
  g.fillStyle = '#e9e4da'
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.save()
  g.font = `italic 400 140px "Brush Script MT", "Segoe Script", ${SERIF}`
  const tw = g.measureText('ScaleColor').width
  g.translate(cx, 300)
  g.scale(Math.min(1, 640 / tw), 1)
  g.fillText('ScaleColor', 0, 0)
  g.restore()

  // Emblema: óvalo crema con una «A» roja
  g.fillStyle = '#e8dcc0'
  g.beginPath()
  g.ellipse(cx, 520, 150, 125, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#a3241c'
  g.font = `700 210px ${SERIF}`
  g.fillText('A', cx + 6, 590)
  g.strokeStyle = '#2a2a2a'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(cx - 120, 600)
  g.quadraticCurveTo(cx - 60, 470, cx - 10, 450)
  g.stroke()

  // Banda clara con el nombre
  const by = H - 230
  g.fillStyle = '#dcdcdc'
  g.fillRect(cx - 330, by, 660, 92)
  g.fillStyle = '#111'
  fitFont(g, p.name, 700, 66, 600, 34)
  g.fillText(p.name, cx, by + 68)
  g.fillStyle = '#9a9a9a'
  g.font = `600 36px ${CONDENSED}`
  g.fillText(`${p.code ?? ''}  ·  17 ml`.trim(), cx, by + 150)
  return texture(cv)
}

/** Reaper Master Series: etiqueta blanca con código grande, nombre y avisos. */
function reaperLabel(p: Paint): THREE.CanvasTexture {
  const { cv, g, H, cx, W } = labelCanvas('reaper')
  g.fillStyle = '#fbfbf8'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#111'
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.font = `900 150px ${CONDENSED}`
  g.fillText((p.code ?? '').padStart(5, '0'), cx, 180)
  nameLines(g, p.name, cx, 270, 560, (n) => `800 ${n}px ${CONDENSED}`, 74)
  g.fillRect(cx - 300, 345, 600, 6)
  g.font = `600 64px ${CONDENSED}`
  g.fillText('Water Soluble', cx, 430)
  g.fillText('Shake Well', cx, 500)
  g.fillText('Made in the USA', cx, 570)
  g.font = `600 40px ${CONDENSED}`
  g.fillText('www.reapermini.com', cx, 630)
  // Silueta del dragón del logotipo, estilizada
  g.beginPath()
  g.moveTo(cx - 330, 400)
  g.lineTo(cx - 290, 370)
  g.lineTo(cx - 300, 420)
  g.lineTo(cx - 260, 440)
  g.closePath()
  g.fill()
  return texture(cv)
}

/** Green Stuff World: etiqueta del color oscurecido, logotipo con lápices y recuadro blanco con código. */
function gswLabel(p: Paint): THREE.CanvasTexture {
  const { cv, g, H, cx, W } = labelCanvas('greenstuffworld')
  const bg = mix(p.hex, '#000000', luminance(p.hex) > 0.5 ? 0.55 : 0.35)
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  const left = cx - 300
  const white = '#ffffff'

  // Lápices del logotipo
  g.fillStyle = white
  for (let i = 0; i < 4; i++) {
    const x = left + i * 30
    g.beginPath()
    g.moveTo(x, 200)
    g.lineTo(x + 11, 175)
    g.lineTo(x + 22, 200)
    g.lineTo(x + 22, 440)
    g.lineTo(x, 440)
    g.closePath()
    g.fill()
  }
  g.textAlign = 'left'
  g.textBaseline = 'alphabetic'
  g.font = `900 92px ${CONDENSED}`
  g.fillText('GREEN', left + 140, 265)
  g.fillText('STUFF', left + 140, 352)
  g.fillText('WORLD', left + 140, 440)
  g.font = `900 112px ${CONDENSED}`
  g.textAlign = 'center'
  const range = /metal/i.test(p.range) ? 'METALLIC' : /ink|wash/i.test(p.range) ? 'INK' : 'ACRYLIC'
  g.fillText(range, cx, 570)
  g.fillText('COLOR', cx, 680)

  // Recuadro blanco con código y nombre
  g.fillRect(cx - 300, 720, 600, 160)
  g.fillStyle = '#111'
  g.font = `800 56px ${CONDENSED}`
  g.fillText(p.code ?? '', cx, 785)
  fitFont(g, p.name.toUpperCase(), 800, 64, 560, 30)
  g.fillText(p.name.toUpperCase(), cx, 855)
  g.fillStyle = white
  g.font = `700 52px ${CONDENSED}`
  g.fillText('17ml (0.57 fl.oz.)', cx, 950)

  // Franja lima vertical y código de barras
  g.fillStyle = '#9ccf2c'
  g.fillRect(cx + 330, 0, 36, H)
  g.fillStyle = '#ffffff'
  for (let i = 0; i < 18; i++) g.fillRect(cx - 360 + (i % 3) * 3, 260 + i * 14, 34, i % 2 ? 4 : 8)
  return texture(cv)
}

/** Turbo Dork: etiqueta negra con el círculo rayado del logotipo y una banda con el color. */
function turboDorkLabel(p: Paint): THREE.CanvasTexture {
  const { cv, g, H, cx, W } = labelCanvas('turbodork')
  g.fillStyle = '#0b0b0b'
  g.fillRect(0, 0, W, H)

  // Círculo con rayas diagonales degradadas
  const cy = 260
  const r = 190
  g.save()
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.clip()
  const grad = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  grad.addColorStop(0, '#5b4fd6')
  grad.addColorStop(1, '#e0479e')
  g.fillStyle = grad
  g.fillRect(cx - r, cy - r, r * 2, r * 2)
  g.strokeStyle = '#0b0b0b'
  g.lineWidth = 14
  for (let i = -12; i < 12; i++) {
    g.beginPath()
    g.moveTo(cx + i * 34 - r, cy + r)
    g.lineTo(cx + i * 34 + r, cy - r)
    g.stroke()
  }
  g.restore()

  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.save()
  g.translate(cx, 250)
  g.rotate(-0.08)
  g.fillStyle = '#ff3d8b'
  g.font = `italic 900 130px "Brush Script MT", ${CONDENSED}`
  g.lineWidth = 12
  g.strokeStyle = '#0b0b0b'
  g.strokeText('Turbo', 0, 0)
  g.fillText('Turbo', 0, 0)
  g.restore()
  g.fillStyle = '#ffffff'
  g.font = `900 150px ${CONDENSED}`
  g.lineWidth = 10
  g.strokeStyle = '#0b0b0b'
  g.strokeText('DORK', cx, 380)
  g.fillText('DORK', cx, 380)

  // Banda con el color (en las Turboshift, degradado hacia un tono desplazado)
  const [h, s, l] = hexToHsl(p.hex)
  const shift = isMetallic(p) ? 0 : 70
  const band = g.createLinearGradient(0, 470, 0, 640)
  band.addColorStop(0, p.hex)
  band.addColorStop(1, `hsl(${(h + shift) % 360} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`)
  g.fillStyle = band
  g.fillRect(cx - 360, 470, 720, 170)

  g.fillStyle = '#ffffff'
  g.font = `italic 800 64px ${CONDENSED}`
  fitFont(g, p.name.toUpperCase(), 800, 64, 640, 30)
  g.font = `italic ${g.font}`
  g.fillText(p.name.toUpperCase(), cx, 740)
  return texture(cv)
}

/** Kimera Kolors: etiqueta gris claro con trama, logotipo «K» y el nombre en vertical sobre el color. */
function kimeraLabel(p: Paint): THREE.CanvasTexture {
  const { cv, g, H, cx, W } = labelCanvas('kimera')
  g.fillStyle = '#d9d9d6'
  g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(255,255,255,0.55)'
  let seed = 9
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < 26; i++) {
    g.beginPath()
    g.arc(rnd() * W, rnd() * H, 40 + rnd() * 90, 0, Math.PI * 2)
    g.fill()
  }

  // Logotipo «K»
  g.fillStyle = '#1a1a1a'
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.font = `700 150px ${SERIF}`
  g.fillText('K', cx - 140, 210)
  g.fillStyle = '#b3261e'
  g.font = `700 50px ${SERIF}`
  g.fillText('M', cx - 100, 130)

  // Rectángulo del color con el nombre en vertical
  const rx = cx - 60
  const rw = 120
  g.fillStyle = p.hex
  g.fillRect(rx, 250, rw, H - 380)
  g.save()
  g.translate(rx + rw / 2, 250 + (H - 380) / 2)
  g.rotate(-Math.PI / 2)
  g.fillStyle = luminance(p.hex) > 0.5 ? '#111' : '#fff'
  let fs = 60
  const serif = (n: number) => `700 ${n}px ${SERIF}`
  g.font = serif(fs)
  while (g.measureText(p.name.toUpperCase()).width > H - 440 && fs > 24) g.font = serif((fs -= 3))
  g.textBaseline = 'middle'
  g.fillText(p.name.toUpperCase(), 0, 4)
  g.restore()

  g.fillStyle = '#333'
  g.font = `600 44px ${CONDENSED}`
  g.fillText('30ml', cx - 160, H - 90)
  g.save()
  g.translate(cx + 180, 420)
  g.rotate(Math.PI / 2)
  g.font = `italic 600 46px ${SERIF}`
  g.fillText('Pigment Acrylics', 0, 0)
  g.restore()
  return texture(cv)
}

/** P3 (Steamforged): etiqueta del color con un círculo blanco a pinceladas y el engranaje «P3». */
function p3Label(p: Paint): THREE.CanvasTexture {
  const { cv, g, H, cx, W } = labelCanvas('p3')
  g.fillStyle = p.hex
  g.fillRect(0, 0, W, H)

  // Círculo blanco con borde de pincel
  const cy = H / 2
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.ellipse(cx, cy, 300, 320, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  for (let i = 0; i < 6; i++) {
    g.lineWidth = 6 + i * 2
    g.beginPath()
    g.ellipse(cx + i * 3, cy - i * 2, 312 + i * 7, 330 + i * 5, 0.05 * i, 0.2, Math.PI * 1.8)
    g.stroke()
  }

  // Engranaje con «P3»
  g.fillStyle = '#111'
  const gr = 165
  g.beginPath()
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const rr = i % 2 ? gr : gr + 32
    g.lineTo(cx + Math.cos(a) * rr, cy - 50 + Math.sin(a) * rr)
  }
  g.closePath()
  g.fill()
  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.font = `700 210px ${SERIF}`
  g.fillText('P', cx - 22, cy + 22)
  g.font = `700 80px ${SERIF}`
  g.fillText('3', cx + 62, cy + 40)

  g.fillStyle = '#111'
  fitFont(g, p.name.toUpperCase(), 800, 62, 440, 30)
  g.fillText(p.name.toUpperCase(), cx, cy + 210)
  return texture(cv)
}

const BRAND_LABELS: Partial<Record<string, (p: Paint) => THREE.CanvasTexture>> = {
  scale75: scale75Label,
  reaper: reaperLabel,
  greenstuffworld: gswLabel,
  turbodork: turboDorkLabel,
  kimera: kimeraLabel,
  p3: p3Label,
}
