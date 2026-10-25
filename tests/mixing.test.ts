import { describe, expect, it } from 'vitest'
import { deltaE2000 } from '../src/match'
import { bestMixes, mixHex, ratioLabel } from '../src/mixing'
import type { Paint } from '../src/paints'

const paint = (name: string, hex: string): Paint => ({ id: 0, name, brand: 'vallejo', range: 'Test', hex })

describe('mezclas', () => {
  it('los extremos devuelven las pinturas originales', () => {
    expect(mixHex('#ff0000', '#0000ff', 1)).toBe('#ff0000')
    expect(mixHex('#ff0000', '#0000ff', 0)).toBe('#0000ff')
  })

  it('mezclar con blanco aclara y con negro oscurece', () => {
    const red = '#a01010'
    expect(deltaE2000(mixHex(red, '#ffffff', 0.5), '#ffffff')).toBeLessThan(deltaE2000(red, '#ffffff'))
    expect(deltaE2000(mixHex(red, '#000000', 0.5), '#000000')).toBeLessThan(deltaE2000(red, '#000000'))
  })

  it('etiqueta las proporciones', () => {
    expect(ratioLabel(0.5)).toBe('1 : 1')
    expect(ratioLabel(0.75)).toBe('3 : 1')
    expect(ratioLabel(0.3)).toBe('1 : 2')
  })

  it('encuentra una mezcla que se acerca a un color que no está en la lista', () => {
    const pool = [paint('Rojo', '#c01010'), paint('Blanco', '#f5f5f5'), paint('Azul', '#1030a0')]
    const pink = mixHex('#c01010', '#f5f5f5', 0.5)
    const [best] = bestMixes(pink, pool)
    expect(new Set([best.a.name, best.b.name])).toEqual(new Set(['Rojo', 'Blanco']))
    expect(best.dE).toBeLessThan(1)
  })
})
