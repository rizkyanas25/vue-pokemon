<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore, type MenuTab } from '../stores/gameStore'
import { ITEM_CATALOG } from '../data/items'

const store = useGameStore()
const actionMessage = ref('')

const tabs: Array<{ id: MenuTab; label: string }> = [
  { id: 'party', label: 'Party' },
  { id: 'pc', label: 'PC Box' },
  { id: 'bag', label: 'Bag' },
  { id: 'pokedex', label: 'Pokedex' },
  { id: 'save', label: 'Save' },
]

const pokedexList = computed(() =>
  Object.values(store.pokedex).sort((a, b) => {
    if (a.id && b.id) return a.id - b.id
    return a.name.localeCompare(b.name)
  }),
)

const party = computed(() => store.player.party)
const pcBox = computed(() => store.boxedPokemon)

const usePotion = (index: number) => {
  actionMessage.value = store.useItem('potion', index)
}

const moveToPc = (index: number) => {
  actionMessage.value = store.movePartyPokemonToBox(index)
}

const moveToParty = (index: number) => {
  actionMessage.value = store.moveBoxPokemonToParty(index)
}

const doSave = () => {
  const ok = store.saveGame()
  actionMessage.value = ok ? 'Game saved.' : 'Save failed.'
}

const doLoad = async () => {
  const ok = await store.loadGame()
  actionMessage.value = ok ? 'Save loaded.' : 'No save data found.'
}
</script>

<template>
  <div class="menu-overlay">
    <div class="menu-panel">
      <header class="menu-header">
        <div class="menu-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab', { active: store.menuTab === tab.id }]"
            @click="store.setMenuTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
        <button class="close-btn" @click="store.closeMenu">Close</button>
      </header>

      <section class="menu-content">
        <div v-if="store.menuTab === 'party'" class="party-grid">
          <div
            v-for="(member, index) in party"
            :key="member.id"
            :class="['party-card', { active: index === store.player.activeIndex }]"
            @click="store.setActiveParty(index)"
          >
            <div class="party-title">
              <span>{{ member.name }}</span>
              <span>Lv{{ member.level }}</span>
            </div>
            <div class="party-hp">
              HP {{ member.currentHp }} / {{ member.stats.hp }}
            </div>
            <div class="party-sub">
              Status: {{ member.status === 'none' ? 'OK' : member.status.toUpperCase() }}
            </div>
            <div class="party-actions">
              <button class="small-btn" @click.stop="usePotion(index)">Use Potion</button>
              <button class="small-btn" @click.stop="moveToPc(index)">Move To PC</button>
            </div>
          </div>
        </div>

        <div v-else-if="store.menuTab === 'pc'" class="pc-layout">
          <section class="pc-section">
            <h3 class="pc-title">Party ({{ party.length }}/6)</h3>
            <div class="pc-grid">
              <div v-for="(member, index) in party" :key="`party-${member.id}`" class="pc-card">
                <div class="party-title">
                  <span>{{ member.name }}</span>
                  <span>Lv{{ member.level }}</span>
                </div>
                <div class="party-hp">HP {{ member.currentHp }} / {{ member.stats.hp }}</div>
                <button class="small-btn" @click="moveToPc(index)">Store</button>
              </div>
            </div>
          </section>

          <section class="pc-section">
            <h3 class="pc-title">PC Box ({{ pcBox.length }})</h3>
            <div v-if="pcBox.length === 0" class="pc-empty">PC Box is empty.</div>
            <div v-else class="pc-grid">
              <div v-for="(member, index) in pcBox" :key="`box-${member.id}`" class="pc-card">
                <div class="party-title">
                  <span>{{ member.name }}</span>
                  <span>Lv{{ member.level }}</span>
                </div>
                <div class="party-sub">
                  Status: {{ member.status === 'none' ? 'OK' : member.status.toUpperCase() }}
                </div>
                <button class="small-btn" :disabled="party.length >= 6" @click="moveToParty(index)">
                  Add To Party
                </button>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="store.menuTab === 'bag'" class="bag-list">
          <div v-for="item in store.bag" :key="item.id" class="bag-item">
            <div class="bag-main">
              <div class="bag-name">{{ ITEM_CATALOG[item.id]?.name ?? item.id }}</div>
              <div class="bag-desc">{{ ITEM_CATALOG[item.id]?.description ?? '' }}</div>
            </div>
            <div class="bag-qty">x{{ item.qty }}</div>
          </div>
          <div class="bag-hint">Use Potions from Party tab.</div>
        </div>

        <div v-else-if="store.menuTab === 'pokedex'" class="pokedex-list">
          <div class="pokedex-summary">
            Seen {{ pokedexList.filter((p) => p.seen).length }} / Caught
            {{ pokedexList.filter((p) => p.caught).length }}
          </div>
          <div v-if="pokedexList.length === 0" class="pokedex-empty">No entries yet.</div>
          <div v-for="entry in pokedexList" :key="entry.key" class="pokedex-item">
            <div class="pokedex-name">{{ entry.seen ? entry.name : '????' }}</div>
            <div class="pokedex-types" v-if="entry.seen">
              {{ entry.types.map((t) => t.toUpperCase()).join(' / ') }}
            </div>
            <div class="pokedex-status">
              {{ entry.caught ? 'Caught' : entry.seen ? 'Seen' : 'Unknown' }}
            </div>
          </div>
        </div>

        <div v-else-if="store.menuTab === 'save'" class="save-panel">
          <div class="save-status">
            <div v-if="store.hasSaveData && store.lastSaved">Last save: {{ store.lastSaved }}</div>
            <div v-else>No save data.</div>
          </div>
          <div class="save-actions">
            <button @click="doSave">Save Game</button>
            <button @click="doLoad">Load Save</button>
          </div>
        </div>
      </section>

      <footer v-if="actionMessage" class="menu-footer">{{ actionMessage }}</footer>
    </div>
  </div>
