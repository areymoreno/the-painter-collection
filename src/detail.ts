import { brandById } from './brands'
import { HAIR_LABEL, SHAPE_LABEL, type Item, brushBrandById, isBrush } from './brushes'
import { loadAllPaints } from './catalog'
import { isOwned, itemKey, statusOf, toggleStatus } from './collection'
import { $, el, esc } from './dom'
import { deltaE2000, equivalents, similarity } from './match'
import { type Paint, isDiscontinued, luminance } from './paints'
import { allPalettes, createPalette, togglePaletteItem } from './palettes'
import { inCompare, toggleCompare } from './panels/comparePanel'
import type { PotViewer } from './pot3d'

// Ficha de un artículo: modelo 3D, datos, colección, paletas, comparar y equivalencias.

interface DetailHooks {
  step(dir: number): void
  openKey(key: string): void
  /** Abre el panel de mezclas con esta pintura como objetivo */
  mixFor(p: Paint): void
  onClose(): void
}

const modal = $('modal')
const panel = $('modal-panel')
const btnOwn = $<HTMLButtonElement>('btn-own')
const btnWish = $<HTMLButtonElement>('btn-wish')
const btnLow = $<HTMLButtonElement>('btn-low')
const btnLink = $<HTMLButtonElement>('btn-link')
const btnCompare = $<HTMLButtonElement>('btn-compare')
const btnPalette = $<HTMLButtonElement>('btn-palette')
const paletteMenu = $('palette-menu')
const eqSection = $('equivalents')

let viewer: PotViewer | null = null
let current: Item | null = null
let hooks: DetailHooks

export const currentItem = () => current
export const isDetailOpen = () => !modal.hidden

const brandName = (it: Item) => (isBrush(it) ? brushBrandById(it.brand).name : brandById(it.brand).name)

export function initDetail(h: DetailHooks) {
  hooks = h
  modal.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-close]')) closeDetail()
  })
  $('btn-prev').addEventListener('click', () => hooks.step(-1))
  $('btn-next').addEventListener('click', () => hooks.step(1))
  btnOwn.addEventListener('click', () => current && toggleStatus(current, 'own'))
  btnWish.addEventListener('click', () => current && toggleStatus(current, 'wish'))
  btnLow.addEventListener('click', () => current && toggleStatus(current, 'low'))
  $('btn-mix').addEventListener('click', () => current && !isBrush(current) && hooks.mixFor(current))
  btnCompare.addEventListener('click', () => {
    if (!current) return
    toggleCompare(current)
    updateButtons()
  })
  btnPalette.addEventListener('click', (e) => {
    e.stopPropagation()
    if (paletteMenu.hidden) renderPaletteMenu()
    paletteMenu.hidden = !paletteMenu.hidden
  })
  document.addEventListener('click', (e) => {
    if (!paletteMenu.contains(e.target as Node)) paletteMenu.hidden = true
  })
  btnLink.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      btnLink.textContent = '¡Copiado!'
    } catch {
      prompt('Copia este enlace:', location.href)
    }
  })
}

export function updateButtons() {
  const s = current && statusOf(current)
  btnOwn.classList.toggle('on', isOwned(s ?? undefined))
  btnWish.classList.toggle('on', s === 'wish')
  btnLow.hidden = !isOwned(s ?? undefined)
  btnLow.classList.toggle('on', s === 'low')
  const cmp = !!current && inCompare(current)
  btnCompare.classList.toggle('on', cmp)
  btnCompare.textContent = cmp ? '⇄ En comparación' : '⇄ Comparar'
  const inPalettes = current ? allPalettes().filter((p) => p.items.includes(itemKey(current!))).length : 0
  btnPalette.classList.toggle('on', inPalettes > 0)
  btnPalette.textContent = inPalettes ? `▤ En ${inPalettes} paleta${inPalettes > 1 ? 's' : ''}` : '+ Paleta'
}

