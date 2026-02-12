import type { MoveCategory, StatKey, StatusId, TypeId } from './types'

export type MoveId =
  | 'tackle'
  | 'quick_attack'
  | 'scratch'
  | 'pound'
  | 'slam'
  | 'swift'
  | 'body_slam'
  | 'hyper_fang'
  | 'ember'
  | 'flamethrower'
  | 'fire_blast'
  | 'flame_wheel'
  | 'water_gun'
  | 'bubble'
  | 'bubble_beam'
  | 'surf'
  | 'hydro_pump'
  | 'aqua_tail'
  | 'vine_whip'
  | 'razor_leaf'
  | 'leaf_blade'
  | 'solar_beam'
  | 'thunder_shock'
  | 'spark'
  | 'thunderbolt'
  | 'thunder'
  | 'growl'
  | 'tail_whip'
  | 'leer'
  | 'harden'
  | 'agility'
  | 'swords_dance'
  | 'thunder_wave'
  | 'poison_sting'
  | 'sludge'
  | 'sludge_bomb'
  | 'sleep_powder'
  | 'ice_beam'
  | 'blizzard'
  | 'karate_chop'
  | 'brick_break'
  | 'earthquake'
  | 'mud_shot'
  | 'wing_attack'
  | 'aerial_ace'
  | 'confusion'
  | 'psybeam'
  | 'psychic'
  | 'bug_bite'
  | 'x_scissor'
  | 'rock_throw'
  | 'rock_slide'
  | 'shadow_ball'
  | 'dragon_breath'
  | 'dragon_claw'
  | 'bite'
  | 'crunch'
  | 'metal_claw'
  | 'disarming_voice'
  | 'moonblast'

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
  pound: {
    id: 'pound',
    name: 'Pound',
    type: 'normal',
    category: 'physical',
    power: 40,
    accuracy: 100,
    pp: 35,
  },
  slam: {
    id: 'slam',
    name: 'Slam',
    type: 'normal',
    category: 'physical',
    power: 80,
    accuracy: 75,
    pp: 20,
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    type: 'normal',
    category: 'special',
    power: 60,
    accuracy: 100,
    pp: 20,
  },
  body_slam: {
    id: 'body_slam',
    name: 'Body Slam',
    type: 'normal',
    category: 'physical',
    power: 85,
    accuracy: 100,
    pp: 15,
    effect: { status: 'paralyze', statusChance: 0.3 },
  },
  hyper_fang: {
    id: 'hyper_fang',
    name: 'Hyper Fang',
    type: 'normal',
    category: 'physical',
    power: 80,
    accuracy: 90,
    pp: 15,
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
  flamethrower: {
    id: 'flamethrower',
    name: 'Flamethrower',
    type: 'fire',
    category: 'special',
    power: 90,
    accuracy: 100,
    pp: 15,
    effect: { status: 'burn', statusChance: 0.1 },
  },
  fire_blast: {
    id: 'fire_blast',
    name: 'Fire Blast',
    type: 'fire',
    category: 'special',
    power: 110,
    accuracy: 85,
    pp: 5,
    effect: { status: 'burn', statusChance: 0.1 },
  },
  flame_wheel: {
    id: 'flame_wheel',
    name: 'Flame Wheel',
    type: 'fire',
    category: 'physical',
    power: 60,
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
  bubble: {
    id: 'bubble',
    name: 'Bubble',
    type: 'water',
    category: 'special',
    power: 40,
    accuracy: 100,
    pp: 30,
  },
  bubble_beam: {
    id: 'bubble_beam',
    name: 'Bubble Beam',
    type: 'water',
    category: 'special',
    power: 65,
    accuracy: 100,
    pp: 20,
  },
  surf: {
    id: 'surf',
    name: 'Surf',
    type: 'water',
    category: 'special',
    power: 90,
    accuracy: 100,
    pp: 15,
  },
  hydro_pump: {
    id: 'hydro_pump',
    name: 'Hydro Pump',
    type: 'water',
    category: 'special',
    power: 110,
    accuracy: 80,
    pp: 5,
  },
  aqua_tail: {
    id: 'aqua_tail',
    name: 'Aqua Tail',
    type: 'water',
    category: 'physical',
    power: 90,
    accuracy: 90,
    pp: 10,
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
  razor_leaf: {
    id: 'razor_leaf',
    name: 'Razor Leaf',
    type: 'grass',
    category: 'physical',
    power: 55,
    accuracy: 95,
    pp: 25,
  },
  leaf_blade: {
    id: 'leaf_blade',
    name: 'Leaf Blade',
    type: 'grass',
    category: 'physical',
    power: 90,
    accuracy: 100,
    pp: 15,
  },
  solar_beam: {
    id: 'solar_beam',
    name: 'Solar Beam',
    type: 'grass',
    category: 'special',
    power: 120,
    accuracy: 100,
    pp: 10,
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
  spark: {
    id: 'spark',
    name: 'Spark',
    type: 'electric',
    category: 'physical',
    power: 65,
    accuracy: 100,
    pp: 20,
    effect: { status: 'paralyze', statusChance: 0.3 },
  },
  thunderbolt: {
    id: 'thunderbolt',
    name: 'Thunderbolt',
    type: 'electric',
    category: 'special',
    power: 90,
    accuracy: 100,
    pp: 15,
    effect: { status: 'paralyze', statusChance: 0.1 },
  },
  thunder: {
    id: 'thunder',
    name: 'Thunder',
    type: 'electric',
    category: 'special',
    power: 110,
    accuracy: 70,
    pp: 10,
    effect: { status: 'paralyze', statusChance: 0.3 },
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
  leer: {
    id: 'leer',
    name: 'Leer',
    type: 'normal',
    category: 'status',
    accuracy: 100,
    pp: 30,
    effect: { statChanges: { def: -1 } },
  },
  harden: {
    id: 'harden',
    name: 'Harden',
    type: 'normal',
    category: 'status',
    accuracy: 100,
    pp: 30,
    effect: { statChanges: { def: 1 }, target: 'self' },
  },
  agility: {
    id: 'agility',
    name: 'Agility',
    type: 'psychic',
    category: 'status',
    accuracy: 100,
    pp: 30,
    effect: { statChanges: { spe: 2 }, target: 'self' },
  },
  swords_dance: {
    id: 'swords_dance',
    name: 'Swords Dance',
    type: 'normal',
    category: 'status',
    accuracy: 100,
    pp: 20,
    effect: { statChanges: { atk: 2 }, target: 'self' },
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
  sludge: {
    id: 'sludge',
    name: 'Sludge',
    type: 'poison',
    category: 'special',
    power: 65,
    accuracy: 100,
    pp: 20,
    effect: { status: 'poison', statusChance: 0.3 },
  },
  sludge_bomb: {
    id: 'sludge_bomb',
    name: 'Sludge Bomb',
    type: 'poison',
    category: 'special',
    power: 90,
    accuracy: 100,
    pp: 10,
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
  ice_beam: {
    id: 'ice_beam',
    name: 'Ice Beam',
    type: 'ice',
    category: 'special',
    power: 90,
    accuracy: 100,
    pp: 10,
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    type: 'ice',
    category: 'special',
    power: 110,
    accuracy: 70,
    pp: 5,
  },
  karate_chop: {
    id: 'karate_chop',
    name: 'Karate Chop',
    type: 'fighting',
    category: 'physical',
    power: 50,
    accuracy: 100,
    pp: 25,
  },
  brick_break: {
    id: 'brick_break',
    name: 'Brick Break',
    type: 'fighting',
    category: 'physical',
    power: 75,
    accuracy: 100,
    pp: 15,
  },
  earthquake: {
    id: 'earthquake',
    name: 'Earthquake',
    type: 'ground',
    category: 'physical',
    power: 100,
    accuracy: 100,
    pp: 10,
  },
  mud_shot: {
    id: 'mud_shot',
    name: 'Mud Shot',
    type: 'ground',
    category: 'special',
    power: 55,
    accuracy: 95,
    pp: 15,
  },
  wing_attack: {
    id: 'wing_attack',
    name: 'Wing Attack',
    type: 'flying',
    category: 'physical',
    power: 60,
    accuracy: 100,
    pp: 35,
  },
  aerial_ace: {
    id: 'aerial_ace',
    name: 'Aerial Ace',
    type: 'flying',
    category: 'physical',
    power: 60,
    accuracy: 100,
    pp: 20,
  },
  confusion: {
    id: 'confusion',
    name: 'Confusion',
    type: 'psychic',
    category: 'special',
    power: 50,
    accuracy: 100,
    pp: 25,
  },
  psybeam: {
    id: 'psybeam',
    name: 'Psybeam',
    type: 'psychic',
    category: 'special',
    power: 65,
    accuracy: 100,
    pp: 20,
  },
  psychic: {
    id: 'psychic',
    name: 'Psychic',
    type: 'psychic',
    category: 'special',
    power: 90,
    accuracy: 100,
    pp: 10,
  },
  bug_bite: {
    id: 'bug_bite',
    name: 'Bug Bite',
    type: 'bug',
    category: 'physical',
    power: 60,
    accuracy: 100,
    pp: 20,
  },
  x_scissor: {
    id: 'x_scissor',
    name: 'X-Scissor',
    type: 'bug',
    category: 'physical',
    power: 80,
    accuracy: 100,
    pp: 15,
  },
  rock_throw: {
    id: 'rock_throw',
    name: 'Rock Throw',
    type: 'rock',
    category: 'physical',
    power: 50,
    accuracy: 90,
    pp: 15,
  },
  rock_slide: {
    id: 'rock_slide',
    name: 'Rock Slide',
    type: 'rock',
    category: 'physical',
    power: 75,
    accuracy: 90,
    pp: 10,
  },
  shadow_ball: {
    id: 'shadow_ball',
    name: 'Shadow Ball',
    type: 'ghost',
    category: 'special',
    power: 80,
    accuracy: 100,
    pp: 15,
  },
  dragon_breath: {
    id: 'dragon_breath',
    name: 'Dragon Breath',
    type: 'dragon',
    category: 'special',
    power: 60,
    accuracy: 100,
    pp: 20,
    effect: { status: 'paralyze', statusChance: 0.3 },
  },
  dragon_claw: {
    id: 'dragon_claw',
    name: 'Dragon Claw',
    type: 'dragon',
    category: 'physical',
    power: 80,
    accuracy: 100,
    pp: 15,
  },
  bite: {
    id: 'bite',
    name: 'Bite',
    type: 'dark',
    category: 'physical',
    power: 60,
    accuracy: 100,
    pp: 25,
  },
  crunch: {
    id: 'crunch',
    name: 'Crunch',
    type: 'dark',
    category: 'physical',
    power: 80,
    accuracy: 100,
    pp: 15,
  },
  metal_claw: {
    id: 'metal_claw',
    name: 'Metal Claw',
    type: 'steel',
    category: 'physical',
    power: 50,
    accuracy: 95,
    pp: 35,
  },
  disarming_voice: {
    id: 'disarming_voice',
    name: 'Disarming Voice',
    type: 'fairy',
    category: 'special',
    power: 40,
    accuracy: 100,
    pp: 15,
  },
  moonblast: {
    id: 'moonblast',
    name: 'Moonblast',
    type: 'fairy',
    category: 'special',
    power: 95,
    accuracy: 100,
    pp: 15,
  },
}

export const getMoveData = (moveId: MoveId) => MOVES[moveId]
