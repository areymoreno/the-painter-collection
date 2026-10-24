import './style.css'
import { InfiniteGrid } from './grid'
import { BRANDS, brandById, rangeAccent } from './brands'
import { BRUSH_BRANDS, HAIR_LABEL, SHAPE_LABEL, type Item, brushBrandById, brushesOf, isBrush } from './brushes'
import { type StatusFilter, itemKey, itemSlug, matchesFilter, statusOf, toggleStatus } from './collection'
import { equivalents, similarity } from './match'
import { type BrandId, type Paint, luminance, sortByColor } from './paints'
import type { PotViewer } from './pot3d'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const tooltip = $<HTMLDivElement>('tooltip')
const modal = $<HTMLDivElement>('modal')
const search = $<HTMLInputElement>('search')

type Mode = 'paints' | 'brushes'
const MODE_PATH: Record<Mode, string> = { paints: 'pinturas', brushes: 'pinceles' }

let mode: Mode = 'paints'
let viewer: PotViewer | null = null
let current: Item | null = null
let visible: Item[] = []
let items: Item[] = []

const brandName = (it: Item) => (isBrush(it) ? brushBrandById(it.brand).name : brandById(it.brand).name)
const detail = (it: Item) => (isBrush(it) ? `Talla ${it.size} · ${HAIR_LABEL[it.hair]}` : (it.code ?? it.hex))

const grid = new InfiniteGrid($<HTMLCanvasElement>('grid'), openItem, (it, x, y) => {
  if (!it) {
    tooltip.hidden = true
    return
  }
  tooltip.innerHTML = `<b>${it.name}</b><span>${it.range} · ${detail(it)}</span>`
  tooltip.style.left = `${x}px`
  tooltip.style.top = `${y}px`
  tooltip.hidden = false
})
grid.setBadge(statusOf)

// ---------- Pinturas / Pinceles ----------

const modeButtons = document.querySelectorAll<HTMLButtonElement>('#mode button')
for (const b of modeButtons) b.addEventListener('click', () => setMode(b.dataset.mode as Mode))

async function setMode(m: Mode, brand?: string) {
  mode = m
  for (const b of modeButtons) b.classList.toggle('on', b.dataset.mode === m)
  search.placeholder = m === 'paints' ? 'Buscar pintura…' : 'Buscar pincel…'
  brandSelect.replaceChildren()
  for (const b of m === 'paints' ? BRANDS : BRUSH_BRANDS) brandSelect.add(new Option(b.name, b.id))
  store('mode', m)
  buildSortSelect()
  await selectBrand(brand ?? saved(`brand-${m}`, m === 'paints' ? 'citadel' : 'gw'))
}

// ---------- Marca ----------

const brandSelect = $<HTMLSelectElement>('brand')

function saved(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

async function selectBrand(id: string) {
  const list = mode === 'paints' ? BRANDS : BRUSH_BRANDS
  if (!list.some((b) => b.id === id)) id = list[0].id
  brandSelect.value = id
  store(`brand-${mode}`, id)
  const loaded: Item[] = mode === 'paints' ? await brandById(id as BrandId).load() : brushesOf(id)
  if (brandSelect.value !== id) return // se cambió de marca mientras cargaba
  items = loaded
  active.clear()
  buildChips()
  refresh()
}

brandSelect.addEventListener('change', () => selectBrand(brandSelect.value))

// ---------- Mi colección ----------

const ownedSelect = $<HTMLSelectElement>('owned')
let statusFilter: StatusFilter = 'all'

const FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'Todas',
  own: 'Las tengo',
  wish: 'Las quiero',
  missing: 'Me faltan',
}

/** Actualiza las opciones con el recuento de la marca actual. */
function updateOwnedSelect() {
  const own = items.filter((it) => statusOf(it) === 'own').length
  const wish = items.filter((it) => statusOf(it) === 'wish').length
  const counts: Record<StatusFilter, number> = { all: items.length, own, wish, missing: items.length - own }
  ownedSelect.replaceChildren()
  for (const f of Object.keys(FILTER_LABEL) as StatusFilter[]) {
    ownedSelect.add(new Option(`${FILTER_LABEL[f]} (${counts[f]})`, f))
  }
  ownedSelect.value = statusFilter
}

ownedSelect.addEventListener('change', () => {
  statusFilter = ownedSelect.value as StatusFilter
  refresh()
})

