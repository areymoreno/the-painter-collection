import { brandById } from '../brands'
import { type Item, brushBrandById, isBrush } from '../brushes'
import { loadIndex } from '../catalog'
import { isOwned, itemKey, statusOfKey } from '../collection'
import { el, esc } from '../dom'
import {
  allPalettes,
  createPalette,
  decodePalette,
  deletePalette,
  encodePalette,
  paletteById,
  type ItemMeta,
  ROLES,
  type Role,
  removePaletteItem,
  renamePalette,
  setItemMeta,
} from '../palettes'
import { type Panel, rerender } from './drawer'

// Paletas: listas por proyecto, con lista de la compra de lo que falta y enlace para compartir.

type View = { kind: 'list' } | { kind: 'detail'; id: string } | { kind: 'shared'; code: string }
let view: View = { kind: 'list' }

export const showPaletteList = () => (view = { kind: 'list' })
export const showPalette = (id: string) => (view = { kind: 'detail', id })
export const showSharedPalette = (code: string) => (view = { kind: 'shared', code })

const itemColor = (it: Item) => (isBrush(it) ? it.handle : it.hex)
const itemBrand = (it: Item) => (isBrush(it) ? brushBrandById(it.brand).name : brandById(it.brand).name)
const itemSub = (it: Item) => `${itemBrand(it)} · ${isBrush(it) ? `Talla ${it.size}` : (it.code ?? it.range)}`

function shareUrl(name: string, items: string[], meta?: Record<string, ItemMeta>) {
  return `${location.origin}${location.pathname}#/paleta/${encodePalette({ name, items, meta })}`
}

async function copy(text: string, btn: HTMLButtonElement, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    btn.textContent = '¡Copiado!'
    setTimeout(() => (btn.textContent = label), 1500)
  } catch {
    prompt('Copia esto:', text)
  }
}

export function palettesPanel(openKey: (key: string) => void): Panel {
  return {
    id: 'palettes',
    title: 'Paletas',
    render(body) {
      if (view.kind === 'detail' && !paletteById(view.id)) view = { kind: 'list' }
      if (view.kind === 'list') renderList(body)
      else if (view.kind === 'detail') renderDetail(body, view.id, openKey)
      else renderShared(body, view.code, openKey)
    },
  }
}

function renderList(body: HTMLElement) {
  body.append(
    el('p', {
      className: 'panel-help',
      textContent: 'Agrupa pinturas y pinceles por proyecto y anota el esquema: qué va de base, sombra, luz… Desde la ficha de cada uno, pulsa «+ Paleta».',
    }),
  )
  const name = el('input', { type: 'text', placeholder: 'Nueva paleta (p. ej. Ultramarines)', className: 'text' })
  const add = el('button', { className: 'btn primary', textContent: 'Crear' })
  const create = () => {
    if (!name.value.trim()) return name.focus()
    view = { kind: 'detail', id: createPalette(name.value).id }
    rerender()
  }
  add.addEventListener('click', create)
  name.addEventListener('keydown', (e) => e.key === 'Enter' && create())
  body.append(el('div', { className: 'cs-row' }, name, add))

  const list = el('ul', { className: 'item-list' })
  if (!allPalettes().length) list.append(el('li', { className: 'muted', textContent: 'Aún no tienes paletas.' }))
  for (const p of allPalettes()) {
    const own = p.items.filter((k) => isOwned(statusOfKey(k))).length
    const b = el('button', { className: 'item-row' })
    b.innerHTML = `
      <span class="sw stack"></span>
      <span class="nm">${esc(p.name)}<small>${p.items.length} artículos · te faltan ${p.items.length - own}</small></span>
      <span class="de">›</span>`
    // Mini muestra con los primeros colores
    loadIndex().then((idx) => {
      const colors = p.items.slice(0, 4).map((k) => idx.get(k)).filter(Boolean).map((it) => itemColor(it!))
      const sw = b.querySelector<HTMLElement>('.sw')!
      sw.style.background = colors.length
        ? `conic-gradient(${colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(',')})`
        : 'transparent'
    })
    b.addEventListener('click', () => {
      view = { kind: 'detail', id: p.id }
      rerender()
    })
    list.append(el('li', {}, b))
  }
  body.append(list)
}

const ROLE_ORDER = Object.keys(ROLES) as Role[]

