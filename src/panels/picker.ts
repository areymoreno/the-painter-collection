import { brandById } from '../brands'
import { loadAllPaints } from '../catalog'
import { isOwned, statusOf } from '../collection'
import { el, esc } from '../dom'
import { type Paint, isDiscontinued } from '../paints'
import { searchItems } from '../search'

/** Buscador compacto de pinturas de todas las marcas, para elegir una en los paneles. */
export function paintPicker(placeholder: string, selected: Paint | null, onPick: (p: Paint) => void): HTMLElement {
  const wrap = el('div', { className: 'picker' })
  const chosen = el('div', { className: 'picker-chosen' })
  const input = el('input', { type: 'search', placeholder, className: 'text' })
  const list = el('ul', { className: 'picker-list', hidden: true })

  const showChosen = (p: Paint | null) => {
    chosen.replaceChildren()
    if (!p) return
    const sw = el('span', { className: 'sw' })
    sw.style.background = p.hex
    chosen.append(sw, el('span', {}, el('b', { textContent: p.name }), el('small', { textContent: ` ${brandById(p.brand).name} · ${p.code ?? p.range}` })))
  }
  showChosen(selected)

  input.addEventListener('input', async () => {
    const all = (await loadAllPaints()).filter((p) => !isDiscontinued(p))
    // Primero las que tienes
    const res = searchItems(all, input.value) as Paint[]
    res.sort((a, b) => Number(isOwned(statusOf(b))) - Number(isOwned(statusOf(a))))
    list.replaceChildren()
    list.hidden = !res.length
    for (const p of res.slice(0, 8)) {
      const li = el('li')
      li.innerHTML = `<span class="sw" style="background:${p.hex}"></span><span>${esc(p.name)} <small>${esc(brandById(p.brand).name)}${isOwned(statusOf(p)) ? ' · ✓' : ''}</small></span>`
      li.addEventListener('mousedown', (e) => {
        e.preventDefault()
        input.value = ''
        list.hidden = true
        showChosen(p)
        onPick(p)
      })
      list.append(li)
    }
  })
  input.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 100))
  wrap.append(chosen, input, list)
  return wrap
}
