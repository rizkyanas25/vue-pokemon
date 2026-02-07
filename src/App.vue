<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import WorldMap from './components/WorldMap.vue'
import PlayerCharacter from './components/PlayerCharacter.vue'
import BattleScene from './components/BattleScene.vue'
import DialogBox from './components/DialogBox.vue'
import GameMenu from './components/GameMenu.vue'
import StarterSelect from './components/StarterSelect.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import ShopMenu from './components/ShopMenu.vue'
import TrainerSelect from './components/TrainerSelect.vue'
import BattleTransition from './components/BattleTransition.vue'

const store = useGameStore()

const handleKeydown = (e: KeyboardEvent) => {
  if (
    store.isLoading ||
    store.gameState === 'STARTER' ||
    store.gameState === 'TRAINER_SELECT' ||
    store.gameState === 'TRANSITION'
  )
    return

  if (store.gameState === 'DIALOG') {
    if (e.key === 'Enter' || e.key === ' ') {
      if (!e.repeat) store.advanceDialog()
    }
    return
  }

  if (store.gameState === 'MENU') {
    if ((e.key === 'Escape' || e.key === 'm') && !e.repeat) {
      store.closeMenu()
    }
    return
  }

  if (store.gameState === 'SHOP') {
    if ((e.key === 'Escape' || e.key === 'm') && !e.repeat) {
      store.closeShop()
    }
    return
  }

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
    case 'Escape':
    case 'm':
      if (!e.repeat) store.openMenu()
      break
    case 'Enter':
    case ' ':
    case 'e':
      if (!e.repeat) store.tryInteract()
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  store.bootstrap()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="game-container">
    <div class="ui-overlay">
      <h1>Pokevue</h1>
      <p v-if="store.gameState === 'ROAMING'">
        Move with Arrow Keys, talk with Enter/Space, menu with M/Esc
      </p>
      <p v-else-if="store.gameState === 'DIALOG'">Talking...</p>
      <p v-else-if="store.gameState === 'MENU'">Menu</p>
      <p v-else-if="store.gameState === 'STARTER'">Choose your starter</p>
      <p v-else-if="store.gameState === 'TRAINER_SELECT'">Choose your trainer</p>
      <p v-else-if="store.gameState === 'TRANSITION'">Encounter!</p>
      <p v-else-if="store.gameState === 'SHOP'">Shop</p>
      <p v-else>Battle Mode!</p>
    </div>

    <div class="viewport">
      <template v-if="store.gameState !== 'BATTLE'">
        <WorldMap>
          <PlayerCharacter />
        </WorldMap>
      </template>
      <template v-else>
        <BattleScene />
      </template>
    </div>

    <DialogBox v-if="store.gameState === 'DIALOG' && store.dialog" :dialog="store.dialog" />
    <GameMenu v-if="store.gameState === 'MENU'" />
    <ShopMenu v-if="store.gameState === 'SHOP'" />
    <TrainerSelect v-if="store.gameState === 'TRAINER_SELECT'" />
    <StarterSelect v-if="store.gameState === 'STARTER'" />
    <LoadingOverlay v-if="store.isLoading" />
    <BattleTransition v-if="store.battleTransition" :kind="store.battleTransition.kind" />
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
  display: block; /* Removed flex center */
  width: 100vw;
  height: 100vh;
  position: relative;
}

.ui-overlay {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 10px;
  border-radius: 8px;
  pointer-events: none; /* Allow clicking through to map if needed */
}

.viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #000;
}
</style>
