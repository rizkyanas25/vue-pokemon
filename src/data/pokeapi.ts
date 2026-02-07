import type { PokemonSpecies } from './battle/pokemon'
import type { Stats, TypeId } from './battle/types'

const API_BASE = 'https://pokeapi.co/api/v2'

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const getStat = (stats: Array<{ base_stat: number; stat: { name: string } }>, name: string) =>
  stats.find((entry) => entry.stat.name === name)?.base_stat ?? 50

const mapStats = (stats: Array<{ base_stat: number; stat: { name: string } }>): Stats => ({
  hp: getStat(stats, 'hp'),
  atk: getStat(stats, 'attack'),
  def: getStat(stats, 'defense'),
  spa: getStat(stats, 'special-attack'),
  spd: getStat(stats, 'special-defense'),
  spe: getStat(stats, 'speed'),
})

export const fetchPokemonSpecies = async (nameOrId: string | number): Promise<PokemonSpecies> => {
  const response = await fetch(`${API_BASE}/pokemon/${nameOrId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch Pokemon ${nameOrId}`)
  }

  const data = await response.json()
  const key = normalizeKey(data.name)
  const types = (data.types ?? [])
    .sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot)
    .map((entry: { type: { name: string } }) => entry.type.name as TypeId)

  const sprite =
    data.sprites?.other?.['official-artwork']?.front_default ?? data.sprites?.front_default ?? null

  return {
    key,
    id: data.id,
    name: titleCase(data.name),
    types,
    baseStats: mapStats(data.stats ?? []),
    baseExp: data.base_experience ?? 64,
    sprite,
  }
}

export const normalizeSpeciesKey = normalizeKey
