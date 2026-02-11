<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { getMoveData } from '../data/battle/moves'
import { applyExperience, resetBattleStages } from '../engine/pokemon'
import {
  applyEndOfTurnStatus,
  attemptCatch,
  chooseMove,
  getEffectiveStat,
  getMoveDataFromState,
  getStatusLabel,
  resolveMove,
} from '../engine/battle'
import type { MoveState, PokemonInstance } from '../engine/pokemon'
import { ITEM_CATALOG, isCatchItem, type ItemId } from '../data/items'

import pikachuImg from '@/assets/sprites/pikachu.png'
import bulbasaurImg from '@/assets/sprites/bulbasaur.png'
import charmanderImg from '@/assets/sprites/charmander.png'
import squirtleImg from '@/assets/sprites/squirtle.png'

type UiState = 'INPUT' | 'MESSAGE' | 'ANIMATING'
type PendingEnd = 'WIN' | 'LOSE' | 'RUN' | 'CATCH' | null
type MenuMode = 'MAIN' | 'BAG' | 'PARTY'
type MainSection = 'moves' | 'utility'

interface QueueEntry {
  text: string
  onShow?: () => void
}

const store = useGameStore()

const playerPokemon = computed<PokemonInstance | null>(
  () => store.player.party[store.player.activeIndex] ?? null,
)
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
const messageQueue = ref<QueueEntry[]>([])
const currentMessage = ref('')

/* ── Animation state ── */
const introReady = ref(false)
const playerAttacking = ref(false)
const enemyAttacking = ref(false)
const playerShaking = ref(false)
const enemyShaking = ref(false)
const playerFainting = ref(false)
const enemyFainting = ref(false)
const flashType = ref('') // move type for color overlay on target
const flashSide = ref<'player' | 'enemy' | ''>('') // which side gets flashed

// Delayed HP display for smooth animation sync
const displayPlayerHp = ref(0)
const displayEnemyHp = ref(0)

onMounted(() => {
  if (playerPokemon.value) displayPlayerHp.value = playerPokemon.value.currentHp
  if (enemyPokemon.value) displayEnemyHp.value = enemyPokemon.value.currentHp
})

const syncHp = () => {
  if (playerPokemon.value) displayPlayerHp.value = playerPokemon.value.currentHp
  if (enemyPokemon.value) displayEnemyHp.value = enemyPokemon.value.currentHp
}

const movesList = computed(() => playerPokemon.value?.moves ?? [])

const clampIndex = (value: number, max: number) => {
  if (max <= 0) return 0
  return Math.min(Math.max(value, 0), max - 1)
}

/* ── Animation helpers ── */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const triggerAttack = async (side: 'player' | 'enemy') => {
  if (side === 'player') {
    playerAttacking.value = true
    await wait(300)
    playerAttacking.value = false
  } else {
    enemyAttacking.value = true
    await wait(300)
    enemyAttacking.value = false
  }
}

const triggerShake = async (side: 'player' | 'enemy') => {
  if (side === 'player') {
    playerShaking.value = true
    await wait(400)
    playerShaking.value = false
  } else {
    enemyShaking.value = true
    await wait(400)
    enemyShaking.value = false
  }
}

const triggerFlash = async (side: 'player' | 'enemy', moveType: string) => {
  flashSide.value = side
  flashType.value = moveType
  await wait(350)
  flashType.value = ''
  flashSide.value = ''
}

const triggerFaint = async (side: 'player' | 'enemy') => {
  if (side === 'player') {
    playerFainting.value = true
  } else {
    enemyFainting.value = true
  }
  await wait(600)
}

/* ── Message queue with animation support ── */
const queueEntries = (entries: QueueEntry[]) => {
  const filtered = entries.filter((e) => e.text)
  if (filtered.length === 0) return
  messageQueue.value.push(...filtered)
  if (!currentMessage.value) showNextMessage()
}

const queueMessages = (messages: string[]) => {
  queueEntries(messages.map((text) => ({ text })))
}

