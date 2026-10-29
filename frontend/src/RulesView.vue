<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
type Work = { id: number; name: string; code: string }
type User = { id: number; name: string; email: string; active: boolean }
type Band = { id?: number; minAmount: number; maxAmount: number | null; approverIds: number[] }
const api = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const works = ref<Work[]>([]), users = ref<User[]>([]), bands = ref<Band[]>([])
const workId = ref<number | null>(null), loading = ref(true), saving = ref(false), creating = ref(false)
const error = ref(''), notice = ref(''), workName = ref(''), workCode = ref(''), userName = ref(''), userEmail = ref('')
const selectedWork = computed(() => works.value.find(work => work.id === workId.value))
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${api}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } })
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.detail ?? body?.message ?? 'Não foi possível concluir a solicitação.') }
  return await response.json() as T
}
async function load() {
  loading.value = true; error.value = ''
  try {
    const [workList, userList] = await Promise.all([request<Work[]>('/api/works'), request<User[]>('/api/users')])
    works.value = workList; users.value = userList
    if (!works.value.some(work => work.id === workId.value)) workId.value = works.value[0]?.id ?? null
    await loadBands()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Falha ao carregar cadastros.' }
  finally { loading.value = false }
}
async function loadBands() {
  if (!workId.value) { bands.value = []; return }
  try {
    const saved = await request<Array<{ id: number; minAmount: number; maxAmount: number | null; approvers: Array<{ id: number }> }>>(`/api/works/${workId.value}/approval-bands`)
    bands.value = saved.map(b => ({ id: b.id, minAmount: b.minAmount, maxAmount: b.maxAmount, approverIds: b.approvers.map(a => a.id) }))
  } catch (e) { error.value = e instanceof Error ? e.message : 'Falha ao carregar regras.' }
}
function addBand() { const last = bands.value.at(-1); if (last) last.maxAmount = last.maxAmount ?? Math.max(last.minAmount + 1, 10000); bands.value.push({ minAmount: last?.maxAmount ?? 0, maxAmount: null, approverIds: [] }) }
function move(b: Band, i: number, d: number) { const n = i + d; if (n < 0 || n >= b.approverIds.length) return; [b.approverIds[i], b.approverIds[n]] = [b.approverIds[n], b.approverIds[i]] }
function toggle(b: Band, id: number) { b.approverIds = b.approverIds.includes(id) ? b.approverIds.filter(x => x !== id) : [...b.approverIds, id] }
function money(v: number | null) { return v === null ? 'Sem limite' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
async function save() {
  if (!workId.value) return
  saving.value = true; error.value = ''; notice.value = ''
  try { await request(`/api/works/${workId.value}/approval-bands`, { method: 'PUT', body: JSON.stringify(bands.value.map(({ minAmount, maxAmount, approverIds }) => ({ minAmount, maxAmount, approverIds }))) }); await loadBands(); notice.value = 'Regras salvas com sucesso.' }
  catch (e) { error.value = e instanceof Error ? e.message : 'Não foi possível salvar as regras.' } finally { saving.value = false }
}
async function createWork() {
  creating.value = true; error.value = ''
  try { const w = await request<Work>('/api/works', { method: 'POST', body: JSON.stringify({ name: workName.value, code: workCode.value }) }); works.value.push(w); workId.value = w.id; bands.value = []; workName.value = ''; workCode.value = '' }
  catch (e) { error.value = e instanceof Error ? e.message : 'Falha ao cadastrar obra.' } finally { creating.value = false }
}
async function createUser() {
  creating.value = true; error.value = ''
  try { const u = await request<User>('/api/users', { method: 'POST', body: JSON.stringify({ name: userName.value, email: userEmail.value }) }); users.value.push(u); userName.value = ''; userEmail.value = '' }
  catch (e) { error.value = e instanceof Error ? e.message : 'Falha ao cadastrar usuário.' } finally { creating.value = false }
}
onMounted(load)
</script>

<template>
  <section class="rules-view">
    <header class="rules-heading"><div><p class="eyebrow">CONFIGURAÇÃO</p><h2>Regras de <span>alçada</span></h2><p>Defina quem aprova as compras de cada obra e em qual ordem.</p></div><label v-if="works.length" class="select-label">Obra<select v-model.number="workId" @change="loadBands"><option v-for="w in works" :key="w.id" :value="w.id">{{ w.name }} · {{ w.code }}</option></select></label></header>
    <div v-if="error" class="alert" role="alert">{{ error }} <button type="button" @click="load">Tentar novamente</button></div><div v-if="notice" class="success" role="status">{{ notice }}</div>
    <div v-if="loading" class="panel loading">Carregando obras e regras…</div>
    <template v-else>
      <div v-if="!works.length" class="panel empty"><h3>Comece cadastrando uma obra</h3><p>Depois, adicione aprovadores e configure as faixas de valor.</p></div>
      <section v-else class="panel rules-panel"><div class="panel-heading"><div><h3>Faixas de aprovação</h3><p>{{ selectedWork?.name }} · faixas contíguas do menor ao maior valor</p></div></div>
        <p v-if="!users.length" class="inline-empty">Cadastre ao menos um usuário para definir aprovadores.</p><p v-else-if="!bands.length" class="inline-empty">Nenhuma faixa configurada. Adicione faixas para cobrir todos os valores.</p>
        <article v-for="(band, i) in bands" :key="band.id ?? i" class="band-card"><div class="band-header"><b class="band-number">{{ String(i + 1).padStart(2, '0') }}</b><div class="band-title"><strong>Faixa {{ i + 1 }}</strong><span>{{ money(band.minAmount) }} a {{ money(band.maxAmount) }}</span></div><button class="remove-button" type="button" @click="bands.splice(i, 1)">Remover faixa</button></div>
          <div class="limits"><label>Valor mínimo, incluído<input v-model.number="band.minAmount" type="number" min="0" step="0.01" :disabled="i > 0" /></label><label>Valor máximo, excluído<input v-if="band.maxAmount !== null" v-model.number="band.maxAmount" type="number" :min="band.minAmount" step="0.01" /><span v-else class="unbounded">Sem limite superior</span></label></div>
          <div class="approver-section"><strong>Aprovadores <small>· na ordem da decisão</small></strong><div v-for="(id, j) in band.approverIds" :key="id" class="approver"><span class="order-dot">{{ j + 1 }}</span><span class="approver-name">{{ users.find(u => u.id === id)?.name }}</span><button type="button" :disabled="j === 0" :aria-label="`Mover ${users.find(u => u.id === id)?.name} para cima`" @click="move(band, j, -1)">↑</button><button type="button" :disabled="j === band.approverIds.length - 1" aria-label="Mover para baixo" @click="move(band, j, 1)">↓</button><button type="button" aria-label="Remover aprovador" @click="toggle(band, id)">×</button></div><div class="user-options"><button v-for="u in users" :key="u.id" type="button" :class="{ selected: band.approverIds.includes(u.id) }" @click="toggle(band, u.id)"><span>{{ band.approverIds.includes(u.id) ? '✓' : '+' }}</span>{{ u.name }}</button></div></div>
        </article><div class="rule-actions"><button class="secondary-button" type="button" @click="addBand">+ Adicionar faixa</button><button class="primary-button" type="button" :disabled="saving || !users.length || !bands.length" @click="save">{{ saving ? 'Salvando…' : 'Salvar regras' }}</button></div>
      </section>
      <div class="reference-grid"><section class="panel reference-card"><div><h3>Obras</h3><span>{{ works.length }} cadastrada(s)</span></div><form @submit.prevent="createWork"><label>Nome da obra<input v-model="workName" required maxlength="120" placeholder="Ex.: Residencial Horizonte" /></label><label>Código<input v-model="workCode" required maxlength="32" placeholder="OB-001" /></label><button class="secondary-button" :disabled="creating">Cadastrar obra</button></form></section><section class="panel reference-card"><div><h3>Aprovadores</h3><span>{{ users.length }} usuário(s)</span></div><form @submit.prevent="createUser"><label>Nome<input v-model="userName" required maxlength="120" placeholder="Nome completo" /></label><label>E-mail<input v-model="userEmail" required type="email" maxlength="254" placeholder="nome@empresa.com" /></label><button class="secondary-button" :disabled="creating">Cadastrar usuário</button></form></section></div>
    </template>
  </section>
</template>