// ---------- Orden ----------

type SortKey = 'color' | 'name' | 'range' | 'catalog' | 'size'

const SORTS: Record<Mode, [SortKey, string][]> = {
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

const sortSelect = $<HTMLSelectElement>('sort')
let sortKey: SortKey = 'color'
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })

function buildSortSelect() {
  sortSelect.replaceChildren()
  for (const [k, label] of SORTS[mode]) sortSelect.add(new Option(label, k))
  const savedKey = saved(`sort-${mode}`, SORTS[mode][0][0]) as SortKey
  sortKey = SORTS[mode].some(([k]) => k === savedKey) ? savedKey : SORTS[mode][0][0]
  sortSelect.value = sortKey
}

sortSelect.addEventListener('change', () => {
  sortKey = sortSelect.value as SortKey
  store(`sort-${mode}`, sortKey)
  refresh()
})

function sortItems(list: Item[]): Item[] {
  const byName = (a: Item, b: Item) => collator.compare(a.name, b.name)
  switch (sortKey) {
    case 'color':
      return sortByColor(list as Paint[])
    case 'name':
      return [...list].sort(byName)
    case 'range': {
      // Gamas en el orden del catálogo; dentro, por nombre (los tonos 1–5 de Tone Pro quedan juntos)
      const order = [...new Set(items.map((it) => it.range))]
      return [...list].sort((a, b) => order.indexOf(a.range) - order.indexOf(b.range) || byName(a, b))
    }
    case 'size':
      return [...list].sort(
        (a, b) => (isBrush(a) && isBrush(b) ? a.width - b.width || a.length - b.length : 0) || byName(a, b),
      )
    default:
      return list
  }
}

// ---------- Filtros por gama ----------

// Sin selección se ven todas; al seleccionar una o varias gamas solo quedan esas.
const active = new Set<string>()
const chips = $<HTMLDivElement>('ranges')

function buildChips() {
  chips.replaceChildren()
  const counts = new Map<string, number>()
  for (const it of items) counts.set(it.range, (counts.get(it.range) ?? 0) + 1)
  for (const [range, count] of counts) {
    const b = document.createElement('button')
    b.className = 'chip'
    b.dataset.range = range
    b.style.setProperty('--accent', rangeAccent(items.find((it) => it.range === range)!))
    b.innerHTML = `<span class="dot"></span>${range} <span class="count">${count}</span>`
    b.addEventListener('click', (e) => {
      // Alt/⌘-clic: dejar solo esta gama
      if (e.altKey || e.metaKey) {
        active.clear()
        active.add(range)
      } else if (active.has(range)) active.delete(range)
      else active.add(range)
      for (const el of chips.querySelectorAll<HTMLElement>('.chip')) {
        el.classList.toggle('on', active.has(el.dataset.range!))
      }
      refresh()
    })
    chips.appendChild(b)
  }
}

function refresh() {
  updateOwnedSelect()
  const filtered = items.filter(
    (it) => (!active.size || active.has(it.range)) && matchesFilter(it, statusFilter),
  )
  visible = sortItems(filtered)
  grid.setPaints(visible)
  const empty = $('empty')
  empty.hidden = visible.length > 0
  if (!visible.length) {
    empty.textContent =
      statusFilter === 'own'
        ? 'Aún no tienes nada marcado en esta marca. Abre una y pulsa «✓ Lo tengo».'
        : statusFilter === 'wish'
          ? 'Tu lista de deseos de esta marca está vacía. Abre una y pulsa «♥ Lo quiero».'
          : 'No hay nada con estos filtros.'
  }
  applySearch()
}

// ---------- Búsqueda ----------

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9#]/g, '')

const results = $<HTMLUListElement>('results')
const MAX_RESULTS = 8
let matches: Item[] = []
let activeResult = 0

function applySearch() {
  const q = norm(search.value)
  if (!q) {
    grid.setHighlight(null)
    matches = []
    renderResults()
    return
  }
  const match = (it: Item) =>
    norm(it.name).includes(q) ||
    (isBrush(it)
      ? norm(it.range).includes(q)
      : it.hex.toLowerCase().includes(q) || (!!it.code && norm(it.code).includes(q)))
  grid.setHighlight(match)
  // Primero los que empiezan por el texto buscado
  matches = visible
    .filter(match)
    .sort((a, b) => Number(!norm(a.name).startsWith(q)) - Number(!norm(b.name).startsWith(q)))
  activeResult = 0
  renderResults()
  if (matches[0]) grid.focus(matches[0])
}

