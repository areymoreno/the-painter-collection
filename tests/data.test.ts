import { describe, expect, it } from 'vitest'
import { encodePalette, decodePalette } from '../src/palettes'
import { parseBackup } from '../src/backup'
import { sortItems } from '../src/sorting'
import { searchItems } from '../src/search'
import { PAINTS } from '../src/paints'

describe('paletas compartidas', () => {
  it('codifica y decodifica (incluidos acentos y apóstrofos)', () => {
    const p = { name: "Ultramarines d'Élite", items: ['pinturas/citadel/base-macragge-blue', 'pinceles/gw/layer-s'] }
    const code = encodePalette(p)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodePalette(code)).toEqual(p)
  })

  it('rechaza enlaces corruptos', () => {
    expect(decodePalette('%%%')).toBeNull()
    expect(decodePalette(btoa('{"x":1}'))).toBeNull()
  })
})

describe('copia de seguridad', () => {
  it('valida el formato', () => {
    expect(() => parseBackup('no json')).toThrow()
    expect(() => parseBackup('{"app":"otra"}')).toThrow()
    const ok = parseBackup(JSON.stringify({ app: 'the-painter-collection', version: 1, collection: { a: 'own' } }))
    expect(ok.collection).toEqual({ a: 'own' })
    expect(ok.palettes).toEqual([])
  })
})

describe('orden y búsqueda', () => {
  const tonePro = PAINTS.filter((p) => p.name.startsWith('Megaboss Yellow'))

  it('ordena por nombre respetando los números', () => {
    const list = [...tonePro].reverse()
    expect(sortItems(list, 'name').map((p) => p.name)).toEqual(tonePro.map((p) => p.name).sort())
  })

  it('agrupa por gama en el orden del catálogo', () => {
    const sample = [PAINTS.find((p) => p.range === 'Layer')!, PAINTS.find((p) => p.range === 'Base')!]
    expect(sortItems(sample, 'range', ['Base', 'Layer']).map((p) => p.range)).toEqual(['Base', 'Layer'])
  })

  it('busca sin tener en cuenta mayúsculas ni signos, primero lo que empieza igual', () => {
    const res = searchItems(PAINTS, 'mephiston')
    expect(res[0].name).toMatch(/^Mephiston/)
    expect(searchItems(PAINTS, "bugmans").some((p) => p.name === "Bugman's Glow")).toBe(true)
    expect(searchItems(PAINTS, '')).toEqual([])
  })
})
