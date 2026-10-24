import type { Paint } from './paints'

// Equivalencias entre marcas: distancia de color CIEDE2000 en espacio Lab.

type Lab = [number, number, number]

const labCache = new Map<string, Lab>()

function hexToLab(hex: string): Lab {
  let lab = labCache.get(hex)
  if (lab) return lab
  const n = parseInt(hex.slice(1), 16)
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const r = lin((n >> 16) & 255)
  const g = lin((n >> 8) & 255)
  const b = lin(n & 255)
  // sRGB → XYZ (D65), normalizado por el blanco de referencia
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  lab = [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
  labCache.set(hex, lab)
  return lab
}

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export function deltaE2000(hexA: string, hexB: string): number {
  const [L1, a1, b1] = hexToLab(hexA)
  const [L2, a2, b2] = hexToLab(hexB)
  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cm = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
  const a1p = a1 * (1 + G)
  const a2p = a2 * (1 + G)
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)
  const h1p = (deg(Math.atan2(b1, a1p)) + 360) % 360
  const h2p = (deg(Math.atan2(b2, a2p)) + 360) % 360

  const dL = L2 - L1
  const dC = C2p - C1p
  let dh = 0
  if (C1p * C2p !== 0) {
    dh = h2p - h1p
    if (dh > 180) dh -= 360
    else if (dh < -180) dh += 360
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dh / 2))

  const Lm = (L1 + L2) / 2
  const Cmp = (C1p + C2p) / 2
  let hm = h1p + h2p
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hm += h1p + h2p < 360 ? 360 : -360
    hm /= 2
  }
  const T =
    1 -
    0.17 * Math.cos(rad(hm - 30)) +
    0.24 * Math.cos(rad(2 * hm)) +
    0.32 * Math.cos(rad(3 * hm + 6)) -
    0.2 * Math.cos(rad(4 * hm - 63))
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2))
  const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7))
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2)
  const Sc = 1 + 0.045 * Cmp
  const Sh = 1 + 0.015 * Cmp * T
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc

  return Math.sqrt(
    (dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh),
  )
}

export interface Equivalent {
  paint: Paint
  dE: number
}

/** La pintura más parecida de cada una de las demás marcas, ordenadas por parecido. */
export function equivalents(target: Paint, catalog: Paint[], limit = 6): Equivalent[] {
  const best = new Map<string, Equivalent>()
  for (const p of catalog) {
    if (p.brand === target.brand) continue
    const dE = deltaE2000(target.hex, p.hex)
    const cur = best.get(p.brand)
    if (!cur || dE < cur.dE) best.set(p.brand, { paint: p, dE })
  }
  return [...best.values()].sort((a, b) => a.dE - b.dE).slice(0, limit)
}

/** Texto orientativo de lo parecidas que son dos pinturas. */
export function similarity(dE: number): string {
  if (dE < 2) return 'casi idéntica'
  if (dE < 5) return 'muy parecida'
  if (dE < 10) return 'parecida'
  return 'aproximada'
}