function renderResults() {
  const open = document.activeElement === search && search.value.trim() !== ''
  results.hidden = !open
  search.setAttribute('aria-expanded', String(open))
  if (!open) return
  results.replaceChildren()
  if (!matches.length) {
    results.innerHTML = `<li class="more">Sin resultados en esta marca</li>`
    return
  }
  matches.slice(0, MAX_RESULTS).forEach((it, i) => {
    const li = document.createElement('li')
    li.role = 'option'
    li.classList.toggle('active', i === activeResult)
    const color = isBrush(it) ? it.handle : it.hex
    const st = statusOf(it)
    li.innerHTML = `
      <span class="sw" style="background:${color}"></span>
      <span class="nm">${it.name}${st ? `<span class="st">${st === 'own' ? '✓' : '♥'}</span>` : ''}</span>
      <span class="meta">${it.range}${isBrush(it) ? ` · ${it.size}` : it.code ? ` · ${it.code}` : ''}</span>`
    // mousedown para que el input no pierda el foco antes del clic
    li.addEventListener('mousedown', (e) => {
      e.preventDefault()
      pickResult(it)
    })
    li.addEventListener('mouseenter', () => {
      activeResult = i
      grid.focus(it)
      for (const [j, el] of [...results.children].entries()) el.classList.toggle('active', j === i)
    })
    results.appendChild(li)
  })
  if (matches.length > MAX_RESULTS) {
    const more = document.createElement('li')
    more.className = 'more'
    more.textContent = `y ${matches.length - MAX_RESULTS} más (resaltadas en la cuadrícula)`
    results.appendChild(more)
  }
}

function pickResult(it: Item) {
  search.blur()
  grid.focus(it)
  openItem(it)
}

search.addEventListener('input', applySearch)
search.addEventListener('focus', renderResults)
search.addEventListener('blur', () => setTimeout(renderResults, 0))
search.addEventListener('keydown', (e) => {
  const shown = Math.min(matches.length, MAX_RESULTS)
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!shown) return
    e.preventDefault()
    activeResult = (activeResult + (e.key === 'ArrowDown' ? 1 : -1) + shown) % shown
    grid.focus(matches[activeResult])
    renderResults()
  } else if (e.key === 'Enter') {
    if (matches[activeResult]) pickResult(matches[activeResult])
  } else if (e.key === 'Escape') {
    if (!results.hidden && search.value) {
      search.value = ''
      applySearch()
    }
    search.blur()
  }
})

// ---------- Modal con el modelo 3D ----------

const btnOwn = $<HTMLButtonElement>('btn-own')
const btnWish = $<HTMLButtonElement>('btn-wish')
const btnLink = $<HTMLButtonElement>('btn-link')
const eqSection = $<HTMLElement>('equivalents')

function updateStatusButtons() {
  const s = current && statusOf(current)
  btnOwn.classList.toggle('on', s === 'own')
  btnWish.classList.toggle('on', s === 'wish')
}

async function openItem(it: Item) {
  current = it
  tooltip.hidden = true
  modal.hidden = false
  history.replaceState(null, '', `#/${itemKey(it)}`)

  const color = isBrush(it) ? it.handle : it.hex
  $('info-name').textContent = it.name
  $('info-range').textContent = `${brandName(it)} · ${it.range}`
  $('info-hex').textContent = isBrush(it)
    ? `Talla ${it.size}  ·  ${SHAPE_LABEL[it.shape]}  ·  ${HAIR_LABEL[it.hair]}`
    : [it.code, it.hex.toUpperCase()].filter(Boolean).join('  ·  ')
  const panel = $('modal-panel')
  panel.style.setProperty('--paint', color)
  panel.classList.toggle('light', luminance(color) > 0.4)
  panel.classList.toggle('brush', isBrush(it))
  updateStatusButtons()
  btnLink.textContent = 'Copiar enlace'
  showEquivalents(it)

  if (!viewer) {
    const { PotViewer } = await import('./pot3d')
    viewer = new PotViewer($<HTMLDivElement>('pot-view'))
  }
  if (current === it && !modal.hidden) viewer.show(it)
}

