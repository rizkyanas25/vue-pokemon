import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TILE, WALKABLE_TILES, type TileId, type NpcData } from '../constants/game'
import { overworldMap, overworldNpcs, overworldSpawn } from '../data/overworld'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameState = 'ROAMING' | 'BATTLE' | 'MENU' | 'DIALOG'

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameState>('ROAMING')

  const player = ref({
    x: overworldSpawn.x,
    y: overworldSpawn.y,
    direction: 'down' as Direction,
    step: 0,
    party: [] as any[], // TODO: Define Pokemon type
  })

  const currentMap = ref<TileId[][]>(overworldMap.tiles)
  const npcs = ref<NpcData[]>(overworldNpcs)

  const dialog = ref<{
    speaker?: string
    lines: string[]
    index: number
  } | null>(null)

  const getNpcAt = (x: number, y: number) => npcs.value.find((npc) => npc.x === x && npc.y === y)

  const isWalkable = (x: number, y: number) => {
    const row = currentMap.value[y]
    if (!row) return false
    const tile = row[x]
    if (tile === undefined) return false
    return WALKABLE_TILES.has(tile)
  }

  const getFrontTile = () => {
    const { x, y, direction } = player.value
    if (direction === 'up') return { x, y: y - 1 }
    if (direction === 'down') return { x, y: y + 1 }
    if (direction === 'left') return { x: x - 1, y }
    return { x: x + 1, y }
  }

  function movePlayer(dx: number, dy: number) {
    if (gameState.value !== 'ROAMING') return

    const newX = player.value.x + dx
    const newY = player.value.y + dy

    if (!isWalkable(newX, newY)) return
    if (getNpcAt(newX, newY)) return

    const tile = currentMap.value[newY]?.[newX]
    if (tile === undefined) return

    player.value.x = newX
    player.value.y = newY
    player.value.step = (player.value.step + 1) % 2

    // Check for encounters only in grass
    if (tile === TILE.GRASS && Math.random() < 0.08) {
      gameState.value = 'BATTLE'
    }
  }

  function setDirection(dir: Direction) {
    player.value.direction = dir
  }

  function tryInteract() {
    if (gameState.value !== 'ROAMING') return
    const target = getFrontTile()
    const npc = getNpcAt(target.x, target.y)
    if (!npc) return

    dialog.value = {
      speaker: npc.name,
      lines: npc.dialog,
      index: 0,
    }
    gameState.value = 'DIALOG'
  }

  function advanceDialog() {
    if (!dialog.value) return
    if (dialog.value.index < dialog.value.lines.length - 1) {
      dialog.value.index += 1
      return
    }

    dialog.value = null
    gameState.value = 'ROAMING'
  }

  return {
    gameState,
    player,
    currentMap,
    npcs,
    dialog,
    movePlayer,
    setDirection,
    tryInteract,
    advanceDialog,
  }
})
