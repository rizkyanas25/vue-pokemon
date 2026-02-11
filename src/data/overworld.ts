import { TILE, type TileId, type NpcData } from '../constants/game'
import { trainerSprite } from './trainers'

const MAP_TEMPLATE = [
  '........bbbb..........bbbb.....bbbb........',
  '..bbb...bbbb..====....bbbbb...bbb..........',
  '..bbb...bbbb..====..~~B~..b..bbb...bbbb....',
  '..bbb...bbbb..====..~~B~.....bbb...bbbb....',
  '....bbbbb..........bbbb......bbbbb.........',
  '...######..bbb.######........bbb..######...',
  '...#....#..bbb...#....====...bbb..#....#...',
  '...#....#....==..#.....====.......#....#...',
  '...######..bb==..####..====..bb...######...',
  '....bbbbb.....==..bbb........bb............',
  '....~~B~..bbb.........bbbb...........bbb...',
  '....~~B~..b..####.....bbbb..====.....bbb...',
  '....bbb....==.....bbb.......====..bbb......',
  '....bbbb........bbbb........====..bbb......',
  '..........bbbb..........bbbb......bbb......',
  '...bbb....bbbb..====....bbbbb..............',
  '...bbb....bbbb..====..~~B~..b..bbbb........',
  '...bbb............==..~~B~.....bbbb........',
  '......bbbbb..........bbbb......bbbbb.......',
  '....######..bbb.######........bbb..####....',
  '....#....#..bbb...#....====...bbb..#..#....',
  '....#....#....==..#.....====.......#..#....',
  '....######..bb==..####..====..bb...####....',
  '.....bbbbb.....==..bbb........bb...........',
  '..bbb..~~B~..bbb.........bbbb.......bbb....',
  '..bbb..~~B~..b..####.....bbbb..==...bbb....',
]

const LEGEND: Record<string, TileId> = {
  '#': TILE.WALL,
  '.': TILE.GRASS,
  '~': TILE.WATER,
  '=': TILE.PATH,
  'b': TILE.BUSH,
  'B': TILE.BRIDGE,
}

const parseMap = (rows: string[]): TileId[][] => {
  const width = rows[0]?.length ?? 0
  return rows.map((row, rowIndex) => {
    if (row.length !== width) {
      throw new Error(`Map row ${rowIndex} has length ${row.length}, expected ${width}`)
    }

    return Array.from(row).map((char, colIndex) => {
      const tile = LEGEND[char]
      if (tile === undefined) {
        throw new Error(`Unknown tile '${char}' at (${colIndex}, ${rowIndex})`)
      }
      return tile
    })
  })
}

export const overworldMap = {
  name: 'Route 1',
  width: MAP_TEMPLATE[0]?.length ?? 0,
  height: MAP_TEMPLATE.length,
  tiles: parseMap(MAP_TEMPLATE),
}

export const overworldSpawn = { x: 11, y: 18 }

export const overworldNpcs: NpcData[] = [
  {
    id: 'trainer-ace',
    name: 'Ace Trainer',
    x: 12,
    y: 4,
    sprite: trainerSprite('acetrainer-gen4'),
    dialog: ['Let me test your team!'],
    role: 'trainer',
    defeated: false,
  },
  {
    id: 'trainer-biker',
    name: 'Biker',
    x: 30,
    y: 10,
    sprite: trainerSprite('biker'),
    dialog: ['You want a battle?'],
    role: 'trainer',
    defeated: false,
  },
  {
    id: 'merchant',
    name: 'Poke Mart',
    x: 11,
    y: 17,
    sprite: '/sprites/Poke_Mart_FRLG.png',
    shopId: 'general',
    dialog: ['Welcome! Take a look at our goods.'],
    role: 'shop',
  },
]
