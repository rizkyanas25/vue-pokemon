import type { MoveCategory, StatKey, StatusId, TypeId } from './types'

export type MoveId =
  | 'tackle'
  | 'quick_attack'
  | 'scratch'
  | 'ember'
  | 'water_gun'
  | 'vine_whip'
  | 'thunder_shock'
  | 'growl'
  | 'tail_whip'
  | 'thunder_wave'
  | 'poison_sting'
  | 'sleep_powder'

export type MoveEffect = {
  status?: StatusId
  statusChance?: number
  statChanges?: Partial<Record<StatKey, number>>
  target?: 'self' | 'enemy'
}

export type MoveData = {
  id: MoveId
  name: string
  type: TypeId
  category: MoveCategory
  power?: number
  accuracy: number
  pp: number
  priority?: number
  effect?: MoveEffect
}

export const MOVES: Record<MoveId, MoveData> = {
  tackle: {
    id: 'tackle',
    name: 'Tackle',
    type: 'normal',
    category: 'physical',
    power: 40,
    accuracy: 100,
    pp: 35,
  },
  quick_attack: {
    id: 'quick_attack',
    name: 'Quick Attack',
    type: 'normal',
    category: 'physical',
    power: 40,
    accuracy: 100,
    pp: 30,
    priority: 1,
  },
  scratch: {
    id: 'scratch',
    name: 'Scratch',
    type: 'normal',
    category: 'physical',
    power: 40,
    accuracy: 100,
    pp: 35,
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    type: 'fire',
    category: 'special',
    power: 40,
    accuracy: 100,
    pp: 25,
    effect: { status: 'burn', statusChance: 0.1 },
  },
  water_gun: {
    id: 'water_gun',
    name: 'Water Gun',
    type: 'water',
    category: 'special',
    power: 40,
    accuracy: 100,
    pp: 25,
  },
  vine_whip: {
    id: 'vine_whip',
    name: 'Vine Whip',
    type: 'grass',
    category: 'physical',
    power: 45,
    accuracy: 100,
    pp: 25,
  },
  thunder_shock: {
    id: 'thunder_shock',
    name: 'Thunder Shock',
    type: 'electric',
    category: 'special',
    power: 40,
    accuracy: 100,
    pp: 30,
    effect: { status: 'paralyze', statusChance: 0.1 },
  },
  growl: {
    id: 'growl',
    name: 'Growl',
    type: 'normal',
    category: 'status',
    accuracy: 100,
    pp: 40,
    effect: { statChanges: { atk: -1 } },
  },
  tail_whip: {
    id: 'tail_whip',
    name: 'Tail Whip',
    type: 'normal',
    category: 'status',
    accuracy: 100,
    pp: 30,
    effect: { statChanges: { def: -1 } },
  },
  thunder_wave: {
    id: 'thunder_wave',
    name: 'Thunder Wave',
    type: 'electric',
    category: 'status',
    accuracy: 90,
    pp: 20,
    effect: { status: 'paralyze' },
  },
  poison_sting: {
    id: 'poison_sting',
    name: 'Poison Sting',
    type: 'poison',
    category: 'physical',
    power: 15,
    accuracy: 100,
    pp: 35,
    effect: { status: 'poison', statusChance: 0.3 },
  },
  sleep_powder: {
    id: 'sleep_powder',
    name: 'Sleep Powder',
    type: 'grass',
    category: 'status',
    accuracy: 75,
    pp: 15,
    effect: { status: 'sleep' },
  },
}

export const getMoveData = (moveId: MoveId) => MOVES[moveId]
