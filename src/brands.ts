import { type BrandId, type Paint, PAINTS, RANGE_INFO } from './paints'

/** Bote con tapa abatible, cuentagotas, tarro de cristal con rosca o lata metálica */
export type Container = 'pot' | 'dropper' | 'jar' | 'tin' | 'spray'

export interface Brand {
  id: BrandId
  name: string
  container: Container
  /** Gamas que vienen en otro envase (p. ej. los sprays) */
  rangeContainer?: Record<string, Container>
  /** Color del plástico de la tapa (pot) o del tapón (dropper) */
  cap: string
  /** Forma del tapón cuentagotas visto desde arriba: cónico, escalonado o con boquilla larga */
  capStyle?: 'cone' | 'stepped' | 'nozzle' | 'flip'
  load: () => Promise<Paint[]>
}

type Row = [name: string, range: string, hex: string, code?: string]

// Datos generados por scripts/import-paints.mjs (Arcturus5404/miniature-paints, MIT)
const fromJson = (id: BrandId, load: () => Promise<{ default: unknown }>) => async () => {
  const rows = (await load()).default as Row[]
  return rows.map(([name, range, hex, code], i): Paint => ({ id: i, name, brand: id, range, hex, code }))
}

export const BRANDS: Brand[] = [
  {
    id: 'citadel',
    name: 'Warhammer Colour',
    container: 'pot',
    cap: '#74736f',
    rangeContainer: { Spray: 'spray' },
    load: async () => PAINTS,
  },
  {
    id: 'vallejo',
    name: 'Vallejo',
    container: 'dropper',
    cap: '#f1f0ec',
    capStyle: 'stepped',
    load: fromJson('vallejo', () => import('./data/vallejo.json')),
  },
  {
    id: 'ak',
    name: 'AK Interactive',
    container: 'dropper',
    cap: '#f4f4f2',
    capStyle: 'stepped',
    load: fromJson('ak', () => import('./data/ak.json')),
  },
  {
    id: 'armypainter',
    name: 'The Army Painter',
    container: 'dropper',
    cap: '#f1f0ec',
    capStyle: 'stepped',
    rangeContainer: { 'Primer (spray)': 'spray' },
    load: fromJson('armypainter', () => import('./data/armypainter.json')),
  },
  {
    id: 'scale75',
    name: 'Scale75',
    container: 'dropper',
    cap: '#141414',
    capStyle: 'stepped',
    load: fromJson('scale75', () => import('./data/scale75.json')),
  },
  {
    id: 'reaper',
    name: 'Reaper',
    container: 'dropper',
    cap: '#ecebe7',
    load: fromJson('reaper', () => import('./data/reaper.json')),
  },
  {
    id: 'monument',
    name: 'Monument Pro Acryl',
    container: 'dropper',
    cap: '#1b1b1d',
    capStyle: 'nozzle',
    load: fromJson('monument', () => import('./data/monument.json')),
  },
  {
    id: 'twothincoats',
    name: 'Two Thin Coats',
    container: 'dropper',
    cap: '#efeee8',
    load: fromJson('twothincoats', () => import('./data/twothincoats.json')),
  },
  {
    id: 'greenstuffworld',
    name: 'Green Stuff World',
    container: 'dropper',
    cap: '#1f1f20',
    capStyle: 'stepped',
    load: fromJson('greenstuffworld', () => import('./data/greenstuffworld.json')),
  },
  {
    id: 'kimera',
    name: 'Kimera Kolors',
    container: 'dropper',
    cap: '#f3f2ee',
    capStyle: 'flip',
    load: fromJson('kimera', () => import('./data/kimera.json')),
  },
  {
    id: 'turbodork',
    name: 'Turbo Dork',
    container: 'dropper',
    cap: '#1a1a1a',
    load: fromJson('turbodork', () => import('./data/turbodork.json')),
  },
  {
    id: 'p3',
    name: 'P3 (Privateer Press)',
    // Desde que la fabrica Steamforged viene en frasco cuentagotas
    container: 'dropper',
    cap: '#f1f0ec',
    capStyle: 'stepped',
    load: fromJson('p3', () => import('./data/p3.json')),
  },
  {
    id: 'mig',
    name: 'AMMO by Mig',
    container: 'dropper',
    cap: '#f07a1e',
    capStyle: 'stepped',
    load: fromJson('mig', () => import('./data/mig.json')),
  },
  {
    id: 'akrc',
    name: 'AK Real Colors',
    container: 'jar',
    cap: '#151515',
    load: fromJson('akrc', () => import('./data/akrc.json')),
  },
  {
    id: 'foundry',
    name: 'Foundry',
    container: 'pot',
    cap: '#1a1a1a',
    load: fromJson('foundry', () => import('./data/foundry.json')),
  },
  {
    id: 'coatdarms',
    name: "Coat d'Arms",
    container: 'pot',
    cap: '#202020',
    load: fromJson('coatdarms', () => import('./data/coatdarms.json')),
  },
  {
    id: 'warcolours',
    name: 'Warcolours',
    container: 'dropper',
    cap: '#3b2a22',
    capStyle: 'stepped',
    load: fromJson('warcolours', () => import('./data/warcolours.json')),
  },
  {
    id: 'tamiya',
    name: 'Tamiya',
    container: 'jar',
    cap: '#f2f2ef',
    load: fromJson('tamiya', () => import('./data/tamiya.json')),
  },
  {
    id: 'mrhobby',
    name: 'Mr. Hobby',
    container: 'jar',
    cap: '#8e9196',
    load: fromJson('mrhobby', () => import('./data/mrhobby.json')),
  },
  {
    id: 'humbrol',
    name: 'Humbrol',
    container: 'dropper',
    cap: '#f4f3ef',
    capStyle: 'cone',
    load: fromJson('humbrol', () => import('./data/humbrol.json')),
  },
  {
    id: 'revell',
    name: 'Revell',
    container: 'tin',
    cap: '#c9ccd0',
    load: fromJson('revell', () => import('./data/revell.json')),
  },
  {
    id: 'italeri',
    name: 'Italeri',
    container: 'dropper',
    cap: '#f4f3ef',
    capStyle: 'stepped',
    load: fromJson('italeri', () => import('./data/italeri.json')),
  },
  {
    id: 'mission',
    name: 'Mission Models',
    container: 'dropper',
    cap: '#141414',
    capStyle: 'flip',
    load: fromJson('mission', () => import('./data/mission.json')),
  },
]

export const brandById = (id: BrandId) => BRANDS.find((b) => b.id === id)!

/** Envase de una pintura concreta (la gama puede cambiar el de la marca). */
export function containerOf(p: Pick<Paint, 'brand' | 'range'>): Container {
  const b = brandById(p.brand)
  return b.rangeContainer?.[p.range] ?? b.container
}

const PALETTE = ['#e4572e', '#3a86ff', '#8338ec', '#ff006e', '#ffbe0b', '#06d6a0', '#8ecae6', '#b5e48c', '#f15bb5', '#fb8500', '#90a955', '#cdb4db']
const accents = new Map<string, string>()

/** Color identificativo de cada gama (los de Citadel están fijados a mano). */
export function rangeAccent(p: { brand: string; range: string }): string {
  if (p.brand === 'citadel') return RANGE_INFO[p.range as keyof typeof RANGE_INFO].accent
  const key = `${p.brand}|${p.range}`
  let c = accents.get(key)
  if (!c) {
    const n = [...accents.keys()].filter((k) => k.startsWith(`${p.brand}|`)).length
    c = PALETTE[n % PALETTE.length]
    accents.set(key, c)
  }
  return c
}
