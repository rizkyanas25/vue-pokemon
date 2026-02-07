<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { PLAYER_TRAINERS } from '../data/trainers'

const store = useGameStore()

const trainers = computed(() => Object.values(PLAYER_TRAINERS))
</script>

<template>
  <div class="trainer-overlay">
    <div class="trainer-panel">
      <h2>Choose Your Trainer</h2>
      <p>Select your avatar before picking a starter.</p>
      <div class="trainer-grid">
        <button
          v-for="trainer in trainers"
          :key="trainer.id"
          class="trainer-card"
          @click="store.chooseTrainer(trainer.id)"
        >
          <img :src="trainer.sprite" :alt="trainer.name" />
          <div class="trainer-name">{{ trainer.name }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trainer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 5, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 460;
  font-family: 'Press Start 2P', cursive;
}

.trainer-panel {
  width: min(700px, 92vw);
  background: #0f0f0f;
  border: 2px solid #2e2e2e;
  border-radius: 12px;
  padding: 24px;
  color: #fff;
  text-align: center;
}

.trainer-panel h2 {
  margin-bottom: 8px;
  font-size: 18px;
}

.trainer-panel p {
  font-size: 12px;
  color: #b0b0b0;
}

.trainer-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.trainer-card {
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 10px;
  padding: 16px;
  color: #fff;
  cursor: pointer;
  display: grid;
  gap: 12px;
  place-items: center;
}

.trainer-card img {
  width: 96px;
  image-rendering: pixelated;
}

.trainer-card:hover {
  border-color: #ffd166;
}

.trainer-name {
  font-size: 12px;
}
</style>
