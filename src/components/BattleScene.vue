<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import pikachuImg from '@/assets/sprites/pikachu.png'
import bulbasaurImg from '@/assets/sprites/bulbasaur.png'

const store = useGameStore()

// Mock checking for "wild pokemon"
// In a real app this would come from the store's encounter data
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

const battleLog = ref('A wild Pokemon appeared!')
const isPlayerTurn = ref(true)

const attack = () => {
  if (!isPlayerTurn.value) return

  // Player attacks
  const damage = Math.floor(Math.random() * 5) + 2
  enemy.value.hp = Math.max(0, enemy.value.hp - damage)
  battleLog.value = `Pikachu used Thunder Shock! Dealt ${damage} damage.`
  isPlayerTurn.value = false

  if (enemy.value.hp <= 0) {
    setTimeout(() => endBattle(true), 1500)
  } else {
    setTimeout(enemyTurn, 1500)
  }
}

const enemyTurn = () => {
  const damage = Math.floor(Math.random() * 4) + 1
  playerPokemon.value.hp = Math.max(0, playerPokemon.value.hp - damage)
  battleLog.value = `Wild pokemon used Tackle! Dealt ${damage} damage.`
  isPlayerTurn.value = true

  if (playerPokemon.value.hp <= 0) {
    setTimeout(() => endBattle(false), 1500)
  }
}

const run = () => {
  battleLog.value = 'Got away safely!'
  setTimeout(() => {
    store.gameState = 'ROAMING'
  }, 1000)
}

const endBattle = (win: boolean) => {
  if (win) {
    battleLog.value = 'Enemy fainted! You won!'
  } else {
    battleLog.value = 'Pikachu fainted! You whited out...'
  }
  setTimeout(() => {
    // Heal for now
    playerPokemon.value.hp = playerPokemon.value.maxHp
    // Back to map
    store.gameState = 'ROAMING'
  }, 2000)
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
      <div class="battle-text" v-if="!isPlayerTurn || battleLog !== ''">
        {{ battleLog }}
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
  width: 600px; /* Or variable */
  height: 480px;
  background-color: #f8f8f8;
  border: 4px solid #333;
  display: flex;
  flex-direction: column;
  font-family: 'Press Start 2P', cursive;
  position: relative;
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
}
</style>
