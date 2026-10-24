// Gama Citadel (Games Workshop). Los hex vienen de Arcturus5404/miniature-paints (MIT);
// las pinturas que no están ahí conservan un valor aproximado.
// Tone Pro: 30 familias × 5 tonos (1 = más oscuro, 5 = más claro); hex muestreados
// de las muestras de GW por warhue.app.

export type BrandId =
  | 'citadel'
  | 'vallejo'
  | 'ak'
  | 'armypainter'
  | 'scale75'
  | 'reaper'
  | 'monument'
  | 'twothincoats'
  | 'greenstuffworld'
  | 'kimera'
  | 'turbodork'
  | 'p3'

export type CitadelRange =
  | 'Base'
  | 'Layer'
  | 'Shade'
  | 'Contrast'
  | 'Dry'
  | 'Technical'
  | 'Air'
  | 'Tone Pro'

export interface Paint {
  id: number
  name: string
  brand: BrandId
  range: string
  hex: string
  code?: string
}

export const RANGE_INFO: Record<CitadelRange, { label: string; accent: string }> = {
  Base: { label: 'Base', accent: '#e4572e' },
  Layer: { label: 'Layer', accent: '#3a86ff' },
  Shade: { label: 'Shade', accent: '#8338ec' },
  Contrast: { label: 'Contrast', accent: '#ff006e' },
  Dry: { label: 'Dry', accent: '#ffbe0b' },
  Technical: { label: 'Technical', accent: '#06d6a0' },
  Air: { label: 'Air', accent: '#8ecae6' },
  'Tone Pro': { label: 'Tone Pro', accent: '#b5e48c' },
}

