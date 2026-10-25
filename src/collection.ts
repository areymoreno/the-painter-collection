import { type Item, isBrush } from './brushes'
import { loadJson, storeJson } from './storage'

// Colección personal: qué pinturas y pinceles tienes o quieres. Se guarda en el navegador.

/** «low»: la tienes pero se está acabando (cuenta como tenerla). */
export type Status = 'own' | 'wish' | 'low'
export type StatusFilter = 'all' | Status | 'missing'

/** La tienes (aunque se esté acabando). */
export const isOwned = (s: Status | undefined) => s === 'own' || s === 'low'

const STORAGE_KEY = 'collection'

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Identificador estable de un artículo dentro de su marca (se usa en los enlaces). */
export function itemSlug(it: Item): string {
  if (isBrush(it)) return slug(it.name)
  return it.code ? slug(it.code) : slug(`${it.range} ${it.name}`)
}

export const modeOf = (it: Item) => (isBrush(it) ? 'pinceles' : 'pinturas')

/** Clave única global: catálogo/marca/artículo */
export const itemKey = (it: Item) => `${modeOf(it)}/${it.brand}/${itemSlug(it)}`

const state: Record<string, Status> = loadJson(STORAGE_KEY, {})
const listeners = new Set<() => void>()

/** Avisa cuando cambia la colección (marcas, importaciones). */
export function onCollectionChange(fn: () => void) {
  listeners.add(fn)
}

function save() {
  storeJson(STORAGE_KEY, state)
  for (const fn of listeners) fn()
}

export function statusOf(it: Item): Status | undefined {
  return state[itemKey(it)]
}

export const statusOfKey = (key: string): Status | undefined => state[key]

/** Copia de la colección, p. ej. para exportarla. */
export const collectionSnapshot = (): Record<string, Status> => ({ ...state })

/**
 * Incorpora marcas importadas. Con `replace` se descarta la colección actual; si no, se
 * combinan y en caso de conflicto gana «lo tengo».
 */
export function mergeCollection(incoming: Record<string, Status>, replace = false): number {
  if (replace) for (const k of Object.keys(state)) delete state[k]
  let n = 0
  for (const [k, v] of Object.entries(incoming)) {
    if (v !== 'own' && v !== 'wish' && v !== 'low') continue
    if (isOwned(state[k]) && v === 'wish') continue
    if (state[k] !== v) n++
    state[k] = v
  }
  save()
  return n
}

/** Activa el estado indicado o lo quita si ya estaba puesto. Devuelve el nuevo estado. */
export function toggleStatus(it: Item, s: Status): Status | undefined {
  const key = itemKey(it)
  if (s === 'low') state[key] = state[key] === 'low' ? 'own' : 'low'
  else if (state[key] === s || (s === 'own' && state[key] === 'low')) delete state[key]
  else state[key] = s
  save()
  return state[key]
}

export function matchesFilter(it: Item, f: StatusFilter): boolean {
  if (f === 'all') return true
  const s = statusOf(it)
  if (f === 'missing') return !isOwned(s)
  if (f === 'own') return isOwned(s)
  return s === f
}