const showNextMessage = () => {
  const next = messageQueue.value.shift()
  if (next) {
    currentMessage.value = next.text
    uiState.value = 'MESSAGE'
    if (next.onShow) {
      next.onShow()
    }
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
  if (uiState.value === 'ANIMATING') return
  if (uiState.value !== 'MESSAGE') return
  showNextMessage()
}

const getSprite = (pokemon: PokemonInstance | null) => {
  if (!pokemon) return ''
  if (pokemon.species.sprite) return pokemon.species.sprite
  const key = pokemon.species.key ?? pokemon.species.name.toLowerCase()
  return spriteMap[key] ?? ''
}

const hpPercent = (hp: number, maxHp: number) => {
  return Math.max(0, Math.min(100, (hp / maxHp) * 100))
}

const hpBarColor = (hp: number, maxHp: number) => {
  const pct = hpPercent(hp, maxHp)
  if (pct > 50) return '#4caf50'
  if (pct > 20) return '#f9a825'
  return '#e53935'
}

const playerHpPct = computed(() =>
  hpPercent(displayPlayerHp.value, playerPokemon.value?.stats.hp ?? 1),
)
const enemyHpPct = computed(() =>
  hpPercent(displayEnemyHp.value, enemyPokemon.value?.stats.hp ?? 1),
)
const playerHpColor = computed(() =>
  hpBarColor(displayPlayerHp.value, playerPokemon.value?.stats.hp ?? 1),
)
const enemyHpColor = computed(() =>
  hpBarColor(displayEnemyHp.value, enemyPokemon.value?.stats.hp ?? 1),
)

const playerStatus = computed(() =>
  playerPokemon.value ? getStatusLabel(playerPokemon.value.status) : '',
)
const enemyStatus = computed(() =>
  enemyPokemon.value ? getStatusLabel(enemyPokemon.value.status) : '',
)

const getTypes = (pokemon: PokemonInstance | null) => {
  const types = pokemon?.species?.types ?? []
  return types.length ? types : ['unknown']
}

const playerTypes = computed(() => getTypes(playerPokemon.value ?? null))
const enemyTypes = computed(() => getTypes(enemyPokemon.value))

const battleBackgroundStyle = computed(() => {
  const terrain = store.battle?.terrain ?? 'grass'
  const split = 'var(--battle-split, 50%)'

  if (terrain === 'water') {
    return {
      backgroundImage: `linear-gradient(to bottom, #cfefff 0%, #cfefff ${split}, #4a90e2 ${split}, #4a90e2 100%)`,
    }
  }
  if (terrain === 'default') {
    return {
      backgroundImage: `linear-gradient(to bottom, #e5e5e5 0%, #e5e5e5 ${split}, #a0a0a0 ${split}, #a0a0a0 100%)`,
    }
  }
  return {
    backgroundImage: `linear-gradient(to bottom, #d0f8d0 0%, #d0f8d0 ${split}, #70b870 ${split}, #70b870 100%)`,
  }
})

/* ── Turn resolution with animations ── */
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
    {
      actor: player,
      target: enemy,
      move: playerMove,
      moveState: playerMoveState,
      side: 'player' as const,
    },
    enemyMove
      ? {
          actor: enemy,
          target: player,
          move: enemyMove,
          moveState: enemyMoveState,
          side: 'enemy' as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    actor: PokemonInstance
    target: PokemonInstance
    move: ReturnType<typeof getMoveData>
    moveState: MoveState
    side: 'player' | 'enemy'
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

  const entries: QueueEntry[] = []

  for (const action of actions) {
    if (action.actor.currentHp <= 0 || action.target.currentHp <= 0) continue

    const hpBefore = action.target.currentHp
    const result = resolveMove(action.actor, action.target, action.move)

    const attackerSide = action.side
    const targetSide = action.side === 'player' ? 'enemy' : 'player'

    if (result.canAct) {
      entries.push({
        text: `${action.actor.name} used ${action.move.name}!`,
        onShow: () => {
          triggerAttack(attackerSide)
        },
      })
    }

    // Add damage-related messages with shake + flash + HP sync
    const damageDealt = hpBefore - action.target.currentHp
    const hasResultMessages = result.messages.length > 0

    if (hasResultMessages) {
      const [firstMsg, ...restMsgs] = result.messages
      if (!firstMsg) continue

      entries.push({
        text: firstMsg,
        onShow: () => {
          if (damageDealt > 0) {
            triggerFlash(targetSide, action.move.type)
            triggerShake(targetSide)
          }
          syncHp()
        },
      })

      for (const msg of restMsgs) {
        entries.push({ text: msg, onShow: syncHp })
      }
    } else if (damageDealt > 0) {
      // No extra messages but damage was dealt - sync HP after attack message
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        const originalOnShow = lastEntry.onShow
        lastEntry.onShow = () => {
          originalOnShow?.()
          setTimeout(() => {
            triggerFlash(targetSide, action.move.type)
            triggerShake(targetSide)
            syncHp()
          }, 350)
        }
      }
    }

    if (action.target.currentHp <= 0) {
      const faintSide = targetSide
      entries.push({
        text: `${action.target.name} fainted!`,
        onShow: () => {
          syncHp()
          triggerFaint(faintSide)
        },
      })
      break
    }
  }

  if (enemy.currentHp <= 0) {
    const expGain = Math.floor((enemy.species.baseExp * enemy.level) / 7)
    entries.push({ text: `${player.name} gained ${expGain} EXP!` })
    const reward = Math.max(20, Math.floor(enemy.level * 15))
    store.addMoney(reward)
    entries.push({ text: `You got ₽${reward}!` })
    const { levelsGained } = applyExperience(player, expGain)
    if (levelsGained > 0) {
      entries.push({ text: `${player.name} grew to level ${player.level}!` })
    }
    pendingEnd.value = 'WIN'
  } else if (player.currentHp <= 0) {
    pendingEnd.value = 'LOSE'
  } else {
    const endEntries: QueueEntry[] = []
    const playerEnd = applyEndOfTurnStatus(player)
    if (playerEnd.message)
      endEntries.push({
        text: playerEnd.message,
        onShow: () => {
          syncHp()
          if (player.currentHp > 0) triggerShake('player')
        },
      })
    const enemyEnd = applyEndOfTurnStatus(enemy)
    if (enemyEnd.message)
      endEntries.push({
        text: enemyEnd.message,
        onShow: () => {
          syncHp()
          if (enemy.currentHp > 0) triggerShake('enemy')
        },
      })

    if (player.currentHp <= 0) {
      endEntries.push({
        text: `${player.name} fainted...`,
        onShow: () => {
          syncHp()
          triggerFaint('player')
        },
      })
      pendingEnd.value = 'LOSE'
    }
    if (enemy.currentHp <= 0) {
      endEntries.push({
        text: `${enemy.name} fainted!`,
        onShow: () => {
          syncHp()
          triggerFaint('enemy')
        },
      })
      pendingEnd.value = 'WIN'
    }

    entries.push(...endEntries)
  }

  uiState.value = 'MESSAGE'
  queueEntries(entries)
}

