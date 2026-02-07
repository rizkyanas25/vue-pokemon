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
  moves: MoveState[]
}

const createStatStages = (): StatStages => ({
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
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
  electric: ['thunder_shock', 'quick_attack', 'tail_whip', 'growl'],
  grass: ['vine_whip', 'tackle', 'growl', 'sleep_powder'],
  poison: ['poison_sting', 'tackle', 'tail_whip', 'growl'],
  fire: ['ember', 'scratch', 'growl', 'quick_attack'],
  water: ['water_gun', 'tackle', 'tail_whip', 'quick_attack'],
  normal: ['tackle', 'quick_attack', 'growl', 'tail_whip'],
  bug: ['tackle', 'growl'],
  flying: ['quick_attack', 'tackle'],
  ground: ['tackle', 'tail_whip'],
  rock: ['tackle'],
  psychic: ['tackle', 'growl'],
  ice: ['tackle'],
  fighting: ['tackle'],
  ghost: ['tackle'],
  dragon: ['tackle'],
  dark: ['tackle'],
  steel: ['tackle'],
  fairy: ['tackle'],
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

const getSuggestedMoves = (types: TypeId[], overrides?: MoveId[]) => {
  const selected: MoveId[] = []

  if (overrides?.length) {
    for (const moveId of overrides) {
      if (!selected.includes(moveId)) selected.push(moveId)
    }
  }

  for (const type of types) {
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
  const moveIds = getSuggestedMoves(species.types, moveOverrides)
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
    moves,
  }
}

export const applyExperience = (pokemon: PokemonInstance, gainedExp: number) => {
  let levelsGained = 0
  pokemon.exp += gainedExp

  while (pokemon.level < 100 && pokemon.exp >= expForLevel(pokemon.level + 1)) {
    const oldStats = pokemon.stats
    pokemon.level += 1
    pokemon.stats = calculateStats(pokemon.species.baseStats, pokemon.level)
    const hpDelta = pokemon.stats.hp - oldStats.hp
    pokemon.currentHp = Math.min(pokemon.stats.hp, pokemon.currentHp + hpDelta)
    levelsGained += 1
  }

  return { levelsGained }
}

export const resetBattleStages = (pokemon: PokemonInstance) => {
  pokemon.statStages = createStatStages()
  pokemon.statusTurns = pokemon.status === 'sleep' ? pokemon.statusTurns : 0
}
