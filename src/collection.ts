import { type Item, isBrush } from './brushes'

// Colección personal: qué pinturas y pinceles tienes o quieres. Se guarda en el navegador.

export type Status = 'own' | 'wish'
export type StatusFilter = 'all' | Status | 'missing'

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

function load(): Record<string, Status> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

const state = load()

export function statusOf(it: Item): Status | undefined {
  return state[itemKey(it)]
}

/** Activa el estado indicado o lo quita si ya estaba puesto. Devuelve el nuevo estado. */
export function toggleStatus(it: Item, s: Status): Status | undefined {
  const key = itemKey(it)
  if (state[key] === s) delete state[key]
  else state[key] = s
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
  return state[key]
}

export function matchesFilter(it: Item, f: StatusFilter): boolean {
  if (f === 'all') return true
  const s = statusOf(it)
  return f === 'missing' ? s !== 'own' : s === f
}
