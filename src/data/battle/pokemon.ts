import type { Stats, TypeId } from './types'
import type { MoveId } from './moves'

export type SpeciesKey = 'pikachu' | 'bulbasaur' | 'charmander' | 'squirtle'

export type PokemonSpecies = {
  key: string
  id: number
  name: string
  types: TypeId[]
  baseStats: Stats
  baseExp: number
  sprite?: string | null
}

export type StarterDefinition = {
  key: SpeciesKey
  species: PokemonSpecies
  defaultMoves: MoveId[]
}

export const STARTERS: StarterDefinition[] = [
  {
    key: 'bulbasaur',
    species: {
      key: 'bulbasaur',
      id: 1,
      name: 'Bulbasaur',
      types: ['grass', 'poison'],
      baseStats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
      baseExp: 64,
    },
    defaultMoves: ['tackle', 'growl', 'vine_whip', 'sleep_powder'],
  },
  {
    key: 'charmander',
    species: {
      key: 'charmander',
      id: 4,
      name: 'Charmander',
      types: ['fire'],
      baseStats: { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
      baseExp: 62,
    },
    defaultMoves: ['scratch', 'growl', 'ember', 'quick_attack'],
  },
  {
    key: 'squirtle',
    species: {
      key: 'squirtle',
      id: 7,
      name: 'Squirtle',
      types: ['water'],
      baseStats: { hp: 44, atk: 48, def: 65, spa: 50, spd: 64, spe: 43 },
      baseExp: 63,
    },
    defaultMoves: ['tackle', 'tail_whip', 'water_gun', 'quick_attack'],
  },
  {
    key: 'pikachu',
    species: {
      key: 'pikachu',
      id: 25,
      name: 'Pikachu',
      types: ['electric'],
      baseStats: { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
      baseExp: 112,
    },
    defaultMoves: ['thunder_shock', 'growl', 'tail_whip', 'quick_attack'],
  },
]

export const getStarterDefinition = (key: SpeciesKey) =>
  STARTERS.find((starter) => starter.key === key)