function renderPaletteMenu() {
  if (!current) return
  const key = itemKey(current)
  paletteMenu.replaceChildren()
  for (const p of allPalettes()) {
    const cb = el('input', { type: 'checkbox', checked: p.items.includes(key) })
    cb.addEventListener('change', () => {
      togglePaletteItem(p.id, key)
      updateButtons()
    })
    paletteMenu.append(el('label', { className: 'menu-item' }, cb, ` ${p.name}`))
  }
  const name = el('input', { type: 'text', placeholder: 'Nueva paleta…', className: 'text' })
  const create = () => {
    if (!name.value.trim()) return
    createPalette(name.value, [key])
    name.value = ''
    renderPaletteMenu()
    updateButtons()
  }
  name.addEventListener('keydown', (e) => e.key === 'Enter' && create())
  const add = el('button', { className: 'btn small', textContent: 'Crear' })
  add.addEventListener('click', create)
  paletteMenu.append(el('div', { className: 'menu-new' }, name, add))
}

export async function openDetail(it: Item) {
  current = it
  modal.hidden = false
  paletteMenu.hidden = true
  history.replaceState(null, '', `#/${itemKey(it)}`)

  const color = isBrush(it) ? it.handle : it.hex
  $('info-name').textContent = it.name
  $('info-range').textContent = `${brandName(it)} · ${it.range}`
  $('info-hex').textContent = isBrush(it)
    ? `Talla ${it.size}  ·  ${SHAPE_LABEL[it.shape]}  ·  ${HAIR_LABEL[it.hair]}`
    : [it.code, it.hex.toUpperCase()].filter(Boolean).join('  ·  ')
  panel.style.setProperty('--paint', color)
  panel.classList.toggle('light', luminance(color) > 0.4)
  panel.classList.toggle('brush', isBrush(it))
  updateButtons()
  btnLink.textContent = 'Copiar enlace'
  showEquivalents(it)

  if (!viewer) {
    const { PotViewer } = await import('./pot3d')
    viewer = new PotViewer($('pot-view'))
  }
  if (current === it && !modal.hidden) viewer.show(it)
}

async function showEquivalents(it: Item) {
  const list = eqSection.querySelector('ul')!
  if (isBrush(it)) {
    $('info-note').hidden = true
    eqSection.hidden = true
    return
  }
  const catalog = await loadAllPaints()
  if (current !== it) return
  list.replaceChildren()
  // Descatalogada: su sustituta más parecida de la gama actual de la misma marca
  const note = $('info-note')
  note.hidden = !isDiscontinued(it)
  if (isDiscontinued(it)) {
    // Lavados antiguos → Shade; el resto → Base o Layer
    const ranges = /wash/i.test(it.name) ? ['Shade'] : ['Base', 'Layer']
    const current = catalog.filter((p) => p.brand === it.brand && ranges.includes(p.range))
    const best = current
      .map((p) => ({ p, dE: deltaE2000(it.hex, p.hex) }))
      .sort((a, b) => a.dE - b.dE)[0]
    note.replaceChildren('Descatalogada. ')
    if (best) {
      const link = el('button', { className: 'link-btn', textContent: `Sustituta actual: ${best.p.name} (${best.p.range})` })
      link.addEventListener('click', () => hooks.openKey(itemKey(best.p)))
      note.append(link)
    }
  }

  const pool = catalog.filter((p) => !isDiscontinued(p))
  for (const { paint: p, dE } of equivalents(it, pool, 5)) {
    const owned = isOwned(statusOf(p))
    const b = el('button', { title: `Diferencia de color ΔE ${dE.toFixed(1)}` })
    b.innerHTML = `
      <span class="sw" style="background:${p.hex}"></span>
      <span class="nm">${esc(p.name)}<small>${esc(brandById(p.brand).name)} · ${esc(p.code ?? p.range)}${owned ? ' · ✓ la tienes' : ''}</small></span>
      <span class="de">${owned ? '<b>✓</b> ' : ''}${similarity(dE)}</span>`
    b.addEventListener('click', () => hooks.openKey(itemKey(p)))
    list.append(el('li', {}, b))
  }
  eqSection.hidden = false
}

export function closeDetail() {
  if (modal.hidden) return
  modal.hidden = true
  viewer?.stop()
  current = null
  history.replaceState(null, '', location.pathname + location.search)
  hooks.onClose()
}
