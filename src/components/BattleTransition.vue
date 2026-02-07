<script setup lang="ts">
const props = defineProps<{ kind: 'wild' | 'trainer' }>()
</script>

<template>
  <div class="battle-transition" :class="`battle-transition--${props.kind}`">
    <div class="glitch-layer primary"></div>
    <div class="glitch-layer secondary"></div>
    <div class="glitch-flash"></div>
  </div>
</template>

<style scoped>
.battle-transition {
  position: fixed;
  inset: 0;
  z-index: 300;
  overflow: hidden;
  background: #101010;
  pointer-events: none;
}

.glitch-layer {
  position: absolute;
  inset: -40%;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.05) 0px,
    rgba(255, 255, 255, 0.05) 6px,
    rgba(0, 0, 0, 0.2) 6px,
    rgba(0, 0, 0, 0.2) 12px
  );
  mix-blend-mode: screen;
  animation: glitch-slide 0.25s steps(2) infinite;
}

.glitch-layer.secondary {
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.08) 0px,
    rgba(255, 255, 255, 0.08) 8px,
    rgba(0, 0, 0, 0.25) 8px,
    rgba(0, 0, 0, 0.25) 16px
  );
  animation: glitch-slide 0.35s steps(2) infinite reverse;
  opacity: 0.6;
}

.glitch-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.2);
  animation: glitch-flash 0.5s ease-in-out infinite;
  opacity: 0.4;
}

.battle-transition--trainer .glitch-layer {
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 210, 90, 0.15) 0px,
    rgba(255, 210, 90, 0.15) 6px,
    rgba(0, 0, 0, 0.25) 6px,
    rgba(0, 0, 0, 0.25) 12px
  );
}

@keyframes glitch-slide {
  0% {
    transform: translateX(-4%) translateY(-2%);
  }
  50% {
    transform: translateX(6%) translateY(3%);
  }
  100% {
    transform: translateX(-2%) translateY(-5%);
  }
}

@keyframes glitch-flash {
  0%,
  100% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
