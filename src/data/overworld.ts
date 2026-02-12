import { TILE, type TileId, type NpcData } from '../constants/game'
import { trainerSprite } from './trainers'

const CENTER_MAP_TEMPLATE = [
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

const MAP_WIDTH = CENTER_MAP_TEMPLATE[0]?.length ?? 0
const MAP_HEIGHT = CENTER_MAP_TEMPLATE.length

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

const createGrassGrid = () =>
  Array.from({ length: MAP_HEIGHT }, () => Array.from({ length: MAP_WIDTH }, () => '.'))

const setTile = (grid: string[][], x: number, y: number, tile: string) => {
  if (x < 0 || y < 0 || y >= grid.length || x >= (grid[0]?.length ?? 0)) return
  grid[y]![x] = tile
}

const fillRect = (grid: string[][], x: number, y: number, width: number, height: number, tile: string) => {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      setTile(grid, col, row, tile)
    }
  }
}

const outlineRect = (
  grid: string[][],
  x: number,
  y: number,
  width: number,
  height: number,
  tile: string,
) => {
  for (let col = x; col < x + width; col += 1) {
    setTile(grid, col, y, tile)
    setTile(grid, col, y + height - 1, tile)
  }
  for (let row = y; row < y + height; row += 1) {
    setTile(grid, x, row, tile)
    setTile(grid, x + width - 1, row, tile)
  }
}

const stampBushPatch = (grid: string[][], x: number, y: number, width: number, height: number) => {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      if ((col + row) % 2 === 0) setTile(grid, col, row, 'b')
    }
  }
}

const carveRoad = (grid: string[][], mapX: number, mapY: number) => {
  const verticalX = mapX === 0 ? 14 : mapX === 2 ? 28 : 21
  const horizontalY = mapY === 0 ? 8 : mapY === 2 ? 18 : 13

  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    setTile(grid, verticalX, y, '=')
    setTile(grid, verticalX + 1, y, '=')
  }
  for (let x = 0; x < MAP_WIDTH; x += 1) {
    setTile(grid, x, horizontalY, '=')
    setTile(grid, x, horizontalY + 1, '=')
  }

  fillRect(grid, verticalX - 1, horizontalY - 1, 4, 4, '=')
}

