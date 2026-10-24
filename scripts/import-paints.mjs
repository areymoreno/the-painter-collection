// Genera src/data/<marca>.json a partir del repositorio abierto
// https://github.com/Arcturus5404/miniature-paints (licencia MIT, © Rick Fleuren).
//
// Uso: node scripts/import-paints.mjs
//
// Cada JSON es una lista compacta de [nombre, gama, hex, código?].

import { mkdir, writeFile } from 'node:fs/promises'

const BASE = 'https://raw.githubusercontent.com/Arcturus5404/miniature-paints/main/paints/'

/**
 * file: fichero .md de origen
 * sets: gamas a incluir → nombre que se mostrará (null = todas, con el nombre original)
 * extra: otros ficheros que se añaden a la misma marca
 */
const BRANDS = {
  vallejo: {
    file: 'Vallejo.md',
    sets: {
      'Model Color': 'Model Color',
      'Game Color': 'Game Color',
      'Game Color Wash': 'Game Color Wash',
      'Game Color Special FX': 'Game Color FX',
      'Xpress Color': 'Xpress Color',
      'Xpress Color Intense': 'Xpress Color',
      'Mecha Color': 'Mecha Color',
      'Metal Color': 'Metal Color',
      'Model Air': 'Model Air',
      'Game Air': 'Game Air',
      'Panzer Aces': 'Panzer Aces',
    },
  },
  ak: {
    file: 'AK.md',
    sets: {
      'Standard (3rd Gen)': 'Standard',
      'Figures (3rd Gen)': 'Figures',
      'AFV (3rd Gen)': 'AFV',
      'Air (3rd Gen)': 'Air',
      'Metallic (3rd Gen)': 'Metallic',
      'Intense (3rd Gen)': 'Intense',
      'Ink (3rd Gen)': 'Ink',
      'Pastel (3rd Gen)': 'Pastel',
    },
  },
  armypainter: {
    file: 'Army_Painter.md',
    sets: {
      'Warpaints Fanatic': 'Fanatic',
      'Warpaints Fanatic Wash': 'Fanatic Wash',
      'Speedpaint Set 2.0': 'Speedpaint 2.0',
      'Warpaints Air': 'Warpaints Air',
    },
  },
  scale75: { file: 'Scale75.md', sets: null },
  reaper: {
    file: 'Reaper.md',
    sets: {
      'Master Series Paints Core Colors': 'Core Colors',
      'Master Series Paints Core Colors Wash': 'Core Colors Wash',
      'Master Series Paints Bones': 'Bones',
      'Master Series Paints Pathfinder': 'Pathfinder',
    },
  },
  monument: {
    file: 'Monument.md',
    sets: {
      'Monument Pro Acrylic Paints': 'Pro Acryl',
      'Monument Pro Signature Series': 'Signature Series',
      'Monument Pro Acrylic Wash': 'Wash',
    },
    // Colaboración con Creature Caster
    extra: [
      {
        file: 'Creature.md',
        sets: { 'Monument Pro Acryl': 'Creature Caster', 'Monument Pro Acryl Transparent': 'Creature Caster' },
      },
    ],
  },
  mig: {
    file: 'Mig.md',
    sets: { Acrylics: 'Acrylic', Washes: 'Wash' },
  },
  akrc: {
    file: 'AKRC.md',
    sets: {
      'Real Colors - Standard': 'Standard',
      'Real Colors - AFV': 'AFV',
      'Real Colors - WWII': 'WWII',
      'Real Colors - Air': 'Air',
      'Real Colors - Modern': 'Modern',
      'Real Colors - Clear': 'Clear',
    },
  },
  foundry: { file: 'Foundry.md', sets: { 'Foundry Paint System': 'Paint System' } },
  coatdarms: {
    file: 'CoatDArmes.md',
    sets: {
      'Fantasy Range': 'Fantasy',
      'Fantasy Range - Ink Wash': 'Ink Wash',
      'Military Range': 'Military',
      'World War II Range': 'WWII',
      'Brushscape Range': 'Brushscape',
    },
  },
  warcolours: {
    file: 'Warcolours.md',
    sets: {
      'Layer paints': 'Layer',
      'One-coat paints': 'One-coat',
      'Metallic paints': 'Metallic',
      'Transparent paints': 'Transparent',
      'Inks for Shading and Glazing': 'Ink',
      'Glazing paints': 'Glaze',
    },
  },
  tamiya: {
    file: 'Tamiya.md',
    sets: { 'Acrylics Mini Flat': 'Acrylic Mini Flat (XF)', 'Acrylics Mini Gloss': 'Acrylic Mini Gloss (X)' },
  },
  mrhobby: {
    file: 'MrHobby.md',
    sets: { 'Aqueous Hobby Color': 'Aqueous Hobby Color', Acrysion: 'Acrysion' },
  },
  humbrol: {
    file: 'Humbrol.md',
    sets: {
      'Humbrol Acrylics - Matt': 'Matt',
      'Humbrol Acrylics - Gloss': 'Gloss',
      'Humbrol Acrylics - Satin': 'Satin',
      'Humbrol Acrylics - Metallics': 'Metallic',
    },
  },
  revell: {
    file: 'Revell.md',
    sets: {
      'Email Color - Matt': 'Matt',
      'Email Color - Silk': 'Silk',
      'Email Color - Gloss': 'Gloss',
      'Email Color - Metallic': 'Metallic',
    },
  },
  italeri: { file: 'Italeri.md', sets: { 'Italeri Acrylic Paint': 'Acrylic' } },
  mission: { file: 'MissionModels.md', sets: { 'Mission Models': 'Acrylic' } },
  twothincoats: {
    file: 'Duncan.md',
    sets: { 'Wave 1': 'Wave 1', 'Wave 2': 'Wave 2', 'Wave 3': 'Wave 3' },
  },
  greenstuffworld: {
    file: 'GreenStuffWorld.md',
    sets: {
      'Acrylic Colors': 'Acrylic',
      'Metallic Colors': 'Metallic',
      'Dipping Inks': 'Dipping Ink',
      'Intensity Ink': 'Intensity Ink',
      'Wash Ink': 'Wash Ink',
      'Candy Ink Metallic': 'Candy Ink',
      'Chameleon Colorshift Metallic': 'Chameleon',
      'Fluor Metallic': 'Fluor Metallic',
    },
  },
  kimera: {
    file: 'KimeraKolors.md',
    sets: {
      'Kimera Kolors Pure Pigments': 'Pure Pigments',
      'Kimera Kolors Expansion Set 1': 'Expansion Set 1',
      'Kimera Kolors Danilo Cartacci Signature Set': 'Signature (Cartacci)',
      'Kimera Kolors Michal Pisarski Signature Set': 'Signature (Pisarski)',
    },
  },
  turbodork: { file: 'TurboDork.md', sets: { 'Turbo Dork': 'Turboshift & Metallic' } },
  p3: {
    file: 'P3.md',
    sets: {
      'Privateer Press Formula P3': 'Formula P3',
      'Privateer Press Formula P3 Wash': 'P3 Wash',
    },
  },
}

