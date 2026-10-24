import { BRANDS } from './brands'
import { BRUSH_BRANDS, type Item, brushesOf } from './brushes'
import { itemKey } from './collection'
import type { Paint } from './paints'

// Catálogo completo (todas las marcas), cargado bajo demanda.

let allPaints: Promise<Paint[]> | null = null
let byKey: Promise<Map<string, Item>> | null = null

export const loadAllPaints = () =>
  (allPaints ??= Promise.all(BRANDS.map((b) => b.load())).then((lists) => lists.flat()))

/** Índice clave → artículo de pinturas y pinceles de todas las marcas. */
export const loadIndex = () =>
  (byKey ??= loadAllPaints().then((paints) => {
    const map = new Map<string, Item>()
    for (const p of paints) map.set(itemKey(p), p)
    for (const b of BRUSH_BRANDS) for (const br of brushesOf(b.id)) map.set(itemKey(br), br)
    return map
  }))
