<script setup lang="ts">
import { onMounted, ref } from 'vue'

type HealthResponse = {
  status: string
  database: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const loading = ref(true)
const error = ref('')
const health = ref<HealthResponse | null>(null)

async function loadHealth() {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/api/health`)
    if (!response.ok) throw new Error('A API não respondeu corretamente.')
    health.value = await response.json() as HealthResponse
  } catch {
    health.value = null
    error.value = 'Não foi possível conectar à API. Confira se o backend e o banco estão iniciados.'
  } finally {
    loading.value = false
  }
}

onMounted(loadHealth)
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
      <div class="status-card" aria-live="polite">
        <span class="status-indicator" :class="{ online: health && !loading, offline: error }" aria-hidden="true"></span>
        <div class="status-copy">
          <strong v-if="loading">Conectando aos serviços…</strong>
          <template v-else-if="health">
            <strong>Ambiente pronto para começar</strong>
            <span>API e banco de dados conectados.</span>
          </template>
          <template v-else>
            <strong>Serviços indisponíveis</strong>
            <span>{{ error }}</span>
          </template>
        </div>
        <button v-if="error" class="retry-button" type="button" @click="loadHealth">Tentar novamente</button>
      </div>
    </section>

    <footer>OBRAFLOW <span>·</span> DOKIMOS</footer>
  </main>
</template>
