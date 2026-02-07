<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { getMoveData } from '../data/battle/moves'
import { applyExperience, resetBattleStages } from '../engine/pokemon'
import {
  applyEndOfTurnStatus,
  chooseMove,
  getEffectiveStat,
  getMoveDataFromState,
  getStatusLabel,
  resolveMove,
} from '../engine/battle'
import type { MoveState, PokemonInstance } from '../engine/pokemon'
import { ITEM_CATALOG, type ItemId } from '../data/items'

import pikachuImg from '@/assets/sprites/pikachu.png'
import bulbasaurImg from '@/assets/sprites/bulbasaur.png'
import charmanderImg from '@/assets/sprites/charmander.png'
import squirtleImg from '@/assets/sprites/squirtle.png'

type UiState = 'INPUT' | 'MESSAGE'
type PendingEnd = 'WIN' | 'LOSE' | 'RUN' | null
type MenuMode = 'MAIN' | 'BAG' | 'PARTY'

const store = useGameStore()

const playerPokemon = computed(() => store.player.party[store.player.activeIndex])
const enemyPokemon = computed(() => store.battle?.enemy ?? null)
const trainerSprite = computed(() => store.battle?.trainerSprite ?? '')
const trainerName = computed(() => store.battle?.trainerName ?? 'Trainer')
const isTrainerBattle = computed(() => Boolean(store.battle?.trainerId))

const spriteMap: Record<string, string> = {
  pikachu: pikachuImg,
  bulbasaur: bulbasaurImg,
  charmander: charmanderImg,
  squirtle: squirtleImg,
}

const uiState = ref<UiState>('MESSAGE')
const pendingEnd = ref<PendingEnd>(null)
const menuMode = ref<MenuMode>('MAIN')
const messageQueue = ref<string[]>([])
const currentMessage = ref('')

const queueMessages = (messages: string[]) => {
  const filtered = messages.filter(Boolean)
  if (filtered.length === 0) return
  messageQueue.value.push(...filtered)
  if (!currentMessage.value) showNextMessage()
}

const showNextMessage = () => {
  const next = messageQueue.value.shift()
  if (next) {
    currentMessage.value = next
    uiState.value = 'MESSAGE'
    return
  }

  currentMessage.value = ''
  if (pendingEnd.value) {
    finishBattle()
  } else {
    uiState.value = 'INPUT'
    menuMode.value = 'MAIN'
  }
}

const advanceMessage = () => {
  if (uiState.value !== 'MESSAGE') return
  showNextMessage()
}

const getSprite = (pokemon: PokemonInstance | null) => {
  if (!pokemon) return ''
  if (pokemon.species.sprite) return pokemon.species.sprite
  const key = pokemon.species.key ?? pokemon.species.name.toLowerCase()
  return spriteMap[key] ?? ''
}

const hpPercent = (pokemon: PokemonInstance | null) => {
  if (!pokemon) return 0
  return Math.max(0, Math.min(100, (pokemon.currentHp / pokemon.stats.hp) * 100))
}

const playerStatus = computed(() => getStatusLabel(playerPokemon.value.status))
const enemyStatus = computed(() => (enemyPokemon.value ? getStatusLabel(enemyPokemon.value.status) : ''))

const battleBackgroundStyle = computed(() => {
  const terrain = store.battle?.terrain ?? 'grass'
  if (terrain === 'water') {
    return {
      backgroundImage:
        'linear-gradient(to bottom, #cfefff 0%, #cfefff 50%, #4a90e2 50%, #4a90e2 100%)',
    }
  }
  if (terrain === 'default') {
    return {
      backgroundImage:
        'linear-gradient(to bottom, #e5e5e5 0%, #e5e5e5 50%, #a0a0a0 50%, #a0a0a0 100%)',
    }
  }
  return {
    backgroundImage:
      'linear-gradient(to bottom, #d0f8d0 0%, #d0f8d0 50%, #70b870 50%, #70b870 100%)',
  }
})

