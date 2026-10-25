import { BRANDS } from '../brands'
import { loadAllPaints } from '../catalog'
import { isOwned, statusOf, toggleStatus } from '../collection'
import { el } from '../dom'
import { deltaE2000, similarity } from '../match'
import { type Paint, isDiscontinued } from '../paints'
import { matchLabelText } from '../scan'
import { type Panel } from './drawer'
import { paintRow } from './rows'

// Escanear un bote con la cámara (o una foto): lee la etiqueta y marca la pintura de un toque.

let stream: MediaStream | null = null

export function stopScan() {
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
}

export function scanPanel(openPaint: (p: Paint) => void): Panel {
  return {
    id: 'scan',
    title: 'Escanear un bote',
    render(body) {
      body.append(
        el('p', {
          className: 'panel-help',
          textContent: 'Enfoca la etiqueta con buena luz, con el nombre o el código bien visibles. Funciona mejor con el bote de frente.',
        }),
      )
      const video = el('video', { className: 'scan-video', autoplay: true, playsInline: true, muted: true, hidden: true })
      const canvas = el('canvas', { className: 'cs-photo', hidden: true })
      const status = el('p', { className: 'scan-status' })
      const results = el('ul', { className: 'item-list' })
      const camBtn = el('button', { className: 'btn primary', textContent: 'Usar la cámara' })
      const shotBtn = el('button', { className: 'btn primary', textContent: 'Capturar', hidden: true })
      const file = el('input', { type: 'file', accept: 'image/*', hidden: true })
      const upload = el('button', { className: 'btn', textContent: 'Subir una foto' })
      upload.addEventListener('click', () => file.click())

      camBtn.addEventListener('click', async () => {
        try {
          stopScan()
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } } })
          video.srcObject = stream
          video.hidden = false
          canvas.hidden = true
          shotBtn.hidden = false
          camBtn.hidden = true
          status.textContent = ''
        } catch {
          status.textContent = 'No se ha podido abrir la cámara. Prueba a subir una foto.'
        }
      })
      shotBtn.addEventListener('click', () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')!.drawImage(video, 0, 0)
        stopScan()
        video.hidden = true
        shotBtn.hidden = true
        camBtn.hidden = false
        camBtn.textContent = 'Escanear otro'
        analyse()
      })
      file.addEventListener('change', () => {
        const f = file.files?.[0]
        if (!f) return
        const img = new Image()
        img.onload = () => {
          const scale = Math.min(1, 1600 / img.naturalWidth)
          canvas.width = Math.round(img.naturalWidth * scale)
          canvas.height = Math.round(img.naturalHeight * scale)
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          analyse()
        }
        img.src = URL.createObjectURL(f)
      })

      async function analyse() {
        canvas.hidden = false
        results.replaceChildren()
        status.textContent = 'Leyendo la etiqueta…'
        const all = (await loadAllPaints()).filter((p) => !isDiscontinued(p))

        // Color del centro de la imagen, por si el texto no se lee
        const g = canvas.getContext('2d', { willReadFrequently: true })!
        const w = Math.round(canvas.width * 0.12)
        const d = g.getImageData(Math.round(canvas.width / 2 - w / 2), Math.round(canvas.height / 2 - w / 2), w, w).data
        let r = 0, gg = 0, b = 0
        for (let i = 0; i < d.length; i += 4) {
          r += d[i]
          gg += d[i + 1]
          b += d[i + 2]
        }
        const n = d.length / 4
        const hex = '#' + [r, gg, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')

        let text = ''
        try {
          const { createWorker } = await import('tesseract.js')
          const worker = await createWorker('eng')
          text = (await worker.recognize(canvas)).data.text
          await worker.terminate()
        } catch {
          status.textContent = 'No se ha podido leer el texto (¿sin conexión?). Te enseño las más parecidas por color.'
        }
        const names = Object.fromEntries(BRANDS.map((x) => [x.id, x.name]))
        const found = matchLabelText(text, all, names)
        results.replaceChildren()
        if (found.length) {
          status.textContent = found.length === 1 ? 'He encontrado esta pintura:' : '¿Es alguna de estas?'
          for (const { paint } of found) results.append(scanRow(paint, openPaint))
        } else if (text) {
          status.textContent = 'No reconozco el texto de la etiqueta. Estas son las más parecidas por color:'
        }
        if (!found.length) {
          const near = all
            .map((p) => ({ p, dE: deltaE2000(hex, p.hex) }))
            .sort((a, b) => a.dE - b.dE)
            .slice(0, 5)
          for (const { p, dE } of near) results.append(paintRow(p, similarity(dE), () => openPaint(p)))
        }
      }

      body.append(el('div', { className: 'cs-row' }, camBtn, shotBtn, upload, file), video, canvas, status, results)
    },
  }
}

/** Fila con botón para marcarla como «Lo tengo» directamente. */
function scanRow(p: Paint, openPaint: (p: Paint) => void): HTMLLIElement {
  const li = paintRow(p, '', () => openPaint(p))
  const btn = el('button', { className: 'btn small scan-own' })
  const sync = () => {
    const own = isOwned(statusOf(p))
    btn.textContent = own ? '✓ La tengo' : '+ La tengo'
    btn.classList.toggle('primary', own)
  }
  sync()
  btn.addEventListener('click', () => {
    if (!isOwned(statusOf(p))) toggleStatus(p, 'own')
    sync()
  })
  li.classList.add('scan-li')
  li.append(btn)
  return li
}
