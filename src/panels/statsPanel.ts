import { BRANDS } from '../brands'
import { BRUSH_BRANDS, type Item, brushesOf } from '../brushes'
import { loadAllPaints } from '../catalog'
import { collectionSnapshot, isOwned, statusOf } from '../collection'
import { el } from '../dom'
import { type Paint, isDiscontinued } from '../paints'
import { COLOR_GROUPS, colorGroup } from '../stats'
import { type Panel, rerender } from './drawer'

// Estadísticas de la colección: totales, avance por marca y gama, y huecos de color.

const expanded = new Set<string>()

function bar(owned: number, total: number) {
  const b = el('div', { className: 'stat-bar' })
  const fill = el('span')
  fill.style.width = `${total ? (owned / total) * 100 : 0}%`
  b.append(fill)
  return b
}

export const statsPanel: Panel = {
  id: 'stats',
  title: 'Estadísticas',
  render(body) {
    const snap = Object.values(collectionSnapshot())
    const own = snap.filter((s) => isOwned(s)).length
    const totals = el('div', { className: 'stat-totals' })
    for (const [n, label] of [
      [own, 'tienes'],
      [snap.filter((s) => s === 'wish').length, 'quieres'],
      [snap.filter((s) => s === 'low').length, 'se acaban'],
    ] as const) {
      totals.append(el('div', {}, el('b', { textContent: String(n) }), el('span', { textContent: label })))
    }
    body.append(totals)
    if (!own) {
      body.append(el('p', { className: 'panel-help', textContent: 'Marca pinturas y pinceles como «Lo tengo» para ver aquí tu avance.' }))
    }

    const colors = el('section', {})
    const brands = el('section', {})
    body.append(colors, brands)

    loadAllPaints().then((all) => {
      const current = all.filter((p) => !isDiscontinued(p))
      const mine = current.filter((p) => isOwned(statusOf(p)))

      // Huecos de color
      const groups = new Map<string, Paint[]>()
      for (const p of mine) {
        const g = colorGroup(p)
        groups.set(g, [...(groups.get(g) ?? []), p])
      }
      colors.append(el('h3', { className: 'stat-title', textContent: 'Colores de tu colección' }))
      const grid = el('div', { className: 'stat-colors' })
      const missing: string[] = []
      for (const g of COLOR_GROUPS) {
        const list = groups.get(g.id) ?? []
        if (!list.length) missing.push(g.label.toLowerCase())
        const tile = el('div', { className: `stat-color${list.length ? '' : ' empty'}`, title: g.label })
        const sw = el('span', { className: 'sw' })
        // Muestra con los colores reales que tienes de ese grupo
        const cols = list.slice(0, 6).map((p) => p.hex)
        sw.style.background = cols.length
          ? `conic-gradient(${cols.map((c, i) => `${c} ${(i / cols.length) * 100}% ${((i + 1) / cols.length) * 100}%`).join(',')})`
          : g.sample
        tile.append(sw, el('b', { textContent: String(list.length) }), el('small', { textContent: g.label }))
        grid.append(tile)
      }
      colors.append(grid)
      if (own && missing.length) {
        colors.append(el('p', { className: 'stat-gap', textContent: `Te faltan: ${missing.join(', ')}.` }))
      }

      // Avance por marca y gama
      brands.append(el('h3', { className: 'stat-title', textContent: 'Por marca' }))
      type Row = { id: string; name: string; list: Item[]; owned: number }
      const rows: Row[] = BRANDS.map((b) => {
        const list = current.filter((p) => p.brand === b.id)
        return { id: b.id as string, name: b.name, list: list as Item[], owned: list.filter((p) => isOwned(statusOf(p))).length }
      })
        .filter((r) => r.owned > 0)
        .sort((a, b) => b.owned - a.owned)
      for (const b of BRUSH_BRANDS) {
        const list = brushesOf(b.id)
        const owned = list.filter((x) => isOwned(statusOf(x))).length
        if (owned) rows.push({ id: `brush-${b.id}`, name: `${b.name} (pinceles)`, list, owned })
      }
      if (!rows.length) brands.append(el('p', { className: 'muted', textContent: 'Aún no tienes nada marcado.' }))
      for (const r of rows) {
        const head = el('button', { className: 'stat-row' })
        head.append(
          el('span', { className: 'stat-name', textContent: `${expanded.has(r.id) ? '▾' : '▸'} ${r.name}` }),
          bar(r.owned, r.list.length),
          el('span', { className: 'stat-num', textContent: `${r.owned}/${r.list.length}` }),
        )
        head.addEventListener('click', () => {
          if (expanded.has(r.id)) expanded.delete(r.id)
          else expanded.add(r.id)
          rerender()
        })
        brands.append(head)
        if (expanded.has(r.id)) {
          const ranges = new Map<string, { total: number; owned: number }>()
          for (const it of r.list) {
            const x = ranges.get(it.range) ?? { total: 0, owned: 0 }
            x.total++
            if (isOwned(statusOf(it))) x.owned++
            ranges.set(it.range, x)
          }
          for (const [range, x] of ranges) {
            brands.append(
              el(
                'div',
                { className: 'stat-row sub' },
                el('span', { className: 'stat-name', textContent: range }),
                bar(x.owned, x.total),
                el('span', { className: 'stat-num', textContent: `${x.owned}/${x.total}` }),
              ),
            )
          }
        }
      }
    })
  },
}
