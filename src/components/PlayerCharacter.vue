<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { TILE_SIZE } from '../constants/game'
import { computed } from 'vue'
import pikachuImg from '@/assets/sprites/pikachu.png'
import bulbasaurImg from '@/assets/sprites/bulbasaur.png'
import charmanderImg from '@/assets/sprites/charmander.png'
import squirtleImg from '@/assets/sprites/squirtle.png'

const store = useGameStore()

const spriteMap: Record<string, string> = {
  pikachu: pikachuImg,
  bulbasaur: bulbasaurImg,
  charmander: charmanderImg,
  squirtle: squirtleImg,
}

const activeSprite = computed(() => {
  const active = store.player.party[store.player.activeIndex]
  if (!active) return pikachuImg
  if (active.species.sprite) return active.species.sprite
  return spriteMap[active.species.key] ?? pikachuImg
})

const playerStyle = computed(() => ({
  width: `${TILE_SIZE}px`,
  height: `${TILE_SIZE}px`,
  transform: `translate(${store.player.x * TILE_SIZE}px, ${store.player.y * TILE_SIZE}px)`,
  backgroundImage: `url(${activeSprite.value})`,
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  position: 'absolute' as const,
  top: 0,
  left: 0,
  transition: 'transform 0.2s linear',
  zIndex: 10,
}))

// TODO: Add direction based sprite flipping or sheet offset
</script>

<template>
  <div class="player-character" :style="playerStyle">
    <!-- Inner div for sprite animation if needed -->
    <div class="sprite-anim"></div>
  </div>
</template>

<style scoped>
.player-character {
  pointer-events: none;
}
</style>
