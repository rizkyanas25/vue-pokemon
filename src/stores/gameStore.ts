import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TILE, WALKABLE_TILES, type TileId, type NpcData } from '../constants/game'
import { overworldMap, overworldNpcs, overworldSpawn } from '../data/overworld'
import { createPokemonInstance, expForLevel, type PokemonInstance } from '../engine/pokemon'
import { STARTERS, type PokemonSpecies, type SpeciesKey } from '../data/battle/pokemon'
import { fetchPokemonSpecies, normalizeSpeciesKey } from '../data/pokeapi'
import type { TypeId } from '../data/battle/types'
import { ITEM_CATALOG, isCatchItem, type ItemId } from '../data/items'
import { SHOPS } from '../data/shops'
import {
  TRAINER_SPRITES,
  trainerSprite,
  type TrainerSpriteId,
  PLAYER_TRAINERS,
  type PlayerTrainerId,
  type PlayerTrainer,
} from '../data/trainers'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameState =
  | 'ROAMING'
  | 'BATTLE'
  | 'MENU'
  | 'DIALOG'
  | 'STARTER'
  | 'SHOP'
  | 'TRAINER_SELECT'
  | 'TRANSITION'
export type MenuTab = 'party' | 'bag' | 'pokedex' | 'save'

export type BagItem = {
  id: ItemId
  qty: number
}

type BattleTerrain = 'grass' | 'water' | 'default'
type BattleOutcome = 'WIN' | 'LOSE' | 'RUN' | 'CATCH'

type BattleState = {
  enemy: PokemonInstance
  terrain: BattleTerrain
  trainerId?: string
  trainerName?: string
  trainerSprite?: string | null
  isLegendary?: boolean
}

type PendingBattle = {
  kind: 'wild' | 'trainer'
  enemyLevel: number
  enemyLookup: number | string
  terrain: BattleTerrain
  trainerId?: string
  trainerName?: string
  trainerSprite?: string | null
  isLegendary?: boolean
}

export type DexEntry = {
  key: string
  id: number
  name: string
  types: TypeId[]
  seen: boolean
  caught: boolean
}

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const placeholderStats = { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 }

