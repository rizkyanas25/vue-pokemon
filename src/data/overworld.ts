import { TILE, type TileId, type NpcData } from '../constants/game'
import { trainerSprite } from './trainers'

const MAP_TEMPLATE = [
  '######################',
  '#......====..........#',
  '#......====....~~~~..#',
  '#......====....~~~~..#',
  '#....................#',
  '#..######......#######',
  '#..#....#........#...#',
  '#..#....#....==..#...#',
  '#..######....==..#####',
  '#..............==....#',
  '#....~~~~............#',
  '#....~~~~...####.....#',
  '#..........==........#',
  '######################',
]

const LEGEND: Record<string, TileId> = {
  '#': TILE.WALL,
  '.': TILE.GRASS,
  '~': TILE.WATER,
  '=': TILE.PATH,
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
  width: MAP_TEMPLATE[0].length,
  height: MAP_TEMPLATE.length,
  tiles: parseMap(MAP_TEMPLATE),
}

export const overworldSpawn = { x: 11, y: 12 }

export const overworldNpcs: NpcData[] = [
  {
    id: 'mom',
    name: 'Mom',
    x: 6,
    y: 4,
    sprite: trainerSprite('caretaker'),
    dialog: [
      'Morning! Your adventure starts here.',
      'Check your Bag often.',
      'And remember to save!',
    ],
    color: '#f4c2c2',
  },
  {
    id: 'ranger',
    name: 'Ranger',
    x: 13,
    y: 7,
    sprite: trainerSprite('backpacker'),
    dialog: [
      'Watch the tall grass.',
      'Wild Pokemon hide there.',
    ],
    color: '#8ecae6',
  },
  {
    id: 'kid',
    name: 'Kid',
    x: 15,
    y: 9,
    sprite: trainerSprite('camper'),
    dialog: [
      'I saw something shiny by the water!',
      'Maybe it was a Pokemon?',
    ],
    color: '#ffb703',
  },
  {
    id: 'merchant',
    name: 'Clerk',
    x: 4,
    y: 9,
    sprite: trainerSprite('clerk'),
    shopId: 'general',
    dialog: ['Welcome! Take a look at our goods.'],
    color: '#cdb4db',
  },
]