const selectMove = (moveState: MoveState) => {
  if (uiState.value !== 'INPUT') return
  resolveTurn(moveState)
}

const resolveEnemyTurn = (preEntries: QueueEntry[]) => {
  const player = playerPokemon.value
  const enemy = enemyPokemon.value
  if (!player || !enemy) return

  const entries: QueueEntry[] = [...preEntries]

  const enemyMoveState = chooseMove(enemy)
  if (enemyMoveState) {
    const enemyMove = getMoveDataFromState(enemyMoveState)
    const hpBefore = player.currentHp
    const result = resolveMove(enemy, player, enemyMove)
    const damageDealt = hpBefore - player.currentHp

    if (result.canAct) {
      entries.push({
        text: `${enemy.name} used ${enemyMove.name}!`,
        onShow: () => triggerAttack('enemy'),
      })
    }

    if (result.messages.length > 0) {
      const [firstMsg, ...restMessages] = result.messages
      if (firstMsg) {
        entries.push({
          text: firstMsg,
          onShow: () => {
            if (damageDealt > 0) {
              triggerFlash('player', enemyMove.type)
              triggerShake('player')
            }
            syncHp()
          },
        })
      }
      for (const msg of restMessages) {
        entries.push({ text: msg, onShow: syncHp })
      }
    } else if (damageDealt > 0) {
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        const originalOnShow = lastEntry.onShow
        lastEntry.onShow = () => {
          originalOnShow?.()
          setTimeout(() => {
            triggerFlash('player', enemyMove.type)
            triggerShake('player')
            syncHp()
          }, 350)
        }
      }
    }
  } else {
    entries.push({ text: `${enemy.name} has no moves left!` })
  }

  if (player.currentHp <= 0) {
    entries.push({
      text: `${player.name} fainted...`,
      onShow: () => {
        syncHp()
        triggerFaint('player')
      },
    })
    pendingEnd.value = 'LOSE'
  } else {
    const endEntries: QueueEntry[] = []
    const playerEnd = applyEndOfTurnStatus(player)
    if (playerEnd.message)
      endEntries.push({
        text: playerEnd.message,
        onShow: () => {
          syncHp()
          triggerShake('player')
        },
      })
    const enemyEnd = applyEndOfTurnStatus(enemy)
    if (enemyEnd.message)
      endEntries.push({
        text: enemyEnd.message,
        onShow: () => {
          syncHp()
          triggerShake('enemy')
        },
      })

    if (player.currentHp <= 0) {
      endEntries.push({
        text: `${player.name} fainted...`,
        onShow: () => {
          syncHp()
          triggerFaint('player')
        },
      })
      pendingEnd.value = 'LOSE'
    }
    if (enemy.currentHp <= 0) {
      endEntries.push({
        text: `${enemy.name} fainted!`,
        onShow: () => {
          syncHp()
          triggerFaint('enemy')
        },
      })
      pendingEnd.value = 'WIN'
    }

    entries.push(...endEntries)
  }

  uiState.value = 'MESSAGE'
  queueEntries(entries)
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
  const enemy = enemyPokemon.value
  if (!enemy) return

  if (isCatchItem(itemId)) {
    if (isTrainerBattle.value) {
      queueMessages(["You can't catch a trainer's Pokemon!"])
      return
    }

    const ballRate = store.useCatchItem(itemId)
    if (ballRate === null) {
      queueMessages(['No items left.'])
      return
    }

    const ballName = ITEM_CATALOG[itemId]?.name ?? 'Poke Ball'
    const entries: QueueEntry[] = [{ text: `You threw a ${ballName}!` }]

    const result = attemptCatch(enemy, ballRate)
    for (const msg of result.messages) {
      entries.push({ text: msg })
    }

    if (result.caught) {
      const catchResult = store.catchPokemon(enemy)
      entries.push({ text: catchResult.message })
      pendingEnd.value = 'CATCH'
      uiState.value = 'MESSAGE'
      queueEntries(entries)
    } else {
      // Enemy gets a turn after failed catch
      const preEntries = entries
      resolveEnemyTurn(preEntries)
    }

    menuMode.value = 'MAIN'
    return
  }

  const message = store.useItem(itemId)
  resolveEnemyTurn([{ text: message, onShow: syncHp }])
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
  // Sync display HP for the new active pokemon
  displayPlayerHp.value = target.currentHp
  resolveEnemyTurn([{ text: `Go, ${target.name}!` }])
  menuMode.value = 'MAIN'
}

