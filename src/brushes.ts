// Catálogo de pinceles. Recopilado a mano a partir de tiendas y reseñas (oct. 2026).
// Confirmado: gamas y tallas de Citadel, W&N Series 7 Miniature (000–6), Artis Opus
// Series D/D+ y las tallas de The Army Painter; medidas de Raphaël 4/0 y 4.
// Rosemary Series 33 y Princeton 3950 (1 y 10) con las medidas publicadas por tiendas;
// colores de mango de da Vinci, Monument y Squidmar según fotos de producto.
// Aproximado: el resto de medidas de pelo (mm), los colores de mango de Rosemary, Vallejo
// y Princeton, y las tallas de Artis Opus Series S.

import type { Paint } from './paints'

export type BrushShape = 'round' | 'flat' | 'drybrush'
export type BrushHair = 'synthetic' | 'sable' | 'hog'

export interface BrushBrand {
  id: string
  name: string
  /** Color del mango y de la virola */
  handle: string
  ferrule: string
  /** Gamas con mango o virola de otro color */
  ranges?: Record<string, { handle?: string; ferrule?: string }>
}

export interface Brush {
  kind: 'brush'
  id: number
  name: string
  brand: string
  range: string
  size: string
  shape: BrushShape
  hair: BrushHair
  /** Diámetro (o ancho, si es plano) y largo del pelo en mm */
  width: number
  length: number
  handle: string
  ferrule: string
}

type Row = [range: string, size: string, shape: BrushShape, hair: BrushHair, width: number, length: number, name?: string]

