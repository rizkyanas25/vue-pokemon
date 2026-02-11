<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

const move = (dx: number, dy: number) => {
  if (store.gameState !== 'ROAMING') return
  store.movePlayer(dx, dy)
  if (dx === 1) store.setDirection('right')
  if (dx === -1) store.setDirection('left')
  if (dy === 1) store.setDirection('down')
  if (dy === -1) store.setDirection('up')
}

const interact = () => {
  if (store.gameState === 'DIALOG') {
    store.advanceDialog()
  } else if (store.gameState === 'ROAMING') {
    store.tryInteract()
  }
  // Handle other states if needed, e.g., Shop selection?
}

const menu = () => {
  if (store.gameState === 'ROAMING') {
    store.openMenu()
  } else if (store.gameState === 'MENU') {
    store.closeMenu()
  } else if (store.gameState === 'SHOP') {
    store.closeShop()
  }
}

// Helper for repeating hold actions could be added, but simple click for now
</script>

<template>
  <div class="virtual-controls">
    <div class="d-pad">
      <button class="btn-up" @click="move(0, -1)">▲</button>
      <button class="btn-left" @click="move(-1, 0)">◀</button>
      <button class="btn-right" @click="move(1, 0)">▶</button>
      <button class="btn-down" @click="move(0, 1)">▼</button>
    </div>

    <div class="action-buttons">
      <button class="btn-b" @click="menu">B</button>
      <button class="btn-a" @click="interact">A</button>
    </div>
  </div>
</template>

<style scoped>
.virtual-controls {
  position: absolute;
  bottom: 20px;
  left: 0;
  width: 100%;
  height: 140px;
  pointer-events: none; /* Let clicks pass through empty areas */
  z-index: 1000;
  display: none; /* Hidden by default on desktop */
}

/* Show on touch devices or small screens */
@media (max-width: 768px) {
  .virtual-controls {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    bottom: calc(env(safe-area-inset-bottom) + 12px);
    height: 128px;
    padding-left: calc(env(safe-area-inset-left) + 12px);
    padding-right: calc(env(safe-area-inset-right) + 12px);
  }

  .action-buttons {
    transform: translateY(-12px);
  }
}

.d-pad,
.action-buttons {
  pointer-events: auto;
  position: relative;
  width: 120px;
  height: 120px;
}

button {
  position: absolute;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  color: white;
  font-family: inherit;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  touch-action: manipulation;
}

button:active {
  background: rgba(255, 255, 255, 0.5);
}

/* D-Pad positioning */
.btn-up {
  top: 0;
  left: 40px;
}
.btn-left {
  top: 40px;
  left: 0;
}
.btn-right {
  top: 40px;
  left: 80px;
}
.btn-down {
  top: 80px;
  left: 40px;
}

/* Action Buttons positioning */
.btn-a {
  bottom: 20px;
  right: 0;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(50, 200, 50, 0.4);
  font-weight: bold;
}

.btn-b {
  bottom: 0;
  right: 60px; /* Offset from A */
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(200, 50, 50, 0.4);
  font-weight: bold;
}
</style>
