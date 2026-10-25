import { loadJson, storeJson } from './storage'

// Paletas: listas con nombre de pinturas/pinceles (por claves de artículo), p. ej. un ejército.

export const ROLES = {
  primer: 'Imprimación',
  base: 'Base',
  shade: 'Sombra',
  layer: 'Capa',
  highlight: 'Luz',
  wash: 'Lavado / veladura',
  detail: 'Detalle',
} as const

export type Role = keyof typeof ROLES

export interface ItemMeta {
  role?: Role
  note?: string
}

export interface Palette {
  id: string
  name: string
  items: string[]
  /** Esquema de pintado: papel de cada pintura y notas */
  meta?: Record<string, ItemMeta>
}

const STORAGE_KEY = 'palettes'

let palettes: Palette[] = loadJson(STORAGE_KEY, [])
const listeners = new Set<() => void>()

export function onPalettesChange(fn: () => void) {
  listeners.add(fn)
}

function save() {
  storeJson(STORAGE_KEY, palettes)
  for (const fn of listeners) fn()
}

const newId = () => Math.random().toString(36).slice(2, 10)

export const allPalettes = (): readonly Palette[] => palettes
export const paletteById = (id: string) => palettes.find((p) => p.id === id)

export function createPalette(name: string, items: string[] = [], meta: Record<string, ItemMeta> = {}): Palette {
  const p: Palette = { id: newId(), name: name.trim() || 'Paleta sin nombre', items: [...new Set(items)], meta }
  palettes = [...palettes, p]
  save()
  return p
}

export function renamePalette(id: string, name: string) {
  const p = paletteById(id)
  if (!p || !name.trim()) return
  p.name = name.trim()
  save()
}

export function deletePalette(id: string) {
  palettes = palettes.filter((p) => p.id !== id)
  save()
}

/** Añade o quita un artículo de la paleta. Devuelve si queda dentro. */
export function togglePaletteItem(id: string, key: string): boolean {
  const p = paletteById(id)
  if (!p) return false
  const i = p.items.indexOf(key)
  if (i >= 0) p.items.splice(i, 1)
  else p.items.push(key)
  save()
  return i < 0
}

export function removePaletteItem(id: string, key: string) {
  const p = paletteById(id)
  if (!p) return
  p.items = p.items.filter((k) => k !== key)
  if (p.meta) delete p.meta[key]
  save()
}

/** Cambia el papel o la nota de un artículo dentro del esquema. */
export function setItemMeta(id: string, key: string, change: ItemMeta) {
  const p = paletteById(id)
  if (!p) return
  const cur = { ...(p.meta?.[key] ?? {}), ...change }
  if (!cur.role) delete cur.role
  if (!cur.note?.trim()) delete cur.note
  p.meta = { ...(p.meta ?? {}), [key]: cur }
  if (!Object.keys(cur).length) delete p.meta[key]
  save()
}

/** Sustituye todas las paletas (al importar una copia de seguridad). */
export function replacePalettes(list: Palette[]) {
  palettes = list
    .filter((p) => p && typeof p.name === 'string' && Array.isArray(p.items))
    .map((p) => ({
      id: p.id || newId(),
      name: p.name,
      items: p.items.filter((k) => typeof k === 'string'),
      meta: typeof p.meta === 'object' && p.meta ? p.meta : {},
    }))
  save()
}

// ---------- Compartir por enlace ----------

/** Codifica una paleta en base64url para el enlace #/paleta/<código>. */
export function encodePalette(p: Pick<Palette, 'name' | 'items' | 'meta'>): string {
  const meta = p.meta && Object.keys(p.meta).length ? p.meta : undefined
  const json = JSON.stringify({ n: p.name, i: p.items, m: meta })
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodePalette(code: string): Pick<Palette, 'name' | 'items' | 'meta'> | null {
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const data = JSON.parse(new TextDecoder().decode(bytes))
    if (typeof data.n !== 'string' || !Array.isArray(data.i)) return null
    const out: Pick<Palette, 'name' | 'items' | 'meta'> = { name: data.n, items: data.i.filter((k: unknown) => typeof k === 'string') }
    if (data.m && typeof data.m === 'object') out.meta = data.m
    return out
  } catch {
    return null
  }
}
