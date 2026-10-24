import { type Item, isBrush } from './brushes'
import { type Paint, sortByColor } from './paints'
import type { Mode } from './links'

export type SortKey = 'color' | 'name' | 'range' | 'catalog' | 'size'

export const SORTS: Record<Mode, [SortKey, string][]> = {
  paints: [
    ['color', 'Por color'],
    ['range', 'Por gama'],
    ['name', 'Por nombre'],
  ],
  brushes: [
    ['catalog', 'Por catálogo'],
    ['size', 'Por talla'],
    ['name', 'Por nombre'],
  ],
}

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })
const byName = (a: Item, b: Item) => collator.compare(a.name, b.name)

/**
 * Ordena una lista. `rangeOrder` es el orden de las gamas en el catálogo de la marca
 * (para «Por gama»; dentro de cada gama, por nombre, así los tonos 1–5 quedan juntos).
 */
export function sortItems(list: Item[], key: SortKey, rangeOrder: string[] = []): Item[] {
  switch (key) {
    case 'color':
      return sortByColor(list as Paint[])
    case 'name':
      return [...list].sort(byName)
    case 'range':
      return [...list].sort((a, b) => rangeOrder.indexOf(a.range) - rangeOrder.indexOf(b.range) || byName(a, b))
    case 'size':
      return [...list].sort(
        (a, b) => (isBrush(a) && isBrush(b) ? a.width - b.width || a.length - b.length : 0) || byName(a, b),
      )
    default:
      return list
  }
}
