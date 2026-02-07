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
      { id: 'pokeball', price: 200 },
    ],
  },
}