const RAW: Record<CitadelRange, string> = {
  Base: `
Abaddon Black:#000000
Averland Sunset:#fbb81c
Balthasar Gold:#a77353
Barak-Nar Burgundy:#451636
Bugman's Glow:#804c43
Caledor Sky:#366699
Caliban Green:#003d15
Castellan Green:#264715
Catachan Fleshtone:#442b25
Celestra Grey:#8ba3a3
Corax White:#ffffff
Corvus Black:#171314
Daemonette Hide:#655f81
Death Guard Green:#6d774d
Death Korps Drab:#3d4539
Deathworld Forest:#556229
Dryad Bark:#2b2a24
Gal Vorbak Red:#4b213c
Grey Knights Steel:#b0bdc6
Grey Seer:#a2a5a7
Hobgrot Hide:#9c823b
Incubi Darkness:#082e32
Ionrach Skin:#97a384
Iron Hands Steel:#b2a79f
Iron Warriors:#706e6b
Jokaero Orange:#ed3814
Kantor Blue:#02134e
Khorne Red:#650001
Leadbelcher:#969696
Lupercal Green:#002c2b
Macragge Blue:#0f3d7c
Mechanicus Standard Grey:#39484a
Mephiston Red:#960c09
Morghast Bone:#c0a973
Mournfang Brown:#490f06
Naggaroth Night:#3b2b50
Night Lords Blue:#002b5c
Nocturne Green:#162a29
Orruk Flesh:#97c17e
Phoenician Purple:#440052
Rakarth Flesh:#9c998d
Ratskin Flesh:#a86648
Retributor Armour:#edc169
Rhinox Hide:#462f30
Runelord Brass:#8d806f
Screamer Pink:#7a0e44
Screaming Bell:#d18a5e
Steel Legion Drab:#584e2d
Stegadon Scale Green:#06455d
The Fang:#405b71
Thondia Brown:#4f322c
Thousand Sons Blue:#00506f
Waaagh! Flesh:#0b3b36
Warplock Bronze:#b36e4f
Wraithbone:#dbd1b2
XV-88:#6c4811
Zandri Dust:#988e56
`,
  Layer: `
Administratum Grey:#989c94
Ahriman Blue:#00708a
Alaitoc Blue:#2f4f85
Altdorf Guard Blue:#2d4696
Auric Armour Gold:#ffc451
Baharroth Blue:#54bdca
Balor Brown:#875408
Baneblade Brown:#8f7c68
Bestigor Flesh:#d08951
Bloodreaver Flesh:#6a4848
Blue Horror:#9eb5ce
Brass Scorpion:#a65d2c
Cadian Fleshtone:#c47652
Calgar Blue:#2a497f
Canoptek Alloy:#c3b2ac
Castellax Bronze:#c68351
Dark Reaper:#354d4c
Dawnstone:#697068
Deathclaw Brown:#af634f
Dechala Lilac:#b598c9
Deepkin Flesh:#a9b79f
Doombull Brown:#570003
Dorn Yellow:#fff55a
Elysian Green:#6b8c37
Emperor's Children:#b74073
Eshin Grey:#484b4e
Evil Sunz Scarlet:#c01411
Fenrisian Grey:#6d94b3
Fire Dragon Bright:#f4874e
Flash Gitz Yellow:#fff300
Flayed One Flesh:#eec483
Fulgrim Pink:#f3abca
Fulgurite Copper:#ce8d51
Gauss Blaster Green:#7fc1a5
Gehenna's Gold:#c96b18
Genestealer Purple:#7658a5
Gorthor Brown:#5f463f
Hashut Copper:#ba885f
Hoeth Blue:#4c78af
Ironbreaker:#899092
Kabalite Green:#008962
Kakophoni Purple:#8869ae
Karak Stone:#b7945c
Kislev Flesh:#d1a570
Knight-Questor Flesh:#996563
Krieg Khaki:#bcbb7e
Liberator Gold:#e1ba7f
Loren Forest:#486c25
Lothern Blue:#2c9bcc
Lugganath Orange:#f69b82
Moot Green:#3daf44
Nurgling Green:#7e975e
Ogryn Camo:#96a648
Pallid Wych Flesh:#caccbb
Phalanx Yellow:#ffe200
Pink Horror:#8e2757
Runefang Steel:#c2c8cc
Russ Grey:#507085
Screaming Skull:#b9c099
Skarsnik Green:#588f6b
Skavenblight Dinge:#45413b
Skrag Brown:#8b4806
Skullcrusher Brass:#f4cb7a
Slaanesh Grey:#8b8893
Sons of Horus Green:#00545e
Sotek Green:#0b6371
Squig Orange:#a74d42
Stormhost Silver:#dadddf
Stormvermin Fur:#6d655f
Straken Green:#597f1c
Sybarite Green:#17a166
Sycorax Bronze:#bb9f84
Tallarn Sand:#a07409
Tau Light Ochre:#bc6b10
Teclis Blue:#3877bf
Temple Guard Blue:#239489
Thunderhawk Blue:#396a70
Troll Slayer Orange:#f16c23
Tuskgor Fur:#863231
Ulthuan Grey:#c4ddd5
Ungor Flesh:#d1a560
Ushabti Bone:#aba173
Vulkan Green:#223c2e
Warboss Green:#317e57
Warpfiend Grey:#66656e
Warpstone Glow:#0f702a
Wazdakka Red:#880804
White Scar:#ffffff
Wild Rider Red:#e82e1b
Word Bearers Red:#620104
Xereus Purple:#47125a
Yriel Yellow:#ffd900
Zamesi Desert:#d89d1b
`,
  Shade: `
Agrax Earthshade:#a99d8d
Agrax Earthshade Gloss:#b4aa9e
Athonian Camoshade:#b6b788
Berserker Bloodshade:#5a1e23
Biel-Tan Green:#7da57a
Carroburg Crimson:#be80a4
Casandora Yellow:#f5cc92
Coelia Greenshade:#1b8f85
Cryptek Armourshade Gloss:#856a67
Drakenhof Nightshade:#a1a5af
Druchii Violet:#8f6592
Fuegan Orange:#bb7648
Kroak Green:#4f7c35
Mortarion Grime:#7a7a52
Nuln Oil:#9e9a98
Nuln Oil Gloss:#b3afae
Poxwalker:#9a9b84
Reikland Fleshshade:#be9a80
Reikland Fleshshade Gloss:#c2a896
Seraphim Sepia:#ae8158
Soulblight Grey:#5e6066
Targor Rageshade:#6b4a68
`,
  Contrast: `
Aethermatic Blue:#1c7e92
Aggaros Dunes:#706542
Akhelian Green:#004f63
Apothecary White:#a5bed4
Asurmen Blue:#2a4a8c
Baal Red:#a11b21
Basilicanum Grey:#212121
Black Legion:#232324
Black Templar:#171717
Blood Angels Red:#860b0e
Celestium Blue:#3d78a8
Creed Camo:#145d2e
Cygor Brown:#3e1a17
Dark Angels Green:#00110f
Darkoath Flesh:#98615b
Flesh Tearers Red:#4b0402
Fyreslayer Flesh:#724e3c
Gore-Grunta Fur:#613b1f
Gryph-Charger Grey:#25698a
Gryph-Hound Orange:#94300e
Guilliman Flesh:#9f4639
Iyanden Yellow:#db7f0c
Karandras Green:#2f5a3a
Leviadon Blue:#000a13
Leviathan Purple:#5e2a7e
Luxion Purple:#6a3c8c
Magmadroth Flame:#e2461e
Magos Purple:#7a3f6e
Mantis Warriors Green:#4f8a2e
Militarum Green:#6b7711
Nazdreg Yellow:#6c4c00
Ork Flesh:#00591e
Plaguebearer Flesh:#718025
Shyish Purple:#2b0e42
Skeleton Horde:#a4966f
Snakebite Leather:#694c29
Space Wolves Grey:#1f486b
Stormfiend:#4a3f3a
Striking Scorpion Green:#3e8a3a
Talassar Blue:#003b70
Terradon Turquoise:#005862
Ultramarines Blue:#091948
Volupus Pink:#60001c
Warp Lightning:#005e26
Wyldwood:#432822
`,
  Dry: `
Astorath Red:#a9311e
Changeling Pink:#f3abca
Chronus Blue:#4b90cf
Dawnstone:#697068
Eldar Flesh:#e8c07f
Etherium Blue:#9eb5ce
Golden Griffon:#e1ba7f
Golgfag Brown:#8f502a
Hellion Green:#7fc1a5
Hexos Palesun:#fff55a
Hoeth Blue:#4c78af
Imrik Blue:#208abf
Kindleflame:#f69c82
Longbeard Grey:#dbdcc6
Lucius Lilac:#b598c9
Necron Compound:#dadddf
Niblet Green:#378c35
Nurgling Green:#7e975e
Praxeti White:#ffffff
Ryza Rust:#f16c23
Sigmarite:#d6ac57
Skink Blue:#54bdca
Slaanesh Grey:#8b8893
Stormfang:#5a7fa3
Sylvaneth Bark:#4e483b
Terminatus Stone:#c8b79d
Thunderhawk Blue:#396a70
Tyrant Skull:#c8c483
Underhive Ash:#bcbb7e
Verminlord Hide:#7e3331
Wrack White:#d3d0cf
`,
  Technical: `
Agrellan Badland:#b39e80
Agrellan Earth:#b39e80
'Ardcoat:#f9f9f9
Armageddon Dunes:#e8d36f
Armageddon Dust:#d2ad00
Astrogranite:#767675
Astrogranite Debris:#9d9d9d
Blood for the Blood God:#600106
Contrast Medium:#f9f9f9
Hexwraith Flame:#29a236
Lahmian Medium:#f9f9f9
Martian Ironcrust:#cf705d
Martian Ironearth:#cf705d
Mordant Earth:#171314
Nighthaunt Gloom:#3a686e
Nihilakh Oxide:#66b39a
Nurgle's Rot:#9d8b16
Soulstone Blue:#142758
Spiritstone Red:#8a2a1e
Stirland Battlemire:#70490d
Stirland Mud:#482b00
Stormshield:#f9f9f9
Tesseract Glow:#65ab46
Typhus Corrosion:#373a22
Valhallan Blizzard:#e1e1e1
Waystone Green:#23513d
`,
  Air: `
Air Abaddon Black:#000000
Air Administratum Grey:#8f9690
Air Caste Thinner:#f9f9f9
Air Angron Red Clear:#e21823
Air Averland Sunset:#fbb81c
Air Balor Brown:#875408
Air Balthasar Gold:#a77353
Air Baneblade Brown:#8f7c68
Air Caledor Sky:#366699
Air Calgar Blue:#2a497f
Air Caliban Green:#003d15
Air Calth Blue Clear:#0087d1
Air Castellan Green:#264715
Air Castellax Bronze:#c68351
Air Chemos Purple:#4f356c
Air Corvus Black:#171314
Air Dawnstone:#697068
Air Death Korps Drab:#3d4539
Air Deathclaw Brown:#af634f
Air Deathshroud Clear:#1c1c1b
Air Deathworld Forest:#556229
Air Dryad Bark:#2b2a24
Air Eidolon Purple Clear:#7d4d99
Air Elysian Green:#6b8c37
Air Evil Sunz Scarlet:#c01411
Air Fenrisian Grey:#6d94b3
Air Flash Gitz Yellow:#fff300
Air Gal Vorbak Red:#4b213c
Air Genestealer Purple:#7658a5
Air Grey Knights Steel:#b0bdc6
Air Iron Hands Steel:#b2a79f
Air Ironbreaker:#899092
Air Kakophoni Purple:#8869ae
Air Kantor Blue:#02134e
Air Karak Stone:#b7945c
Air Khorne Red:#650001
Air Kislev Flesh:#d1a570
Air Leadbelcher:#969696
Air Lothern Blue:#2c9bcc
Air Lupercal Green:#002c2b
Air Macragge Blue:#0f3d7c
Air Mechanicus Standard Grey:#39484a
Air Mephiston Red:#960c09
Air Moot Green:#3daf44
Air Mortarion Green Clear:#00832b
Air Mournfang Brown:#490f06
Air Night Lords Blue:#002b5c
Air Nocturne Green:#162a29
Air Ogryn Camo:#96a648
Air Phalanx Yellow:#ffe200
Air Phoenician Purple:#440052
Air Pyroclast Orange Clear:#ed8022
Air Relictor Gold:#eac58f
Air Runefang Steel:#c2c8cc
Air Russ Grey:#507085
Air Sigismund Yellow Clear:#ffe32f
Air Sons of Horus Green:#00545e
Air Steel Legion Drab:#584e2d
Air Straken Green:#597f1c
Air Sybarite Green:#17a166
Air Tallarn Sand:#a07409
Air Tau Light Ochre:#bc6b10
Air Temple Guard Blue:#239489
Air Terminatus Stone:#c8b79d
Air Thallax Gold:#e88f47
Air The Fang:#405b71
Air Troll Slayer Orange:#f16c23
Air Tuskgor Fur:#863231
Air Typhon Ash:#e4d8c1
Air Ulthuan Grey:#c4ddd5
Air Ushabti Bone:#aba173
Air Valdor Gold:#ce8d51
Air Vulkan Green:#223c2e
Air Warboss Green:#317e57
Air White Scar:#ffffff
Air Word Bearers Red:#620104
Air XV-88:#6c4811
Air Zandri Dust:#988e56
`,
  'Tone Pro': `
Carmine Blades 1:#3c262a
Carmine Blades 2:#5b3539
Carmine Blades 3:#750019
Carmine Blades 4:#910022
Carmine Blades 5:#c64d50
Bloodtoof Red 1:#581e16
Bloodtoof Red 2:#94001e
Bloodtoof Red 3:#ad072b
Bloodtoof Red 4:#d60020
Bloodtoof Red 5:#ef353c
Chotec Orange 1:#93150b
Chotec Orange 2:#b82f2d
Chotec Orange 3:#e04a33
Chotec Orange 4:#f56230
Chotec Orange 5:#f78030
Ta'unar Ochre 1:#bb5528
Ta'unar Ochre 2:#d27144
Ta'unar Ochre 3:#e78344
Ta'unar Ochre 4:#ea9b6b
Ta'unar Ochre 5:#e9b06e
Khemri Sands 1:#6c4b12
Khemri Sands 2:#8d5e06
Khemri Sands 3:#b1791e
Khemri Sands 4:#cf8400
Khemri Sands 5:#dc9a00
Hawkshroud Yellow 1:#f69113
Hawkshroud Yellow 2:#fba200
Hawkshroud Yellow 3:#febb00
Hawkshroud Yellow 4:#ffd300
Hawkshroud Yellow 5:#fde07e
Megaboss Yellow 1:#f9ad00
Megaboss Yellow 2:#f8ce00
Megaboss Yellow 3:#ffe440
Megaboss Yellow 4:#f8e85f
Megaboss Yellow 5:#fff175
Plague Toad Venom 1:#49892d
Plague Toad Venom 2:#549b32
Plague Toad Venom 3:#80c234
Plague Toad Venom 4:#9cc829
Plague Toad Venom 5:#c8d600
Kruleboyz Green 1:#4a7d36
Kruleboyz Green 2:#627f3c
Kruleboyz Green 3:#7a823f
Kruleboyz Green 4:#939859
Kruleboyz Green 5:#aeb16c
Lustria Green 1:#004816
Lustria Green 2:#006929
Lustria Green 3:#007931
Lustria Green 4:#34ad40
Lustria Green 5:#4eb33f
Kasrkin Green 1:#001b1b
Kasrkin Green 2:#1f4530
Kasrkin Green 3:#40713c
Kasrkin Green 4:#678e55
Kasrkin Green 5:#86a978
Hierotek Green 1:#00321c
Hierotek Green 2:#00542d
Hierotek Green 3:#006a2e
Hierotek Green 4:#00894e
Hierotek Green 5:#00b681
Green Morkshroom 1:#143230
Green Morkshroom 2:#004f48
Green Morkshroom 3:#006458
Green Morkshroom 4:#007b6d
Green Morkshroom 5:#37ac83
Seraphon Blue 1:#002f34
Seraphon Blue 2:#004650
Seraphon Blue 3:#006874
Seraphon Blue 4:#008d92
Seraphon Blue 5:#00b7b9
Craventhrone Cloak 1:#08232e
Craventhrone Cloak 2:#12373e
Craventhrone Cloak 3:#164858
Craventhrone Cloak 4:#41717d
Craventhrone Cloak 5:#598a8e
Stormwolf Blue 1:#233f55
Stormwolf Blue 2:#405568
Stormwolf Blue 3:#54697d
Stormwolf Blue 4:#6e95a4
Stormwolf Blue 5:#87afb9
Scinari Blue 1:#004789
Scinari Blue 2:#005895
Scinari Blue 3:#006c9a
Scinari Blue 4:#0088bb
Scinari Blue 5:#009ab9
Blue Gorkshroom 1:#002356
Blue Gorkshroom 2:#004487
Blue Gorkshroom 3:#0057a3
Blue Gorkshroom 4:#006cad
Blue Gorkshroom 5:#007bb2
Ultramar Blue 1:#001a42
Ultramar Blue 2:#0f3062
Ultramar Blue 3:#0d4f88
Ultramar Blue 4:#436ca1
Ultramar Blue 5:#6d9ecf
Shalaxi Violet 1:#130040
Shalaxi Violet 2:#262e6d
Shalaxi Violet 3:#324e99
Shalaxi Violet 4:#6472b9
Shalaxi Violet 5:#7e8bc8
Enrapturess Dusk 1:#1e1435
Enrapturess Dusk 2:#413549
Enrapturess Dusk 3:#534d5e
Enrapturess Dusk 4:#6e6773
Enrapturess Dusk 5:#817a86
Hive Fleet Purple 1:#1e1a40
Hive Fleet Purple 2:#3c1e54
Hive Fleet Purple 3:#655192
Hive Fleet Purple 4:#8769b1
Hive Fleet Purple 5:#8f82ae
Magnus the Red 1:#3a202d
Magnus the Red 2:#4a123e
Magnus the Red 3:#76003f
Magnus the Red 4:#9a1b59
Magnus the Red 5:#aa4277
Eye of Terror 1:#920030
Eye of Terror 2:#bd0047
Eye of Terror 3:#c20060
Eye of Terror 4:#d4417b
Eye of Terror 5:#db6499
Carthalos Skin 1:#241815
Carthalos Skin 2:#2d140c
Carthalos Skin 3:#4e2212
Carthalos Skin 4:#5f3a37
Carthalos Skin 5:#795346
Celestine Skin 1:#cd8169
Celestine Skin 2:#d58b70
Celestine Skin 3:#d99578
Celestine Skin 4:#eaa889
Celestine Skin 5:#ddb398
Gnarlwood 1:#342928
Gnarlwood 2:#514235
Gnarlwood 3:#725c44
Gnarlwood 4:#776857
Gnarlwood 5:#887b67
Necrolith Bone 1:#877561
Necrolith Bone 2:#b0916a
Necrolith Bone 3:#b99f7d
Necrolith Bone 4:#c1ab86
Necrolith Bone 5:#bcb79e
Dataslate Grey 1:#2b2d28
Dataslate Grey 2:#3e3d35
Dataslate Grey 3:#555650
Dataslate Grey 4:#737069
Dataslate Grey 5:#878983
Blackstone Void 1:#000208
Blackstone Void 2:#4e5458
Blackstone Void 3:#6e7074
Blackstone Void 4:#9b9d9f
Blackstone Void 5:#ffffff
`,
}