export const useGameStore = defineStore('game', () => {
  const MOVE_ANIM_MS = 200
  const GLITCH_MS = 520
  const LEGENDARY_IDS = new Set([144, 145, 146, 150, 151])
  const LEGENDARY_POOL = [144, 145, 146, 150, 151]
  const LEGENDARY_CHANCE = 0.1

  const gameState = ref<GameState>('ROAMING')
  const isLoading = ref(true)

  const speciesCache = ref<Record<string, PokemonSpecies>>({})
  const pokedex = ref<Record<string, DexEntry>>({})

  const player = ref({
    x: overworldSpawn.x,
    y: overworldSpawn.y,
    direction: 'down' as Direction,
    step: 0,
    activeIndex: 0,
    party: [] as PokemonInstance[],
  })
  const playerTrainer = ref<PlayerTrainer | null>(null)

  const currentMap = ref<TileId[][]>(overworldMap.tiles)
  const npcs = ref<NpcData[]>(overworldNpcs)

  const battle = ref<BattleState | null>(null)
  const battleTransition = ref<{ kind: 'wild' | 'trainer' } | null>(null)
  const pendingBattle = ref<PendingBattle | null>(null)
  const encounterLock = ref(false)
  const menuTab = ref<MenuTab>('party')
  const worldPos = ref({ x: 1, y: 1 })
  const mapCache = ref<Record<string, TileId[][]>>({})
  const npcCache = ref<Record<string, NpcData[]>>({})
  const money = ref(3000)
  const currentShopId = ref<string | null>(null)
  const bag = ref<BagItem[]>([
    { id: 'potion', qty: 3 },
    { id: 'pokeball', qty: 5 },
  ])

  const saveKey = 'pokemon-vue-save-v3'
  const MAP_VERSION = 3
  const legacySaveKey = 'pokemon-vue-save-v2'
  const legacySaveKeyV1 = 'pokemon-vue-save-v1'
  const hasSaveData = ref(false)
  const lastSaved = ref<string | null>(null)

  const dialog = ref<{
    speaker?: string
    lines: string[]
    index: number
  } | null>(null)

  const cacheSpecies = (species: PokemonSpecies) => {
    speciesCache.value[species.key] = species
  }

  const getStarterByKey = (key: string) =>
    STARTERS.find((starter) => starter.key === (key as SpeciesKey)) ?? null

  const findSpeciesInCache = (keyOrId: string | number) => {
    if (typeof keyOrId === 'number') {
      return Object.values(speciesCache.value).find((species) => species.id === keyOrId) ?? null
    }

    const normalized = normalizeSpeciesKey(keyOrId)
    return (
      speciesCache.value[normalized] ??
      Object.values(speciesCache.value).find((species) => species.name.toLowerCase() === normalized) ??
      null
    )
  }

  const buildPlaceholderSpecies = (keyOrId: string | number): PokemonSpecies => {
    const key = typeof keyOrId === 'string' ? normalizeSpeciesKey(keyOrId) : `pokemon-${keyOrId}`
    const id = typeof keyOrId === 'number' ? keyOrId : 0
    return {
      key,
      id,
      name: titleCase(typeof keyOrId === 'string' ? keyOrId : `Pokemon ${keyOrId}`),
      types: ['normal'],
      baseStats: placeholderStats,
      baseExp: 50,
      sprite: null,
    }
  }

  const ensureSpecies = async (keyOrId: string | number) => {
    const cached = findSpeciesInCache(keyOrId)
    if (cached) return cached

    const starterFallback =
      typeof keyOrId === 'string'
        ? getStarterByKey(normalizeSpeciesKey(keyOrId))
        : STARTERS.find((starter) => starter.species.id === keyOrId) ?? null

    try {
      const species = await fetchPokemonSpecies(keyOrId)
      cacheSpecies(species)
      return species
    } catch {
      if (starterFallback) {
        cacheSpecies(starterFallback.species)
        return starterFallback.species
      }
      const placeholder = buildPlaceholderSpecies(keyOrId)
      cacheSpecies(placeholder)
      return placeholder
    }
  }

  const upsertDexEntry = (species: PokemonSpecies, caught: boolean) => {
    const key = species.key
    const entry = pokedex.value[key] ?? {
      key,
      id: species.id,
      name: species.name,
      types: species.types,
      seen: false,
      caught: false,
    }

    pokedex.value[key] = {
      ...entry,
      id: species.id || entry.id,
      name: species.name || entry.name,
      types: species.types?.length ? species.types : entry.types,
      seen: true,
      caught: entry.caught || caught,
    }
  }

  const markSeen = (species: PokemonSpecies) => upsertDexEntry(species, false)
  const markCaught = (species: PokemonSpecies) => upsertDexEntry(species, true)

  const getNpcAt = (x: number, y: number) => npcs.value.find((npc) => npc.x === x && npc.y === y)

  const mapKey = (x: number, y: number) => `${x},${y}`

  const isTileWalkable = (tiles: TileId[][], x: number, y: number) => {
    const row = tiles[y]
    if (!row) return false
    const tile = row[x]
    if (tile === undefined) return false
    return WALKABLE_TILES.has(tile)
  }

  const isTrainerNpc = (npc: NpcData) => npc.role === 'trainer'
  const isTrainerActive = (npc: NpcData) => isTrainerNpc(npc) && !npc.defeated

  const clearPendingBattle = () => {
    pendingBattle.value = null
    encounterLock.value = false
    battleTransition.value = null
  }

  const startPendingBattle = async () => {
    const pending = pendingBattle.value
    if (!pending) {
      if (gameState.value === 'TRANSITION') gameState.value = 'ROAMING'
      clearPendingBattle()
      return
    }

    try {
      const species = await ensureSpecies(pending.enemyLookup)
      battle.value = {
        enemy: createPokemonInstance(species, pending.enemyLevel),
        terrain: pending.terrain,
        trainerId: pending.trainerId,
        trainerName: pending.trainerName,
        trainerSprite: pending.trainerSprite,
        isLegendary: pending.isLegendary,
      }
      markSeen(species)
      gameState.value = 'BATTLE'
    } finally {
      clearPendingBattle()
    }
  }

  const beginBattleTransition = (kind: 'wild' | 'trainer') => {
    if (battleTransition.value) return
    battleTransition.value = { kind }
    gameState.value = 'TRANSITION'
    window.setTimeout(() => {
      void startPendingBattle()
    }, GLITCH_MS)
  }

  const queueBattle = (
    pending: PendingBattle,
    options: { delayMs?: number; autoTransition?: boolean } = {},
  ) => {
    if (pendingBattle.value) return
    pendingBattle.value = pending
    encounterLock.value = true
    const delayMs = options.delayMs ?? 0
    const autoTransition = options.autoTransition ?? true
    if (!autoTransition) return

    if (delayMs > 0) {
      window.setTimeout(() => beginBattleTransition(pending.kind), delayMs)
    } else {
      beginBattleTransition(pending.kind)
    }
  }

  const buildReachableSet = (tiles: TileId[][]) => {
    const height = tiles.length
    const width = tiles[0]?.length ?? 0
    const reachable = new Set<string>()
    const queue: Array<{ x: number; y: number }> = []

    const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height
    const enqueue = (x: number, y: number) => {
      if (!inBounds(x, y)) return
      if (!isTileWalkable(tiles, x, y)) return
      const key = `${x},${y}`
      if (!reachable.has(key)) queue.push({ x, y })
    }

    for (let x = 0; x < width; x += 1) {
      enqueue(x, 0)
      enqueue(x, height - 1)
    }
    for (let y = 0; y < height; y += 1) {
      enqueue(0, y)
      enqueue(width - 1, y)
    }

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) break
      const key = `${current.x},${current.y}`
      if (reachable.has(key)) continue
      reachable.add(key)

      enqueue(current.x + 1, current.y)
      enqueue(current.x - 1, current.y)
      enqueue(current.x, current.y + 1)
      enqueue(current.x, current.y - 1)
    }

    return reachable
  }

  const findNearestWalkable = (tiles: TileId[][], startX: number, startY: number) => {
    const height = tiles.length
    const width = tiles[0]?.length ?? 0
    const visited = new Set<string>()
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]

    const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) break
      const key = `${current.x},${current.y}`
      if (visited.has(key)) continue
      visited.add(key)

      if (isTileWalkable(tiles, current.x, current.y)) return current

      const candidates = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ]
      for (const next of candidates) {
        if (!inBounds(next.x, next.y)) continue
        const nextKey = `${next.x},${next.y}`
        if (!visited.has(nextKey)) queue.push(next)
      }
    }

    return null
  }

  const ensurePlayerOnWalkable = () => {
    if (isTileWalkable(currentMap.value, player.value.x, player.value.y)) return
    const fallback = findNearestWalkable(currentMap.value, player.value.x, player.value.y)
    if (fallback) {
      player.value.x = fallback.x
      player.value.y = fallback.y
    }
  }

  const randomTrainerSprite = () =>
    TRAINER_SPRITES[Math.floor(Math.random() * TRAINER_SPRITES.length)] as TrainerSpriteId

  const isSpawnableTile = (tiles: TileId[][], x: number, y: number) => {
    const row = tiles[y]
    if (!row) return false
    const tile = row[x]
    if (tile === undefined) return false
    return WALKABLE_TILES.has(tile) && tile !== TILE.BUSH
  }

  const findRandomWalkableSpot = (
    tiles: TileId[][],
    existing: NpcData[],
    reachable?: Set<string>,
  ) => {
    const height = tiles.length
    const width = tiles[0]?.length ?? 0
    const attempts = 50

    for (let i = 0; i < attempts; i += 1) {
      const x = Math.floor(Math.random() * Math.max(1, width - 4)) + 2
      const y = Math.floor(Math.random() * Math.max(1, height - 4)) + 2
      if (!isSpawnableTile(tiles, x, y)) continue
      if (reachable && !reachable.has(`${x},${y}`)) continue
      if (existing.some((npc) => npc.x === x && npc.y === y)) continue
      return { x, y }
    }

    return null
  }

  const createTrainerNpc = (
    key: string,
    tiles: TileId[][],
    existing: NpcData[],
    reachable?: Set<string>,
  ) => {
    const spot = findRandomWalkableSpot(tiles, existing, reachable)
    if (!spot) return null
    const spriteId = randomTrainerSprite()
    return {
      id: `trainer-${key}-${existing.length}`,
      name: 'Trainer',
      x: spot.x,
      y: spot.y,
      sprite: trainerSprite(spriteId),
      dialog: ['A trainer is looking for a battle.'],
      role: 'trainer',
      defeated: false,
    } as NpcData
  }

  const maybeSpawnTrainer = (key: string) => {
    const npcList = npcCache.value[key]
    if (!npcList) return
    const trainerCount = npcList.filter((npc) => npc.id.startsWith('trainer-')).length
    if (trainerCount >= 2) return
    if (Math.random() > 0.03) return

    const reachable = buildReachableSet(currentMap.value)
    const npc = createTrainerNpc(key, currentMap.value, npcList, reachable)
    if (!npc) return
    npcList.push(npc)
    npcCache.value[key] = npcList
    npcs.value = npcList
  }

  const generateMap = (width: number, height: number) => {
    const tiles: TileId[][] = []
    for (let y = 0; y < height; y += 1) {
      const row: TileId[] = []
      for (let x = 0; x < width; x += 1) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          row.push(TILE.GRASS)
          continue
        }
        const rand = Math.random()
        if (rand < 0.08) row.push(TILE.WATER)
        else if (rand < 0.12) row.push(TILE.WALL)
        else if (rand < 0.2) row.push(TILE.PATH)
        else if (rand < 0.45) row.push(TILE.BUSH)
        else row.push(TILE.GRASS)
      }
      tiles.push(row)
    }
    addBridges(tiles)
    return tiles
  }

  const addBridges = (tiles: TileId[][]) => {
    const height = tiles.length
    const width = tiles[0]?.length ?? 0
    for (let y = 1; y < height - 1; y += 1) {
      let runStart = -1
      for (let x = 1; x <= width; x += 1) {
        const isWater = x < width && tiles[y]?.[x] === TILE.WATER
        if (isWater && runStart === -1) {
          runStart = x
          continue
        }
        if (!isWater && runStart !== -1) {
          const runLength = x - runStart
          if (runLength >= 3 && Math.random() < 0.4) {
            const bridgeLength = Math.min(3, runLength)
            const start = runStart + Math.floor((runLength - bridgeLength) / 2)
            for (let i = 0; i < bridgeLength; i += 1) {
              tiles[y][start + i] = TILE.BRIDGE
            }
          }
          runStart = -1
        }
      }
    }
  }

  const ensureMapAt = (x: number, y: number) => {
    const key = mapKey(x, y)
    if (mapCache.value[key]) return key

    const width = overworldMap.width
    const height = overworldMap.height
    const isCenter = x === 1 && y === 1
    const tiles = isCenter ? overworldMap.tiles : generateMap(width, height)
    mapCache.value[key] = tiles

    const reachable = buildReachableSet(tiles)
    const baseNpcs = isCenter ? [...overworldNpcs] : []
    const npcList = [...baseNpcs]
    const spawnCount = isCenter ? 1 : Math.random() < 0.6 ? 1 : 0
    for (let i = 0; i < spawnCount; i += 1) {
      const npc = createTrainerNpc(key, tiles, npcList, reachable)
      if (npc) npcList.push(npc)
    }
    const filtered = npcList.filter((npc) => !isTrainerNpc(npc) || reachable.has(`${npc.x},${npc.y}`))
    npcCache.value[key] = filtered
    return key
  }

  const setCurrentMap = (x: number, y: number) => {
    const key = ensureMapAt(x, y)
    worldPos.value = { x, y }
    currentMap.value = mapCache.value[key]
    const reachable = buildReachableSet(currentMap.value)
    const npcList = (npcCache.value[key] ?? []).filter(
      (npc) => !isTrainerNpc(npc) || reachable.has(`${npc.x},${npc.y}`),
    )
    npcCache.value[key] = npcList
    npcs.value = npcList
  }

  const isWalkable = (x: number, y: number) => {
    const row = currentMap.value[y]
    if (!row) return false
    const tile = row[x]
    if (tile === undefined) return false
    return WALKABLE_TILES.has(tile)
  }

  const findAdjacentTrainer = () => {
    const { x, y } = player.value
    return (
      npcs.value.find((npc) => {
        if (!isTrainerActive(npc)) return false
        const dx = Math.abs(npc.x - x)
        const dy = Math.abs(npc.y - y)
        return dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0)
      }) ?? null
    )
  }

  const getFrontTile = () => {
    const { x, y, direction } = player.value
    if (direction === 'up') return { x, y: y - 1 }
    if (direction === 'down') return { x, y: y + 1 }
    if (direction === 'left') return { x: x - 1, y }
    return { x: x + 1, y }
  }

  function movePlayer(dx: number, dy: number) {
    if (gameState.value !== 'ROAMING' || isLoading.value || encounterLock.value) return

    ensurePlayerOnWalkable()

    const newX = player.value.x + dx
    const newY = player.value.y + dy

    const width = currentMap.value[0]?.length ?? 0
    const height = currentMap.value.length

    const tryTransition = () => {
      const nextWorldX = worldPos.value.x + Math.sign(dx)
      const nextWorldY = worldPos.value.y + Math.sign(dy)
      if (nextWorldX < 0 || nextWorldX > 2 || nextWorldY < 0 || nextWorldY > 2) return false

      setCurrentMap(nextWorldX, nextWorldY)
      const targetX = dx > 0 ? 0 : dx < 0 ? width - 1 : player.value.x
      const targetY = dy > 0 ? 0 : dy < 0 ? height - 1 : player.value.y

      const adjustedX = Math.min(Math.max(targetX, 0), width - 1)
      const adjustedY = Math.min(Math.max(targetY, 0), height - 1)

      const isFree = (x: number, y: number) =>
        isTileWalkable(currentMap.value, x, y) && !getNpcAt(x, y)

      if (!isFree(adjustedX, adjustedY)) {
        // find nearest walkable tile along the entry edge
        for (let offset = 0; offset < Math.max(width, height); offset += 1) {
          const candidateY = Math.min(Math.max(adjustedY + offset, 0), height - 1)
          const candidateY2 = Math.min(Math.max(adjustedY - offset, 0), height - 1)
          const candidateX = Math.min(Math.max(adjustedX + offset, 0), width - 1)
          const candidateX2 = Math.min(Math.max(adjustedX - offset, 0), width - 1)
          if (isFree(adjustedX, candidateY)) {
            player.value.x = adjustedX
            player.value.y = candidateY
            return true
          }
          if (isFree(adjustedX, candidateY2)) {
            player.value.x = adjustedX
            player.value.y = candidateY2
            return true
          }
          if (isFree(candidateX, adjustedY)) {
            player.value.x = candidateX
            player.value.y = adjustedY
            return true
          }
          if (isFree(candidateX2, adjustedY)) {
            player.value.x = candidateX2
            player.value.y = adjustedY
            return true
          }
        }
        return false
      }

      player.value.x = adjustedX
      player.value.y = adjustedY
      return true
    }

    if (newX < 0 || newX > width - 1 || newY < 0 || newY > height - 1) {
      if (tryTransition()) return
      return
    }

    const row = currentMap.value[newY]
    if (!row) return
    const tile = row[newX]
    if (tile === undefined) return
    if (!WALKABLE_TILES.has(tile)) return
    if (getNpcAt(newX, newY)) return

    player.value.x = newX
    player.value.y = newY
    player.value.step = (player.value.step + 1) % 2

    const nearbyTrainer = findAdjacentTrainer()
    if (nearbyTrainer) {
      void startTrainerBattle(nearbyTrainer, tile)
      return
    }

    if (tile === TILE.BUSH && Math.random() < 0.12) {
      void startWildBattle(tile)
    }

    maybeSpawnTrainer(mapKey(worldPos.value.x, worldPos.value.y))
  }

  function setDirection(dir: Direction) {
    player.value.direction = dir
  }

  function setActiveParty(index: number) {
    if (index < 0 || index >= player.value.party.length) return
    player.value.activeIndex = index
  }

  function startTrainerBattle(npc: NpcData, tile?: TileId) {
    if (gameState.value !== 'ROAMING' || isLoading.value || encounterLock.value) return Promise.resolve()
    if (!player.value.party[player.value.activeIndex]) return Promise.resolve()

    const enemyLevel = Math.max(2, player.value.party[player.value.activeIndex].level)
    const foeLookup = npc.pokemonId ?? npc.pokemonKey ?? Math.floor(Math.random() * 151) + 1
    const terrain: BattleTerrain =
      tile === TILE.WATER ? 'water' : tile === TILE.GRASS || tile === TILE.BUSH ? 'grass' : 'default'

    queueBattle(
      {
        kind: 'trainer',
        enemyLevel,
        enemyLookup: foeLookup,
        terrain,
        trainerId: npc.id,
        trainerName: npc.name,
        trainerSprite: npc.sprite ?? null,
      },
      { autoTransition: false },
    )

    const dialogLines = npc.dialog?.length ? npc.dialog : [`${npc.name} wants to battle!`]
    dialog.value = {
      speaker: npc.name,
      lines: dialogLines,
      index: 0,
    }
    gameState.value = 'DIALOG'
    return Promise.resolve()
  }

  function startWildBattle(tile?: TileId) {
    if (gameState.value !== 'ROAMING' || isLoading.value || encounterLock.value) return Promise.resolve()
    if (!player.value.party[player.value.activeIndex]) return Promise.resolve()

    const wantsLegendary = Math.random() < LEGENDARY_CHANCE
    let randomId = Math.floor(Math.random() * 151) + 1
    if (wantsLegendary) {
      randomId = LEGENDARY_POOL[Math.floor(Math.random() * LEGENDARY_POOL.length)]
    } else {
      while (LEGENDARY_IDS.has(randomId)) {
        randomId = Math.floor(Math.random() * 151) + 1
      }
    }
    const isLegendary = LEGENDARY_IDS.has(randomId)
    const enemyLevel = isLegendary
      ? Math.max(50, player.value.party[player.value.activeIndex].level)
      : Math.max(2, player.value.party[player.value.activeIndex].level - 1)
    const terrain: BattleTerrain =
      tile === TILE.WATER ? 'water' : tile === TILE.GRASS || tile === TILE.BUSH ? 'grass' : 'default'

    queueBattle(
      {
        kind: 'wild',
        enemyLevel,
        enemyLookup: randomId,
        terrain,
        isLegendary,
      },
      { delayMs: MOVE_ANIM_MS, autoTransition: !isLegendary },
    )

    if (isLegendary) {
      dialog.value = {
        speaker: '???',
        lines: [
          'A legendary Pokemon is chasing you!',
          "You can't run away!",
        ],
        index: 0,
      }
      gameState.value = 'DIALOG'
    }
    return Promise.resolve()
  }

  const markTrainerDefeated = (trainerId: string) => {
    const npc = npcs.value.find((entry) => entry.id === trainerId)
    if (npc) npc.defeated = true
  }

    function endBattle(result?: BattleOutcome) {
      if (battle.value?.trainerId && (result === 'WIN' || result === 'CATCH')) {
        markTrainerDefeated(battle.value.trainerId)
      }
      battle.value = null
      gameState.value = 'ROAMING'
      encounterLock.value = false
      battleTransition.value = null
      pendingBattle.value = null
    }

  function openMenu(tab?: MenuTab) {
    if (
      gameState.value === 'BATTLE' ||
      gameState.value === 'STARTER' ||
      gameState.value === 'TRAINER_SELECT' ||
      gameState.value === 'TRANSITION' ||
      gameState.value === 'SHOP' ||
      isLoading.value
    )
      return
    if (tab) menuTab.value = tab
    gameState.value = 'MENU'
  }

  function closeMenu() {
    if (gameState.value === 'MENU') gameState.value = 'ROAMING'
  }

  function setMenuTab(tab: MenuTab) {
    menuTab.value = tab
  }

    function useItem(itemId: ItemId, targetIndex = player.value.activeIndex) {
      const item = bag.value.find((entry) => entry.id === itemId)
      if (!item || item.qty <= 0) return 'No items left.'

      const catalog = ITEM_CATALOG[itemId]

      if (isCatchItem(itemId)) {
        return "Use catch items through the battle catch flow."
      }

      const target = player.value.party[targetIndex]
      if (!target) return 'No valid target.'

      if (catalog?.heal) {
        if (target.currentHp >= target.stats.hp) return `${target.name} is already at full HP.`
        const heal = Math.min(catalog.heal, target.stats.hp - target.currentHp)
        target.currentHp += heal
        item.qty -= 1
        if (item.qty <= 0) bag.value = bag.value.filter((e) => e.qty > 0)
        return `${target.name} recovered ${heal} HP.`
      }

      return "You can't use that right now."
    }

    function useCatchItem(itemId: ItemId) {
      const item = bag.value.find((entry) => entry.id === itemId)
      if (!item || item.qty <= 0) return null
      item.qty -= 1
      if (item.qty <= 0) bag.value = bag.value.filter((e) => e.qty > 0)
      return ITEM_CATALOG[itemId]?.catchRate ?? 1
    }

    function catchPokemon(pokemon: PokemonInstance) {
      if (player.value.party.length < 6) {
        pokemon.status = 'none'
        pokemon.statusTurns = 0
        player.value.party.push(pokemon)
        markCaught(pokemon.species)
        return { added: true, message: `${pokemon.name} was added to your party!` }
      }
      markCaught(pokemon.species)
      return { added: false, message: `Your party is full! ${pokemon.name} was released...` }
    }

  function addMoney(amount: number) {
    money.value = Math.max(0, money.value + amount)
  }

  function openShop(shopId: string) {
    if (gameState.value === 'BATTLE' || gameState.value === 'STARTER' || isLoading.value) return
    currentShopId.value = shopId
    gameState.value = 'SHOP'
  }

  function closeShop() {
    if (gameState.value === 'SHOP') {
      currentShopId.value = null
      gameState.value = 'ROAMING'
    }
  }

  function buyItem(itemId: ItemId) {
    const shop = currentShopId.value ? SHOPS[currentShopId.value] : null
    if (!shop) return 'Shop is closed.'
    const listing = shop.inventory.find((entry) => entry.id === itemId)
    if (!listing) return 'Item not available.'

    const price = listing.price ?? ITEM_CATALOG[itemId]?.price ?? 0
    if (money.value < price) return 'Not enough money.'

    money.value -= price
    const bagItem = bag.value.find((entry) => entry.id === itemId)
    if (bagItem) bagItem.qty += 1
    else bag.value.push({ id: itemId, qty: 1 })

    return `Purchased ${ITEM_CATALOG[itemId]?.name ?? itemId}!`
  }

  function serializeGame() {
    return {
      version: 3,
      savedAt: new Date().toISOString(),
      player: player.value,
      playerTrainer: playerTrainer.value,
      bag: bag.value,
      money: money.value,
      pokedex: pokedex.value,
      speciesCache: speciesCache.value,
      worldPos: worldPos.value,
      mapVersion: MAP_VERSION,
      mapCache: mapCache.value,
      npcCache: npcCache.value,
    }
  }

  function normalizePokemon(pokemon: PokemonInstance): PokemonInstance {
    const fallbackKey =
      (pokemon as unknown as { speciesId?: string }).speciesId ?? pokemon.species?.key ?? pokemon.name?.toLowerCase()
    const starterFallback = fallbackKey ? getStarterByKey(normalizeSpeciesKey(fallbackKey)) : null
    const species =
      pokemon.species ??
      starterFallback?.species ??
      buildPlaceholderSpecies(fallbackKey ?? 'pokemon')

    const level = pokemon.level ?? 1
    const template = createPokemonInstance(species, level)
    const stats = pokemon.stats ?? template.stats
    const moves = pokemon.moves?.length ? pokemon.moves : template.moves
    const currentHp = Math.min(pokemon.currentHp ?? stats.hp, stats.hp)

    return {
      ...pokemon,
      species,
      name: pokemon.name ?? species.name,
      level,
      exp: pokemon.exp ?? expForLevel(level),
      status: pokemon.status ?? 'none',
      statusTurns: pokemon.statusTurns ?? 0,
      statStages: pokemon.statStages ?? { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      currentHp,
      moves,
      stats,
    }
  }

  const normalizeDexEntry = (key: string, entry: Partial<DexEntry> | null | undefined) => {
    const safeEntry = entry ?? {}
    const normalizedKey = normalizeSpeciesKey(safeEntry.key ?? key)
    return {
      key: normalizedKey,
      id: safeEntry.id ?? 0,
      name: safeEntry.name ?? titleCase(normalizedKey),
      types: safeEntry.types ?? [],
      seen: Boolean(safeEntry.seen),
      caught: Boolean(safeEntry.caught),
    }
  }

  function saveGame() {
    if (typeof window === 'undefined') return false
    try {
      const payload = serializeGame()
      localStorage.setItem(saveKey, JSON.stringify(payload))
      lastSaved.value = payload.savedAt
      hasSaveData.value = true
      return true
    } catch {
      return false
    }
  }

  async function loadGame() {
    if (typeof window === 'undefined') return false
    const toggleLoading = !isLoading.value
    if (toggleLoading) isLoading.value = true
    try {
      const raw =
        localStorage.getItem(saveKey) ??
        localStorage.getItem(legacySaveKey) ??
        localStorage.getItem(legacySaveKeyV1)
      if (!raw) return false
      const data = JSON.parse(raw)
      if (!data?.player?.party) return false

      const restoredParty = (data.player.party as PokemonInstance[]).map(normalizePokemon)
      player.value = {
        ...player.value,
        ...data.player,
        party: restoredParty,
      }
      if (player.value.activeIndex >= restoredParty.length) {
        player.value.activeIndex = 0
      }

      const rawBag = Array.isArray(data.bag) ? data.bag : []
      bag.value = rawBag
        .map((entry: Partial<BagItem> & { id?: ItemId }) => ({
          id: (entry.id ?? 'potion') as ItemId,
          qty: entry.qty ?? 1,
        }))
        .filter((entry) => ITEM_CATALOG[entry.id])

      if (bag.value.length === 0) {
        bag.value = [
          { id: 'potion', qty: 3 },
          { id: 'pokeball', qty: 5 },
        ]
      }

      playerTrainer.value = data.playerTrainer ?? null
      money.value = typeof data.money === 'number' ? data.money : money.value

      const loadedWorld = data.worldPos ?? worldPos.value
      worldPos.value = {
        x: Math.min(2, Math.max(0, loadedWorld.x ?? 1)),
        y: Math.min(2, Math.max(0, loadedWorld.y ?? 1)),
      }

      const shouldResetMaps = data.mapVersion !== MAP_VERSION
      mapCache.value = shouldResetMaps ? {} : data.mapCache ?? mapCache.value
      npcCache.value = shouldResetMaps ? {} : data.npcCache ?? npcCache.value

      setCurrentMap(worldPos.value.x, worldPos.value.y)
      ensurePlayerOnWalkable()
      const rawDex = data.pokedex ?? {}
      pokedex.value = Object.entries(rawDex).reduce((acc, [key, entry]) => {
        acc[normalizeSpeciesKey(key)] = normalizeDexEntry(key, entry as Partial<DexEntry>)
        return acc
      }, {} as Record<string, DexEntry>)
      speciesCache.value = data.speciesCache ?? {}

      hasSaveData.value = true
      lastSaved.value = data.savedAt ?? null
      await hydratePartySpecies()
      return true
    } catch {
      return false
    } finally {
      if (toggleLoading) isLoading.value = false
    }
  }

  function refreshSaveMeta() {
    if (typeof window === 'undefined') return
    try {
      const raw =
        localStorage.getItem(saveKey) ??
        localStorage.getItem(legacySaveKey) ??
        localStorage.getItem(legacySaveKeyV1)
      if (!raw) {
        hasSaveData.value = false
        lastSaved.value = null
        return
      }
      const data = JSON.parse(raw)
      hasSaveData.value = true
      lastSaved.value = data?.savedAt ?? null
    } catch {
      hasSaveData.value = false
      lastSaved.value = null
    }
  }

  async function bootstrap() {
    isLoading.value = true
    refreshSaveMeta()

    ensureMapAt(worldPos.value.x, worldPos.value.y)
    setCurrentMap(worldPos.value.x, worldPos.value.y)

    const loaded = await loadGame()
    if (!playerTrainer.value) {
      gameState.value = 'TRAINER_SELECT'
    } else if (loaded && player.value.party.length > 0) {
      gameState.value = 'ROAMING'
    } else {
      gameState.value = 'STARTER'
    }
    isLoading.value = false
  }

  async function hydratePartySpecies() {
    const tasks = player.value.party.map(async (pokemon) => {
      const lookup =
        pokemon.species?.id && pokemon.species.id > 0
          ? pokemon.species.id
          : pokemon.species?.key ?? pokemon.name
      const species = await ensureSpecies(lookup)
      pokemon.species = species
      pokemon.name = pokemon.name ?? species.name
      markCaught(species)
    })
    await Promise.all(tasks)
  }

  async function chooseStarter(key: SpeciesKey) {
    if (isLoading.value) return
    const starter = getStarterByKey(key)
    isLoading.value = true
    try {
      const species = await ensureSpecies(starter?.species.id ?? key)
      const moveOverrides = starter?.defaultMoves
      const instance = createPokemonInstance(species, 5, moveOverrides)
      player.value.party = [instance]
      player.value.activeIndex = 0
      worldPos.value = { x: 1, y: 1 }
      setCurrentMap(worldPos.value.x, worldPos.value.y)
      player.value.x = overworldSpawn.x
      player.value.y = overworldSpawn.y
      player.value.direction = 'down'
      player.value.step = 0
      ensurePlayerOnWalkable()
      markCaught(species)
      gameState.value = 'ROAMING'
    } finally {
      isLoading.value = false
    }
  }

  function chooseTrainer(id: PlayerTrainerId) {
    const trainer = PLAYER_TRAINERS[id]
    if (!trainer) return
    playerTrainer.value = trainer
    if (player.value.party.length > 0) {
      gameState.value = 'ROAMING'
    } else {
      gameState.value = 'STARTER'
    }
  }

  function tryInteract() {
    if (gameState.value !== 'ROAMING' || isLoading.value) return
    const target = getFrontTile()
    const npc = getNpcAt(target.x, target.y)
    if (!npc) return

    if (npc.shopId) {
      openShop(npc.shopId)
      return
    }

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
    if (pendingBattle.value) {
      beginBattleTransition(pendingBattle.value.kind)
      return
    }
    gameState.value = 'ROAMING'
  }

  return {
    gameState,
    isLoading,
    player,
    playerTrainer,
    currentMap,
    npcs,
    dialog,
    battle,
    battleTransition,
    menuTab,
    bag,
    money,
    currentShopId,
    pokedex,
    speciesCache,
    hasSaveData,
    lastSaved,
    movePlayer,
    setDirection,
    setActiveParty,
    tryInteract,
    advanceDialog,
    startWildBattle,
    endBattle,
    openMenu,
    closeMenu,
    setMenuTab,
      useItem,
      useCatchItem,
      catchPokemon,
      addMoney,
    openShop,
    closeShop,
    buyItem,
    saveGame,
    loadGame,
    bootstrap,
    chooseStarter,
    chooseTrainer,
  }
})
