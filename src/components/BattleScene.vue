<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
type MainSection = 'moves' | 'utility'

const store = useGameStore()

const playerPokemon = computed(() => store.player.party[store.player.activeIndex])
const enemyPokemon = computed(() => store.battle?.enemy ?? null)
const trainerSprite = computed(() => store.battle?.trainerSprite ?? '')
const trainerName = computed(() => store.battle?.trainerName ?? 'Trainer')
const isTrainerBattle = computed(() => Boolean(store.battle?.trainerId))
const playerTrainerSprite = computed(() => store.playerTrainer?.sprite ?? '')

const spriteMap: Record<string, string> = {
  pikachu: pikachuImg,
  bulbasaur: bulbasaurImg,
  charmander: charmanderImg,
  squirtle: squirtleImg,
}

const uiState = ref<UiState>('MESSAGE')
const pendingEnd = ref<PendingEnd>(null)
const menuMode = ref<MenuMode>('MAIN')
const mainSection = ref<MainSection>('moves')
const selectedMoveIndex = ref(0)
const selectedUtilityIndex = ref(0)
const selectedBagIndex = ref(0)
const selectedPartyIndex = ref(0)
const messageQueue = ref<string[]>([])
const currentMessage = ref('')

const movesList = computed(() => playerPokemon.value?.moves ?? [])

const clampIndex = (value: number, max: number) => {
  if (max <= 0) return 0
  return Math.min(Math.max(value, 0), max - 1)
}

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
    mainSection.value = 'moves'
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
const enemyStatus = computed(() =>
  enemyPokemon.value ? getStatusLabel(enemyPokemon.value.status) : '',
)

const getTypes = (pokemon: PokemonInstance | null) => {
  const types = pokemon?.species?.types ?? []
  return types.length ? types : ['unknown']
}

const playerTypes = computed(() => getTypes(playerPokemon.value))
const enemyTypes = computed(() => getTypes(enemyPokemon.value))

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
    enemyMove ? { actor: enemy, target: player, move: enemyMove, moveState: enemyMoveState } : null,
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

    const result = resolveMove(action.actor, action.target, action.move)
    if (result.canAct) {
      messages.push(`${action.actor.name} used ${action.move.name}!`)
    }
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
    const result = resolveMove(enemy, player, enemyMove)
    if (result.canAct) {
      messages.push(`${enemy.name} used ${enemyMove.name}!`)
    }
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
  mainSection.value = 'moves'
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
  if (store.battle?.isLegendary) {
    queueMessages(["You can't run!"])
    return
  }
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

const handleMoveNavigation = (key: string) => {
  const moveCount = movesList.value.length
  if (moveCount === 0) return

  const columns = 2
  const rows = Math.ceil(moveCount / columns)
  let row = Math.floor(selectedMoveIndex.value / columns)
  let col = selectedMoveIndex.value % columns

  if (key === 'ArrowLeft') col = Math.max(0, col - 1)
  if (key === 'ArrowRight') col = Math.min(columns - 1, col + 1)
  if (key === 'ArrowUp') row = Math.max(0, row - 1)
  if (key === 'ArrowDown') {
    if (row < rows - 1) {
      row += 1
    } else {
      mainSection.value = 'utility'
      return
    }
  }

  const nextIndex = row * columns + col
  selectedMoveIndex.value = nextIndex >= moveCount ? moveCount - 1 : nextIndex
}

const handleUtilityNavigation = (key: string) => {
  const max = 3
  if (key === 'ArrowLeft') selectedUtilityIndex.value = clampIndex(selectedUtilityIndex.value - 1, max)
  if (key === 'ArrowRight') selectedUtilityIndex.value = clampIndex(selectedUtilityIndex.value + 1, max)
  if (key === 'ArrowUp') mainSection.value = 'moves'
}

