import type { ComputedRef, InjectionKey } from 'vue'

export const TileSizeKey = Symbol('tileSize') as InjectionKey<ComputedRef<number>>
