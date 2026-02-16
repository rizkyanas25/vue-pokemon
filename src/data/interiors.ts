import { TILE, type NpcData, type TileId } from '../constants/game'
import { trainerSprite } from './trainers'

export type InteriorId = 'pokemon_center' | 'poke_mart'

type InteriorData = {
  id: InteriorId
  name: string
  tiles: TileId[][]
  spawn: { x: number; y: number }
  exitTiles: Array<{ x: number; y: number }>
  npcs: NpcData[]
}

const LEGEND: Record<string, TileId> = {
  '#': TILE.WALL,
  '=': TILE.PATH,
}

const parseRows = (rows: string[]) => {
  const width = rows[0]?.length ?? 0
  return rows.map((row, rowIndex) => {
    if (row.length !== width) {
      throw new Error(`Interior row ${rowIndex} has length ${row.length}, expected ${width}`)
    }
    return Array.from(row).map((char, colIndex) => {
      const tile = LEGEND[char]
      if (tile === undefined) {
        throw new Error(`Unknown interior tile '${char}' at (${colIndex}, ${rowIndex})`)
      }
      return tile
    })
  })
}

const CENTER_ROWS = [
  '##############',
  '#============#',
  '#===######===#',
  '#============#',
  '#============#',
  '#============#',
  '#============#',
  '#============#',
  '#============#',
  '######==######',
]

const MART_ROWS = [
  '##############',
  '#============#',
  '#===######===#',
  '#============#',
  '#============#',
  '#============#',
  '#============#',
  '#============#',
  '#============#',
  '######==######',
]

export const INTERIORS: Record<InteriorId, InteriorData> = {
  pokemon_center: {
    id: 'pokemon_center',
    name: 'Pokemon Center',
    tiles: parseRows(CENTER_ROWS),
    spawn: { x: 6, y: 8 },
    exitTiles: [
      { x: 6, y: 9 },
      { x: 7, y: 9 },
    ],
    npcs: [
      {
        id: 'center-nurse',
        name: 'Nurse Joy',
        x: 6,
        y: 3,
        sprite: trainerSprite('nurse'),
        dialog: ['Welcome to the Pokemon Center!', "We'll heal your Pokemon right away."],
        role: 'center',
      },
    ],
  },
  poke_mart: {
    id: 'poke_mart',
    name: 'Poke Mart',
    tiles: parseRows(MART_ROWS),
    spawn: { x: 6, y: 8 },
    exitTiles: [
      { x: 6, y: 9 },
      { x: 7, y: 9 },
    ],
    npcs: [
      {
        id: 'mart-clerk',
        name: 'Shop Clerk',
        x: 6,
        y: 3,
        sprite: trainerSprite('clerk'),
        shopId: 'general',
        dialog: ['Welcome! How can I help you today?'],
        role: 'shop',
      },
    ],
  },
}
