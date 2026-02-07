import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameState = 'ROAMING' | 'BATTLE' | 'MENU'

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameState>('ROAMING')

  const player = ref({
    x: 5,
    y: 5,
    direction: 'down' as Direction,
    step: 0, // For animation
    party: [] as any[], // TODO: Define Pokemon type
  })

  // 0 = grass, 1 = wall, 2 = water, 3 = door
  const currentMap = ref<number[][]>([
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ])

  function movePlayer(dx: number, dy: number) {
    if (gameState.value !== 'ROAMING') return

    const newX = player.value.x + dx
    const newY = player.value.y + dy

    // Check bounds
    if (
      newY < 0 ||
      newY >= currentMap.value.length ||
      newX < 0 ||
      !currentMap.value[0] ||
      newX >= currentMap.value[0].length
    ) {
      return
    }

    // Check collision (1 is wall, 2 is water)
    const row = currentMap.value[newY]
    if (!row) return
    const tile = row[newX]
    if (tile === 1 || tile === 2) {
      // Bump sound?
      return
    }

    player.value.x = newX
    player.value.y = newY
    player.value.step = (player.value.step + 1) % 2

    // Check for encounters (random chance on grass '0')
    if (tile === 0 && Math.random() < 0.15) {
      gameState.value = 'BATTLE'
      // TODO: Init battle
    }
  }

  function setDirection(dir: Direction) {
    player.value.direction = dir
  }

  return {
    gameState,
    player,
    currentMap,
    movePlayer,
    setDirection,
  }
})
