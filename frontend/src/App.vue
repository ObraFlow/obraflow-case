<script setup lang="ts">
import { ref } from 'vue'
import RulesView from './RulesView.vue'
import HealthStatus from './features/health/HealthStatus.vue'
import OrderView from './features/orders/OrderView.vue'
import ApprovalView from './features/approval/ApprovalView.vue'

const activeView = ref<'orders' | 'approval' | 'rules'>('orders')
</script>

<template>
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="ObraFlow, início">
        <span class="brand-mark" aria-hidden="true">O</span>
        <span>obra<span class="brand-accent">flow</span></span>
      </a>
      <span class="product-label">DOKIMOS <span>·</span> APROVAÇÕES</span>
      <nav class="main-nav" aria-label="Seções da aplicação">
        <button type="button" :aria-current="activeView === 'orders' ? 'page' : undefined" @click="activeView = 'orders'">Pedidos</button>
        <button type="button" :aria-current="activeView === 'approval' ? 'page' : undefined" @click="activeView = 'approval'">Aprovações</button>
        <button type="button" :aria-current="activeView === 'rules' ? 'page' : undefined" @click="activeView = 'rules'">Regras da alçada</button>
      </nav>
    </header>

    <section class="welcome" aria-labelledby="welcome-title">
      <p class="eyebrow">GESTÃO DE COMPRAS</p>
      <h1 id="welcome-title">Decisões claras.<br /><span>Obras em movimento.</span></h1>
      <p class="intro">Pedidos de compra e aprovações, organizados em um só lugar.</p>
      <HealthStatus />
    </section>

    <OrderView v-if="activeView === 'orders'" />
    <ApprovalView v-else-if="activeView === 'approval'" />
    <RulesView v-else />

    <footer>OBRAFLOW <span>·</span> DOKIMOS</footer>
  </main>
</template>