const run = () => {
  if (uiState.value !== 'INPUT') return
  if (isTrainerBattle.value) {
    queueMessages(["You can't run from a trainer battle!"])
    return
  }
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

/* ── Keyboard navigation ── */
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
  if (key === 'ArrowLeft')
    selectedUtilityIndex.value = clampIndex(selectedUtilityIndex.value - 1, max)
  if (key === 'ArrowRight')
    selectedUtilityIndex.value = clampIndex(selectedUtilityIndex.value + 1, max)
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

  if (uiState.value === 'ANIMATING') return

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
    if (isConfirm) {
      const selectedItem = store.bag[selectedBagIndex.value]
      if (selectedItem) useBattleItem(selectedItem.id)
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

  // Trigger intro animation after a brief delay
  setTimeout(() => {
    introReady.value = true
  }, 50)

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
      <!-- Enemy HUD -->
      <div class="hud enemy-hud" :class="{ 'intro-hud-enemy': !introReady }">
        <div class="name">
          {{ enemyPokemon.name }} Lv{{ enemyPokemon.level }}
          <span v-if="enemyStatus" class="status">{{ enemyStatus }}</span>
        </div>
        <div class="types">
          <span v-for="type in enemyTypes" :key="type" class="type-badge" :class="`type-${type}`">
            {{ type === 'unknown' ? '???' : type.toUpperCase() }}
          </span>
        </div>
        <div class="hp-bar">
          <div
            class="hp-fill"
            :style="{ width: `${enemyHpPct}%`, backgroundColor: enemyHpColor }"
          ></div>
        </div>
        <div class="hp-text">{{ displayEnemyHp }} / {{ enemyPokemon.stats.hp }}</div>
      </div>

      <img v-if="trainerSprite" class="trainer-sprite" :src="trainerSprite" alt="Trainer" />

      <!-- Enemy sprite -->
      <div
        class="sprite-container enemy-sprite"
        :class="{
          'intro-enemy': !introReady,
          'anim-shake': enemyShaking,
          'anim-faint': enemyFainting,
          'anim-attack-enemy': enemyAttacking,
          'is-wild': !isTrainerBattle,
        }"
      >
        <!-- Type flash overlay -->
        <div
          v-if="flashType && flashSide === 'enemy'"
          class="flash-overlay"
          :class="`flash-${flashType}`"
        ></div>
        <img v-if="getSprite(enemyPokemon)" :src="getSprite(enemyPokemon)" alt="Enemy" />
        <div v-else class="sprite-placeholder"></div>
      </div>

      <!-- Player sprite -->
      <div
        class="sprite-container player-sprite"
        :class="{
          'intro-player': !introReady,
          'anim-shake': playerShaking,
          'anim-faint': playerFainting,
          'anim-attack-player': playerAttacking,
        }"
      >
        <!-- Type flash overlay -->
        <div
          v-if="flashType && flashSide === 'player'"
          class="flash-overlay"
          :class="`flash-${flashType}`"
        ></div>
        <img v-if="getSprite(playerPokemon)" :src="getSprite(playerPokemon)" alt="Player" />
        <div v-else class="sprite-placeholder"></div>
      </div>

      <img
        v-if="playerTrainerSprite"
        class="player-trainer-sprite"
        :src="playerTrainerSprite"
        alt="Player Trainer"
      />

      <!-- Player HUD -->
      <div class="hud player-hud" :class="{ 'intro-hud-player': !introReady }">
        <div class="name">
          {{ playerPokemon.name }} Lv{{ playerPokemon.level }}
          <span v-if="playerStatus" class="status">{{ playerStatus }}</span>
        </div>
        <div class="types">
          <span v-for="type in playerTypes" :key="type" class="type-badge" :class="`type-${type}`">
            {{ type === 'unknown' ? '???' : type.toUpperCase() }}
          </span>
        </div>
        <div class="hp-bar">
          <div
            class="hp-fill"
            :style="{ width: `${playerHpPct}%`, backgroundColor: playerHpColor }"
          ></div>
        </div>
        <div class="hp-text">{{ displayPlayerHp }} / {{ playerPokemon.stats.hp }}</div>
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
                  menuMode === 'MAIN' && mainSection === 'moves' && selectedMoveIndex === moveIndex,
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
              :class="{
                'is-active':
                  menuMode === 'MAIN' && mainSection === 'utility' && selectedUtilityIndex === 0,
              }"
              @click="openBag"
            >
              BAG
            </button>
            <button
              :class="{
                'is-active':
                  menuMode === 'MAIN' && mainSection === 'utility' && selectedUtilityIndex === 1,
              }"
              @click="openParty"
            >
              POKEMON
            </button>
            <button
              :class="{
                'is-active':
                  menuMode === 'MAIN' && mainSection === 'utility' && selectedUtilityIndex === 2,
              }"
              @click="run"
              :disabled="store.battle?.isLegendary || isTrainerBattle"
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

  /* Desktop split: (100vh - 200px (panel height)) / 2 */
  --battle-split: calc((100vh - 200px) / 2);
}

