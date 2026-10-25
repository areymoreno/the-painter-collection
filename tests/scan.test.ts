import { describe, expect, it } from 'vitest'
import type { Paint } from '../src/paints'
import { matchLabelText } from '../src/scan'

const p = (name: string, brand: Paint['brand'], code?: string): Paint => ({ id: 0, name, brand, range: 'X', hex: '#000000', code })
const paints = [
  p('Intermediate Green', 'vallejo', '70.891'),
  p('Green', 'vallejo', '70.954'),
  p('Mephiston Red', 'citadel'),
  p('Forest Green', 'greenstuffworld', '1797'),
]
const brands = { vallejo: 'Vallejo', citadel: 'Warhammer Colour', greenstuffworld: 'Green Stuff World' }

describe('reconocer etiquetas', () => {
  it('encuentra por código aunque el OCR meta ruido', () => {
    const res = matchLabelText('VERDE MEDIO 70.891 INTERM\nMODEL COLOR acrylic-colors AV vallejo', paints, brands)
    expect(res[0].paint.code).toBe('70.891')
  })

  it('encuentra por nombre', () => {
    const res = matchLabelText('WARHAMMER COLOUR\nBASE\nMEPHISTON RED', paints, brands)
    expect(res[0].paint.name).toBe('Mephiston Red')
  })

  it('prefiere el nombre más largo y específico', () => {
    const res = matchLabelText('GREEN STUFF WORLD ACRYLIC COLOR 1797 FOREST GREEN', paints, brands)
    expect(res[0].paint.name).toBe('Forest Green')
  })

  it('no devuelve nada con texto vacío', () => {
    expect(matchLabelText('', paints, brands)).toEqual([])
  })
})
