import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TILE, WALKABLE_TILES, type TileId, type NpcData } from '../constants/game'
import { overworldMap, overworldNpcs, overworldSpawn } from '../data/overworld'
import { createPokemonInstance, expForLevel, type PokemonInstance } from '../engine/pokemon'
import { STARTERS, type PokemonSpecies, type SpeciesKey } from '../data/battle/pokemon'
import { fetchPokemonSpecies, normalizeSpeciesKey } from '../data/pokeapi'
import type { TypeId } from '../data/battle/types'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameState = 'ROAMING' | 'BATTLE' | 'MENU' | 'DIALOG' | 'STARTER'
export type MenuTab = 'party' | 'bag' | 'pokedex' | 'save'

export type BagItemId = 'potion' | 'pokeball'
export type BagItem = {
  id: BagItemId
  name: string
  description: string
  qty: number
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

  const currentMap = ref<TileId[][]>(overworldMap.tiles)
  const npcs = ref<NpcData[]>(overworldNpcs)

  const battle = ref<{ enemy: PokemonInstance } | null>(null)
  const menuTab = ref<MenuTab>('party')
  const npcSprites = ref<Record<string, string | null>>({})
  const bag = ref<BagItem[]>([
    { id: 'potion', name: 'Potion', description: 'Heals 20 HP.', qty: 3 },
    { id: 'pokeball', name: 'Poke Ball', description: 'A device for catching wild Pokemon.', qty: 5 },
  ])

  const saveKey = 'pokemon-vue-save-v2'
  const legacySaveKey = 'pokemon-vue-save-v1'
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

  const ensureNpcSprite = async (npc: NpcData) => {
    if (npc.sprite) {
      npcSprites.value[npc.id] = npc.sprite
      return
    }

    if (npcSprites.value[npc.id] !== undefined) return

    const lookup = npc.pokemonId ?? npc.pokemonKey
    if (!lookup) {
      npcSprites.value[npc.id] = null
      return
    }

    try {
      const species = await ensureSpecies(lookup)
      npcSprites.value[npc.id] = species.sprite ?? null
    } catch {
      npcSprites.value[npc.id] = null
    }
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

  const isWalkable = (x: number, y: number) => {
    const row = currentMap.value[y]
    if (!row) return false
    const tile = row[x]
    if (tile === undefined) return false
    return WALKABLE_TILES.has(tile)
  }

  const getFrontTile = () => {
    const { x, y, direction } = player.value
    if (direction === 'up') return { x, y: y - 1 }
    if (direction === 'down') return { x, y: y + 1 }
    if (direction === 'left') return { x: x - 1, y }
    return { x: x + 1, y }
  }

  function movePlayer(dx: number, dy: number) {
    if (gameState.value !== 'ROAMING' || isLoading.value) return

    const newX = player.value.x + dx
    const newY = player.value.y + dy

    if (!isWalkable(newX, newY)) return
    if (getNpcAt(newX, newY)) return

    const tile = currentMap.value[newY]?.[newX]
    if (tile === undefined) return

    player.value.x = newX
    player.value.y = newY
    player.value.step = (player.value.step + 1) % 2

    if (tile === TILE.GRASS && Math.random() < 0.08) {
      void startWildBattle()
    }
  }

  function setDirection(dir: Direction) {
    player.value.direction = dir
  }

  function setActiveParty(index: number) {
    if (index < 0 || index >= player.value.party.length) return
    player.value.activeIndex = index
  }

  function startWildBattle() {
    if (gameState.value !== 'ROAMING' || isLoading.value) return Promise.resolve()
    if (!player.value.party[player.value.activeIndex]) return Promise.resolve()

    isLoading.value = true
    const enemyLevel = Math.max(2, player.value.party[player.value.activeIndex].level - 1)
    const randomId = Math.floor(Math.random() * 151) + 1

    return ensureSpecies(randomId)
      .then((species) => {
        battle.value = { enemy: createPokemonInstance(species, enemyLevel) }
        markSeen(species)
        gameState.value = 'BATTLE'
      })
      .finally(() => {
        isLoading.value = false
      })
  }

  function endBattle() {
    battle.value = null
    gameState.value = 'ROAMING'
  }

  function openMenu(tab?: MenuTab) {
    if (gameState.value === 'BATTLE' || gameState.value === 'STARTER' || isLoading.value) return
    if (tab) menuTab.value = tab
    gameState.value = 'MENU'
  }

  function closeMenu() {
    if (gameState.value === 'MENU') gameState.value = 'ROAMING'
  }

  function setMenuTab(tab: MenuTab) {
    menuTab.value = tab
  }

  function useItem(itemId: BagItemId, targetIndex = player.value.activeIndex) {
    const item = bag.value.find((entry) => entry.id === itemId)
    if (!item || item.qty <= 0) return 'No items left.'

    const target = player.value.party[targetIndex]
    if (!target) return 'No valid target.'

    if (itemId === 'potion') {
      if (target.currentHp >= target.stats.hp) return `${target.name} is already at full HP.`
      const heal = Math.min(20, target.stats.hp - target.currentHp)
      target.currentHp += heal
      item.qty -= 1
      return `${target.name} recovered ${heal} HP.`
    }

    return "You can't use that right now."
  }

  function serializeGame() {
    return {
      version: 2,
      savedAt: new Date().toISOString(),
      player: player.value,
      bag: bag.value,
      pokedex: pokedex.value,
      speciesCache: speciesCache.value,
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
      const raw = localStorage.getItem(saveKey) ?? localStorage.getItem(legacySaveKey)
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

      bag.value = Array.isArray(data.bag) ? data.bag : bag.value
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
      const raw = localStorage.getItem(saveKey) ?? localStorage.getItem(legacySaveKey)
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

    const loaded = await loadGame()
    if (loaded && player.value.party.length > 0) {
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
      player.value.x = overworldSpawn.x
      player.value.y = overworldSpawn.y
      player.value.direction = 'down'
      player.value.step = 0
      markCaught(species)
      gameState.value = 'ROAMING'
    } finally {
      isLoading.value = false
    }
  }

  function tryInteract() {
    if (gameState.value !== 'ROAMING' || isLoading.value) return
    const target = getFrontTile()
    const npc = getNpcAt(target.x, target.y)
    if (!npc) return

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
    gameState.value = 'ROAMING'
  }

  return {
    gameState,
    isLoading,
    player,
    currentMap,
    npcs,
    dialog,
    battle,
    menuTab,
    bag,
    pokedex,
    speciesCache,
    npcSprites,
    hasSaveData,
    lastSaved,
    movePlayer,
    setDirection,
    setActiveParty,
    tryInteract,
    advanceDialog,
    startWildBattle,
    endBattle,
    ensureNpcSprite,
    openMenu,
    closeMenu,
    setMenuTab,
    useItem,
    saveGame,
    loadGame,
    bootstrap,
    chooseStarter,
  }
})
