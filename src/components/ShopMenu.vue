<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { ITEM_CATALOG } from '../data/items'
import { SHOPS } from '../data/shops'

const store = useGameStore()
const message = ref('')

const shop = computed(() =>
  store.currentShopId ? SHOPS[store.currentShopId] ?? null : null,
)

const buy = (itemId: keyof typeof ITEM_CATALOG) => {
  message.value = store.buyItem(itemId)
}
</script>

<template>
  <div class="shop-overlay">
    <div class="shop-panel">
      <header class="shop-header">
        <div>
          <div class="shop-title">{{ shop?.name ?? 'Shop' }}</div>
          <div class="shop-money">Money: ₽{{ store.money }}</div>
        </div>
        <button class="close-btn" @click="store.closeShop">Close</button>
      </header>

      <section class="shop-content">
        <div v-if="!shop" class="shop-empty">No shop available.</div>
        <div v-else class="shop-list">
          <div v-for="item in shop.inventory" :key="item.id" class="shop-item">
            <div class="shop-info">
              <div class="shop-name">{{ ITEM_CATALOG[item.id]?.name ?? item.id }}</div>
              <div class="shop-desc">{{ ITEM_CATALOG[item.id]?.description ?? '' }}</div>
            </div>
            <div class="shop-actions">
              <div class="shop-price">₽{{ item.price }}</div>
              <button @click="buy(item.id)">Buy</button>
            </div>
          </div>
        </div>
      </section>

      <footer v-if="message" class="shop-footer">{{ message }}</footer>
    </div>
  </div>
</template>

<style scoped>
.shop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 5, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 520;
  font-family: 'Press Start 2P', cursive;
}

.shop-panel {
  width: min(900px, 94vw);
  background: #101010;
  border: 2px solid #2c2c2c;
  border-radius: 12px;
  color: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #1b1b1b;
  border-bottom: 2px solid #2c2c2c;
}

.shop-title {
  font-size: 14px;
  margin-bottom: 6px;
}

.shop-money {
  font-size: 11px;
  color: #ffd166;
}

.close-btn {
  background: transparent;
  border: 1px solid #555;
  color: #fff;
  padding: 8px 12px;
  cursor: pointer;
}

.shop-content {
  padding: 16px 18px;
}

.shop-empty {
  font-size: 12px;
  color: #aaa;
}

.shop-list {
  display: grid;
  gap: 12px;
}

.shop-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px;
  background: #1b1b1b;
  gap: 16px;
}

.shop-name {
  font-size: 12px;
  margin-bottom: 6px;
}

.shop-desc {
  font-size: 10px;
  color: #b0b0b0;
}

.shop-actions {
  display: grid;
  gap: 6px;
  justify-items: end;
}

.shop-price {
  font-size: 12px;
}

.shop-actions button {
  padding: 6px 10px;
  border: 1px solid #555;
  background: #2c2c2c;
  color: #fff;
  cursor: pointer;
  font-size: 10px;
}

.shop-footer {
  padding: 10px 18px;
  border-top: 1px solid #2c2c2c;
  font-size: 11px;
  background: #161616;
}
</style>
