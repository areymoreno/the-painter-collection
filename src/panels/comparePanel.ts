import { brandById } from '../brands'
import { HAIR_LABEL, SHAPE_LABEL, type Item, brushBrandById, isBrush } from '../brushes'
import { itemKey, statusOf } from '../collection'
import { el, esc } from '../dom'
import { deltaE2000, similarity } from '../match'
import { hexToHsl } from '../paints'
import { type Panel, rerender } from './drawer'

// Comparar dos artículos lado a lado.

const slots: Item[] = []
const listeners = new Set<() => void>()

export const compareItems = (): readonly Item[] => slots
export const inCompare = (it: Item) => slots.some((s) => itemKey(s) === itemKey(it))

export function onCompareChange(fn: () => void) {
  listeners.add(fn)
}

function changed() {
  for (const fn of listeners) fn()
  rerender()
}

/** Añade o quita un artículo. Con dos ya elegidos, el más antiguo deja su sitio. */
export function toggleCompare(it: Item) {
  const i = slots.findIndex((s) => itemKey(s) === itemKey(it))
  if (i >= 0) slots.splice(i, 1)
  else {
    slots.push(it)
    if (slots.length > 2) slots.shift()
  }
  changed()
}

const color = (it: Item) => (isBrush(it) ? it.handle : it.hex)

function facts(it: Item): [string, string][] {
  if (isBrush(it)) {
    return [
      ['Marca', brushBrandById(it.brand).name],
      ['Gama', it.range],
      ['Talla', it.size],
      ['Forma', SHAPE_LABEL[it.shape]],
      ['Pelo', HAIR_LABEL[it.hair]],
      ['Penacho', `${it.width} × ${it.length} mm`],
    ]
  }
  const n = parseInt(it.hex.slice(1), 16)
  const [h, s, l] = hexToHsl(it.hex)
  return [
    ['Marca', brandById(it.brand).name],
    ['Gama', it.range],
    ...(it.code ? ([['Código', it.code]] as [string, string][]) : []),
    ['Hex', it.hex.toUpperCase()],
    ['RGB', `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`],
    ['HSL', `${Math.round(h)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`],
  ]
}

export function comparePanel(openItem: (it: Item) => void): Panel {
  return {
    id: 'compare',
    title: 'Comparar',
    render(body) {
      if (!slots.length) {
        body.append(
          el('p', {
            className: 'panel-help',
            textContent: 'Abre una pintura o un pincel y pulsa «⇄ Comparar». Después elige otro para verlos lado a lado.',
          }),
        )
        return
      }
      const cols = el('div', { className: 'compare' })
      for (let i = 0; i < 2; i++) {
        const it = slots[i]
        const col = el('div', { className: 'compare-col' })
        if (!it) {
          col.append(el('div', { className: 'compare-sw empty', textContent: 'Elige otro artículo' }))
        } else {
          const sw = el('button', { className: 'compare-sw', title: 'Abrir ficha' })
          sw.style.background = color(it)
          sw.addEventListener('click', () => openItem(it))
          const own = statusOf(it)
          const name = el('h3', {})
          name.innerHTML = `${esc(it.name)}${own ? ` <span class="st">${own === 'own' ? '✓' : '♥'}</span>` : ''}`
          const dl = el('dl', {})
          for (const [k, v] of facts(it)) dl.append(el('dt', { textContent: k }), el('dd', { textContent: v }))
          const remove = el('button', { className: 'btn small', textContent: 'Quitar' })
          remove.addEventListener('click', () => toggleCompare(it))
          col.append(sw, name, dl, remove)
        }
        cols.append(col)
      }
      body.append(cols)

      const [a, b] = slots
      if (a && b && !isBrush(a) && !isBrush(b)) {
        const dE = deltaE2000(a.hex, b.hex)
        const bar = el('div', { className: 'compare-split' })
        bar.style.background = `linear-gradient(90deg, ${a.hex} 50%, ${b.hex} 50%)`
        body.append(
          bar,
          el('p', { className: 'compare-result' }, el('b', { textContent: similarity(dE) }), ` · diferencia de color ΔE ${dE.toFixed(1)}`),
          el('p', { className: 'panel-help', textContent: 'ΔE < 2: casi idénticas · 2–5: muy parecidas · 5–10: parecidas.' }),
        )
      }
    },
  }
}
