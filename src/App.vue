<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import WorldMap from './components/WorldMap.vue'
import PlayerCharacter from './components/PlayerCharacter.vue'
import BattleScene from './components/BattleScene.vue'

const store = useGameStore()

const handleKeydown = (e: KeyboardEvent) => {
  if (store.gameState !== 'ROAMING') return

  switch (e.key) {
    case 'ArrowUp':
    case 'w':
      store.setDirection('up')
      store.movePlayer(0, -1)
      break
    case 'ArrowDown':
    case 's':
      store.setDirection('down')
      store.movePlayer(0, 1)
      break
    case 'ArrowLeft':
    case 'a':
      store.setDirection('left')
      store.movePlayer(-1, 0)
      break
    case 'ArrowRight':
    case 'd':
      store.setDirection('right')
      store.movePlayer(1, 0)
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="game-container">
    <div class="ui-overlay">
      <h1>Pokemon Vue</h1>
      <p v-if="store.gameState === 'ROAMING'">Use Arrow Keys to Move</p>
      <p v-else>Battle Mode!</p>
    </div>

    <div class="viewport">
      <template v-if="store.gameState === 'ROAMING'">
        <WorldMap>
          <PlayerCharacter />
        </WorldMap>
      </template>
      <template v-else-if="store.gameState === 'BATTLE'">
        <BattleScene />
      </template>
    </div>
  </main>
</template>

<style>
/* Global resets */
body {
  margin: 0;
  background-color: #222;
  color: white;
  font-family: 'Press Start 2P', cursive, sans-serif; /* Pixel font if available */
  overflow: hidden;
}

.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.ui-overlay {
  text-align: center;
  margin-bottom: 20px;
}

.viewport {
  border: 4px solid #fff;
  border-radius: 4px;
  overflow: hidden;
  /* Simulate gameboy screen size? or larger */
  background-color: #000;
}
</style>