function renderItems(
  body: HTMLElement,
  keys: string[],
  openKey: (key: string) => void,
  meta: Record<string, ItemMeta> = {},
  editing?: { remove(key: string): void; setMeta(key: string, m: ItemMeta): void },
) {
  const grid = el('div', { className: 'scheme' })
  const shop = el('ul', { className: 'item-list' })
  const shopBox = el('section', { className: 'shopping', hidden: true })
  const copyShop = el('button', { className: 'btn small', textContent: 'Copiar lista' })
  const copyScheme = el('button', { className: 'btn small', textContent: 'Copiar esquema' })
  shopBox.append(el('h3', {}, 'Lista de la compra ', copyShop), shop)
  body.append(grid, shopBox)

  loadIndex().then((idx) => {
    if (!keys.length) grid.append(el('p', { className: 'muted', textContent: 'Paleta vacía.' }))
    const missing: Item[] = []
    // Agrupadas por papel en el esquema (imprimación → base → sombra → …), al final las sin asignar
    const groups = new Map<Role | '', string[]>()
    for (const k of keys) {
      const r = meta[k]?.role ?? ''
      groups.set(r, [...(groups.get(r) ?? []), k])
    }
    const order: (Role | '')[] = [...ROLE_ORDER, '']
    const lines: string[] = []
    for (const role of order) {
      const ks = groups.get(role)
      if (!ks?.length) continue
      const title = role ? ROLES[role] : groups.size > 1 ? 'Sin asignar' : ''
      if (title) grid.append(el('h4', { className: 'scheme-title', textContent: title }))
      const ul = el('ul', { className: 'item-list' })
      for (const k of ks) {
        const it = idx.get(k)
        if (!it) continue
        const own = isOwned(statusOfKey(k))
        const low = statusOfKey(k) === 'low'
        if (!own || low) missing.push(it)
        lines.push(`${role ? `${ROLES[role]}: ` : ''}${it.name} (${itemSub(it)})${meta[k]?.note ? ` — ${meta[k].note}` : ''}`)

        const row = el('div', { className: 'item-row' })
        const open = el('button', { className: 'row-main' })
        open.innerHTML = `
          <span class="sw" style="background:${itemColor(it)}"></span>
          <span class="nm">${esc(it.name)}<small>${esc(itemSub(it))}</small></span>
          <span class="de">${low ? '<b class="low">se acaba</b>' : own ? '<b>✓ la tengo</b>' : statusOfKey(k) === 'wish' ? '♥' : ''}</span>`
        open.addEventListener('click', () => openKey(k))
        row.append(open)
        if (editing) {
          const x = el('button', { className: 'row-x', title: 'Quitar de la paleta', textContent: '×' })
          x.addEventListener('click', () => editing.remove(k))
          row.append(x)
        }
        const li = el('li', {}, row)
        if (editing) {
          const sel = el('select', { className: 'scheme-role' })
          sel.add(new Option('Papel…', ''))
          for (const r of ROLE_ORDER) sel.add(new Option(ROLES[r], r))
          sel.value = meta[k]?.role ?? ''
          sel.addEventListener('change', () => editing.setMeta(k, { role: (sel.value || undefined) as Role | undefined }))
          const note = el('input', { type: 'text', className: 'scheme-note', placeholder: 'Nota (p. ej. 2 capas, diluida)', value: meta[k]?.note ?? '' })
          note.addEventListener('change', () => editing.setMeta(k, { note: note.value }))
          li.append(el('div', { className: 'scheme-edit' }, sel, note))
        } else if (meta[k]?.note) {
          li.append(el('p', { className: 'scheme-noteview', textContent: meta[k].note! }))
        }
        ul.append(li)
      }
      grid.append(ul)
    }
    if (keys.length) {
      grid.append(el('div', { className: 'cs-row' }, copyScheme))
      copyScheme.addEventListener('click', () => copy(lines.join('\n'), copyScheme, 'Copiar esquema'))
    }
    shopBox.hidden = !missing.length
    for (const it of missing) {
      const dot = el('span', { className: 'dot' })
      dot.style.background = itemColor(it)
      shop.append(el('li', { className: 'shop-item' }, dot, `${it.name} — ${itemSub(it)}${statusOfKey(itemKey(it)) === 'low' ? ' (se acaba)' : ''}`))
    }
    copyShop.addEventListener('click', () =>
      copy(missing.map((it) => `• ${it.name} (${itemSub(it)})`).join('\n'), copyShop, 'Copiar lista'),
    )
  })
}

function renderDetail(body: HTMLElement, id: string, openKey: (key: string) => void) {
  const p = paletteById(id)!
  const back = el('button', { className: 'btn link', textContent: '‹ Todas las paletas' })
  back.addEventListener('click', () => {
    view = { kind: 'list' }
    rerender()
  })
  const name = el('input', { type: 'text', value: p.name, className: 'text title-input' })
  name.addEventListener('change', () => renamePalette(id, name.value))

  const share = el('button', { className: 'btn', textContent: 'Copiar enlace' })
  share.addEventListener('click', () => copy(shareUrl(p.name, p.items, p.meta), share, 'Copiar enlace'))
  const del = el('button', { className: 'btn danger', textContent: 'Borrar paleta' })
  del.addEventListener('click', () => {
    if (!confirm(`¿Borrar la paleta «${p.name}»?`)) return
    deletePalette(id)
    view = { kind: 'list' }
    rerender()
  })

  body.append(back, name, el('div', { className: 'cs-row' }, share, del))
  renderItems(body, p.items, openKey, p.meta, {
    remove: (k) => removePaletteItem(id, k),
    setMeta: (k, m) => setItemMeta(id, k, m),
  })
}

function renderShared(body: HTMLElement, code: string, openKey: (key: string) => void) {
  const data = decodePalette(code)
  if (!data) {
    body.append(el('p', { className: 'muted', textContent: 'El enlace de la paleta no es válido.' }))
    return
  }
  const save = el('button', { className: 'btn primary', textContent: 'Guardar en mis paletas' })
  save.addEventListener('click', () => {
    view = { kind: 'detail', id: createPalette(data.name, data.items, data.meta).id }
    history.replaceState(null, '', location.pathname + location.search)
    rerender()
  })
  body.append(
    el('p', { className: 'panel-help', textContent: 'Te han compartido esta paleta:' }),
    el('h3', { className: 'shared-title', textContent: data.name }),
    el('div', { className: 'cs-row' }, save),
  )
  renderItems(body, data.items, openKey, data.meta)
}
