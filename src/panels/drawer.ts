import { $ } from '../dom'

// Panel lateral (en móvil, hoja inferior) donde se abren las herramientas.

export interface Panel {
  id: string
  title: string
  render(body: HTMLElement): void
}

const drawer = $('drawer')
const title = $('drawer-title')
const body = $('drawer-body')
let current: Panel | null = null
const openListeners = new Set<(id: string | null) => void>()

export const drawerPanel = () => current?.id ?? null

export function onDrawerChange(fn: (id: string | null) => void) {
  openListeners.add(fn)
}

export function openPanel(panel: Panel) {
  current = panel
  title.textContent = panel.title
  drawer.hidden = false
  rerender()
  for (const fn of openListeners) fn(panel.id)
}

/** Vuelve a pintar el panel abierto (tras cambios en la colección, paletas…). */
export function rerender() {
  if (!current || drawer.hidden) return
  const scroll = body.scrollTop
  body.replaceChildren()
  current.render(body)
  body.scrollTop = scroll
}

export function closeDrawer() {
  drawer.hidden = true
  current = null
  for (const fn of openListeners) fn(null)
}

$('drawer-close').addEventListener('click', closeDrawer)