function parse(md, sets) {
  const lines = md.split('\n').filter((l) => l.startsWith('|'))
  const header = lines[0].split('|').map((c) => c.trim())
  const col = (name) => header.indexOf(name)
  const iName = col('Name')
  const iCode = col('Code')
  const iSet = col('Set')
  const iHex = col('Hex')

  const out = []
  const seen = new Set()
  for (const line of lines.slice(2)) {
    const c = line.split('|').map((x) => x.trim())
    const set = c[iSet]
    const range = sets ? sets[set] : set.replace(/\s+/g, ' ').replace(/ Range$/, '')
    if (!range) continue
    const hex = c[iHex]?.match(/#([0-9A-Fa-f]{6})/)?.[1]
    const name = c[iName]?.replace(/\s+/g, ' ').replace(/\s*\d+ ?ml$/i, '')
    if (!hex || !name) continue
    const key = `${range}|${name.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    const code = iCode >= 0 && c[iCode] && c[iCode] !== 'null' ? c[iCode] : undefined
    out.push(code ? [name, range, `#${hex.toLowerCase()}`, code] : [name, range, `#${hex.toLowerCase()}`])
  }
  return out
}

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true })
for (const [id, { file, sets, extra = [] }] of Object.entries(BRANDS)) {
  const paints = []
  for (const src of [{ file, sets }, ...extra]) {
    const res = await fetch(BASE + src.file)
    if (!res.ok) throw new Error(`${src.file}: HTTP ${res.status}`)
    paints.push(...parse(await res.text(), src.sets))
  }
  await writeFile(new URL(`../src/data/${id}.json`, import.meta.url), JSON.stringify(paints) + '\n')
  console.log(`${id}: ${paints.length} pinturas`)
}