const resolveTurn = (playerMoveState: MoveState) => {
  const player = playerPokemon.value
  const enemy = enemyPokemon.value
  if (!player || !enemy) return

  if (playerMoveState.pp <= 0) {
    queueMessages([`${player.name} has no PP left!`])
    return
  }

  playerMoveState.pp -= 1
  const playerMove = getMoveDataFromState(playerMoveState)
  const enemyMoveState = chooseMove(enemy)
  const enemyMove = enemyMoveState ? getMoveDataFromState(enemyMoveState) : null

  const actions = [
    { actor: player, target: enemy, move: playerMove, moveState: playerMoveState },
    enemyMove
      ? { actor: enemy, target: player, move: enemyMove, moveState: enemyMoveState }
      : null,
  ].filter(Boolean) as Array<{
    actor: PokemonInstance
    target: PokemonInstance
    move: ReturnType<typeof getMoveData>
    moveState: MoveState
  }>

  actions.sort((a, b) => {
    const priorityA = a.move.priority ?? 0
    const priorityB = b.move.priority ?? 0
    if (priorityA !== priorityB) return priorityB - priorityA

    const speedA = getEffectiveStat(a.actor, 'spe')
    const speedB = getEffectiveStat(b.actor, 'spe')
    if (speedA !== speedB) return speedB - speedA

    return Math.random() < 0.5 ? -1 : 1
  })

  const messages: string[] = []

  for (const action of actions) {
    if (action.actor.currentHp <= 0 || action.target.currentHp <= 0) continue

    messages.push(`${action.actor.name} used ${action.move.name}!`)
    const result = resolveMove(action.actor, action.target, action.move)
    messages.push(...result.messages)

    if (action.target.currentHp <= 0) {
      messages.push(`${action.target.name} fainted!`)
      break
    }
  }

  if (enemy.currentHp <= 0) {
    const expGain = Math.floor((enemy.species.baseExp * enemy.level) / 7)
    messages.push(`${player.name} gained ${expGain} EXP!`)
    const reward = Math.max(20, Math.floor(enemy.level * 15))
    store.addMoney(reward)
    messages.push(`You got ₽${reward}!`)
    const { levelsGained } = applyExperience(player, expGain)
    if (levelsGained > 0) {
      messages.push(`${player.name} grew to level ${player.level}!`)
    }
    pendingEnd.value = 'WIN'
  } else if (player.currentHp <= 0) {
    messages.push(`${player.name} fainted...`)
    pendingEnd.value = 'LOSE'
  } else {
    const endMessages: string[] = []
    const playerEnd = applyEndOfTurnStatus(player)
    if (playerEnd.message) endMessages.push(playerEnd.message)
    const enemyEnd = applyEndOfTurnStatus(enemy)
    if (enemyEnd.message) endMessages.push(enemyEnd.message)

    if (player.currentHp <= 0) {
      endMessages.push(`${player.name} fainted...`)
      pendingEnd.value = 'LOSE'
    }
    if (enemy.currentHp <= 0) {
      endMessages.push(`${enemy.name} fainted!`)
      pendingEnd.value = 'WIN'
    }

    messages.push(...endMessages)
  }

  uiState.value = 'MESSAGE'
  queueMessages(messages)
}

const selectMove = (moveState: MoveState) => {
  if (uiState.value !== 'INPUT') return
  resolveTurn(moveState)
}

const resolveEnemyTurn = (preMessages: string[]) => {
  const player = playerPokemon.value
  const enemy = enemyPokemon.value
  if (!player || !enemy) return

  const messages: string[] = [...preMessages]

  const enemyMoveState = chooseMove(enemy)
  if (enemyMoveState) {
    const enemyMove = getMoveDataFromState(enemyMoveState)
    messages.push(`${enemy.name} used ${enemyMove.name}!`)
    const result = resolveMove(enemy, player, enemyMove)
    messages.push(...result.messages)
  } else {
    messages.push(`${enemy.name} has no moves left!`)
  }

  if (player.currentHp <= 0) {
    messages.push(`${player.name} fainted...`)
    pendingEnd.value = 'LOSE'
  } else {
    const endMessages: string[] = []
    const playerEnd = applyEndOfTurnStatus(player)
    if (playerEnd.message) endMessages.push(playerEnd.message)
    const enemyEnd = applyEndOfTurnStatus(enemy)
    if (enemyEnd.message) endMessages.push(enemyEnd.message)

    if (player.currentHp <= 0) {
      endMessages.push(`${player.name} fainted...`)
      pendingEnd.value = 'LOSE'
    }
    if (enemy.currentHp <= 0) {
      endMessages.push(`${enemy.name} fainted!`)
      pendingEnd.value = 'WIN'
    }

    messages.push(...endMessages)
  }

  uiState.value = 'MESSAGE'
  queueMessages(messages)
}

