import { type Item, isBrush } from './brushes'

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9#]/g, '')

/** Devuelve el filtro de búsqueda para un texto (nombre, código, hex o gama de pincel). */
export function matcher(query: string): ((it: Item) => boolean) | null {
  const q = norm(query)
  if (!q) return null
  return (it) =>
    norm(it.name).includes(q) ||
    (isBrush(it)
      ? norm(it.range).includes(q)
      : it.hex.toLowerCase().includes(q) || (!!it.code && norm(it.code).includes(q)))
}

/** Coincidencias ordenadas: primero las que empiezan por el texto buscado. */
export function searchItems(list: Item[], query: string): Item[] {
  const m = matcher(query)
  if (!m) return []
  const q = norm(query)
  return list.filter(m).sort((a, b) => Number(!norm(a.name).startsWith(q)) - Number(!norm(b.name).startsWith(q)))
}
