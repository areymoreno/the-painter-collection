import { type Status, collectionSnapshot, mergeCollection } from './collection'
import { type Palette, allPalettes, replacePalettes } from './palettes'

// Copia de seguridad de la colección y las paletas en un archivo JSON.

export interface Backup {
  app: 'the-painter-collection'
  version: 1
  exported: string
  collection: Record<string, Status>
  palettes: Palette[]
}

export function makeBackup(now = new Date()): Backup {
  return {
    app: 'the-painter-collection',
    version: 1,
    exported: now.toISOString(),
    collection: collectionSnapshot(),
    palettes: allPalettes().map((p) => ({ ...p, items: [...p.items] })),
  }
}

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const b = data as Partial<Backup>
  if (b?.app !== 'the-painter-collection' || typeof b.collection !== 'object' || !b.collection) {
    throw new Error('El archivo no es una copia de The Painter Collection.')
  }
  return { ...(b as Backup), palettes: Array.isArray(b.palettes) ? b.palettes : [] }
}

/** Aplica una copia. Devuelve cuántas marcas han cambiado. */
export function applyBackup(b: Backup, replace: boolean): number {
  const n = mergeCollection(b.collection, replace)
  if (replace) replacePalettes(b.palettes)
  else {
    const existing = allPalettes()
    const names = new Set(existing.map((p) => p.name))
    replacePalettes([...existing, ...b.palettes.filter((p) => !names.has(p.name))])
  }
  return n
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(makeBackup(), null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `the-painter-collection-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