.battle-arena {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* ── Sprite containers ── */
.sprite-container {
  position: absolute;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
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

.enemy-sprite.is-wild {
  /* Position further to the right on desktop if wild (no trainer) */
  right: 12%;
  transform: translateX(0);
}

.player-sprite {
  bottom: 20px;
  left: 140px;
  transform: scaleX(-1);
  z-index: 2;
}

/* ── Flash overlay ── */
.flash-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  border-radius: 8px;
  pointer-events: none;
  animation: flashPulse 0.35s ease-out forwards;
  mix-blend-mode: screen;
}

@keyframes flashPulse {
  0% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
  }
}

.flash-normal {
  background: radial-gradient(circle, rgba(168, 168, 120, 0.8), transparent 70%);
}
.flash-fire {
  background: radial-gradient(circle, rgba(255, 100, 30, 0.9), transparent 70%);
}
.flash-water {
  background: radial-gradient(circle, rgba(80, 144, 255, 0.9), transparent 70%);
}
.flash-electric {
  background: radial-gradient(circle, rgba(255, 220, 30, 0.9), transparent 70%);
}
.flash-grass {
  background: radial-gradient(circle, rgba(100, 210, 60, 0.9), transparent 70%);
}
.flash-ice {
  background: radial-gradient(circle, rgba(150, 220, 230, 0.9), transparent 70%);
}
.flash-fighting {
  background: radial-gradient(circle, rgba(200, 40, 30, 0.9), transparent 70%);
}
.flash-poison {
  background: radial-gradient(circle, rgba(170, 50, 170, 0.9), transparent 70%);
}
.flash-ground {
  background: radial-gradient(circle, rgba(230, 190, 90, 0.9), transparent 70%);
}
.flash-flying {
  background: radial-gradient(circle, rgba(170, 140, 255, 0.9), transparent 70%);
}
.flash-psychic {
  background: radial-gradient(circle, rgba(255, 80, 140, 0.9), transparent 70%);
}
.flash-bug {
  background: radial-gradient(circle, rgba(170, 190, 20, 0.9), transparent 70%);
}
.flash-rock {
  background: radial-gradient(circle, rgba(190, 170, 50, 0.9), transparent 70%);
}
.flash-ghost {
  background: radial-gradient(circle, rgba(110, 80, 160, 0.9), transparent 70%);
}
.flash-dragon {
  background: radial-gradient(circle, rgba(110, 50, 255, 0.9), transparent 70%);
}
.flash-dark {
  background: radial-gradient(circle, rgba(110, 80, 60, 0.9), transparent 70%);
}
.flash-steel {
  background: radial-gradient(circle, rgba(190, 190, 210, 0.9), transparent 70%);
}
.flash-fairy {
  background: radial-gradient(circle, rgba(240, 150, 175, 0.9), transparent 70%);
}

