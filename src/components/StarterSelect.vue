<script setup lang="ts">
import { computed } from 'vue'
import { STARTERS } from '../data/battle/pokemon'
import { useGameStore } from '../stores/gameStore'
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

const starters = computed(() =>
  STARTERS.map((starter) => ({
    ...starter,
    sprite: spriteMap[starter.key] ?? null,
  })),
)
</script>

<template>
  <div class="starter-overlay">
    <div class="starter-panel">
      <h2>Choose Your Starter</h2>
      <p>Pick one to begin your adventure.</p>
      <div class="starter-grid">
        <button
          v-for="starter in starters"
          :key="starter.key"
          class="starter-card"
          @click="store.chooseStarter(starter.key)"
        >
          <img v-if="starter.sprite" :src="starter.sprite" :alt="starter.species.name" />
          <div class="starter-name">{{ starter.species.name }}</div>
          <div class="starter-types">{{ starter.species.types.join(' / ') }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.starter-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 5, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 450;
  font-family: 'Press Start 2P', cursive;
}

.starter-panel {
  width: min(960px, 92vw);
  background: #0f0f0f;
  border: 2px solid #2e2e2e;
  border-radius: 12px;
  padding: 24px;
  color: #fff;
  text-align: center;
}

.starter-panel h2 {
  margin-bottom: 8px;
  font-size: 18px;
}

.starter-panel p {
  font-size: 12px;
  color: #b0b0b0;
}

.starter-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.starter-card {
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 10px;
  padding: 16px;
  color: #fff;
  cursor: pointer;
  display: grid;
  gap: 10px;
  place-items: center;
}

.starter-card img {
  width: 96px;
  image-rendering: pixelated;
}

.starter-card:hover {
  border-color: #ffd166;
}

.starter-name {
  font-size: 12px;
}

.starter-types {
  font-size: 10px;
  color: #bdbdbd;
  text-transform: uppercase;
}
</style>
