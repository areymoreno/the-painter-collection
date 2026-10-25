import { brandById } from '../brands'
import { isOwned, statusOf } from '../collection'
import { el, esc } from '../dom'
import { similarity } from '../match'
import { type Mix, ratioLabel } from '../mixing'
import type { Paint } from '../paints'

// Filas reutilizadas por los paneles.

/** Fila de pintura reutilizada por los paneles. */
export function paintRow(p: Paint, right: string, onClick: () => void, title = ''): HTMLLIElement {
  const own = isOwned(statusOf(p))
  const b = el('button', { className: 'item-row', title })
  b.innerHTML = `
    <span class="sw" style="background:${p.hex}"></span>
    <span class="nm">${esc(p.name)}<small>${esc(brandById(p.brand).name)} · ${esc(p.code ?? p.range)}</small></span>
    <span class="de">${own ? '<b>✓</b> ' : ''}${esc(right)}</span>`
  b.addEventListener('click', onClick)
  return el('li', {}, b)
}

/** Fila con las dos pinturas de una mezcla, su proporción y el resultado. */
export function mixRow(m: Mix, onOpen: (p: Paint) => void): HTMLLIElement {
  const li = el('li', { className: 'mix-row' })
  const part = (p: Paint) => {
    const btn = el('button', { className: 'mix-part', title: 'Abrir ficha' })
    btn.innerHTML = `<span class="sw" style="background:${p.hex}"></span><span>${esc(p.name)}<small>${esc(brandById(p.brand).name)}</small></span>`
    btn.addEventListener('click', () => onOpen(p))
    return btn
  }
  const res = el('span', { className: 'sw big', title: m.hex })
  res.style.background = m.hex
  li.append(
    part(m.a),
    el('span', { className: 'mix-ratio', textContent: ratioLabel(m.t) }),
    part(m.b),
    el('span', { className: 'mix-eq', textContent: '=' }),
    res,
    el('span', { className: 'mix-de', textContent: similarity(m.dE) }),
  )
  return li
}
