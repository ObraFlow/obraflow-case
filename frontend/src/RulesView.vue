<script setup lang="ts">
import { useApprovalRules } from './features/approval-rules/useApprovalRules'

const {
  works, users, bands, workId, loading, saving, creatingWork, creatingUser, error, notice,
  workName, workCode, userName, userEmail, selectedWork,
  load, selectWork, addBand, removeBand, moveApprover, toggleApprover, money, save, createWork, createUser,
} = useApprovalRules()
</script>

<template>
  <section class="rules-view">
    <header class="rules-heading"><div><p class="eyebrow">CONFIGURAÇÃO</p><h2>Regras de <span>alçada</span></h2><p>Defina quem aprova as compras de cada obra e em qual ordem.</p></div><label v-if="works.length" class="select-label">Obra<select v-model.number="workId" @change="selectWork"><option v-for="w in works" :key="w.id" :value="w.id">{{ w.name }} · {{ w.code }}</option></select></label></header>
    <div v-if="error" class="alert" role="alert">{{ error }} <button type="button" @click="load">Tentar novamente</button></div><div v-if="notice" class="success" role="status">{{ notice }}</div>
    <div v-if="loading" class="panel loading">Carregando obras e regras…</div>
    <template v-else>
      <div v-if="!works.length" class="panel empty"><h3>Comece cadastrando uma obra</h3><p>Depois, adicione aprovadores e configure as faixas de valor.</p></div>
      <section v-else class="panel rules-panel"><div class="panel-heading"><div><h3>Faixas de aprovação</h3><p>{{ selectedWork?.name }} · faixas contíguas do menor ao maior valor</p></div></div>
        <p v-if="!users.length" class="inline-empty">Cadastre ao menos um usuário para definir aprovadores.</p><p v-else-if="!bands.length" class="inline-empty">Nenhuma faixa configurada. Adicione faixas para cobrir todos os valores.</p>
        <article v-for="(band, i) in bands" :key="band.id ?? i" class="band-card"><div class="band-header"><b class="band-number">{{ String(i + 1).padStart(2, '0') }}</b><div class="band-title"><strong>Faixa {{ i + 1 }}</strong><span>{{ money(band.minAmount) }} a {{ money(band.maxAmount) }}</span></div><button class="remove-button" type="button" @click="removeBand(i)">Remover faixa</button></div>
          <div class="limits"><label>Valor mínimo, incluído<input v-model.number="band.minAmount" type="number" min="0" step="0.01" :disabled="i > 0" /></label><label>Valor máximo, excluído<input v-if="band.maxAmount !== null" v-model.number="band.maxAmount" type="number" :min="band.minAmount" step="0.01" /><span v-else class="unbounded">Sem limite superior</span></label></div>
          <div class="approver-section"><strong>Aprovadores <small>· na ordem da decisão</small></strong><div v-for="(id, j) in band.approverIds" :key="id" class="approver"><span class="order-dot">{{ j + 1 }}</span><span class="approver-name">{{ users.find(u => u.id === id)?.name }}</span><button type="button" :disabled="j === 0" :aria-label="`Mover ${users.find(u => u.id === id)?.name} para cima`" @click="moveApprover(band, j, -1)">↑</button><button type="button" :disabled="j === band.approverIds.length - 1" aria-label="Mover para baixo" @click="moveApprover(band, j, 1)">↓</button><button type="button" aria-label="Remover aprovador" @click="toggleApprover(band, id)">×</button></div><div class="user-options"><button v-for="u in users" :key="u.id" type="button" :class="{ selected: band.approverIds.includes(u.id) }" @click="toggleApprover(band, u.id)"><span>{{ band.approverIds.includes(u.id) ? '✓' : '+' }}</span>{{ u.name }}</button></div></div>
        </article><div class="rule-actions"><button class="secondary-button" type="button" @click="addBand">+ Adicionar faixa</button><button class="primary-button" type="button" :disabled="saving || !users.length || !bands.length" @click="save">{{ saving ? 'Salvando…' : 'Salvar regras' }}</button></div>
      </section>
      <div class="reference-grid"><section class="panel reference-card"><div><h3>Obras</h3><span>{{ works.length }} cadastrada(s)</span></div><form @submit.prevent="createWork"><label>Nome da obra<input v-model="workName" required maxlength="120" placeholder="Ex.: Residencial Horizonte" /></label><label>Código<input v-model="workCode" required maxlength="32" placeholder="OB-001" /></label><button class="secondary-button" :disabled="creatingWork">Cadastrar obra</button></form></section><section class="panel reference-card"><div><h3>Aprovadores</h3><span>{{ users.length }} usuário(s)</span></div><form @submit.prevent="createUser"><label>Nome<input v-model="userName" required maxlength="120" placeholder="Nome completo" /></label><label>E-mail<input v-model="userEmail" required type="email" maxlength="254" placeholder="nome@empresa.com" /></label><button class="secondary-button" :disabled="creatingUser">Cadastrar usuário</button></form></section></div>
    </template>
  </section>
</template>
