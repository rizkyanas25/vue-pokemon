export type ItemId = 'potion' | 'pokeball'

export type ItemData = {
  id: ItemId
  name: string
  description: string
  price: number
  heal?: number
}

export const ITEM_CATALOG: Record<ItemId, ItemData> = {
  potion: {
    id: 'potion',
    name: 'Potion',
    description: 'Heals 20 HP.',
    price: 300,
    heal: 20,
  },
  pokeball: {
    id: 'pokeball',
    name: 'Poke Ball',
    description: 'A device for catching wild Pokemon.',
    price: 200,
  },
}
