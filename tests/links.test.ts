import { describe, expect, it } from 'vitest'
import { brushesOf } from '../src/brushes'
import { itemKey, itemSlug } from '../src/collection'
import { parseRoute } from '../src/links'
import { PAINTS } from '../src/paints'

describe('claves de artículo y enlaces', () => {
  it('genera claves estables para pinturas con y sin código', () => {
    const mephiston = PAINTS.find((p) => p.name === 'Mephiston Red' && p.range === 'Base')!
    expect(itemKey(mephiston)).toBe('pinturas/citadel/base-mephiston-red')
    expect(itemSlug({ ...mephiston, brand: 'vallejo', code: '70.926' })).toBe('70.926')
  })

  it('genera claves de pincel', () => {
    const b = brushesOf('wn').find((x) => x.size === '00')!
    expect(itemKey(b)).toBe('pinceles/wn/series-7-miniature-00')
  })

  it('todas las claves de Citadel son únicas', () => {
    const keys = PAINTS.map(itemKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('interpreta las rutas del hash', () => {
    expect(parseRoute('#/pinturas/vallejo/70.908')).toEqual({
      kind: 'item',
      mode: 'paints',
      brand: 'vallejo',
      slug: '70.908',
    })
    expect(parseRoute('#/pinceles/gw')).toEqual({ kind: 'item', mode: 'brushes', brand: 'gw', slug: undefined })
    expect(parseRoute('#/paleta/abc')).toEqual({ kind: 'palette', code: 'abc' })
    expect(parseRoute('')).toEqual({ kind: 'none' })
    expect(parseRoute('#/otra/cosa')).toEqual({ kind: 'none' })
  })

  it('la clave de un artículo se puede volver a interpretar', () => {
    const p = PAINTS[10]
    const route = parseRoute(`#/${itemKey(p)}`)
    expect(route.kind === 'item' && route.slug).toBe(itemSlug(p))
  })
})
