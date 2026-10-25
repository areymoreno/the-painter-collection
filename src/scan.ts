import type { Paint } from './paints'
import { norm } from './search'

// Reconocer un bote a partir del texto leído en su etiqueta (OCR).

export interface ScanMatch {
  paint: Paint
  score: number
}

/**
 * Busca las pinturas cuyo código o nombre aparece en el texto. El código pesa más que el
 * nombre (es único), y la marca escrita en la etiqueta desempata.
 */
export function matchLabelText(text: string, paints: Paint[], brandNames: Record<string, string>, limit = 6): ScanMatch[] {
  const flat = norm(text)
  if (flat.length < 3) return []
  const tokens = new Set(text.toLowerCase().split(/[^a-z0-9.]+/).map(norm).filter((t) => t.length >= 2))
  const out: ScanMatch[] = []
  for (const p of paints) {
    let score = 0
    const code = p.code ? norm(p.code) : ''
    if (code.length >= 3 && (tokens.has(code) || (code.length >= 4 && flat.includes(code)))) score += 5
    const name = norm(p.name)
    if (name.length >= 4 && flat.includes(name)) score += 2 + Math.min(3, name.length / 6)
    if (!score) continue
    const brand = norm(brandNames[p.brand] ?? '')
    if (brand && flat.includes(brand.slice(0, 6))) score += 1
    out.push({ paint: p, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}
