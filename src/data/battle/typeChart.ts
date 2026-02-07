import type { TypeId } from './types'

type TypeChart = Record<TypeId, Partial<Record<TypeId, number>>>

const DOUBLE: Record<TypeId, TypeId[]> = {
  normal: [],
  fire: ['grass', 'ice', 'bug', 'steel'],
  water: ['fire', 'ground', 'rock'],
  electric: ['water', 'flying'],
  grass: ['water', 'ground', 'rock'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock', 'dark', 'steel'],
  poison: ['grass', 'fairy'],
  ground: ['fire', 'electric', 'poison', 'rock', 'steel'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'dark'],
  rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['psychic', 'ghost'],
  dragon: ['dragon'],
  dark: ['psychic', 'ghost'],
  steel: ['ice', 'rock', 'fairy'],
  fairy: ['fighting', 'dragon', 'dark'],
}

const HALF: Record<TypeId, TypeId[]> = {
  normal: ['rock', 'steel'],
  fire: ['fire', 'water', 'rock', 'dragon'],
  water: ['water', 'grass', 'dragon'],
  electric: ['electric', 'grass', 'dragon'],
  grass: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
  ice: ['fire', 'water', 'ice', 'steel'],
  fighting: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
  poison: ['poison', 'ground', 'rock', 'ghost'],
  ground: ['grass', 'bug'],
  flying: ['electric', 'rock', 'steel'],
  psychic: ['psychic', 'steel'],
  bug: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
  rock: ['fighting', 'ground', 'steel'],
  ghost: ['dark'],
  dragon: ['steel'],
  dark: ['fighting', 'dark', 'fairy'],
  steel: ['fire', 'water', 'electric', 'steel'],
  fairy: ['fire', 'poison', 'steel'],
}

const ZERO: Record<TypeId, TypeId[]> = {
  normal: ['ghost'],
  fire: [],
  water: [],
  electric: ['ground'],
  grass: [],
  ice: [],
  fighting: ['ghost'],
  poison: ['steel'],
  ground: ['flying'],
  flying: [],
  psychic: ['dark'],
  bug: [],
  rock: [],
  ghost: ['normal'],
  dragon: ['fairy'],
  dark: [],
  steel: [],
  fairy: [],
}

const buildChart = (): TypeChart => {
  const chart = {} as TypeChart
  const types = Object.keys(DOUBLE) as TypeId[]

  for (const attackType of types) {
    const record: Partial<Record<TypeId, number>> = {}
    for (const defType of DOUBLE[attackType]) record[defType] = 2
    for (const defType of HALF[attackType]) record[defType] = 0.5
    for (const defType of ZERO[attackType]) record[defType] = 0
    chart[attackType] = record
  }

  return chart
}

export const TYPE_CHART = buildChart()

export const getTypeMultiplier = (attackType: TypeId, defenderTypes: TypeId[]) =>
  defenderTypes.reduce((multiplier, defType) => {
    const value = TYPE_CHART[attackType]?.[defType] ?? 1
    return multiplier * value
  }, 1)
