import { getMoveData, type MoveId } from '../data/battle/moves'
import type { PokemonSpecies } from '../data/battle/pokemon'
import type { StatStages, Stats, StatusId, TypeId } from '../data/battle/types'

export type MoveState = {
  id: MoveId
  pp: number
  maxPp: number
}

export type PokemonInstance = {
  id: string
  species: PokemonSpecies
  name: string
  level: number
  exp: number
  stats: Stats
  currentHp: number
  status: StatusId
  statusTurns: number
  statStages: StatStages
  abilityState: {
    flashFireBoosted: boolean
    sturdyUsed: boolean
    intimidateApplied: boolean
  }
  moves: MoveState[]
}

export type MoveLearnResult = 'learned' | 'already-known' | 'no-slot'

const createStatStages = (): StatStages => ({
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
})

const createAbilityState = () => ({
  flashFireBoosted: false,
  sturdyUsed: false,
  intimidateApplied: false,
})

export const expForLevel = (level: number) => Math.floor((4 * level ** 3) / 5)

export const calculateStats = (base: Stats, level: number): Stats => ({
  hp: Math.floor((2 * base.hp * level) / 100) + level + 10,
  atk: Math.floor((2 * base.atk * level) / 100) + 5,
  def: Math.floor((2 * base.def * level) / 100) + 5,
  spa: Math.floor((2 * base.spa * level) / 100) + 5,
  spd: Math.floor((2 * base.spd * level) / 100) + 5,
  spe: Math.floor((2 * base.spe * level) / 100) + 5,
})

const TYPE_MOVES: Partial<Record<TypeId, MoveId[]>> = {
  electric: ['thunder_shock', 'spark', 'thunderbolt', 'thunder', 'quick_attack', 'growl'],
  grass: ['vine_whip', 'razor_leaf', 'leaf_blade', 'solar_beam', 'sleep_powder', 'growl'],
  poison: ['poison_sting', 'sludge', 'sludge_bomb', 'tail_whip', 'leer'],
  fire: ['ember', 'flame_wheel', 'flamethrower', 'fire_blast', 'scratch', 'growl'],
  water: ['water_gun', 'bubble_beam', 'surf', 'hydro_pump', 'tail_whip', 'tackle'],
  normal: ['tackle', 'pound', 'quick_attack', 'body_slam', 'slam', 'hyper_fang', 'growl'],
  bug: ['bug_bite', 'x_scissor', 'tackle', 'growl'],
  flying: ['wing_attack', 'aerial_ace', 'quick_attack', 'growl'],
  ground: ['mud_shot', 'earthquake', 'tackle', 'tail_whip'],
  rock: ['rock_throw', 'rock_slide', 'tackle', 'harden'],
  psychic: ['confusion', 'psybeam', 'psychic', 'agility', 'growl'],
  ice: ['ice_beam', 'blizzard', 'tackle', 'harden'],
  fighting: ['karate_chop', 'brick_break', 'tackle', 'leer'],
  ghost: ['shadow_ball', 'tackle', 'growl'],
  dragon: ['dragon_breath', 'dragon_claw', 'scratch', 'growl'],
  dark: ['bite', 'crunch', 'quick_attack', 'leer'],
  steel: ['metal_claw', 'tackle', 'harden'],
  fairy: ['disarming_voice', 'moonblast', 'tail_whip', 'growl'],
}

const buildMoveStates = (moveIds: MoveId[]) =>
  moveIds.slice(0, 4).map((moveId) => {
    const move = getMoveData(moveId)
    return {
      id: move.id,
      pp: move.pp,
      maxPp: move.pp,
    }
  })

const getMovesForLevel = (species: PokemonSpecies, level: number) => {
  if (!species.levelUpMoves?.length) return []

  const sorted = [...species.levelUpMoves].sort((a, b) => a.level - b.level)
  const selected: MoveId[] = []

  for (const move of sorted) {
    if (move.level > level) continue
    selected.push(move.moveId)
  }

  return selected.slice(-4)
}

const getSuggestedMoves = (species: PokemonSpecies, level: number, overrides?: MoveId[]) => {
  const selected: MoveId[] = []

  if (overrides?.length) {
    for (const moveId of overrides) {
      if (!selected.includes(moveId)) selected.push(moveId)
    }
  }

  if (!overrides?.length) {
    const levelMoves = getMovesForLevel(species, level)
    for (const moveId of levelMoves) {
      if (!selected.includes(moveId)) selected.push(moveId)
    }
  }

  for (const type of species.types) {
    const candidates = TYPE_MOVES[type] ?? []
    for (const moveId of candidates) {
      if (!selected.includes(moveId)) selected.push(moveId)
      if (selected.length >= 4) break
    }
    if (selected.length >= 4) break
  }

  if (selected.length === 0) selected.push('tackle', 'growl')
  if (selected.length === 1) selected.push('quick_attack')
  if (selected.length === 2) selected.push('tail_whip')
  if (selected.length === 3) selected.push('growl')

  return selected.slice(0, 4)
}

export const createPokemonInstance = (
  species: PokemonSpecies,
  level: number,
  moveOverrides?: MoveId[],
): PokemonInstance => {
  const stats = calculateStats(species.baseStats, level)
  const moveIds = getSuggestedMoves(species, level, moveOverrides)
  const moves = buildMoveStates(moveIds)

  return {
    id: `${species.key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    species,
    name: species.name,
    level,
    exp: expForLevel(level),
    stats,
    currentHp: stats.hp,
    status: 'none',
    statusTurns: 0,
    statStages: createStatStages(),
    abilityState: createAbilityState(),
    moves,
  }
}

export const applyExperience = (pokemon: PokemonInstance, gainedExp: number) => {
  let levelsGained = 0
  const levelsReached: number[] = []
  pokemon.exp += gainedExp

  while (pokemon.level < 100 && pokemon.exp >= expForLevel(pokemon.level + 1)) {
    const oldStats = pokemon.stats
    pokemon.level += 1
    levelsReached.push(pokemon.level)
    pokemon.stats = calculateStats(pokemon.species.baseStats, pokemon.level)
    const hpDelta = pokemon.stats.hp - oldStats.hp
    pokemon.currentHp = Math.min(pokemon.stats.hp, pokemon.currentHp + hpDelta)
    levelsGained += 1
  }

  return { levelsGained, levelsReached }
}

export const getLevelUpMoveIds = (species: PokemonSpecies, fromLevel: number, toLevel: number) => {
  if (!species.levelUpMoves?.length) return []

  const learned: MoveId[] = []
  for (const move of species.levelUpMoves) {
    if (move.level <= fromLevel || move.level > toLevel) continue
    if (!learned.includes(move.moveId)) learned.push(move.moveId)
  }
  return learned
}

export const learnMove = (pokemon: PokemonInstance, moveId: MoveId): MoveLearnResult => {
  if (pokemon.moves.some((move) => move.id === moveId)) return 'already-known'
  if (pokemon.moves.length >= 4) return 'no-slot'

  const move = getMoveData(moveId)
  pokemon.moves.push({
    id: move.id,
    pp: move.pp,
    maxPp: move.pp,
  })
  return 'learned'
}

export const getPendingEvolution = (pokemon: PokemonInstance) => {
  const evolution = pokemon.species.evolution
  if (!evolution) return null
  if (pokemon.level < evolution.minLevel) return null
  return evolution
}

export const resetBattleStages = (pokemon: PokemonInstance) => {
  pokemon.statStages = createStatStages()
  pokemon.statusTurns = pokemon.status === 'sleep' ? pokemon.statusTurns : 0
  pokemon.abilityState = createAbilityState()
}