const addMapTheme = (grid: string[][], key: string) => {
  switch (key) {
    case '0,0':
      fillRect(grid, 3, 3, 12, 6, '~')
      for (let y = 3; y < 9; y += 1) setTile(grid, 8, y, 'B')
      outlineRect(grid, 24, 3, 13, 8, '#')
      fillRect(grid, 27, 5, 7, 4, '.')
      stampBushPatch(grid, 2, 15, 16, 8)
      stampBushPatch(grid, 20, 16, 9, 6)
      break
    case '1,0':
      fillRect(grid, 5, 3, 34, 5, '~')
      for (let x = 20; x <= 22; x += 1) {
        for (let y = 3; y < 8; y += 1) setTile(grid, x, y, 'B')
      }
      outlineRect(grid, 7, 12, 10, 7, '#')
      outlineRect(grid, 26, 12, 10, 7, '#')
      stampBushPatch(grid, 3, 20, 14, 5)
      stampBushPatch(grid, 24, 20, 14, 5)
      break
    case '2,0':
      outlineRect(grid, 4, 3, 15, 9, '#')
      outlineRect(grid, 24, 4, 15, 10, '#')
      fillRect(grid, 8, 16, 10, 6, '~')
      for (let x = 11; x <= 13; x += 1) {
        for (let y = 16; y < 22; y += 1) setTile(grid, x, y, 'B')
      }
      stampBushPatch(grid, 25, 16, 14, 8)
      break
    case '0,1':
      stampBushPatch(grid, 2, 2, 13, 8)
      fillRect(grid, 19, 3, 18, 6, '~')
      for (let y = 3; y < 9; y += 1) setTile(grid, 28, y, 'B')
      outlineRect(grid, 4, 16, 13, 8, '#')
      fillRect(grid, 7, 18, 7, 4, '.')
      stampBushPatch(grid, 23, 16, 14, 8)
      break
    case '2,1':
      stampBushPatch(grid, 3, 3, 16, 6)
      outlineRect(grid, 22, 2, 18, 10, '#')
      fillRect(grid, 26, 5, 6, 4, '.')
      fillRect(grid, 6, 15, 12, 8, '~')
      for (let x = 10; x <= 12; x += 1) {
        for (let y = 15; y < 23; y += 1) setTile(grid, x, y, 'B')
      }
      stampBushPatch(grid, 23, 15, 16, 8)
      break
    case '0,2':
      fillRect(grid, 4, 4, 14, 9, '~')
      for (let y = 4; y < 13; y += 1) setTile(grid, 10, y, 'B')
      outlineRect(grid, 22, 4, 17, 8, '#')
      fillRect(grid, 25, 6, 11, 4, '.')
      stampBushPatch(grid, 3, 16, 16, 8)
      stampBushPatch(grid, 22, 17, 15, 7)
      break
    case '1,2':
      stampBushPatch(grid, 3, 3, 13, 7)
      stampBushPatch(grid, 27, 3, 13, 7)
      fillRect(grid, 17, 5, 9, 5, '~')
      for (let x = 20; x <= 22; x += 1) {
        for (let y = 5; y < 10; y += 1) setTile(grid, x, y, 'B')
      }
      outlineRect(grid, 6, 14, 12, 8, '#')
      outlineRect(grid, 25, 14, 12, 8, '#')
      fillRect(grid, 19, 18, 5, 5, 'b')
      break
    case '2,2':
      fillRect(grid, 5, 4, 11, 7, '~')
      for (let y = 4; y < 11; y += 1) setTile(grid, 10, y, 'B')
      stampBushPatch(grid, 20, 3, 20, 8)
      outlineRect(grid, 4, 16, 14, 8, '#')
      fillRect(grid, 8, 19, 6, 2, '.')
      fillRect(grid, 23, 16, 15, 8, '~')
      for (let x = 29; x <= 31; x += 1) {
        for (let y = 16; y < 24; y += 1) setTile(grid, x, y, 'B')
      }
      break
  }
}

const clearBlockedEdgeTiles = (grid: string[][]) => {
  const replaceIfBlocked = (x: number, y: number) => {
    const tile = grid[y]?.[x]
    if (tile === '#' || tile === '~') setTile(grid, x, y, '.')
  }

  for (let x = 0; x < MAP_WIDTH; x += 1) {
    replaceIfBlocked(x, 0)
    replaceIfBlocked(x, MAP_HEIGHT - 1)
  }
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    replaceIfBlocked(0, y)
    replaceIfBlocked(MAP_WIDTH - 1, y)
  }
}

const buildSectorTemplate = (mapX: number, mapY: number): string[] => {
  if (mapX === 1 && mapY === 1) return CENTER_MAP_TEMPLATE

  const key = `${mapX},${mapY}`
  const grid = createGrassGrid()
  carveRoad(grid, mapX, mapY)
  addMapTheme(grid, key)
  clearBlockedEdgeTiles(grid)
  return grid.map((row) => row.join(''))
}

const sectorTemplateCache: Record<string, string[]> = {}

export const getOverworldSectorTiles = (mapX: number, mapY: number) => {
  const key = `${mapX},${mapY}`
  const template = sectorTemplateCache[key] ?? (sectorTemplateCache[key] = buildSectorTemplate(mapX, mapY))
  return parseMap(template)
}

export const overworldMap = {
  name: 'Route 1',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  tiles: parseMap(CENTER_MAP_TEMPLATE),
}

export const overworldSpawn = { x: 11, y: 18 }
export const pokemonCenterRespawn = { mapX: 1, mapY: 1, x: 13, y: 18 }

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
    interiorId: 'poke_mart',
    dialog: ['Step inside the Poke Mart if you need supplies.'],
    role: 'portal',
  },
  {
    id: 'pokemon-center-nurse',
    name: 'Pokemon Center',
    x: 13,
    y: 17,
    sprite: trainerSprite('nurse'),
    interiorId: 'pokemon_center',
    dialog: ['Need a rest? The Pokemon Center is open.'],
    role: 'portal',
  },
]
