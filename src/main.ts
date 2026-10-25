import './style.css'
import { BRANDS, brandById, rangeAccent } from './brands'
import { BRUSH_BRANDS, HAIR_LABEL, type Item, brushesOf, isBrush } from './brushes'
import { loadIndex } from './catalog'
import { type StatusFilter, isOwned, itemKey, itemSlug, matchesFilter, onCollectionChange, statusOf } from './collection'
import { currentItem, closeDetail, initDetail, isDetailOpen, openDetail, updateButtons } from './detail'
import { showChangelogIfNeeded } from './changelog'
import { $, esc } from './dom'
import { InfiniteGrid } from './grid'
import { type Mode, parseRoute } from './links'
import { onPalettesChange } from './palettes'
import type { BrandId } from './paints'
import { backupPanel } from './panels/backupPanel'
import { colorSearchPanel, setSearchColor } from './panels/colorSearch'
import { mixPanel, setMixTarget } from './panels/mixPanel'
import { scanPanel, stopScan } from './panels/scanPanel'
import { statsPanel } from './panels/statsPanel'
import { compareItems, comparePanel, onCompareChange } from './panels/comparePanel'
import { closeDrawer, drawerPanel, onDrawerChange, openPanel, rerender } from './panels/drawer'
import { palettesPanel, showPaletteList, showSharedPalette } from './panels/palettesPanel'
import { initSearchBox } from './searchBox'
import { SORTS, type SortKey, sortItems } from './sorting'
import { saved, store } from './storage'

const tooltip = $('tooltip')
const search = $<HTMLInputElement>('search')
const hud = $('hud')
const mobile = window.matchMedia('(max-width: 720px)')

let mode: Mode = 'paints'
let visible: Item[] = []
let items: Item[] = []

const detail = (it: Item) => (isBrush(it) ? `Talla ${it.size} · ${HAIR_LABEL[it.hair]}` : (it.code ?? it.hex))

const grid = new InfiniteGrid($<HTMLCanvasElement>('grid'), openItem, (it, x, y) => {
  if (!it) {
    tooltip.hidden = true
    return
  }
  tooltip.innerHTML = `<b>${esc(it.name)}</b><span>${esc(it.range)} · ${esc(detail(it))}</span>`
  tooltip.style.left = `${x}px`
  tooltip.style.top = `${y}px`
  tooltip.hidden = false
})
grid.setBadge(statusOf)

function openItem(it: Item) {
  tooltip.hidden = true
  openDetail(it)
}

initDetail({
  step(dir) {
    const cur = currentItem()
    if (!cur) return
    const i = visible.indexOf(cur)
    const next = visible[(i + dir + visible.length) % visible.length]
    openItem(next)
    grid.focus(next)
  },
  openKey: (key) => openByKey(key),
  mixFor(p) {
    setMixTarget(p)
    closeDetail()
    openPanel(panels.mix)
  },
  onClose() {},
})

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
  low: 'Se acaban',
  missing: 'Me faltan',
}

