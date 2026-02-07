export const TRAINER_SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/trainers/'

export const trainerSprite = (id: string) => `${TRAINER_SPRITE_BASE}${id}.png`

export const TRAINER_SPRITES = [
  'clerk',
  'caretaker',
  'backpacker',
  'camper',
  'biker',
  'beauty',
  'artist',
  'acetrainer-gen4',
] as const

export type TrainerSpriteId = (typeof TRAINER_SPRITES)[number]

export type PlayerTrainerId = 'male' | 'female'

export type PlayerTrainer = {
  id: PlayerTrainerId
  name: string
  sprite: string
}

export const PLAYER_TRAINERS: Record<PlayerTrainerId, PlayerTrainer> = {
  male: {
    id: 'male',
    name: 'Male Trainer',
    sprite: trainerSprite('backpacker'),
  },
  female: {
    id: 'female',
    name: 'Female Trainer',
    sprite: trainerSprite('beauty'),
  },
}