const DATA: { brand: BrushBrand; rows: Row[] }[] = [
  {
    brand: { id: 'gw', name: 'Warhammer (Citadel)', handle: '#1b1b1c', ferrule: '#b9bcc0' },
    rows: [
      ['Base', 'S', 'round', 'sable', 2.5, 10],
      ['Base', 'M', 'round', 'synthetic', 3.5, 13],
      ['Base', 'L', 'flat', 'synthetic', 6, 14],
      ['Base', 'XL', 'flat', 'synthetic', 9, 16],
      ['Layer', 'S', 'round', 'sable', 1.5, 8],
      ['Layer', 'M', 'round', 'sable', 2, 10],
      ['Shade', 'M', 'round', 'synthetic', 3.5, 12],
      ['Shade', 'L', 'round', 'synthetic', 5, 15],
      ['Dry', 'S', 'drybrush', 'synthetic', 4, 6],
      ['Dry', 'M', 'drybrush', 'synthetic', 6, 7],
      ['Dry', 'L', 'drybrush', 'synthetic', 9, 8],
      ['Glaze', 'M', 'round', 'synthetic', 4, 12],
      ['Scenery', 'M', 'flat', 'hog', 8, 12],
      ['Scenery', 'L', 'flat', 'hog', 12, 14],
      ['Artificer', 'XS', 'round', 'sable', 1, 7, 'Artificer Layer XS'],
      ['Artificer', 'S', 'round', 'sable', 1.3, 8, 'Artificer Layer S'],
      ['Artificer', 'M', 'round', 'sable', 1.7, 9, 'Artificer Layer M'],
      ['STC', 'S', 'round', 'synthetic', 2.5, 10, 'STC Base S'],
      ['STC', 'M', 'round', 'synthetic', 3.5, 13, 'STC Base M'],
      ['STC', 'S', 'round', 'synthetic', 1.5, 8, 'STC Layer S'],
      ['STC', 'M', 'round', 'synthetic', 2, 10, 'STC Layer M'],
      ['STC', 'M', 'round', 'synthetic', 3.5, 12, 'STC Shade M'],
      ['STC', 'S', 'drybrush', 'synthetic', 4, 6, 'STC Dry S'],
      ['STC', 'M', 'round', 'synthetic', 4, 12, 'STC Glaze M'],
    ],
  },
  {
    brand: { id: 'tap', name: 'The Army Painter', handle: '#202022', ferrule: '#c7c9cc' },
    rows: [
      ['Wargamer', '10/0', 'round', 'sable', 0.5, 4, 'The Psycho'],
      ['Wargamer', '5/0', 'round', 'sable', 0.7, 5, 'Insane Detail'],
      ['Wargamer', '00', 'round', 'sable', 1, 7, 'Detail'],
      ['Wargamer', '≈ 1', 'round', 'sable', 1.8, 10, 'Character'],
      ['Wargamer', '≈ 2', 'round', 'sable', 2.5, 12, 'Regiment'],
      ['Wargamer', '8', 'round', 'synthetic', 5, 18, 'Monster'],
      ['Wargamer', 'S', 'drybrush', 'synthetic', 5, 7, 'Small Drybrush'],
      ['Wargamer', 'L', 'drybrush', 'synthetic', 9, 9, 'Large Drybrush'],
      ['Wargamer', 'L', 'flat', 'synthetic', 10, 14, 'Vehicle & Scenery'],
      ['Hobby', '1', 'round', 'synthetic', 1.8, 10, 'Layering'],
      ['Hobby', '3', 'round', 'synthetic', 2.8, 12, 'Speedpaint'],
      ['Hobby', '5', 'round', 'synthetic', 3.6, 14, 'Basecoating'],
    ],
  },
  {
    brand: { id: 'wn', name: 'Winsor & Newton', handle: '#121213', ferrule: '#c9ccd0' },
    rows: [
      ['Series 7 Miniature', '000', 'round', 'sable', 0.8, 5],
      ['Series 7 Miniature', '00', 'round', 'sable', 1, 6],
      ['Series 7 Miniature', '0', 'round', 'sable', 1.3, 7],
      ['Series 7 Miniature', '1', 'round', 'sable', 1.7, 8],
      ['Series 7 Miniature', '2', 'round', 'sable', 2.2, 9],
      ['Series 7 Miniature', '3', 'round', 'sable', 2.7, 10],
      ['Series 7 Miniature', '4', 'round', 'sable', 3.2, 11],
      ['Series 7 Miniature', '5', 'round', 'sable', 3.7, 12],
      ['Series 7 Miniature', '6', 'round', 'sable', 4.2, 13],
    ],
  },
  {
    brand: { id: 'raphael', name: 'Raphaël', handle: '#161616', ferrule: '#c9ccd0' },
    rows: [
      ['8404', '4/0', 'round', 'sable', 1.7, 6],
      ['8404', '3/0', 'round', 'sable', 1.9, 7],
      ['8404', '2/0', 'round', 'sable', 2.1, 8],
      ['8404', '0', 'round', 'sable', 2.4, 10],
      ['8404', '1', 'round', 'sable', 2.8, 12],
      ['8404', '2', 'round', 'sable', 3.1, 14],
      ['8404', '3', 'round', 'sable', 3.5, 17],
      ['8404', '4', 'round', 'sable', 4, 19],
    ],
  },
  {
    brand: { id: 'artisopus', name: 'Artis Opus', handle: '#101011', ferrule: '#c8a35a' },
    rows: [
      ['Series S', '00', 'round', 'sable', 1, 6],
      ['Series S', '0', 'round', 'sable', 1.3, 7],
      ['Series S', '1', 'round', 'sable', 1.7, 8],
      ['Series S', '2', 'round', 'sable', 2.2, 9],
      ['Series S', '3', 'round', 'sable', 2.8, 11],
      ['Series D', 'XS', 'drybrush', 'synthetic', 3, 4],
      ['Series D', 'S', 'drybrush', 'synthetic', 4, 5],
      ['Series D', 'M', 'drybrush', 'synthetic', 6, 6],
      ['Series D', 'L', 'drybrush', 'synthetic', 8, 7],
      ['Series D', 'XL', 'drybrush', 'synthetic', 11, 8],
      ['Series D+', 'XS+', 'drybrush', 'synthetic', 3.5, 4.5],
      ['Series D+', 'S+', 'drybrush', 'synthetic', 5, 5.5],
      ['Series D+', 'M+', 'drybrush', 'synthetic', 7, 6.5],
      ['Series D+', 'L+', 'drybrush', 'synthetic', 9.5, 7.5],
      ['Series D+', 'XXL', 'drybrush', 'synthetic', 13, 9],
    ],
  },
  {
    brand: { id: 'rosemary', name: 'Rosemary & Co', handle: '#1b1b1b', ferrule: '#c9ccd0' },
    rows: [
      ['Series 33', '10/0', 'round', 'sable', 0.8, 6.4],
      ['Series 33', '3/0', 'round', 'sable', 1, 7.8],
      ['Series 33', '2/0', 'round', 'sable', 1.4, 8.6],
      ['Series 33', '0', 'round', 'sable', 1.5, 9.8],
      ['Series 33', '2', 'round', 'sable', 2, 14.1],
      ['Series 33', '4', 'round', 'sable', 3.4, 15.7],
    ],
  },
  {
    brand: { id: 'davinci', name: 'da Vinci', handle: '#0f0f10', ferrule: '#cfd2d6' },
    rows: [
      ['Maestro Series 10', '0', 'round', 'sable', 1.4, 7],
      ['Maestro Series 10', '1', 'round', 'sable', 1.8, 9],
      ['Maestro Series 10', '2', 'round', 'sable', 2.3, 11],
      ['Maestro Series 10', '3', 'round', 'sable', 2.8, 13],
      ['Maestro Series 10', '4', 'round', 'sable', 3.3, 15],
    ],
  },
  {
    brand: {
      id: 'monument',
      name: 'Monument Hobbies',
      handle: '#6a1420',
      ferrule: '#c9ccd0',
      ranges: { 'PRO Synthetic': { handle: '#1b2340' } },
    },
    rows: [
      ['PRO Sable', '0', 'round', 'sable', 1.3, 8],
      ['PRO Sable', '1', 'round', 'sable', 1.7, 9],
      ['PRO Sable', '2', 'round', 'sable', 2.2, 11],
      ['PRO Sable', '3', 'round', 'sable', 2.7, 12],
      ['PRO Sable', '4', 'round', 'sable', 3.2, 14],
      ['PRO Synthetic', '10/0', 'round', 'synthetic', 0.6, 5],
      ['PRO Synthetic', '00', 'round', 'synthetic', 1, 7],
      ['PRO Synthetic', '1', 'round', 'synthetic', 1.7, 9],
      ['PRO Synthetic', '2', 'round', 'synthetic', 2.2, 11],
      ['PRO Synthetic', '4', 'round', 'synthetic', 3.2, 14],
      ['PRO Synthetic', '6', 'round', 'synthetic', 4, 17],
    ],
  },
  {
    brand: {
      id: 'squidmar',
      name: 'Squidmar',
      handle: '#111112',
      ferrule: '#c8a35a',
      ranges: { 'Wight MKI': { handle: '#ecebe6', ferrule: '#c9ccd0' } },
    },
    rows: [
      ['Kolinsky MKII', 'XS', 'round', 'sable', 1, 6],
      ['Kolinsky MKII', 'S', 'round', 'sable', 1.4, 8],
      ['Kolinsky MKII', 'M', 'round', 'sable', 1.9, 10],
      ['Kolinsky MKII', 'L', 'round', 'sable', 2.4, 12],
      ['Kolinsky MKII', 'XL', 'round', 'sable', 3, 14],
      ['Kolinsky MKII', 'B', 'round', 'sable', 3.4, 12, 'Kolinsky MKII Bold'],
      ['Wight MKI', 'XS', 'round', 'synthetic', 1, 6],
      ['Wight MKI', 'S', 'round', 'synthetic', 1.4, 8],
      ['Wight MKI', 'M', 'round', 'synthetic', 1.9, 10],
      ['Wight MKI', 'L', 'round', 'synthetic', 2.4, 12],
      ['Wight MKI', 'XL', 'round', 'synthetic', 3, 14],
    ],
  },
  {
    brand: { id: 'vallejo', name: 'Vallejo', handle: '#b8865a', ferrule: '#c9ccd0' },
    rows: [
      ['Kolinsky Tajmir', '0', 'round', 'sable', 1.4, 8],
      ['Kolinsky Tajmir', '1', 'round', 'sable', 1.8, 10],
      ['Kolinsky Tajmir', '2', 'round', 'sable', 2.3, 12],
    ],
  },
  {
    brand: { id: 'princeton', name: 'Princeton', handle: '#2a2a2c', ferrule: '#c9ccd0' },
    rows: [
      ['Velvetouch 3950', '20/0', 'round', 'synthetic', 0.4, 4, 'Velvetouch Mini Round 20/0'],
      ['Velvetouch 3950', '12/0', 'round', 'synthetic', 0.6, 5, 'Velvetouch Mini Round 12/0'],
      ['Velvetouch 3950', '1', 'round', 'synthetic', 1.9, 9.5],
      ['Velvetouch 3950', '4', 'round', 'synthetic', 2.9, 13],
      ['Velvetouch 3950', '10', 'round', 'synthetic', 5.6, 24],
    ],
  },
]

