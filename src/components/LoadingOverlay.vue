<script setup lang="ts"></script>

<template>
  <div class="loading-overlay">
    <div class="loading-panel">
      <div class="spinner"></div>
      <div class="loading-text">Loading Pokemon data...</div>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 5, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 600;
  font-family: 'Press Start 2P', cursive;
}

.loading-panel {
  background: #111;
  border: 2px solid #2f2f2f;
  border-radius: 10px;
  padding: 20px 24px;
  display: grid;
  gap: 12px;
  color: #fff;
  text-align: center;
  min-width: 240px;
}

.spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid #333;
  border-top-color: #ffd166;
  animation: spin 1s linear infinite;
  justify-self: center;
}

.loading-text {
  font-size: 12px;
  color: #d0d0d0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
