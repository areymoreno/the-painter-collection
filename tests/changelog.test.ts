import { describe, expect, it } from 'vitest'
import { CHANGELOG, pendingReleases } from '../src/changelog'

const r = (id: string) => ({ id, date: id, items: [] })
const LIST = [r('c'), r('b'), r('a')] // de más reciente a más antigua

describe('aviso de novedades', () => {
  it('en la primera visita muestra la última versión', () => {
    expect(pendingReleases(null, false, LIST)).toEqual([LIST[0]])
  })

  it('no muestra nada si está desactivado', () => {
    expect(pendingReleases(null, true, LIST)).toEqual([])
    expect(pendingReleases('a', true, LIST)).toEqual([])
  })

  it('muestra todo lo posterior a lo último visto', () => {
    expect(pendingReleases('a', false, LIST)).toEqual([LIST[0], LIST[1]])
  })

  it('aunque ya se haya visto todo, vuelve a mostrar la última versión', () => {
    expect(pendingReleases('c', false, LIST)).toEqual([LIST[0]])
  })

  it('si lo visto ya no existe, muestra todo', () => {
    expect(pendingReleases('antiguo', false, LIST)).toEqual(LIST)
  })

  it('el registro real tiene al menos una versión con contenido', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0)
    expect(CHANGELOG[0].items.length).toBeGreaterThan(0)
  })
})
