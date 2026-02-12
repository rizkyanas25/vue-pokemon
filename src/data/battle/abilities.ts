import type { TypeId } from './types'

export type AbilityId =
  | 'overgrow'
  | 'blaze'
  | 'torrent'
  | 'static'
  | 'intimidate'
  | 'levitate'
  | 'sturdy'
  | 'water_absorb'
  | 'volt_absorb'
  | 'flash_fire'
  | 'thick_fat'
  | 'guts'

export type AbilityData = {
  id: AbilityId
  name: string
  description: string
}

export const ABILITIES: Record<AbilityId, AbilityData> = {
  overgrow: {
    id: 'overgrow',
    name: 'Overgrow',
    description: 'Boosts Grass moves when HP is low.',
  },
  blaze: {
    id: 'blaze',
    name: 'Blaze',
    description: 'Boosts Fire moves when HP is low.',
  },
  torrent: {
    id: 'torrent',
    name: 'Torrent',
    description: 'Boosts Water moves when HP is low.',
  },
  static: {
    id: 'static',
    name: 'Static',
    description: 'May paralyze attackers after physical contact.',
  },
  intimidate: {
    id: 'intimidate',
    name: 'Intimidate',
    description: "Lowers the foe's Attack on battle entry.",
  },
  levitate: {
    id: 'levitate',
    name: 'Levitate',
    description: 'Immune to Ground-type moves.',
  },
  sturdy: {
    id: 'sturdy',
    name: 'Sturdy',
    description: 'Survives a knockout hit at 1 HP from full HP.',
  },
  water_absorb: {
    id: 'water_absorb',
    name: 'Water Absorb',
    description: 'Absorbs Water moves and heals HP.',
  },
  volt_absorb: {
    id: 'volt_absorb',
    name: 'Volt Absorb',
    description: 'Absorbs Electric moves and heals HP.',
  },
  flash_fire: {
    id: 'flash_fire',
    name: 'Flash Fire',
    description: 'Absorbs Fire moves and boosts own Fire moves.',
  },
  thick_fat: {
    id: 'thick_fat',
    name: 'Thick Fat',
    description: 'Reduces damage from Fire and Ice moves.',
  },
  guts: {
    id: 'guts',
    name: 'Guts',
    description: 'Boosts physical power when statused.',
  },
}

const POKEAPI_ABILITY_TO_ID: Record<string, AbilityId> = {
  overgrow: 'overgrow',
  blaze: 'blaze',
  torrent: 'torrent',
  static: 'static',
  intimidate: 'intimidate',
  levitate: 'levitate',
  sturdy: 'sturdy',
  'water-absorb': 'water_absorb',
  'volt-absorb': 'volt_absorb',
  'flash-fire': 'flash_fire',
  'thick-fat': 'thick_fat',
  guts: 'guts',
}

export const resolveAbilityFromPokeApi = (rawName: string): AbilityId | null => {
  return POKEAPI_ABILITY_TO_ID[rawName] ?? null
}

export const defaultAbilityForTypes = (types: TypeId[]): AbilityId => {
  if (types.includes('fire')) return 'blaze'
  if (types.includes('water')) return 'torrent'
  if (types.includes('grass')) return 'overgrow'
  if (types.includes('electric')) return 'static'
  if (types.includes('flying') || types.includes('ghost')) return 'levitate'
  if (types.includes('rock') || types.includes('steel')) return 'sturdy'
  if (types.includes('poison')) return 'guts'
  return 'sturdy'
}

export const getAbilityName = (ability: AbilityId | undefined | null) => {
  if (!ability) return ''
  return ABILITIES[ability]?.name ?? ''
}
