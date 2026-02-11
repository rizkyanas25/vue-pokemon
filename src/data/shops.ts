import type { ItemId } from './items'

export type ShopItem = {
  id: ItemId
  price: number
}

export type ShopData = {
  id: string
  name: string
  inventory: ShopItem[]
}

export const SHOPS: Record<string, ShopData> = {
  general: {
    id: 'general',
    name: 'Poké Mart',
    inventory: [
      { id: 'potion', price: 300 },
      { id: 'super_potion', price: 700 },
      { id: 'pokeball', price: 200 },
      { id: 'greatball', price: 600 },
      { id: 'ultraball', price: 1200 },
    ],
  },
}
