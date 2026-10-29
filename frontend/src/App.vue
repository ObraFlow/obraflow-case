<script setup lang="ts">
import RulesView from './RulesView.vue'
import HealthStatus from './features/health/HealthStatus.vue'
</script>

<template>
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="ObraFlow, início">
        <span class="brand-mark" aria-hidden="true">O</span>
        <span>obra<span class="brand-accent">flow</span></span>
      </a>
      <span class="product-label">DOKIMOS <span>·</span> APROVAÇÕES</span>
    </header>

    <section class="welcome" aria-labelledby="welcome-title">
      <p class="eyebrow">GESTÃO DE COMPRAS</p>
      <h1 id="welcome-title">Decisões claras.<br /><span>Obras em movimento.</span></h1>
      <p class="intro">Pedidos de compra e aprovações, organizados em um só lugar.</p>
      <HealthStatus />
    </section>

    <RulesView />

    <footer>OBRAFLOW <span>·</span> DOKIMOS</footer>
  </main>
</template>