</template>

<style scoped>
.menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 500;
  font-family: 'Press Start 2P', cursive;
}

.menu-panel {
  width: min(1000px, 95vw);
  max-height: 90vh;
  background: #101010;
  border: 2px solid #2c2c2c;
  border-radius: 12px;
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #1c1c1c;
  border-bottom: 2px solid #2c2c2c;
}

.menu-tabs {
  display: flex;
  gap: 10px;
}

.tab {
  background: #2b2b2b;
  border: 1px solid #3a3a3a;
  color: #fff;
  font-size: 12px;
  padding: 8px 12px;
  cursor: pointer;
}

.tab.active {
  background: #ffd166;
  color: #111;
}

.close-btn {
  background: transparent;
  border: 1px solid #555;
  color: #fff;
  padding: 8px 12px;
  cursor: pointer;
}

.menu-content {
  padding: 16px 18px;
  overflow-y: auto;
  flex: 1;
}

.party-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.party-card {
  border: 2px solid #333;
  background: #1a1a1a;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  display: grid;
  gap: 8px;
}

.party-card.active {
  border-color: #ffd166;
}

.party-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.party-hp,
.party-sub {
  font-size: 11px;
}

.party-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.small-btn {
  padding: 6px 8px;
  border: 1px solid #555;
  background: #2c2c2c;
  color: #fff;
  cursor: pointer;
  font-size: 10px;
}

.bag-list {
  display: grid;
  gap: 12px;
}

.pc-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pc-section {
  border: 1px solid #333;
  border-radius: 8px;
  background: #1b1b1b;
  padding: 10px;
  display: grid;
  gap: 10px;
}

.pc-title {
  margin: 0;
  font-size: 11px;
}

.pc-grid {
  display: grid;
  gap: 8px;
  max-height: 48vh;
  overflow-y: auto;
}

.pc-card {
  border: 1px solid #333;
  border-radius: 8px;
  background: #151515;
  padding: 10px;
  display: grid;
  gap: 8px;
}

.pc-empty {
  color: #888;
  font-size: 10px;
}

.bag-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1b1b1b;
}

.bag-name {
  font-size: 12px;
  margin-bottom: 6px;
}

.bag-desc {
  font-size: 10px;
  color: #b0b0b0;
}

.bag-qty {
  font-size: 12px;
}

.bag-hint {
  font-size: 10px;
  color: #888;
}

.pokedex-list {
  display: grid;
  gap: 10px;
}

.pokedex-summary {
  font-size: 12px;
  margin-bottom: 6px;
}

.pokedex-empty {
  font-size: 11px;
  color: #888;
  padding: 8px 0;
}

.pokedex-item {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  padding: 10px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1b1b1b;
  font-size: 10px;
}

.pokedex-name {
  font-size: 12px;
}

.pokedex-types {
  color: #cfcfcf;
}

.pokedex-status {
  text-align: right;
}

.save-panel {
  display: grid;
  gap: 12px;
  font-size: 12px;
}

.save-actions {
  display: flex;
  gap: 12px;
}

.save-actions button {
  padding: 8px 12px;
  border: 1px solid #555;
  background: #2c2c2c;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.menu-footer {
  padding: 10px 18px;
  border-top: 1px solid #2c2c2c;
  font-size: 11px;
  background: #161616;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .pc-layout {
    grid-template-columns: 1fr;
  }
}
</style>
