import { brandById, BRANDS } from '../brands'
import { loadAllPaints } from '../catalog'
import { statusOf } from '../collection'
import { el, esc } from '../dom'
import { deltaE2000, similarity } from '../match'
import type { Paint } from '../paints'
import { type Panel, rerender } from './drawer'

// Buscar por color: eliges un color (o lo tomas de una foto) y salen las pinturas más parecidas.

let color = '#9a1115'
let image: HTMLImageElement | null = null
let picked: { x: number; y: number } | null = null
let brandFilter = ''
let onlyOwned = false

export function setSearchColor(hex: string) {
  color = hex
}

export function colorSearchPanel(openPaint: (p: Paint) => void): Panel {
  return {
    id: 'color',
    title: 'Buscar por color',
    render(body) {
      const picker = el('input', { type: 'color', value: color, className: 'cs-picker' })
      const hex = el('input', { type: 'text', value: color.toUpperCase(), className: 'cs-hex', maxLength: 7 })
      const file = el('input', { type: 'file', accept: 'image/*', hidden: true })
      const upload = el('button', { className: 'btn', textContent: image ? 'Cambiar foto' : 'Subir una foto' })
      upload.addEventListener('click', () => file.click())

      const setColor = (c: string) => {
        color = c.toLowerCase()
        picker.value = color
        hex.value = color.toUpperCase()
        renderResults()
      }
      picker.addEventListener('input', () => setColor(picker.value))
      hex.addEventListener('change', () => {
        const v = hex.value.trim().replace(/^#?/, '#')
        if (/^#[0-9a-f]{6}$/i.test(v)) setColor(v)
        else hex.value = color.toUpperCase()
      })
      file.addEventListener('change', () => {
        const f = file.files?.[0]
        if (!f) return
        const img = new Image()
        img.onload = () => {
          image = img
          picked = null
          rerender()
        }
        img.src = URL.createObjectURL(f)
      })

      body.append(
        el('p', { className: 'panel-help', textContent: 'Elige un color o sube una foto de una miniatura y toca el punto que quieras igualar.' }),
        el('div', { className: 'cs-row' }, picker, hex, upload, file),
      )

      if (image) {
        const canvas = el('canvas', { className: 'cs-photo' })
        const scale = Math.min(1, 900 / image.naturalWidth)
        canvas.width = Math.round(image.naturalWidth * scale)
        canvas.height = Math.round(image.naturalHeight * scale)
        const g = canvas.getContext('2d', { willReadFrequently: true })!
        const draw = () => {
          g.drawImage(image!, 0, 0, canvas.width, canvas.height)
          if (picked) {
            g.lineWidth = 3
            g.strokeStyle = '#fff'
            g.beginPath()
            g.arc(picked.x, picked.y, 12, 0, Math.PI * 2)
            g.stroke()
            g.strokeStyle = '#000'
            g.lineWidth = 1.5
            g.stroke()
          }
        }
        draw()
        canvas.addEventListener('click', (e) => {
          const r = canvas.getBoundingClientRect()
          const x = ((e.clientX - r.left) / r.width) * canvas.width
          const y = ((e.clientY - r.top) / r.height) * canvas.height
          picked = null
          draw()
          // Media de un cuadrado de 7×7 px para evitar ruido
          const d = g.getImageData(Math.max(0, x - 3), Math.max(0, y - 3), 7, 7).data
          let rs = 0, gs = 0, bs = 0, n = 0
          for (let i = 0; i < d.length; i += 4) {
            rs += d[i]
            gs += d[i + 1]
            bs += d[i + 2]
            n++
          }
          const to = (v: number) => Math.round(v / n).toString(16).padStart(2, '0')
          picked = { x, y }
          draw()
          setColor(`#${to(rs)}${to(gs)}${to(bs)}`)
        })
        body.append(canvas)
      }

      const brandSel = el('select', { className: 'cs-brand' })
      brandSel.add(new Option('Todas las marcas', ''))
      for (const b of BRANDS) brandSel.add(new Option(b.name, b.id))
      brandSel.value = brandFilter
      brandSel.addEventListener('change', () => {
        brandFilter = brandSel.value
        renderResults()
      })
      const owned = el('input', { type: 'checkbox', checked: onlyOwned })
      owned.addEventListener('change', () => {
        onlyOwned = owned.checked
        renderResults()
      })
      body.append(el('div', { className: 'cs-row' }, brandSel, el('label', { className: 'cs-check' }, owned, ' Solo las que tengo')))

      const list = el('ul', { className: 'item-list' })
      body.append(list)

      async function renderResults() {
        const target = color
        const all = await loadAllPaints()
        if (target !== color) return
        const pool = all.filter((p) => (!brandFilter || p.brand === brandFilter) && (!onlyOwned || statusOf(p) === 'own'))
        const best = pool
          .map((p) => ({ p, dE: deltaE2000(target, p.hex) }))
          .sort((a, b) => a.dE - b.dE)
          .slice(0, 15)
        list.replaceChildren()
        if (!best.length) {
          list.append(el('li', { className: 'muted', textContent: onlyOwned ? 'No tienes pinturas marcadas en esta selección.' : 'Sin resultados.' }))
        }
        for (const { p, dE } of best) list.append(paintRow(p, similarity(dE), () => openPaint(p), `ΔE ${dE.toFixed(1)}`))
      }
      renderResults()
    },
  }
}

/** Fila de pintura reutilizada por los paneles. */
export function paintRow(p: Paint, right: string, onClick: () => void, title = ''): HTMLLIElement {
  const own = statusOf(p) === 'own'
  const b = el('button', { className: 'item-row', title })
  b.innerHTML = `
    <span class="sw" style="background:${p.hex}"></span>
    <span class="nm">${esc(p.name)}<small>${esc(brandById(p.brand).name)} · ${esc(p.code ?? p.range)}</small></span>
    <span class="de">${own ? '<b>✓</b> ' : ''}${esc(right)}</span>`
  b.addEventListener('click', onClick)
  return el('li', {}, b)
}