const openBag = () => {
  if (uiState.value !== 'INPUT') return
  menuMode.value = 'BAG'
}

const openParty = () => {
  if (uiState.value !== 'INPUT') return
  menuMode.value = 'PARTY'
}

const backToMain = () => {
  menuMode.value = 'MAIN'
}

const useBattleItem = (itemId: ItemId) => {
  if (uiState.value !== 'INPUT') return
  const message = store.useItem(itemId)
  resolveEnemyTurn([message])
  menuMode.value = 'MAIN'
}

const switchPokemon = (index: number) => {
  if (uiState.value !== 'INPUT') return
  const target = store.player.party[index]
  if (!target || target.currentHp <= 0) {
    queueMessages(['That Pokemon has no energy left!'])
    return
  }
  if (index === store.player.activeIndex) return

  store.setActiveParty(index)
  resolveEnemyTurn([`Go, ${target.name}!`])
  menuMode.value = 'MAIN'
}

const run = () => {
  if (uiState.value !== 'INPUT') return
  pendingEnd.value = 'RUN'
  queueMessages(['Got away safely!'])
}

const finishBattle = () => {
  const player = playerPokemon.value
  const enemy = enemyPokemon.value
  if (player) {
    resetBattleStages(player)
    player.status = 'none'
    player.statusTurns = 0
    if (pendingEnd.value === 'LOSE') {
      player.currentHp = player.stats.hp
    }
  }
  if (enemy) {
    resetBattleStages(enemy)
    enemy.status = 'none'
    enemy.statusTurns = 0
  }

  const result = pendingEnd.value ?? undefined
  pendingEnd.value = null
  store.endBattle(result)
}

onMounted(() => {
  const enemy = enemyPokemon.value
  const player = playerPokemon.value
  if (player) resetBattleStages(player)
  if (enemy) resetBattleStages(enemy)
  if (enemy) {
    if (isTrainerBattle.value) {
      queueMessages([`${trainerName.value} wants to battle!`, `${trainerName.value} sent out ${enemy.name}!`])
    } else {
      queueMessages([`A wild ${enemy.name} appeared!`])
    }
  }
})
</script>

<template>
  <div class="battle-scene" :style="battleBackgroundStyle" v-if="enemyPokemon && playerPokemon">
    <div class="battle-arena">
      <div class="hud enemy-hud">
        <div class="name">
          {{ enemyPokemon.name }} Lv{{ enemyPokemon.level }}
          <span v-if="enemyStatus" class="status">{{ enemyStatus }}</span>
        </div>
        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: `${hpPercent(enemyPokemon)}%` }"></div>
        </div>
        <div class="hp-text">{{ enemyPokemon.currentHp }} / {{ enemyPokemon.stats.hp }}</div>
      </div>

      <img v-if="trainerSprite" class="trainer-sprite" :src="trainerSprite" alt="Trainer" />

      <div class="sprite-container enemy-sprite">
        <img v-if="getSprite(enemyPokemon)" :src="getSprite(enemyPokemon)" alt="Enemy" />
        <div v-else class="sprite-placeholder"></div>
      </div>

      <div class="sprite-container player-sprite">
        <img v-if="getSprite(playerPokemon)" :src="getSprite(playerPokemon)" alt="Player" />
        <div v-else class="sprite-placeholder"></div>
      </div>

      <div class="hud player-hud">
        <div class="name">
          {{ playerPokemon.name }} Lv{{ playerPokemon.level }}
          <span v-if="playerStatus" class="status">{{ playerStatus }}</span>
        </div>
        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: `${hpPercent(playerPokemon)}%` }"></div>
        </div>
        <div class="hp-text">{{ playerPokemon.currentHp }} / {{ playerPokemon.stats.hp }}</div>
      </div>
    </div>

    <div
      class="battle-menu"
      :class="{ clickable: uiState === 'MESSAGE' }"
      @click="uiState === 'MESSAGE' && advanceMessage()"
    >
      <div class="battle-text" v-if="uiState === 'MESSAGE'" @click="advanceMessage">
        {{ currentMessage }}
        <span class="blinking-arrow">▼</span>
      </div>
      <div v-else class="menu">
        <template v-if="menuMode === 'MAIN'">
          <div class="moves">
            <button
              v-for="moveState in playerPokemon.moves"
              :key="moveState.id"
              class="move-button"
              :disabled="moveState.pp <= 0"
              @click="selectMove(moveState)"
            >
              <div class="move-name">{{ getMoveData(moveState.id).name }}</div>
              <div class="move-meta">
                PP {{ moveState.pp }}/{{ getMoveData(moveState.id).pp }} ·
                {{ getMoveData(moveState.id).type.toUpperCase() }}
              </div>
            </button>
          </div>
          <div class="utility">
            <button @click="openBag">BAG</button>
            <button @click="openParty">POKEMON</button>
            <button @click="run">RUN</button>
          </div>
        </template>

        <template v-else-if="menuMode === 'BAG'">
          <div class="bag-menu">
            <div v-if="store.bag.length === 0" class="menu-empty">Bag is empty.</div>
            <button
              v-for="item in store.bag"
              :key="item.id"
              class="bag-item"
              @click="useBattleItem(item.id)"
            >
              <div class="bag-name">{{ ITEM_CATALOG[item.id]?.name ?? item.id }}</div>
              <div class="bag-meta">
                x{{ item.qty }} · ₽{{ ITEM_CATALOG[item.id]?.price ?? 0 }}
              </div>
            </button>
          </div>
          <div class="utility">
            <button @click="backToMain">BACK</button>
          </div>
        </template>

        <template v-else>
          <div class="party-menu">
            <button
              v-for="(member, index) in store.player.party"
              :key="member.id"
              class="party-item"
              :disabled="member.currentHp <= 0"
              @click="switchPokemon(index)"
            >
              <div class="party-name">{{ member.name }} Lv{{ member.level }}</div>
              <div class="party-meta">
                HP {{ member.currentHp }} / {{ member.stats.hp }}
              </div>
            </button>
          </div>
          <div class="utility">
            <button @click="backToMain">BACK</button>
          </div>
        </template>
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
  display: flex;
  flex-direction: column;
  font-family: 'Press Start 2P', cursive;
  z-index: 200;
  background-color: #f8f8f8;
}