export const BRUSH_BRANDS: BrushBrand[] = DATA.map((d) => d.brand)

const BRUSHES: Record<string, Brush[]> = Object.fromEntries(
  DATA.map(({ brand, rows }) => [
    brand.id,
    rows.map(([range, size, shape, hair, width, length, name], i): Brush => ({
      kind: 'brush',
      id: i,
      name: name ?? `${range} ${size}`,
      brand: brand.id,
      range,
      size,
      shape,
      hair,
      width,
      length,
      handle: brand.ranges?.[range]?.handle ?? brand.handle,
      ferrule: brand.ranges?.[range]?.ferrule ?? brand.ferrule,
    })),
  ]),
)

export const brushBrandById = (id: string) => BRUSH_BRANDS.find((b) => b.id === id)!
export const brushesOf = (id: string) => BRUSHES[id] ?? []

/** Lo que se muestra en la cuadrícula: una pintura o un pincel */
export type Item = Paint | Brush

export const isBrush = (x: Item): x is Brush => (x as Brush).kind === 'brush'

export const HAIR_LABEL: Record<BrushHair, string> = {
  synthetic: 'Sintético',
  sable: 'Marta (sable)',
  hog: 'Cerda',
}

export const SHAPE_LABEL: Record<BrushShape, string> = {
  round: 'Redondo',
  flat: 'Plano',
  drybrush: 'Pincel seco',
}

/** Color del pelo según el tipo */
export const HAIR_COLOR: Record<BrushHair, string> = {
  synthetic: '#e9dcc3',
  sable: '#8a4b2a',
  hog: '#d9c9a3',
}