/** Actualiza las opciones con el recuento de la marca actual. */
function updateOwnedSelect() {
  const own = items.filter((it) => isOwned(statusOf(it))).length
  const low = items.filter((it) => statusOf(it) === 'low').length
  const wish = items.filter((it) => statusOf(it) === 'wish').length
  const counts: Record<StatusFilter, number> = { all: items.length, own, wish, low, missing: items.length - own }
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

onCollectionChange(() => {
  updateOwnedSelect()
  updateButtons()
  grid.invalidate()
  if (statusFilter !== 'all') refresh()
  rerender()
})

// ---------- Orden ----------

const sortSelect = $<HTMLSelectElement>('sort')
let sortKey: SortKey = 'color'

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

// ---------- Filtros por gama ----------

// Sin selección se ven todas; al seleccionar una o varias gamas solo quedan esas.
const active = new Set<string>()
const chips = $('ranges')

function buildChips() {
  chips.replaceChildren()
  const counts = new Map<string, number>()
  for (const it of items) counts.set(it.range, (counts.get(it.range) ?? 0) + 1)
  for (const [range, count] of counts) {
    const b = document.createElement('button')
    b.className = 'chip'
    b.dataset.range = range
    b.style.setProperty('--accent', rangeAccent(items.find((it) => it.range === range)!))
    b.innerHTML = `<span class="dot"></span>${esc(range)} <span class="count">${count}</span>`
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
  const filtered = items.filter((it) => (!active.size || active.has(it.range)) && matchesFilter(it, statusFilter))
  visible = sortItems(filtered, sortKey, [...new Set(items.map((it) => it.range))])
  grid.setPaints(visible)
  const empty = $('empty')
  empty.hidden = visible.length > 0
  if (!visible.length) {
    empty.textContent =
      statusFilter === 'own'
        ? 'Aún no tienes nada marcado en esta marca. Abre una y pulsa «✓ Lo tengo».'
        : statusFilter === 'wish'
          ? 'Tu lista de deseos de esta marca está vacía. Abre una y pulsa «♥ Lo quiero».'
          : statusFilter === 'low'
            ? 'No has marcado ninguna como «Se acaba» en esta marca.'
          : 'No hay nada con estos filtros.'
  }
  updateSummary()
  applySearch()
}

// ---------- Búsqueda ----------

const searchBox = initSearchBox({
  input: search,
  results: $<HTMLUListElement>('results'),
  items: () => visible,
  onHighlight: (fn) => grid.setHighlight(fn),
  onFocus: (it) => grid.focus(it),
  onPick: (it) => openItem(it),
})
const applySearch = () => searchBox.apply()

// ---------- Herramientas (panel lateral) ----------

const panels = {
  color: colorSearchPanel((p) => openByKey(itemKey(p))),
  palettes: palettesPanel((key) => openByKey(key)),
  compare: comparePanel((it) => openByKey(itemKey(it))),
  mix: mixPanel((p) => openByKey(itemKey(p))),
  scan: scanPanel((p) => openByKey(itemKey(p))),
  stats: statsPanel,
  backup: backupPanel,
}

for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
  btn.addEventListener('click', () => {
    const id = btn.dataset.tool as keyof typeof panels
    if (drawerPanel() === id) return closeDrawer()
    if (id === 'color') {
      const cur = currentItem()
      if (cur && !isBrush(cur)) setSearchColor(cur.hex)
    }
    if (id === 'palettes') showPaletteList()
    openPanel(panels[id])
  })
}

onDrawerChange((id) => {
  if (id !== 'scan') stopScan()
  for (const b of document.querySelectorAll<HTMLElement>('[data-tool]')) b.classList.toggle('on', b.dataset.tool === id)
  // En móvil se pliega la cabecera para dejar sitio al panel
  if (id && mobile.matches) hud.classList.add('collapsed')
})

function updateCompareCount() {
  const n = compareItems().length
  $('compare-count').textContent = n ? String(n) : ''
}
onCompareChange(() => {
  updateCompareCount()
  updateButtons()
  // Con dos elegidos se abre la comparación directamente
  if (compareItems().length === 2 && drawerPanel() !== 'compare') {
    closeDetail()
    openPanel(panels.compare)
  }
})
onPalettesChange(() => {
  updateButtons()
  rerender()
})

// ---------- Cabecera plegable (móvil) ----------

// El panel lateral se coloca justo debajo de la cabecera, que cambia de alto
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--hud-bottom', `${hud.getBoundingClientRect().bottom}px`)
}).observe(hud)


function updateSummary() {
  const b = (mode === 'paints' ? BRANDS : BRUSH_BRANDS).find((x) => x.id === brandSelect.value)
  $('hud-summary-text').textContent = `${b?.name ?? ''} · ${visible.length}${active.size ? ` · ${active.size} gama${active.size > 1 ? 's' : ''}` : ''}`
}

grid.onPanStart = () => {
  if (mobile.matches && document.activeElement !== search) hud.classList.add('collapsed')
}
$('hud-summary').addEventListener('click', () => hud.classList.remove('collapsed'))
mobile.addEventListener('change', () => !mobile.matches && hud.classList.remove('collapsed'))

// ---------- Teclado ----------

window.addEventListener(
  'keydown',
  (e) => {
    if (!isDetailOpen()) {
      if (e.key === '/' && document.activeElement !== search) {
        e.preventDefault()
        search.focus()
      } else if (e.key === 'Escape' && drawerPanel()) closeDrawer()
      return
    }
    // Con la ficha abierta el teclado la controla a ella, no a la cuadrícula
    if ((e.target as HTMLElement).closest('input, textarea')) return
    e.stopImmediatePropagation()
    if (e.key === 'Escape') closeDetail()
    else if (e.key === 'ArrowRight') $('btn-next').click()
    else if (e.key === 'ArrowLeft') $('btn-prev').click()
  },
  { capture: true },
)

// ---------- Enlaces ----------

/** Abre un artículo por su clave (catálogo/marca/artículo), cambiando de marca si hace falta. */
async function openByKey(key: string): Promise<boolean> {
  const route = parseRoute(`#/${key}`)
  if (route.kind !== 'item') return false
  if (route.mode !== mode || brandSelect.value !== route.brand) await setMode(route.mode, route.brand)
  if (!route.slug) return true
  const it = items.find((x) => itemSlug(x) === route.slug)
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

async function handleRoute(): Promise<boolean> {
  const route = parseRoute(location.hash)
  if (route.kind === 'palette') {
    showSharedPalette(route.code)
    openPanel(panels.palettes)
    return false
  }
  if (route.kind === 'item') {
    const cur = currentItem()
    if (cur && location.hash === `#/${itemKey(cur)}`) return true
    return openByKey(location.hash.replace(/^#\/?/, ''))
  }
  return false
}

window.addEventListener('hashchange', handleRoute)

// Compatibilidad con la clave antigua 'brand' (solo pinturas)
const legacyBrand = saved('brand', '')
if (legacyBrand && !saved('brand-paints', '')) store('brand-paints', legacyBrand)

updateCompareCount()
if (!(await handleRoute())) {
  await setMode(saved('mode', 'paints') === 'brushes' ? 'brushes' : 'paints')
}
loadIndex() // precarga en segundo plano para paletas y equivalencias
showChangelogIfNeeded()

// ---------- Uso sin conexión ----------

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {})
}
