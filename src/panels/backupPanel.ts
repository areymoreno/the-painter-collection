import { applyBackup, downloadBackup, parseBackup } from '../backup'
import { collectionSnapshot } from '../collection'
import { el } from '../dom'
import { allPalettes } from '../palettes'
import { type Panel, rerender } from './drawer'

// Exportar e importar la colección y las paletas.

let message = ''

export const backupPanel: Panel = {
  id: 'backup',
  title: 'Copia de seguridad',
  render(body) {
    const snap = Object.values(collectionSnapshot())
    const own = snap.filter((s) => s === 'own').length
    const wish = snap.length - own
    body.append(
      el('p', {
        className: 'panel-help',
        textContent:
          'Tu colección se guarda solo en este navegador. Descarga una copia para no perderla o para pasarla a otro dispositivo.',
      }),
      el('p', { className: 'backup-stats', textContent: `${own} que tienes · ${wish} en deseos · ${allPalettes().length} paletas` }),
    )

    const exp = el('button', { className: 'btn primary', textContent: 'Descargar copia (.json)' })
    exp.addEventListener('click', downloadBackup)

    const file = el('input', { type: 'file', accept: 'application/json,.json', hidden: true })
    const replace = el('input', { type: 'checkbox' })
    const imp = el('button', { className: 'btn', textContent: 'Importar copia…' })
    imp.addEventListener('click', () => file.click())
    file.addEventListener('change', async () => {
      const f = file.files?.[0]
      if (!f) return
      try {
        const backup = parseBackup(await f.text())
        if (replace.checked && !confirm('Se sustituirá tu colección actual por la del archivo. ¿Seguir?')) return
        const n = applyBackup(backup, replace.checked)
        message = `Importado: ${n} marcas actualizadas.`
      } catch (e) {
        message = (e as Error).message
      }
      rerender()
    })

    body.append(
      el('div', { className: 'cs-row' }, exp),
      el('div', { className: 'cs-row' }, imp, file),
      el('label', { className: 'cs-check' }, replace, ' Sustituir en vez de combinar'),
    )
    if (message) body.append(el('p', { className: 'backup-msg', textContent: message }))
    message = ''
  },
}
