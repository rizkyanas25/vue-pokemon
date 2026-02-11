export type ItemId = 'potion' | 'super_potion' | 'pokeball' | 'greatball' | 'ultraball'

export type ItemData = {
  id: ItemId
  name: string
  description: string
  price: number
  heal?: number
  catchRate?: number
}

export const ITEM_CATALOG: Record<ItemId, ItemData> = {
  potion: {
    id: 'potion',
    name: 'Potion',
    description: 'Heals 20 HP.',
    price: 300,
    heal: 20,
  },
  super_potion: {
    id: 'super_potion',
    name: 'Super Potion',
    description: 'Heals 50 HP.',
    price: 700,
    heal: 50,
  },
  pokeball: {
    id: 'pokeball',
    name: 'Poke Ball',
    description: 'A device for catching wild Pokemon.',
    price: 200,
    catchRate: 1,
  },
  greatball: {
    id: 'greatball',
    name: 'Great Ball',
    description: 'A good ball with a higher catch rate.',
    price: 600,
    catchRate: 1.5,
  },
  ultraball: {
    id: 'ultraball',
    name: 'Ultra Ball',
    description: 'A high-performance ball.',
    price: 1200,
    catchRate: 2,
  },
}

export const isCatchItem = (itemId: ItemId) => Boolean(ITEM_CATALOG[itemId]?.catchRate)