const handleGridNavigation = (
  key: string,
  count: number,
  selected: { value: number },
  columns = 2,
) => {
  if (count === 0) return
  const rows = Math.ceil(count / columns)
  let row = Math.floor(selected.value / columns)
  let col = selected.value % columns

  if (key === 'ArrowLeft') col = Math.max(0, col - 1)
  if (key === 'ArrowRight') col = Math.min(columns - 1, col + 1)
  if (key === 'ArrowUp') row = Math.max(0, row - 1)
  if (key === 'ArrowDown') row = Math.min(rows - 1, row + 1)

  const nextIndex = row * columns + col
  selected.value = nextIndex >= count ? count - 1 : nextIndex
}

const handleBattleKeydown = (e: KeyboardEvent) => {
  if (store.gameState !== 'BATTLE') return

  const key = e.key
  const isArrow = key.startsWith('Arrow')
  const isConfirm = key === 'Enter' || key === ' '
  const isCancel = key === 'Escape' || key === 'Backspace'

  if (isArrow || isConfirm || isCancel) {
    e.preventDefault()
  }

  if (uiState.value === 'MESSAGE') {
    if (isConfirm) advanceMessage()
    return
  }

  if (menuMode.value === 'MAIN') {
    if (isArrow) {
      if (mainSection.value === 'moves') handleMoveNavigation(key)
      else handleUtilityNavigation(key)
      return
    }
    if (isConfirm) {
      if (mainSection.value === 'moves') {
        const move = movesList.value[selectedMoveIndex.value]
        if (move) selectMove(move)
      } else {
        if (selectedUtilityIndex.value === 0) openBag()
        if (selectedUtilityIndex.value === 1) openParty()
        if (selectedUtilityIndex.value === 2) run()
      }
    }
    return
  }

  if (menuMode.value === 'BAG') {
    if (isArrow) {
      handleGridNavigation(key, store.bag.length, selectedBagIndex)
      return
    }
    if (isConfirm && store.bag[selectedBagIndex.value]) {
      useBattleItem(store.bag[selectedBagIndex.value].id)
      return
    }
    if (isCancel) backToMain()
    return
  }

  if (menuMode.value === 'PARTY') {
    if (isArrow) {
      handleGridNavigation(key, store.player.party.length, selectedPartyIndex)
      return
    }
    if (isConfirm) {
      switchPokemon(selectedPartyIndex.value)
      return
    }
    if (isCancel) backToMain()
  }
}

watch(menuMode, (mode) => {
  if (mode === 'MAIN') {
    mainSection.value = 'moves'
    selectedMoveIndex.value = clampIndex(selectedMoveIndex.value, movesList.value.length)
  }
  if (mode === 'BAG') selectedBagIndex.value = 0
  if (mode === 'PARTY') selectedPartyIndex.value = 0
})

watch(movesList, (list) => {
  selectedMoveIndex.value = clampIndex(selectedMoveIndex.value, list.length)
})

onMounted(() => {
  window.addEventListener('keydown', handleBattleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleBattleKeydown)
})

