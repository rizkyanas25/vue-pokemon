export const TILE_SIZE = 48 // 48px per tile, classic RPG maker style or zoomed in

export const TILE = {
  GRASS: 0,
  WALL: 1,
  WATER: 2,
  PATH: 3,
  BUSH: 4,
  BRIDGE: 5,
} as const

export type TileId = (typeof TILE)[keyof typeof TILE]

export const TILE_COLORS: Record<TileId, string> = {
  [TILE.GRASS]: '#4caf50',
  [TILE.WALL]: '#5d4037',
  [TILE.WATER]: '#2196f3',
  [TILE.PATH]: '#c8a46b',
  [TILE.BUSH]: '#3b8f3b',
  [TILE.BRIDGE]: '#d7a25c',
}

export const WALKABLE_TILES = new Set<TileId>([TILE.GRASS, TILE.PATH, TILE.BUSH, TILE.BRIDGE])

export type NpcData = {
  id: string
  name: string
  x: number
  y: number
  dialog: string[]
  color?: string
  sprite?: string | null
  pokemonId?: number
  pokemonKey?: string
  shopId?: string
  role?: 'trainer' | 'shop' | 'center'
  defeated?: boolean
}
