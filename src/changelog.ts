import { el } from './dom'
import { saved, store } from './storage'

// Bienvenida en la primera visita y aviso de novedades cuando hay versiones nuevas.
// Para anunciar cambios, añade una entrada al principio de CHANGELOG con un id nuevo.

type Icon =
  | 'paint'
  | 'brush'
  | 'jar'
  | 'color'
  | 'palette'
  | 'compare'
  | 'backup'
  | 'check'
  | 'link'
  | 'search'
  | 'swap'
  | 'phone'
  | 'label'
  | 'mix'
  | 'stats'
  | 'scan'

interface Item {
  icon: Icon
  title: string
  text: string
}

interface Release {
  id: string
  date: string
  items: Item[]
}

export const CHANGELOG: Release[] = [
  {
    id: '2026-10-25',
    date: '25 de octubre de 2026',
    items: [
      {
        icon: 'mix',
        title: 'Mezclas',
        text: 'Mira qué sale al mezclar dos pinturas o qué mezcla de las tuyas se acerca al color que buscas.',
      },
      {
        icon: 'scan',
        title: 'Escanea tus botes',
        text: 'Enfoca la etiqueta con la cámara y márcala como «Lo tengo» de un toque.',
      },
      {
        icon: 'stats',
        title: 'Estadísticas',
        text: 'Cuántas tienes por marca y gama, y qué colores te faltan. Marca las que se acaban y saldrán en la lista de la compra.',
      },
      {
        icon: 'palette',
        title: 'Esquemas de pintado',
        text: 'En cada paleta indica qué va de base, sombra o luz y añade notas para repetir el ejército.',
      },
      {
        icon: 'paint',
        title: 'Imprimaciones y descatalogadas',
        text: 'Sprays e imprimaciones de varias marcas, y la gama antigua de Citadel con su sustituta actual.',
      },
    ],
  },
  {
    id: '2026-10-24',
    date: '24 de octubre de 2026',
    items: [
      {
        icon: 'paint',
        title: '23 marcas y más de 6.000 pinturas',
        text: 'Vallejo, AK, Army Painter, Monument, Scale75, Tamiya y muchas más, cada una con su bote y su etiqueta en 3D.',
      },
      {
        icon: 'brush',
        title: 'Pinceles',
        text: 'Catálogo nuevo con 11 marcas, de Citadel a Winsor & Newton, por talla y tipo de pelo.',
      },
      {
        icon: 'check',
        title: 'Tu colección y paletas',
        text: 'Marca lo que tienes y lo que quieres, y agrúpalo en paletas con lista de la compra.',
      },
      {
        icon: 'color',
        title: 'Encuentra el color',
        text: 'Equivalencias entre marcas, búsqueda por color o desde una foto, y comparación lado a lado.',
      },
      {
        icon: 'phone',
        title: 'Donde quieras',
        text: 'Instálala en el móvil, úsala sin conexión y comparte enlaces a pinturas y paletas.',
      },
    ],
  },
]

const SEEN_KEY = 'changelog-seen'
const OFF_KEY = 'changelog-off'

/** Novedades publicadas después de la última vez que el usuario las vio. */
export function pendingReleases(seen: string | null, off: boolean, list: Release[] = CHANGELOG): Release[] {
  // En la primera visita se muestra la bienvenida, no las novedades
  if (off || !seen) return []
  const i = list.findIndex((r) => r.id === seen)
  return i < 0 ? list : list.slice(0, i)
}

/** Bienvenida de la primera visita: qué es la web y cómo se usa. */
const WELCOME: Item[] = [
  {
    icon: 'paint',
    title: 'Explora más de 6.000 pinturas',
    text: 'Arrastra para moverte por los botes vistos desde arriba, usa la rueda o pellizca para hacer zoom y elige marca y gama arriba.',
  },
  {
    icon: 'label',
    title: 'Ábrelos en 3D',
    text: 'Toca un bote para verlo con su etiqueta, sus equivalencias en otras marcas y mezclas para conseguir su color.',
  },
  {
    icon: 'check',
    title: 'Lleva tu colección',
    text: 'Marca lo que tienes, lo que quieres y lo que se acaba. Se guarda en tu navegador y puedes hacer una copia.',
  },
  {
    icon: 'color',
    title: 'Herramientas',
    text: 'Busca por color o desde una foto, escanea tus botes, crea paletas con su esquema y compara pinturas.',
  },
]

