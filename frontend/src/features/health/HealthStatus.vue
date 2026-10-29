<script setup lang="ts">
import { useHealth } from './useHealth'

const { loading, error, health, loadHealth } = useHealth()
</script>

<template>
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
</template>