function parse(): Paint[] {
  const out: Paint[] = []
  for (const range of Object.keys(RAW) as CitadelRange[]) {
    for (const line of RAW[range].split('\n')) {
      const t = line.trim()
      if (!t) continue
      const i = t.lastIndexOf(':')
      out.push({ id: out.length, name: t.slice(0, i), brand: 'citadel', range, hex: t.slice(i + 1) })
    }
  }
  return out
}

export const PAINTS = parse()

export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

// Orden cromático: grises/neutros primero (por luminosidad), luego por tono.
export function sortByColor(list: Paint[]): Paint[] {
  return [...list].sort((a, b) => {
    const [ha, sa, la] = hexToHsl(a.hex)
    const [hb, sb, lb] = hexToHsl(b.hex)
    const na = sa < 0.12 || la < 0.08 || la > 0.94
    const nb = sb < 0.12 || lb < 0.08 || lb > 0.94
    if (na !== nb) return na ? -1 : 1
    if (na) return la - lb
    const bucketA = Math.round(ha / 15)
    const bucketB = Math.round(hb / 15)
    if (bucketA !== bucketB) return bucketA - bucketB
    return la - lb
  })
}

const METALLICS = new Set([
  'Balthasar Gold',
  'Grey Knights Steel',
  'Iron Hands Steel',
  'Leadbelcher',
  'Retributor Armour',
  'Runelord Brass',
  'Warplock Bronze',
  'Auric Armour Gold',
  'Brass Scorpion',
  'Canoptek Alloy',
  'Fulgurite Copper',
  "Gehenna's Gold",
  'Hashut Copper',
  'Ironbreaker',
  'Liberator Gold',
  'Runefang Steel',
  'Stormhost Silver',
  'Necron Compound',
  'Golden Griffon',
  'Sigmarite',
  'Castellax Bronze',
  'Sycorax Bronze',
  'Skullcrusher Brass',
  'Iron Warriors',
])

const METAL_WORDS =
  /\b(metal\w*|gold|golden|silver|steel|bronze|copper|brass|iron|gunmetal|chrome|alumin\w*|platinum|titanium|pewter|mithril|oro|plata)\b/i

export function isMetallic(p: Paint): boolean {
  if (p.brand === 'citadel') return METALLICS.has(p.name.replace(/^Air /, ''))
  return METAL_WORDS.test(p.name) || /metal/i.test(p.range)
}

/** Pinturas translúcidas (lavados, tintas, contrast/speedpaint…). */
export function isWash(p: Paint): boolean {
  return /shade|wash|ink|contrast|speedpaint|xpress|instant|inktensity/i.test(p.range)
}
