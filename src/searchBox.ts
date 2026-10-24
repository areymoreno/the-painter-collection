import { type Item, isBrush } from './brushes'
import { statusOf } from './collection'
import { esc } from './dom'
import { matcher, searchItems } from './search'

// Buscador de la cabecera con desplegable de resultados y navegación con teclado.

interface SearchBoxOptions {
  input: HTMLInputElement
  results: HTMLUListElement
  /** Artículos visibles en la cuadrícula (donde se busca) */
  items: () => Item[]
  onHighlight(fn: ((it: Item) => boolean) | null): void
  onFocus(it: Item): void
  onPick(it: Item): void
}

const MAX_RESULTS = 8

export function initSearchBox({ input, results, items, onHighlight, onFocus, onPick }: SearchBoxOptions) {
  let matches: Item[] = []
  let active = 0

  function apply() {
    onHighlight(matcher(input.value))
    matches = searchItems(items(), input.value)
    active = 0
    render()
    if (matches[0]) onFocus(matches[0])
  }

  function render() {
    const open = document.activeElement === input && input.value.trim() !== ''
    results.hidden = !open
    input.setAttribute('aria-expanded', String(open))
    if (!open) return
    results.replaceChildren()
    if (!matches.length) {
      results.innerHTML = `<li class="more">Sin resultados en esta marca</li>`
      return
    }
    matches.slice(0, MAX_RESULTS).forEach((it, i) => {
      const li = document.createElement('li')
      li.role = 'option'
      li.classList.toggle('active', i === active)
      const color = isBrush(it) ? it.handle : it.hex
      const st = statusOf(it)
      li.innerHTML = `
        <span class="sw" style="background:${color}"></span>
        <span class="nm">${esc(it.name)}${st ? `<span class="st">${st === 'own' ? '✓' : '♥'}</span>` : ''}</span>
        <span class="meta">${esc(it.range)}${isBrush(it) ? ` · ${esc(it.size)}` : it.code ? ` · ${esc(it.code)}` : ''}</span>`
      // mousedown para que el input no pierda el foco antes del clic
      li.addEventListener('mousedown', (e) => {
        e.preventDefault()
        pick(it)
      })
      li.addEventListener('mouseenter', () => {
        active = i
        onFocus(it)
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

  function pick(it: Item) {
    input.blur()
    onFocus(it)
    onPick(it)
  }

  input.addEventListener('input', apply)
  input.addEventListener('focus', render)
  input.addEventListener('blur', () => setTimeout(render, 0))
  input.addEventListener('keydown', (e) => {
    const shown = Math.min(matches.length, MAX_RESULTS)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!shown) return
      e.preventDefault()
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + shown) % shown
      onFocus(matches[active])
      render()
    } else if (e.key === 'Enter') {
      if (matches[active]) pick(matches[active])
    } else if (e.key === 'Escape') {
      if (!results.hidden && input.value) {
        input.value = ''
        apply()
      }
      input.blur()
    }
  })

  return { apply }
}
