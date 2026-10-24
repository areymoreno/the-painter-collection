import { describe, expect, it } from 'vitest'
import { CHANGELOG, pendingReleases } from '../src/changelog'

describe('aviso de novedades', () => {
  it('no muestra nada en la primera visita ni si está desactivado', () => {
    expect(pendingReleases(null, false)).toEqual([])
    expect(pendingReleases(CHANGELOG[CHANGELOG.length - 1].id, true)).toEqual([])
  })

  it('muestra solo lo posterior a lo último visto', () => {
    const last = CHANGELOG[CHANGELOG.length - 1].id
    expect(pendingReleases(last, false)).toEqual(CHANGELOG.slice(0, -1))
    expect(pendingReleases(CHANGELOG[0].id, false)).toEqual([])
  })

  it('si lo visto ya no existe, muestra todo', () => {
    expect(pendingReleases('antiguo', false)).toEqual(CHANGELOG)
  })
})
