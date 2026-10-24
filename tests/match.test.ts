import { describe, expect, it } from 'vitest'
import { deltaE2000, equivalents, similarity } from '../src/match'
import type { Paint } from '../src/paints'

const paint = (name: string, brand: Paint['brand'], hex: string): Paint => ({ id: 0, name, brand, range: 'Test', hex })

describe('diferencia de color (CIEDE2000)', () => {
  it('es cero para el mismo color y simétrica', () => {
    expect(deltaE2000('#9a1115', '#9a1115')).toBe(0)
    expect(deltaE2000('#9a1115', '#1d5aa3')).toBeCloseTo(deltaE2000('#1d5aa3', '#9a1115'), 6)
  })

  it('da unos 100 entre negro y blanco', () => {
    expect(deltaE2000('#000000', '#ffffff')).toBeCloseTo(100, 0)
  })

  it('distingue colores parecidos de colores distintos', () => {
    expect(deltaE2000('#9a1115', '#9c1418')).toBeLessThan(2)
    expect(deltaE2000('#9a1115', '#2a8a3a')).toBeGreaterThan(30)
  })

  it('etiqueta el parecido', () => {
    expect(similarity(1)).toBe('casi idéntica')
    expect(similarity(3)).toBe('muy parecida')
    expect(similarity(7)).toBe('parecida')
    expect(similarity(20)).toBe('aproximada')
  })
})

describe('equivalencias', () => {
  const target = paint('Rojo', 'citadel', '#9a1115')
  const catalog = [
    target,
    paint('Rojo Vallejo', 'vallejo', '#9b1216'),
    paint('Verde Vallejo', 'vallejo', '#2a8a3a'),
    paint('Rojo AK', 'ak', '#a01a1a'),
    paint('Otro Citadel', 'citadel', '#9a1115'),
  ]

  it('elige la más parecida de cada otra marca, ordenadas', () => {
    const eq = equivalents(target, catalog)
    expect(eq.map((e) => e.paint.name)).toEqual(['Rojo Vallejo', 'Rojo AK'])
  })

  it('nunca propone la misma marca', () => {
    expect(equivalents(target, catalog).every((e) => e.paint.brand !== 'citadel')).toBe(true)
  })
})