const ICONS: Record<Icon, string> = {
  paint: '<path d="M8 3h8v3H8z"/><path d="M7 6h10l1 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9z"/><path d="M6 12h12"/>',
  brush: '<path d="M14 4l6 6-7 7-6-6z"/><path d="M7 11l-2 2c-1.5 1.5-1 4-3 6 3 0 5-.5 6.5-2l2-2"/>',
  jar: '<rect x="6" y="3" width="12" height="4" rx="1"/><path d="M7 7h10v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M7 12h10"/>',
  color: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  palette: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  compare: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  backup: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  swap: '<circle cx="8" cy="8" r="4"/><circle cx="16" cy="16" r="4"/><path d="M14 6h4v4M10 18H6v-4"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  label: '<path d="M4 4h9l7 7-9 9-7-7z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
  mix: '<circle cx="9" cy="10" r="5.5"/><circle cx="15" cy="10" r="5.5"/><path d="M12 15.5V21"/>',
  stats: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><rect x="9" y="7" width="6" height="10" rx="1.5"/>',
}

/** Tira decorativa de tapones de pintura. */
const CAP_COLORS = ['#9a1115', '#e3522b', '#f2b11c', '#52b244', '#1f8c9c', '#0d407f', '#7658a5', '#b74073', '#c4ae7e', '#888d8f']

function icon(name: Icon) {
  const span = el('span', { className: 'wn-icon' })
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`
  return span
}

const card = (it: Item) =>
  el('li', { className: 'wn-card' }, icon(it.icon), el('div', {}, el('b', { textContent: it.title }), el('p', { textContent: it.text })))

export function showChangelogIfNeeded() {
  const latest = CHANGELOG[0]?.id
  if (!latest) return
  const seen = saved(SEEN_KEY, '') || null
  const welcome = !seen
  const pending = pendingReleases(seen, saved(OFF_KEY, '') === '1')
  if (!welcome && !pending.length) return

  const logo = el('img', {
    src: `${import.meta.env.BASE_URL}images/the-painter-collection-claro.png`,
    alt: 'The Painter Collection',
    className: 'wn-logo',
  })
  const caps = el('div', { className: 'wn-caps', ariaHidden: 'true' })
  CAP_COLORS.forEach((c, i) => {
    const cap = el('span')
    cap.style.setProperty('--c', c)
    cap.style.animationDelay = `${i * 40}ms`
    caps.append(cap)
  })

  const never = el('input', { type: 'checkbox' })
  const ok = el('button', { className: 'wn-ok', textContent: welcome ? 'Empezar' : 'Entendido' })
  const close = () => {
    // Al cerrar se da todo por visto: solo volverá a salir cuando haya novedades nuevas
    store(SEEN_KEY, latest)
    if (never.checked) store(OFF_KEY, '1')
    overlay.classList.add('leaving')
    document.removeEventListener('keydown', onKey, true)
    setTimeout(() => overlay.remove(), 220)
  }
  const x = el('button', { className: 'wn-close', ariaLabel: 'Cerrar', textContent: '×' })
  x.addEventListener('click', close)

  const box = el(
    'div',
    { className: 'whatsnew', role: 'dialog', ariaLabel: welcome ? 'Bienvenida' : 'Novedades' },
    x,
    el(
      'header',
      { className: 'wn-head' },
      logo,
      el('h2', { textContent: welcome ? 'Bienvenido a tu colección de pinturas' : 'Esto es lo que ha cambiado' }),
      welcome
        ? el('p', { className: 'wn-sub', textContent: 'Todas las pinturas y pinceles de miniaturas en un mismo sitio.' })
        : el('span'),
      caps,
    ),
    el(
      'div',
      { className: 'wn-body' },
      ...(welcome
        ? [el('ul', { className: 'wn-grid wn-welcome' }, ...WELCOME.map(card))]
        : []),
      ...pending.map((r) =>
        el(
          'section',
          { className: 'wn-release' },
          el('h3', { textContent: r.date }),
          el(
            'ul',
            { className: 'wn-grid' },
            ...r.items.map(card),
          ),
        ),
      ),
    ),
    el(
      'footer',
      { className: 'wn-foot' },
      welcome
        ? el('span', { className: 'wn-hint', textContent: 'Te avisaremos aquí cuando haya novedades.' })
        : el('label', { className: 'cs-check' }, never, ' No avisarme de novedades'),
      ok,
    ),
  )
  box.setAttribute('aria-modal', 'true')
  const overlay = el('div', { className: 'whatsnew-overlay' }, box)
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopImmediatePropagation()
      close()
    }
  }
  ok.addEventListener('click', close)
  overlay.addEventListener('click', (e) => e.target === overlay && close())
  document.addEventListener('keydown', onKey, true)
  document.body.append(overlay)
  ok.focus()
}