onMounted(() => {
  const enemy = enemyPokemon.value
  const player = playerPokemon.value
  if (player) resetBattleStages(player)
  if (enemy) resetBattleStages(enemy)
  if (enemy) {
    if (isTrainerBattle.value) {
      queueMessages([
        `${trainerName.value} wants to battle!`,
        `${trainerName.value} sent out ${enemy.name}!`,
      ])
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
        <div class="types">
          <span
            v-for="type in enemyTypes"
            :key="type"
            class="type-badge"
            :class="`type-${type}`"
          >
            {{ type === 'unknown' ? '???' : type.toUpperCase() }}
          </span>
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

      <img
        v-if="playerTrainerSprite"
        class="player-trainer-sprite"
        :src="playerTrainerSprite"
        alt="Player Trainer"
      />

      <div class="hud player-hud">
        <div class="name">
          {{ playerPokemon.name }} Lv{{ playerPokemon.level }}
          <span v-if="playerStatus" class="status">{{ playerStatus }}</span>
        </div>
        <div class="types">
          <span
            v-for="type in playerTypes"
            :key="type"
            class="type-badge"
            :class="`type-${type}`"
          >
            {{ type === 'unknown' ? '???' : type.toUpperCase() }}
          </span>
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
      @click.self="uiState === 'MESSAGE' && advanceMessage()"
    >
      <div class="battle-text" v-if="uiState === 'MESSAGE'" @click="advanceMessage">
        {{ currentMessage }}
        <span class="blinking-arrow">▼</span>
      </div>
      <div v-else class="menu">
        <template v-if="menuMode === 'MAIN'">
          <div class="moves">
            <button
              v-for="(moveState, moveIndex) in playerPokemon.moves"
              :key="moveState.id"
              class="move-button"
              :class="{
                'is-active':
                  menuMode === 'MAIN' &&
                  mainSection === 'moves' &&
                  selectedMoveIndex === moveIndex,
              }"
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
            <button
              :class="{ 'is-active': menuMode === 'MAIN' && mainSection === 'utility' && selectedUtilityIndex === 0 }"
              @click="openBag"
            >
              BAG
            </button>
            <button
              :class="{ 'is-active': menuMode === 'MAIN' && mainSection === 'utility' && selectedUtilityIndex === 1 }"
              @click="openParty"
            >
              POKEMON
            </button>
            <button
              :class="{ 'is-active': menuMode === 'MAIN' && mainSection === 'utility' && selectedUtilityIndex === 2 }"
              @click="run"
              :disabled="store.battle?.isLegendary"
            >
              RUN
            </button>
          </div>
        </template>

        <template v-else-if="menuMode === 'BAG'">
          <div class="bag-menu">
            <div v-if="store.bag.length === 0" class="menu-empty">Bag is empty.</div>
            <button
              v-for="(item, itemIndex) in store.bag"
              :key="item.id"
              class="bag-item"
              :class="{ 'is-active': selectedBagIndex === itemIndex }"
              @click="useBattleItem(item.id)"
            >
              <div class="bag-name">{{ ITEM_CATALOG[item.id]?.name ?? item.id }}</div>
              <div class="bag-meta">x{{ item.qty }} · ₽{{ ITEM_CATALOG[item.id]?.price ?? 0 }}</div>
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
              :class="{ 'is-active': selectedPartyIndex === index }"
              :disabled="member.currentHp <= 0"
              @click="switchPokemon(index)"
            >
              <div class="party-name">{{ member.name }} Lv{{ member.level }}</div>
              <div class="party-meta">HP {{ member.currentHp }} / {{ member.stats.hp }}</div>
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
  right: 40px;
  width: 140px;
  image-rendering: pixelated;
  opacity: 0.9;
  z-index: 1;
}

.player-trainer-sprite {
  position: absolute;
  bottom: 10px;
  left: 40px;
  width: 140px;
  image-rendering: pixelated;
  opacity: 0.95;
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
  right: 140px;
  z-index: 2;
}

.player-sprite {
  bottom: 20px;
  left: 140px;
  transform: scaleX(-1);
  z-index: 2;
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

.types {
  margin-top: 4px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.type-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 10px;
  color: #111;
  border: 1px solid rgba(0, 0, 0, 0.4);
  text-transform: uppercase;
  background: #ddd;
}

.type-normal { background: #a8a878; }
.type-fire { background: #f08030; }
.type-water { background: #6890f0; color: #fff; }
.type-electric { background: #f8d030; }
.type-grass { background: #78c850; }
.type-ice { background: #98d8d8; }
.type-fighting { background: #c03028; color: #fff; }
.type-poison { background: #a040a0; color: #fff; }
.type-ground { background: #e0c068; }
.type-flying { background: #a890f0; }
.type-psychic { background: #f85888; color: #fff; }
.type-bug { background: #a8b820; }
.type-rock { background: #b8a038; }
.type-ghost { background: #705898; color: #fff; }
.type-dragon { background: #7038f8; color: #fff; }
.type-dark { background: #705848; color: #fff; }
.type-steel { background: #b8b8d0; }
.type-fairy { background: #ee99ac; }
.type-unknown { background: #999; color: #fff; }

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

.move-button.is-active,
.utility button.is-active,
.bag-item.is-active,
.party-item.is-active {
  border-color: #ffd166;
  box-shadow: 0 0 0 2px rgba(255, 209, 102, 0.4);
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
