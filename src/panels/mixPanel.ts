import { loadAllPaints } from '../catalog'
import { isOwned, statusOf } from '../collection'
import { el } from '../dom'
import { deltaE2000, similarity } from '../match'
import { bestMixes, mixHex } from '../mixing'
import { type Paint, isDiscontinued } from '../paints'
import { mixRow, paintRow } from './rows'
import { type Panel, rerender } from './drawer'
import { paintPicker } from './picker'

// Mezclas: qué sale al mezclar dos pinturas, y qué mezcla de tus pinturas se acerca a un color.

let tab: 'mix' | 'target' = 'mix'
let a: Paint | null = null
let b: Paint | null = null
let t = 0.5
let target: Paint | null = null

/** Abre la pestaña «Conseguir un color» con esta pintura como objetivo. */
export function setMixTarget(p: Paint) {
  target = p
  tab = 'target'
}

export function mixPanel(openPaint: (p: Paint) => void): Panel {
  return {
    id: 'mix',
    title: 'Mezclas',
    render(body) {
      const tabs = el('div', { className: 'segmented panel-tabs' })
      for (const [id, label] of [
        ['mix', 'Mezclar dos'],
        ['target', 'Conseguir un color'],
      ] as const) {
        const btn = el('button', { textContent: label, className: tab === id ? 'on' : '' })
        btn.addEventListener('click', () => {
          tab = id
          rerender()
        })
        tabs.append(btn)
      }
      body.append(tabs)
      if (tab === 'mix') renderMix(body, openPaint)
      else renderTarget(body, openPaint)
    },
  }
}

function renderMix(body: HTMLElement, openPaint: (p: Paint) => void) {
  body.append(el('p', { className: 'panel-help', textContent: 'Elige dos pinturas y la proporción para ver qué color sale.' }))
  const result = el('div', { className: 'mix-result' })
  const near = el('ul', { className: 'item-list' })
  const slider = el('input', { type: 'range', min: '10', max: '90', step: '5', value: String(Math.round(t * 100)), className: 'mix-slider' })
  const label = el('div', { className: 'mix-slider-label' })

  async function update() {
    label.textContent = a && b ? `${Math.round(t * 100)} % ${a.name} · ${100 - Math.round(t * 100)} % ${b.name}` : ''
    result.replaceChildren()
    near.replaceChildren()
    if (!a || !b) {
      result.append(el('div', { className: 'compare-sw empty', textContent: 'Elige las dos pinturas' }))
      return
    }
    const hex = mixHex(a.hex, b.hex, t)
    const bar = el('div', { className: 'mix-bar' })
    bar.style.background = `linear-gradient(90deg, ${a.hex} 0 25%, ${hex} 25% 75%, ${b.hex} 75%)`
    result.append(bar, el('p', { className: 'compare-result' }, el('b', { textContent: hex.toUpperCase() }), ' · aproximado'))
    const all = (await loadAllPaints()).filter((p) => !isDiscontinued(p))
    const best = all
      .map((p) => ({ p, dE: deltaE2000(hex, p.hex) }))
      .sort((x, y) => x.dE - y.dE)
      .slice(0, 6)
    near.append(el('li', { className: 'list-title', textContent: 'Pinturas que se parecen al resultado' }))
    for (const { p, dE } of best) near.append(paintRow(p, similarity(dE), () => openPaint(p)))
  }

  slider.addEventListener('input', () => {
    t = Number(slider.value) / 100
    update()
  })
  body.append(
    paintPicker('Primera pintura…', a, (p) => {
      a = p
      update()
    }),
    paintPicker('Segunda pintura…', b, (p) => {
      b = p
      update()
    }),
    slider,
    label,
    result,
    near,
  )
  update()
}

function renderTarget(body: HTMLElement, openPaint: (p: Paint) => void) {
  body.append(
    el('p', {
      className: 'panel-help',
      textContent: 'Elige el color que quieres conseguir y te propongo mezclas con las pinturas que tienes.',
    }),
  )
  const list = el('ul', { className: 'item-list' })
  body.append(
    paintPicker('Color que quieres conseguir…', target, (p) => {
      target = p
      update()
    }),
    list,
  )

  async function update() {
    list.replaceChildren()
    if (!target) return
    const owned = (await loadAllPaints()).filter((p) => isOwned(statusOf(p)) && !isDiscontinued(p))
    if (owned.length < 2) {
      list.append(el('li', { className: 'muted', textContent: 'Marca al menos dos pinturas como «Lo tengo» para buscar mezclas.' }))
      return
    }
    const direct = owned
      .map((p) => ({ p, dE: deltaE2000(target!.hex, p.hex) }))
      .sort((x, y) => x.dE - y.dE)[0]
    if (direct && direct.dE < 3) {
      list.append(el('li', { className: 'list-title', textContent: 'Ya tienes una casi igual' }))
      list.append(paintRow(direct.p, similarity(direct.dE), () => openPaint(direct.p)))
    }
    list.append(el('li', { className: 'list-title', textContent: 'Mezclas con tus pinturas' }))
    for (const m of bestMixes(target.hex, owned, 6)) list.append(mixRow(m, openPaint))
  }
  update()
}
