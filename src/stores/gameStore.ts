import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TILE, WALKABLE_TILES, type TileId, type NpcData } from '../constants/game'
import { overworldMap, overworldNpcs, overworldSpawn } from '../data/overworld'
import { createPokemonInstance, expForLevel, type PokemonInstance } from '../engine/pokemon'
import { STARTERS, type PokemonSpecies, type SpeciesKey } from '../data/battle/pokemon'
import { fetchPokemonSpecies, normalizeSpeciesKey } from '../data/pokeapi'
import type { TypeId } from '../data/battle/types'
import { ITEM_CATALOG, type ItemId } from '../data/items'
import { SHOPS } from '../data/shops'
import { TRAINER_SPRITES, trainerSprite, type TrainerSpriteId } from '../data/trainers'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameState = 'ROAMING' | 'BATTLE' | 'MENU' | 'DIALOG' | 'STARTER' | 'SHOP'
export type MenuTab = 'party' | 'bag' | 'pokedex' | 'save'

export type BagItem = {
  id: ItemId
  qty: number
}

type BattleTerrain = 'grass' | 'water' | 'default'

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

  const battle = ref<{ enemy: PokemonInstance; terrain: BattleTerrain } | null>(null)
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

  const randomTrainerSprite = () =>
    TRAINER_SPRITES[Math.floor(Math.random() * TRAINER_SPRITES.length)] as TrainerSpriteId

  const findRandomWalkableSpot = (tiles: TileId[][], existing: NpcData[]) => {
    const height = tiles.length
    const width = tiles[0]?.length ?? 0
    const attempts = 50

    for (let i = 0; i < attempts; i += 1) {
      const x = Math.floor(Math.random() * Math.max(1, width - 4)) + 2
      const y = Math.floor(Math.random() * Math.max(1, height - 4)) + 2
      if (!isTileWalkable(tiles, x, y)) continue
      if (existing.some((npc) => npc.x === x && npc.y === y)) continue
      return { x, y }
    }

    return null
  }

  const createTrainerNpc = (key: string, tiles: TileId[][], existing: NpcData[]) => {
    const spot = findRandomWalkableSpot(tiles, existing)
    if (!spot) return null
    const spriteId = randomTrainerSprite()
    return {
      id: `trainer-${key}-${existing.length}`,
      name: 'Trainer',
      x: spot.x,
      y: spot.y,
      sprite: trainerSprite(spriteId),
      dialog: ['A trainer is looking for a battle.'],
    } as NpcData
  }

  const maybeSpawnTrainer = (key: string) => {
    const npcList = npcCache.value[key]
    if (!npcList) return
    const trainerCount = npcList.filter((npc) => npc.id.startsWith('trainer-')).length
    if (trainerCount >= 2) return
    if (Math.random() > 0.03) return

    const npc = createTrainerNpc(key, currentMap.value, npcList)
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
          row.push(TILE.WALL)
          continue
        }
        const rand = Math.random()
        if (rand < 0.08) row.push(TILE.WATER)
        else if (rand < 0.12) row.push(TILE.WALL)
        else if (rand < 0.2) row.push(TILE.PATH)
        else row.push(TILE.GRASS)
      }
      tiles.push(row)
    }
    return tiles
  }

  const ensureMapAt = (x: number, y: number) => {
    const key = mapKey(x, y)
    if (mapCache.value[key]) return key

    const width = overworldMap.width
    const height = overworldMap.height
    const isCenter = x === 1 && y === 1
    const tiles = isCenter ? overworldMap.tiles : generateMap(width, height)
    mapCache.value[key] = tiles

    const baseNpcs = isCenter ? [...overworldNpcs] : []
    const npcList = [...baseNpcs]
    const spawnCount = isCenter ? 1 : Math.random() < 0.6 ? 1 : 0
    for (let i = 0; i < spawnCount; i += 1) {
      const npc = createTrainerNpc(key, tiles, npcList)
      if (npc) npcList.push(npc)
    }
    npcCache.value[key] = npcList
    return key
  }

  const setCurrentMap = (x: number, y: number) => {
    const key = ensureMapAt(x, y)
    worldPos.value = { x, y }
    currentMap.value = mapCache.value[key]
    npcs.value = npcCache.value[key] ?? []
  }

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

    const width = currentMap.value[0]?.length ?? 0
    const height = currentMap.value.length

    const tryTransition = () => {
      const nextWorldX = worldPos.value.x + Math.sign(dx)
      const nextWorldY = worldPos.value.y + Math.sign(dy)
      if (nextWorldX < 0 || nextWorldX > 2 || nextWorldY < 0 || nextWorldY > 2) return false

      setCurrentMap(nextWorldX, nextWorldY)
      const targetX = dx > 0 ? 1 : dx < 0 ? width - 2 : player.value.x
      const targetY = dy > 0 ? 1 : dy < 0 ? height - 2 : player.value.y

      const adjustedX = Math.min(Math.max(targetX, 1), width - 2)
      const adjustedY = Math.min(Math.max(targetY, 1), height - 2)

      const isFree = (x: number, y: number) =>
        isTileWalkable(currentMap.value, x, y) && !getNpcAt(x, y)

      if (!isFree(adjustedX, adjustedY)) {
        // find nearest walkable tile along the entry edge
        for (let offset = 0; offset < Math.max(width, height); offset += 1) {
          const candidateY = Math.min(Math.max(adjustedY + offset, 1), height - 2)
          const candidateY2 = Math.min(Math.max(adjustedY - offset, 1), height - 2)
          const candidateX = Math.min(Math.max(adjustedX + offset, 1), width - 2)
          const candidateX2 = Math.min(Math.max(adjustedX - offset, 1), width - 2)
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

    if (newX <= 0 || newX >= width - 1 || newY <= 0 || newY >= height - 1) {
      if (tryTransition()) return
    }

    if (!isWalkable(newX, newY)) return
    if (getNpcAt(newX, newY)) return

    const tile = currentMap.value[newY]?.[newX]
    if (tile === undefined) return

    player.value.x = newX
    player.value.y = newY
    player.value.step = (player.value.step + 1) % 2

    if (tile === TILE.GRASS && Math.random() < 0.08) {
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

  function startWildBattle(tile?: TileId) {
    if (gameState.value !== 'ROAMING' || isLoading.value) return Promise.resolve()
    if (!player.value.party[player.value.activeIndex]) return Promise.resolve()

    isLoading.value = true
    const enemyLevel = Math.max(2, player.value.party[player.value.activeIndex].level - 1)
    const randomId = Math.floor(Math.random() * 151) + 1
    const terrain: BattleTerrain =
      tile === TILE.WATER ? 'water' : tile === TILE.GRASS ? 'grass' : 'default'

    return ensureSpecies(randomId)
      .then((species) => {
        battle.value = { enemy: createPokemonInstance(species, enemyLevel), terrain }
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
    if (
      gameState.value === 'BATTLE' ||
      gameState.value === 'STARTER' ||
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

    const target = player.value.party[targetIndex]
    if (!target) return 'No valid target.'

    const catalog = ITEM_CATALOG[itemId]
    if (catalog?.heal) {
      if (target.currentHp >= target.stats.hp) return `${target.name} is already at full HP.`
      const heal = Math.min(catalog.heal, target.stats.hp - target.currentHp)
      target.currentHp += heal
      item.qty -= 1
      return `${target.name} recovered ${heal} HP.`
    }

    return "You can't use that right now."
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
      bag: bag.value,
      money: money.value,
      pokedex: pokedex.value,
      speciesCache: speciesCache.value,
      worldPos: worldPos.value,
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

      money.value = typeof data.money === 'number' ? data.money : money.value
      worldPos.value = data.worldPos ?? worldPos.value
      mapCache.value = data.mapCache ?? mapCache.value
      npcCache.value = data.npcCache ?? npcCache.value

      if (mapCache.value[mapKey(worldPos.value.x, worldPos.value.y)]) {
        currentMap.value = mapCache.value[mapKey(worldPos.value.x, worldPos.value.y)]
      }
      if (npcCache.value[mapKey(worldPos.value.x, worldPos.value.y)]) {
        npcs.value = npcCache.value[mapKey(worldPos.value.x, worldPos.value.y)]
      }
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
      worldPos.value = { x: 1, y: 1 }
      setCurrentMap(worldPos.value.x, worldPos.value.y)
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
    addMoney,
    openShop,
    closeShop,
    buyItem,
    saveGame,
    loadGame,
    bootstrap,
    chooseStarter,
  }
})
