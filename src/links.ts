// Rutas del hash: #/pinturas/<marca>/<artículo>, #/pinceles/<marca>/<artículo> y #/paleta/<código>

export type Mode = 'paints' | 'brushes'

export const MODE_PATH: Record<Mode, string> = { paints: 'pinturas', brushes: 'pinceles' }

export type Route =
  | { kind: 'item'; mode: Mode; brand: string; slug?: string }
  | { kind: 'palette'; code: string }
  | { kind: 'none' }

export function parseRoute(hash: string): Route {
  const key = hash.replace(/^#\/?/, '')
  if (!key) return { kind: 'none' }
  const parts = key.split('/').map((s) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  })
  if (parts[0] === 'paleta' && parts[1]) return { kind: 'palette', code: parts[1] }
  const mode = (Object.keys(MODE_PATH) as Mode[]).find((m) => MODE_PATH[m] === parts[0])
  if (!mode || !parts[1]) return { kind: 'none' }
  return { kind: 'item', mode, brand: parts[1], slug: parts[2] || undefined }
}