/* ── HUDs ── */
.hud {
  position: absolute;
  width: 240px;
  background-color: #fff;
  border: 4px solid #333;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 4px 4px 0 #333;
  z-index: 5;
}

.enemy-hud {
  top: 30px;
  left: 30px;
}

.player-hud {
  bottom: 30px;
  right: 30px;
}

/* ── Intro animations ── */
.intro-enemy {
  transform: translateX(300px);
  opacity: 0;
  animation: slideInEnemy 0.6s 0.2s ease-out forwards;
}

.intro-player {
  transform: scaleX(-1) translateX(300px);
  opacity: 0;
  animation: slideInPlayer 0.6s 0.3s ease-out forwards;
}

.intro-hud-enemy {
  opacity: 0;
  animation: fadeInHud 0.4s 0.5s ease-out forwards;
}

.intro-hud-player {
  opacity: 0;
  animation: fadeInHud 0.4s 0.6s ease-out forwards;
}

@keyframes slideInEnemy {
  0% {
    transform: translateX(300px);
    opacity: 0;
  }
  70% {
    transform: translateX(-10px);
    opacity: 1;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInPlayer {
  0% {
    transform: scaleX(-1) translateX(300px);
    opacity: 0;
  }
  70% {
    transform: scaleX(-1) translateX(-10px);
    opacity: 1;
  }
  100% {
    transform: scaleX(-1) translateX(0);
    opacity: 1;
  }
}

@keyframes fadeInHud {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Attack lunge ── */
.anim-attack-player {
  animation: lungeRight 0.3s ease-in-out;
}

.anim-attack-enemy {
  animation: lungeLeft 0.3s ease-in-out;
}

@keyframes lungeRight {
  0% {
    transform: scaleX(-1) translateX(0);
  }
  40% {
    transform: scaleX(-1) translateX(-40px);
  }
  100% {
    transform: scaleX(-1) translateX(0);
  }
}

@keyframes lungeLeft {
  0% {
    transform: translateX(0);
  }
  40% {
    transform: translateX(40px);
  }
  100% {
    transform: translateX(0);
  }
}

/* ── Shake on hit ── */
.anim-shake {
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%,
  100% {
    filter: brightness(1);
  }
  10% {
    transform: translateX(-6px);
    filter: brightness(2);
  }
  20% {
    transform: translateX(6px);
    filter: brightness(1);
  }
  30% {
    transform: translateX(-4px);
    filter: brightness(2);
  }
  40% {
    transform: translateX(4px);
    filter: brightness(1);
  }
  50% {
    transform: translateX(-2px);
    filter: brightness(1.5);
  }
  60% {
    transform: translateX(2px);
  }
  70% {
    transform: translateX(0);
  }
}

/* Override shake for player (needs scaleX) */
.player-sprite.anim-shake {
  animation: shakePlayer 0.4s ease-in-out;
}

@keyframes shakePlayer {
  0%,
  100% {
    transform: scaleX(-1);
    filter: brightness(1);
  }
  10% {
    transform: scaleX(-1) translateX(-6px);
    filter: brightness(2);
  }
  20% {
    transform: scaleX(-1) translateX(6px);
    filter: brightness(1);
  }
  30% {
    transform: scaleX(-1) translateX(-4px);
    filter: brightness(2);
  }
  40% {
    transform: scaleX(-1) translateX(4px);
    filter: brightness(1);
  }
  50% {
    transform: scaleX(-1) translateX(-2px);
    filter: brightness(1.5);
  }
  60% {
    transform: scaleX(-1) translateX(2px);
  }
  70% {
    transform: scaleX(-1) translateX(0);
  }
}

/* ── Faint animation ── */
.anim-faint {
  animation: faint 0.6s ease-in forwards;
}

.player-sprite.anim-faint {
  animation: faintPlayer 0.6s ease-in forwards;
}

@keyframes faint {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(60px);
    opacity: 0;
  }
}

@keyframes faintPlayer {
  0% {
    transform: scaleX(-1) translateY(0);
    opacity: 1;
  }
  100% {
    transform: scaleX(-1) translateY(60px);
    opacity: 0;
  }
}

/* ── HUD ── */
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

.type-normal {
  background: #a8a878;
}
.type-fire {
  background: #f08030;
}
.type-water {
  background: #6890f0;
  color: #fff;
}
.type-electric {
  background: #f8d030;
}
.type-grass {
  background: #78c850;
}
.type-ice {
  background: #98d8d8;
}
.type-fighting {
  background: #c03028;
  color: #fff;
}
.type-poison {
  background: #a040a0;
  color: #fff;
}
.type-ground {
  background: #e0c068;
}
.type-flying {
  background: #a890f0;
}
.type-psychic {
  background: #f85888;
  color: #fff;
}
.type-bug {
  background: #a8b820;
}
.type-rock {
  background: #b8a038;
}
.type-ghost {
  background: #705898;
  color: #fff;
}
.type-dragon {
  background: #7038f8;
  color: #fff;
}
.type-dark {
  background: #705848;
  color: #fff;
}
.type-steel {
  background: #b8b8d0;
}
.type-fairy {
  background: #ee99ac;
}
.type-unknown {
  background: #999;
  color: #fff;
}

.enemy-hud {
  top: 40px;
  left: 40px;
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
  border-radius: 2px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: #4caf50;
  transition:
    width 0.6s ease-out,
    background-color 0.6s ease-out;
}

/* ── Battle menu ── */
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

/* ── Mobile Layout Adjustments ── */
@media (max-width: 600px) {
  .battle-scene {
    font-size: 12px;
    /* Center the horizon in the visible area above the 11rem menu */
    /* Visible height = 100vh - 11rem */
    /* Horizon = (100vh - 11rem) / 2 */
    --battle-split: calc((100vh - 11rem) / 2);
  }

  /* HUDs */
  .hud {
    width: 160px;
    padding: 6px;
    background: rgba(255, 255, 255, 0.9);
  }

  .enemy-hud {
    top: 10px;
    left: 10px;
  }

  .player-hud {
    /* 11rem (menu height) + 10px spacing */
    bottom: calc(11rem + 10px);
    right: 10px;
  }

  .hp-text {
    font-size: 10px;
  }

  /* Sprites */
  .enemy-sprite {
    top: 130px; /* Moved down to clear HUD */
    right: 110px; /* Increased gap */
  }

  .enemy-sprite.is-wild {
    right: 20px; /* Centered-ish for wild pokemon (no trainer) */
  }

  .trainer-sprite {
    top: 20px;
    right: -10px; /* Moved slightly off-screen to give space */
    width: 140px; /* Restored size */
  }

  .enemy-sprite img,
  .trainer-sprite {
    width: 144px; /* Restored size */
  }

  .player-sprite {
    bottom: 19rem; /* Moved up to clear HUD/Menu */
    left: 110px; /* Mirrored: 110px matching enemy's right: 110px */
    z-index: 5;
  }

  .player-trainer-sprite {
    left: -10px; /* Mirrored: -10px matching trainer's right: -10px */
    width: 140px; /* Restored size */
    bottom: 19rem;
    z-index: 4;
  }

  .player-sprite img,
  .player-trainer-sprite {
    width: 144px; /* Restored size */
  }

  .intro-enemy {
    transform: translateX(100px);
  }

  .intro-player {
    transform: scaleX(-1) translateX(100px);
  }

  /* Menu */
  .battle-menu {
    border-top: 2px solid #000;
    padding: 10px;
    position: absolute;
    bottom: 0;
    width: 100%;
    box-sizing: border-box;
    height: 11rem; /* Fixed height for mobile menu */
    z-index: 100;
  }

  .battle-text {
    font-size: 14px;
  }

  .move-button,
  .utility button,
  .bag-item,
  .party-item {
    padding: 8px;
    font-size: 10px;
  }

  .move-name,
  .bag-name,
  .party-name {
    font-size: 11px;
    margin-bottom: 2px;
  }

  .move-meta,
  .bag-meta,
  .party-meta {
    font-size: 8px;
  }
}
</style>
