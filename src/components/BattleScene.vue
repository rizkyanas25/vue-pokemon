<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import pikachuImg from '@/assets/sprites/pikachu.png'
import bulbasaurImg from '@/assets/sprites/bulbasaur.png'

const store = useGameStore()

const enemy = ref({
  name: 'Wild Bulbasaur',
  maxHp: 20,
  hp: 20,
  sprite: bulbasaurImg,
})

const playerPokemon = ref({
  name: 'Pikachu',
  maxHp: 25,
  hp: 25,
  sprite: pikachuImg,
})

// Battle State Machine
type BattleState =
  | 'PLAYER_INPUT'
  | 'PLAYER_ATTACK_ANIM'
  | 'ENEMY_TURN'
  | 'ENEMY_ATTACK_ANIM'
  | 'WIN'
  | 'LOSE'
  | 'RUN'

const battleState = ref<BattleState>('PLAYER_INPUT')
const battleLog = ref('A wild Pokemon appeared!')

// Computed to show menu or text
const showMenu = computed(() => battleState.value === 'PLAYER_INPUT' && battleLog.value === '')

const attack = () => {
  if (battleState.value !== 'PLAYER_INPUT') return

  // Player attacks
  const damage = Math.floor(Math.random() * 5) + 2
  enemy.value.hp = Math.max(0, enemy.value.hp - damage)
  battleLog.value = `${playerPokemon.value.name} used Thunder Shock!`

  if (enemy.value.hp <= 0) {
    battleState.value = 'WIN'
  } else {
    battleState.value = 'PLAYER_ATTACK_ANIM' // Waiting for user to click text
  }
}

const run = () => {
  battleLog.value = 'Got away safely!'
  battleState.value = 'RUN'
}

const nextText = () => {
  if (battleLog.value === '') return

  // Clear current text
  battleLog.value = ''

  // Handle state transitions based on what just happened
  if (battleState.value === 'PLAYER_ATTACK_ANIM') {
    // Pokemon took damage text?
    battleLog.value = `Dealt damage!`
    battleState.value = 'ENEMY_TURN'
    return
  }

  if (battleState.value === 'ENEMY_TURN') {
    const damage = Math.floor(Math.random() * 4) + 1
    playerPokemon.value.hp = Math.max(0, playerPokemon.value.hp - damage)
    battleLog.value = `${enemy.value.name} used Tackle!`

    if (playerPokemon.value.hp <= 0) {
      battleState.value = 'LOSE'
    } else {
      battleState.value = 'ENEMY_ATTACK_ANIM'
    }
    return
  }

  if (battleState.value === 'ENEMY_ATTACK_ANIM') {
    battleLog.value = `Took damage!`
    battleState.value = 'PLAYER_INPUT' // Back to menu
    return
  }

  if (battleState.value === 'WIN') {
    battleLog.value = 'Enemy fainted! You won!'
    // Next click exits
    setTimeout(() => (store.gameState = 'ROAMING'), 1000)
  }

  if (battleState.value === 'LOSE') {
    battleLog.value = 'You fainted...'
    setTimeout(() => {
      playerPokemon.value.hp = playerPokemon.value.maxHp
      store.gameState = 'ROAMING'
    }, 1000)
  }

  if (battleState.value === 'RUN') {
    store.gameState = 'ROAMING'
  }
}
</script>

<template>
  <div class="battle-scene">
    <div class="battle-arena">
      <!-- Enemy HUD -->
      <div class="hud enemy-hud">
        <div class="name">{{ enemy.name }}</div>
        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }"></div>
        </div>
        <div class="hp-text">{{ enemy.hp }} / {{ enemy.maxHp }}</div>
      </div>

      <div class="sprite-container enemy-sprite">
        <img :src="enemy.sprite" alt="Enemy" />
      </div>

      <!-- Player Sprite -->
      <div class="sprite-container player-sprite">
        <img :src="playerPokemon.sprite" alt="Player" />
      </div>

      <!-- Player HUD -->
      <div class="hud player-hud">
        <div class="name">{{ playerPokemon.name }}</div>
        <div class="hp-bar">
          <div
            class="hp-fill"
            :style="{ width: `${(playerPokemon.hp / playerPokemon.maxHp) * 100}%` }"
          ></div>
        </div>
        <div class="hp-text">{{ playerPokemon.hp }} / {{ playerPokemon.maxHp }}</div>
      </div>
    </div>

    <!-- Dialog / Menu -->
    <div class="battle-menu">
      <div class="battle-text" v-if="!showMenu" @click="nextText" style="cursor: pointer">
        {{ battleLog }}
        <span class="blinking-arrow">▼</span>
      </div>
      <div class="actions" v-else>
        <button @click="attack">FIGHT</button>
        <button>BAG</button>
        <button>POKEMON</button>
        <button @click="run">RUN</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-scene {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
  font-family: 'Press Start 2P', cursive;
  z-index: 200; /* Above UI overlay */
  background-image: linear-gradient(to bottom, #d0f8d0 0%, #d0f8d0 50%, #70b870 50%, #70b870 100%);
}

.battle-arena {
  flex: 1;
  position: relative;
}

.sprite-container {
  position: absolute;
}
.sprite-container img {
  width: 144px; /* 3x scale */
  image-rendering: pixelated;
}

.enemy-sprite {
  top: 40px;
  right: 40px;
}

.player-sprite {
  bottom: 20px;
  left: 40px;
  transform: scaleX(-1); /* Flip if using front sprite */
}

.hud {
  position: absolute;
  background: #fff;
  border: 2px solid #333;
  border-radius: 4px;
  padding: 8px;
  width: 200px;
  color: #000; /* Ensure text is visible */
}

.enemy-hud {
  top: 20px;
  left: 20px;
}

.player-hud {
  bottom: 40px;
  right: 40px;
}

.hp-bar {
  width: 100%;
  height: 10px;
  background: #ddd;
  margin-top: 4px;
  border: 1px solid #333;
}

.hp-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.5s;
}

.battle-menu {
  height: 120px;
  background: #333;
  color: white;
  padding: 16px;
  border-top: 4px solid #000;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  height: 100%;
}

button {
  background: #fff;
  border: 2px solid #888;
  font-family: inherit;
  font-size: 16px;
  cursor: pointer;
  text-align: left;
  padding: 10px;
}
button:hover {
  background: #eee;
  border-color: #f00;
}

.battle-text {
  font-size: 18px;
  line-height: 1.5;
  position: relative;
}

.blinking-arrow {
  position: absolute;
  bottom: 0;
  right: 0;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
