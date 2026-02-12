import type { Stats, TypeId } from './types'
import type { MoveId } from './moves'

export type SpeciesKey = 'pikachu' | 'bulbasaur' | 'charmander' | 'squirtle'

export type LevelUpMove = {
  level: number
  moveId: MoveId
}

export type EvolutionData = {
  minLevel: number
  toSpeciesId: number
  toSpeciesKey: string
  toSpeciesName: string
}

export type PokemonSpecies = {
  key: string
  id: number
  name: string
  types: TypeId[]
  baseStats: Stats
  baseExp: number
  sprite?: string | null
  levelUpMoves?: LevelUpMove[]
  evolution?: EvolutionData | null
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
      levelUpMoves: [
        { level: 1, moveId: 'tackle' },
        { level: 3, moveId: 'growl' },
        { level: 7, moveId: 'vine_whip' },
        { level: 13, moveId: 'sleep_powder' },
      ],
      evolution: {
        minLevel: 16,
        toSpeciesId: 2,
        toSpeciesKey: 'ivysaur',
        toSpeciesName: 'Ivysaur',
      },
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
      levelUpMoves: [
        { level: 1, moveId: 'scratch' },
        { level: 1, moveId: 'growl' },
        { level: 7, moveId: 'ember' },
        { level: 13, moveId: 'quick_attack' },
      ],
      evolution: {
        minLevel: 16,
        toSpeciesId: 5,
        toSpeciesKey: 'charmeleon',
        toSpeciesName: 'Charmeleon',
      },
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
      levelUpMoves: [
        { level: 1, moveId: 'tackle' },
        { level: 4, moveId: 'tail_whip' },
        { level: 7, moveId: 'water_gun' },
        { level: 13, moveId: 'quick_attack' },
      ],
      evolution: {
        minLevel: 16,
        toSpeciesId: 8,
        toSpeciesKey: 'wartortle',
        toSpeciesName: 'Wartortle',
      },
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
      levelUpMoves: [
        { level: 1, moveId: 'thunder_shock' },
        { level: 1, moveId: 'growl' },
        { level: 6, moveId: 'tail_whip' },
        { level: 11, moveId: 'quick_attack' },
        { level: 13, moveId: 'thunder_wave' },
      ],
      evolution: null,
    },
    defaultMoves: ['thunder_shock', 'growl', 'tail_whip', 'quick_attack'],
  },
]

export const getStarterDefinition = (key: SpeciesKey) =>
  STARTERS.find((starter) => starter.key === key)
