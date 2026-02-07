export type TypeId =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy'

export type MoveCategory = 'physical' | 'special' | 'status'

export type StatusId = 'none' | 'paralyze' | 'burn' | 'poison' | 'sleep'

export type StatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe'

export type Stats = {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}

export type StatStages = Record<StatKey, number>