// Catálogo completo de pinturas (todas las marcas), para buscar equivalencias
let allPaints: Promise<Paint[]> | null = null
const loadAllPaints = () => (allPaints ??= Promise.all(BRANDS.map((b) => b.load())).then((l) => l.flat()))

async function showEquivalents(it: Item) {
  const list = eqSection.querySelector('ul')!
  if (isBrush(it)) {
    eqSection.hidden = true
    return
  }
  const catalog = await loadAllPaints()
  if (current !== it) return
  list.replaceChildren()
  for (const { paint: p, dE } of equivalents(it, catalog, 5)) {
    const li = document.createElement('li')
    const b = document.createElement('button')
    const owned = statusOf(p) === 'own'
    b.innerHTML = `
      <span class="sw" style="background:${p.hex}"></span>
      <span class="nm">${p.name}<small>${brandById(p.brand).name} · ${p.code ?? p.range}${owned ? ' · ✓ la tienes' : ''}</small></span>
      <span class="de">${owned ? '<b>✓</b> ' : ''}${similarity(dE)}</span>`
    b.title = `Diferencia de color ΔE ${dE.toFixed(1)}`
    b.addEventListener('click', () => openByKey(itemKey(p)))
    li.appendChild(b)
    list.appendChild(li)
  }
  eqSection.hidden = false
}

function closeModal() {
  modal.hidden = true
  viewer?.stop()
  current = null
  history.replaceState(null, '', location.pathname + location.search)
}

function step(dir: number) {
  if (!current) return
  const i = visible.indexOf(current)
  const next = visible[(i + dir + visible.length) % visible.length]
  openItem(next)
  grid.focus(next)
}

function toggle(s: 'own' | 'wish') {
  if (!current) return
  toggleStatus(current, s)
  updateStatusButtons()
  updateOwnedSelect()
  grid.invalidate()
}

modal.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-close]')) closeModal()
})
$('btn-prev').addEventListener('click', () => step(-1))
$('btn-next').addEventListener('click', () => step(1))
btnOwn.addEventListener('click', () => toggle('own'))
btnWish.addEventListener('click', () => toggle('wish'))
btnLink.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href)
    btnLink.textContent = '¡Copiado!'
  } catch {
    prompt('Copia este enlace:', location.href)
  }
})

window.addEventListener(
  'keydown',
  (e) => {
    if (modal.hidden) {
      if (e.key === '/' && document.activeElement !== search) {
        e.preventDefault()
        search.focus()
      }
      return
    }
    // Con el modal abierto el teclado controla el modal, no la cuadrícula
    e.stopImmediatePropagation()
    if (e.key === 'Escape') closeModal()
    else if (e.key === 'ArrowRight') step(1)
    else if (e.key === 'ArrowLeft') step(-1)
  },
  { capture: true },
)

// ---------- Enlaces: #/pinturas/<marca>/<artículo> ----------

/** Abre un artículo a partir de su clave, cambiando de catálogo y marca si hace falta. */
async function openByKey(key: string): Promise<boolean> {
  const [path, brand, slug] = key.split('/').map(decodeURIComponent)
  const m = (Object.keys(MODE_PATH) as Mode[]).find((k) => MODE_PATH[k] === path)
  if (!m || !brand) return false
  if (m !== mode || brandSelect.value !== brand) await setMode(m, brand)
  if (!slug) return true
  const it = items.find((x) => itemSlug(x) === slug)
  if (!it) return false
  // Que el artículo esté visible aunque haya filtros puestos
  if (!visible.includes(it)) {
    active.clear()
    for (const el of chips.querySelectorAll('.chip')) el.classList.remove('on')
    statusFilter = 'all'
    refresh()
  }
  grid.focus(it)
  openItem(it)
  return true
}

const keyFromHash = () => location.hash.replace(/^#\/?/, '')

window.addEventListener('hashchange', () => {
  const key = keyFromHash()
  if (key && (!current || key !== itemKey(current))) openByKey(key)
})

// Compatibilidad con la clave antigua 'brand' (solo pinturas)
const legacyBrand = saved('brand', '')
if (legacyBrand && !saved('brand-paints', '')) store('brand-paints', legacyBrand)

const initial = keyFromHash()
if (!initial || !(await openByKey(initial))) {
  await setMode(saved('mode', 'paints') === 'brushes' ? 'brushes' : 'paints')
}
