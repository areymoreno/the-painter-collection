import { deltaE2000 } from './match'
import type { Paint } from './paints'

// Mezclas de dos pinturas. Aproximación de mezcla de pigmentos: media geométrica ponderada
// en RGB lineal (los pigmentos absorben luz, así que la mezcla tiende a oscurecer como en
// la realidad). Es orientativa: el resultado real depende de cada pintura.

const toLin = (v: number) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const toSrgb = (c: number) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Color resultante de mezclar `t` partes de A con `1 - t` de B. */
export function mixHex(a: string, b: string, t: number): string {
  if (t >= 1) return a.toLowerCase()
  if (t <= 0) return b.toLowerCase()
  const ca = rgb(a)
  const cb = rgb(b)
  const out = ca.map((v, i) => {
    // Pequeño suelo para que el negro no anule por completo al otro color
    const la = Math.max(toLin(v), 0.002)
    const lb = Math.max(toLin(cb[i]), 0.002)
    return toSrgb(la ** t * lb ** (1 - t))
  })
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Proporción legible: 0.75 → «3 : 1». */
export function ratioLabel(t: number): string {
  const options: [number, string][] = [
    [0.25, '1 : 3'],
    [1 / 3, '1 : 2'],
    [0.5, '1 : 1'],
    [2 / 3, '2 : 1'],
    [0.75, '3 : 1'],
  ]
  return options.reduce((best, o) => (Math.abs(o[0] - t) < Math.abs(best[0] - t) ? o : best))[1]
}

export interface Mix {
  a: Paint
  b: Paint
  /** Parte de A (0–1) */
  t: number
  hex: string
  dE: number
}

const RATIOS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75]

/**
 * Mejores mezclas de dos pinturas de `pool` para acercarse a `target`.
 * Solo prueba con las `candidates` pinturas más cercanas para que sea rápido.
 */
export function bestMixes(target: string, pool: Paint[], limit = 6, candidates = 90): Mix[] {
  const near = pool
    .map((p) => ({ p, d: deltaE2000(target, p.hex) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, candidates)
    .map((x) => x.p)
  const out: Mix[] = []
  for (let i = 0; i < near.length; i++) {
    for (let j = i + 1; j < near.length; j++) {
      const a = near[i]
      const b = near[j]
      if (a.hex === b.hex) continue
      for (const t of RATIOS) {
        const hex = mixHex(a.hex, b.hex, t)
        out.push({ a, b, t, hex, dE: deltaE2000(target, hex) })
      }
    }
  }
  out.sort((x, y) => x.dE - y.dE)
  // Una mezcla por pareja
  const seen = new Set<string>()
  const res: Mix[] = []
  for (const m of out) {
    const key = [m.a.name, m.a.brand, m.b.name, m.b.brand].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    res.push(m)
    if (res.length >= limit) break
  }
  return res
}
