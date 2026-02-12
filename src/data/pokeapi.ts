import { MOVES, type MoveId } from './battle/moves'
import type { EvolutionData, LevelUpMove, PokemonSpecies } from './battle/pokemon'
import type { Stats, TypeId } from './battle/types'
import { defaultAbilityForTypes, resolveAbilityFromPokeApi } from './battle/abilities'

const API_BASE = 'https://pokeapi.co/api/v2'
const BLACK_WHITE_VERSION = 'black-white'
const AVAILABLE_MOVES = new Set<MoveId>(Object.keys(MOVES) as MoveId[])

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const moveNameToId = (name: string): MoveId | null => {
  const candidate = normalizeKey(name).replace(/-/g, '_') as MoveId
  return AVAILABLE_MOVES.has(candidate) ? candidate : null
}

const extractIdFromUrl = (url: string | undefined): number | null => {
  if (!url) return null
  const match = url.match(/\/(\d+)\/?$/)
  if (!match?.[1]) return null
  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

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

type PokemonMoveEntry = {
  move?: { name?: string }
  version_group_details?: Array<{
    level_learned_at?: number
    move_learn_method?: { name?: string }
    version_group?: { name?: string }
  }>
}

type PokemonAbilityEntry = {
  slot?: number
  is_hidden?: boolean
  ability?: { name?: string }
}

type EvolutionChainNode = {
  species?: { name?: string; url?: string }
  evolves_to?: EvolutionChainNode[]
  evolution_details?: Array<{
    min_level?: number | null
    trigger?: { name?: string }
  }>
}

const buildLevelUpMoves = (moves: PokemonMoveEntry[]): LevelUpMove[] => {
  const byMove = new Map<MoveId, number>()

  for (const entry of moves) {
    const moveName = entry.move?.name
    if (!moveName) continue
    const moveId = moveNameToId(moveName)
    if (!moveId) continue

    const details = entry.version_group_details ?? []
    const levelUpDetails = details.filter(
      (detail) => detail.move_learn_method?.name === 'level-up',
    )
    if (levelUpDetails.length === 0) continue

    const blackWhiteDetail = levelUpDetails.find(
      (detail) => detail.version_group?.name === BLACK_WHITE_VERSION,
    )
    const chosen = blackWhiteDetail ?? levelUpDetails[0]
    const level = chosen?.level_learned_at ?? 0
    if (level <= 0) continue

    const currentLevel = byMove.get(moveId)
    if (currentLevel === undefined || level < currentLevel) {
      byMove.set(moveId, level)
    }
  }

  return Array.from(byMove.entries())
    .map(([moveId, level]) => ({ moveId, level }))
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.moveId.localeCompare(b.moveId)
    })
}

const chooseAbility = (abilities: PokemonAbilityEntry[], types: TypeId[]) => {
  const ordered = [...abilities].sort((a, b) => {
    const hiddenA = Boolean(a.is_hidden)
    const hiddenB = Boolean(b.is_hidden)
    if (hiddenA !== hiddenB) return hiddenA ? 1 : -1
    return (a.slot ?? 999) - (b.slot ?? 999)
  })

  for (const entry of ordered) {
    const rawName = entry.ability?.name
    if (!rawName) continue
    const mapped = resolveAbilityFromPokeApi(rawName)
    if (mapped) return mapped
  }

  return defaultAbilityForTypes(types)
}

const findEvolutionNode = (
  node: EvolutionChainNode | undefined,
  speciesName: string,
): EvolutionChainNode | null => {
  if (!node) return null
  if (node.species?.name === speciesName) return node
  for (const child of node.evolves_to ?? []) {
    const found = findEvolutionNode(child, speciesName)
    if (found) return found
  }
  return null
}

const findEvolutionData = (
  chainRoot: EvolutionChainNode | undefined,
  speciesName: string,
): EvolutionData | null => {
  const currentNode = findEvolutionNode(chainRoot, speciesName)
  if (!currentNode) return null

  const candidates = currentNode.evolves_to ?? []
  for (const candidate of candidates) {
    const details = candidate.evolution_details ?? []
    const levelUpDetail = details.find(
      (detail) =>
        detail.trigger?.name === 'level-up' &&
        typeof detail.min_level === 'number' &&
        detail.min_level > 0,
    )
    if (!levelUpDetail?.min_level) continue

    const toName = candidate.species?.name
    if (!toName) continue
    const toId = extractIdFromUrl(candidate.species?.url)
    if (!toId) continue

    return {
      minLevel: levelUpDetail.min_level,
      toSpeciesId: toId,
      toSpeciesKey: normalizeKey(toName),
      toSpeciesName: titleCase(toName),
    }
  }

  return null
}

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
  const levelUpMoves = buildLevelUpMoves(data.moves ?? [])
  const ability = chooseAbility(data.abilities ?? [], types)

  let evolution: EvolutionData | null = null
  try {
    const speciesResponse = await fetch(`${API_BASE}/pokemon-species/${data.id}`)
    if (speciesResponse.ok) {
      const speciesData = await speciesResponse.json()
      const evolutionChainUrl = speciesData?.evolution_chain?.url
      if (evolutionChainUrl) {
        const chainResponse = await fetch(evolutionChainUrl)
        if (chainResponse.ok) {
          const chainData = await chainResponse.json()
          evolution = findEvolutionData(chainData?.chain, data.name)
        }
      }
    }
  } catch {
    // Evolution metadata is optional; species data remains usable without it.
  }

  return {
    key,
    id: data.id,
    name: titleCase(data.name),
    types,
    baseStats: mapStats(data.stats ?? []),
    baseExp: data.base_experience ?? 64,
    sprite,
    ability,
    levelUpMoves,
    evolution,
  }
}

export const normalizeSpeciesKey = normalizeKey
