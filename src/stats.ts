import { type Paint, hexToHsl, isMetallic } from './paints'

// Clasificación de colores para las estadísticas de la colección.

export const COLOR_GROUPS = [
  { id: 'rojos', label: 'Rojos', sample: '#b3191c' },
  { id: 'naranjas', label: 'Naranjas', sample: '#e3672a' },
  { id: 'marrones', label: 'Marrones', sample: '#6b4423' },
  { id: 'amarillos', label: 'Amarillos', sample: '#f2c12e' },
  { id: 'lima', label: 'Verdes lima', sample: '#8fbf2a' },
  { id: 'verdes', label: 'Verdes', sample: '#2f7d3a' },
  { id: 'turquesas', label: 'Turquesas', sample: '#1f9c96' },
  { id: 'azules', label: 'Azules', sample: '#2554a8' },
  { id: 'violetas', label: 'Violetas', sample: '#6a3fa0' },
  { id: 'rosas', label: 'Rosas y magentas', sample: '#d0457f' },
  { id: 'carnes', label: 'Carnes y huesos', sample: '#d9b48f' },
  { id: 'neutros', label: 'Blancos, grises y negros', sample: '#8a8a8a' },
  { id: 'metalicos', label: 'Metálicos', sample: '#b8a37a' },
] as const

export type ColorGroup = (typeof COLOR_GROUPS)[number]['id']

export function colorGroup(p: Paint): ColorGroup {
  if (isMetallic(p)) return 'metalicos'
  const [h, s, l] = hexToHsl(p.hex)
  if (s < 0.12 || l < 0.07 || l > 0.95) return 'neutros'
  // Tonos cálidos poco saturados y claros: carnes, huesos, arenas
  if (h >= 15 && h < 55 && l > 0.55 && s < 0.6) return 'carnes'
  if (h >= 10 && h < 50 && l < 0.42) return 'marrones'
  if (h < 12 || h >= 345) return 'rojos'
  if (h < 42) return 'naranjas'
  if (h < 68) return 'amarillos'
  if (h < 95) return 'lima'
  if (h < 160) return 'verdes'
  if (h < 195) return 'turquesas'
  if (h < 250) return 'azules'
  if (h < 290) return 'violetas'
  return 'rosas'
}
