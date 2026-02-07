import type { ComputedRef, InjectionKey } from 'vue'

export type TileSize = {
  width: number
  height: number
}

export const TileSizeKey = Symbol('tileSize') as InjectionKey<ComputedRef<TileSize>>
