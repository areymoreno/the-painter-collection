import { brandById } from './brands'
import { HAIR_LABEL, SHAPE_LABEL, type Item, brushBrandById, isBrush } from './brushes'
import { loadAllPaints } from './catalog'
import { itemKey, statusOf, toggleStatus } from './collection'
import { $, el, esc } from './dom'
import { equivalents, similarity } from './match'
import { luminance } from './paints'
import { allPalettes, createPalette, togglePaletteItem } from './palettes'
import { inCompare, toggleCompare } from './panels/comparePanel'
import type { PotViewer } from './pot3d'

// Ficha de un artículo: modelo 3D, datos, colección, paletas, comparar y equivalencias.

interface DetailHooks {
  step(dir: number): void
  openKey(key: string): void
  onClose(): void
}

const modal = $('modal')
const panel = $('modal-panel')
const btnOwn = $<HTMLButtonElement>('btn-own')
const btnWish = $<HTMLButtonElement>('btn-wish')
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
  btnOwn.classList.toggle('on', s === 'own')
  btnWish.classList.toggle('on', s === 'wish')
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
    eqSection.hidden = true
    return
  }
  const catalog = await loadAllPaints()
  if (current !== it) return
  list.replaceChildren()
  for (const { paint: p, dE } of equivalents(it, catalog, 5)) {
    const owned = statusOf(p) === 'own'
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