.battle-arena {
  flex: 1;
  position: relative;
}

.sprite-container {
  position: absolute;
}
.sprite-container img {
  width: 144px;
  image-rendering: pixelated;
}

.trainer-sprite {
  position: absolute;
  top: 20px;
  right: 140px;
  width: 140px;
  image-rendering: pixelated;
  opacity: 0.9;
  z-index: 1;
}

.sprite-placeholder {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 2px dashed #666;
}

.enemy-sprite {
  top: 40px;
  right: 40px;
  z-index: 2;
}

.player-sprite {
  bottom: 20px;
  left: 40px;
  transform: scaleX(-1);
}

.hud {
  position: absolute;
  background: #fff;
  border: 2px solid #333;
  border-radius: 4px;
  padding: 8px;
  width: 230px;
  color: #000;
}

.name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.status {
  font-size: 10px;
  color: #111;
  background: #f4d35e;
  border: 1px solid #111;
  padding: 2px 6px;
  border-radius: 4px;
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
  height: var(--battle-panel-height);
  background: #333;
  color: white;
  padding: 16px;
  border-top: 4px solid #000;
}

.battle-menu.clickable {
  cursor: pointer;
}

.battle-text {
  font-size: 18px;
  line-height: 1.5;
  position: relative;
  cursor: pointer;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bag-menu,
.party-menu {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.bag-item,
.party-item {
  background: #fff;
  border: 2px solid #888;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  padding: 10px;
  color: #111;
}

.bag-item:hover,
.party-item:hover {
  background: #eee;
  border-color: #f00;
}

.party-item:disabled,
.bag-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bag-name,
.party-name {
  font-size: 12px;
  margin-bottom: 6px;
}

.bag-meta,
.party-meta {
  font-size: 10px;
  color: #444;
}

.menu-empty {
  grid-column: 1 / -1;
  font-size: 12px;
  color: #ddd;
}

.moves {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.move-button {
  background: #fff;
  border: 2px solid #888;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  padding: 10px;
  color: #111;
}

.move-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.move-button:hover:not(:disabled) {
  background: #eee;
  border-color: #f00;
}

.move-name {
  font-size: 14px;
  margin-bottom: 6px;
}

.move-meta {
  font-size: 10px;
  color: #444;
}

.utility {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.utility button {
  background: #fff;
  border: 2px solid #888;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  text-align: center;
  padding: 10px;
  color: #111;
}

.utility button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
