import { el } from './dom'
import { saved, store } from './storage'

// Aviso de novedades al entrar después de una actualización.
// Para anunciar cambios, añade una entrada al principio de CHANGELOG con un id nuevo.

interface Release {
  id: string
  date: string
  items: string[]
}

export const CHANGELOG: Release[] = [
  {
    id: '2026-10-25',
    date: '25 de octubre de 2026',
    items: [
      '11 marcas nuevas de pinturas: AMMO by Mig, AK Real Colors, Foundry, Coat d’Arms, Warcolours, Tamiya, Mr. Hobby, Humbrol, Revell, Italeri y Mission Models.',
      'Nuevos envases: tarros de cristal con tapón de rosca y latas de Revell.',
      'Pinceles de Rosemary & Co, da Vinci, Monument, Squidmar, Vallejo y Princeton.',
    ],
  },
  {
    id: '2026-10-24',
    date: '24 de octubre de 2026',
    items: [
      'Buscar por color, también desde una foto.',
      'Paletas con lista de la compra y enlace para compartir.',
      'Comparar dos pinturas o pinceles lado a lado.',
      'Copia de seguridad de tu colección y uso sin conexión.',
    ],
  },
]

const SEEN_KEY = 'changelog-seen'
const OFF_KEY = 'changelog-off'

/** Novedades que el usuario aún no ha visto (vacío en la primera visita o si las desactivó). */
export function pendingReleases(seen: string | null, off: boolean): Release[] {
  if (off || !seen) return []
  const i = CHANGELOG.findIndex((r) => r.id === seen)
  return i < 0 ? CHANGELOG : CHANGELOG.slice(0, i)
}

export function showChangelogIfNeeded() {
  const latest = CHANGELOG[0]?.id
  if (!latest) return
  const seen = saved(SEEN_KEY, '') || null
  const pending = pendingReleases(seen, saved(OFF_KEY, '') === '1')
  // En la primera visita no hay nada «nuevo»: se marca como visto
  if (!seen) store(SEEN_KEY, latest)
  if (!pending.length) return

  const never = el('input', { type: 'checkbox' })
  const ok = el('button', { className: 'btn primary', textContent: 'Entendido' })
  const box = el(
    'div',
    { className: 'whatsnew', role: 'dialog', ariaLabel: 'Novedades' },
    el('h2', { textContent: '¡Hay novedades!' }),
    ...pending.map((r) =>
      el(
        'section',
        {},
        el('h3', { textContent: r.date }),
        el('ul', {}, ...r.items.map((t) => el('li', { textContent: t }))),
      ),
    ),
    el('div', { className: 'whatsnew-foot' }, el('label', { className: 'cs-check' }, never, ' No volver a mostrar'), ok),
  )
  box.setAttribute('aria-modal', 'true')
  const overlay = el('div', { className: 'whatsnew-overlay' }, box)
  const close = () => {
    store(SEEN_KEY, latest)
    if (never.checked) store(OFF_KEY, '1')
    overlay.classList.add('leaving')
    document.removeEventListener('keydown', onKey, true)
    setTimeout(() => overlay.remove(), 200)
  }
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
