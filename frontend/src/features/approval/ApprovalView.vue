<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '../../shared/api/http'

type Item = { id: number; description: string; quantity: number; unit: string; unitPrice: number; total: number }
type Approver = { id: number; name: string; email: string; position: number }
type Decision = { id: number; approverId: number; approverName: string; approverEmail: string; position: number; outcome: 'APPROVED' | 'REJECTED'; decidedAt: string; reason: string | null }
type Order = { id: number; workName: string; supplierName: string; orderDate: string; items: Item[]; total: number; status: 'PENDING' | 'APPROVED' | 'REJECTED'; currentApproverPosition: number | null; approvers: Approver[]; decisions: Decision[] }

const orders = ref<Order[]>([])
const selectedOrder = ref<Order | null>(null)
const selectedId = ref<number | null>(null)
const loading = ref(true)
const detailLoading = ref(false)
const saving = ref(false)
const error = ref('')
const detailError = ref('')
const reason = ref('')
const reasonMissing = ref(false)
const actionError = ref('')
const currentApprover = computed(() => selectedOrder.value?.approvers.find(
  approver => approver.position === selectedOrder.value?.currentApproverPosition,
))
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
const dateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const statusLabel = (status: Order['status']) => ({ PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado' })[status]

async function loadOrders() {
  loading.value = true
  error.value = ''
  try {
    orders.value = await apiRequest<Order[]>('/api/orders')
    if (selectedId.value && !orders.value.some(order => order.id === selectedId.value)) {
      selectedId.value = null
      selectedOrder.value = null
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Não foi possível carregar os pedidos.'
  } finally {
    loading.value = false
  }
}

async function openOrder(id: number) {
  selectedId.value = id
  selectedOrder.value = null
  reason.value = ''
  reasonMissing.value = false
  detailLoading.value = true
  detailError.value = ''
  actionError.value = ''
  try {
    selectedOrder.value = await apiRequest<Order>(`/api/orders/${id}`)
  } catch (cause) {
    detailError.value = cause instanceof Error ? cause.message : 'Não foi possível carregar os detalhes.'
  } finally {
    detailLoading.value = false
  }
}

async function decide(outcome: 'APPROVED' | 'REJECTED') {
  const order = selectedOrder.value
  if (!order || !currentApprover.value || saving.value) return
  if (outcome === 'REJECTED' && !reason.value.trim()) {
    reasonMissing.value = true
    actionError.value = 'Informe o motivo da rejeição.'
    return
  }
  reasonMissing.value = false
  saving.value = true
  actionError.value = ''
  try {
    selectedOrder.value = await apiRequest<Order>(`/api/orders/${order.id}/decisions`, {
      method: 'POST',
      body: JSON.stringify({ approverId: currentApprover.value.id, outcome, reason: outcome === 'REJECTED' ? reason.value.trim() : null }),
    })
    reason.value = ''
    await loadOrders()
  } catch (cause) {
    actionError.value = cause instanceof ApiError ? cause.message : 'Não foi possível registrar a decisão.'
  } finally {
    saving.value = false
  }
}

function clearReasonError() {
  if (reasonMissing.value) {
    reasonMissing.value = false
    actionError.value = ''
  }
}

onMounted(loadOrders)
</script>

<template>
  <section class="approval-view" aria-labelledby="approval-heading">
    <div class="approval-heading">
      <div>
        <p class="eyebrow">COMPRAS · FLUXO DE DECISÃO</p>
        <h2 id="approval-heading">Aprovar <span>pedidos</span></h2>
        <p>Acompanhe cada etapa e consulte o histórico completo das decisões.</p>
      </div>
      <button class="secondary-button" type="button" :disabled="loading" @click="loadOrders">Atualizar lista</button>
    </div>

    <div v-if="error && orders.length" class="alert" role="alert"><span>{{ error }}</span><button type="button" @click="loadOrders">Tentar novamente</button></div>
    <div v-if="loading" class="panel loading" role="status">Carregando pedidos…</div>
    <div v-else-if="error" class="panel load-error"><div class="alert" role="alert">{{ error }}</div><button class="secondary-button" type="button" @click="loadOrders">Tentar novamente</button></div>
    <div v-else-if="!orders.length" class="panel empty" role="status">
      <h3>Nenhum pedido cadastrado</h3><p>Os pedidos aparecerão aqui assim que forem registrados.</p>
    </div>

    <div v-else class="approval-layout">
      <section class="panel approval-list" aria-label="Lista de pedidos">
        <h3>Pedidos <span>{{ orders.length }}</span></h3>
        <button v-for="order in orders" :key="order.id" type="button" class="approval-order"
          :class="{ selected: selectedId === order.id }" :aria-current="selectedId === order.id ? 'true' : undefined"
          @click="openOrder(order.id)">
          <span class="approval-order-top"><strong>Pedido #{{ order.id }}</strong><span class="status-pill" :class="`status-${order.status.toLowerCase()}`">{{ statusLabel(order.status) }}</span></span>
          <span>{{ order.workName }} · {{ order.supplierName }}</span>
          <span class="approval-order-bottom">{{ date(order.orderDate) }} · {{ order.items.length }} {{ order.items.length === 1 ? 'item' : 'itens' }} <strong>{{ currency(order.total) }}</strong></span>
          <span v-if="order.currentApproverPosition" class="approval-current">Etapa {{ order.currentApproverPosition }} de {{ order.approvers.length }} · {{ order.approvers[order.currentApproverPosition - 1]?.name }}</span>
          <span v-else class="approval-current">Fluxo encerrado</span>
        </button>
      </section>

      <section class="panel approval-detail" aria-label="Detalhes do pedido" aria-live="polite">
        <div v-if="!selectedId" class="empty detail-placeholder"><h3>Selecione um pedido</h3><p>Os detalhes, itens e decisões serão exibidos aqui.</p></div>
        <div v-else-if="detailLoading" class="loading" role="status">Carregando detalhes…</div>
        <div v-else-if="detailError" class="alert" role="alert"><span>{{ detailError }}</span><button type="button" @click="openOrder(selectedId!)">Tentar novamente</button></div>
        <template v-else-if="selectedOrder">
          <header class="detail-header">
            <div><p class="eyebrow">{{ selectedOrder.workName }}</p><h3>Pedido #{{ selectedOrder.id }}</h3><p>{{ selectedOrder.supplierName }} · {{ date(selectedOrder.orderDate) }}</p></div>
            <span class="status-pill" :class="`status-${selectedOrder.status.toLowerCase()}`">{{ statusLabel(selectedOrder.status) }}</span>
          </header>
          <section class="detail-section">
            <h4>Itens <span>{{ selectedOrder.items.length }}</span></h4>
            <div class="item-table-wrap"><table class="approval-items"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Preço unitário</th><th>Total</th></tr></thead>
              <tbody><tr v-for="item in selectedOrder.items" :key="item.id"><td>{{ item.description }} <small>{{ item.unit }}</small></td><td>{{ item.quantity }}</td><td>{{ currency(item.unitPrice) }}</td><td>{{ currency(item.total) }}</td></tr></tbody>
              <tfoot><tr><th colspan="3">Total do pedido</th><th>{{ currency(selectedOrder.total) }}</th></tr></tfoot></table></div>
          </section>
          <section class="detail-section">
            <h4>Alçada de aprovação</h4>
            <ol class="approval-timeline">
              <li v-for="approver in selectedOrder.approvers" :key="approver.position" :class="{
                done: selectedOrder.decisions.some(decision => decision.position === approver.position && decision.outcome === 'APPROVED'),
                rejected: selectedOrder.decisions.some(decision => decision.position === approver.position && decision.outcome === 'REJECTED'),
                current: selectedOrder.currentApproverPosition === approver.position,
              }">
                <span class="timeline-number">{{ approver.position }}</span><div><strong>{{ approver.name }}</strong><small>{{ approver.email }}</small>
                  <span v-if="selectedOrder.decisions.find(decision => decision.position === approver.position)" class="timeline-result">{{ selectedOrder.decisions.find(decision => decision.position === approver.position)?.outcome === 'APPROVED' ? 'Aprovou' : 'Rejeitou' }}</span>
                  <span v-else-if="selectedOrder.currentApproverPosition === approver.position" class="timeline-result">Aguardando decisão</span>
                  <span v-else class="timeline-result">Próxima etapa</span>
                </div>
              </li>
            </ol>
          </section>
          <section class="detail-section">
            <h4>Histórico de decisões</h4>
            <ol v-if="selectedOrder.decisions.length" class="decision-history">
              <li v-for="decision in selectedOrder.decisions" :key="decision.id">
                <div><strong>{{ decision.approverName }} · {{ decision.outcome === 'APPROVED' ? 'Aprovou' : 'Rejeitou' }}</strong><time :datetime="decision.decidedAt">{{ dateTime(decision.decidedAt) }}</time></div>
                <p v-if="decision.reason">{{ decision.reason }}</p>
              </li>
            </ol>
            <p v-else class="history-empty">Nenhuma decisão registrada.</p>
          </section>
          <section v-if="selectedOrder.status === 'PENDING' && currentApprover" class="decision-panel" aria-label="Registrar decisão">
            <h4>Decisão de {{ currentApprover.name }}</h4>
            <p>Esta é a etapa atual. A próxima etapa será liberada após a aprovação.</p>
            <label>Motivo da rejeição <span>(obrigatório para rejeitar)</span>
              <textarea v-model="reason" maxlength="1000" rows="3" placeholder="Explique por que o pedido deve ser rejeitado" :aria-invalid="reasonMissing ? 'true' : undefined" :aria-describedby="reasonMissing ? 'decision-error' : undefined" @input="clearReasonError"></textarea>
            </label>
            <small v-if="actionError" id="decision-error" class="field-error" role="alert">{{ actionError }}</small>
            <div class="decision-actions">
              <button class="reject-button" type="button" :disabled="saving" @click="decide('REJECTED')">{{ saving ? 'Salvando…' : 'Rejeitar pedido' }}</button>
              <button class="primary-button" type="button" :disabled="saving" @click="decide('APPROVED')">{{ saving ? 'Salvando…' : 'Aprovar pedido' }}</button>
            </div>
          </section>
          <p v-else class="terminal-note" role="status">{{ selectedOrder.status === 'APPROVED' ? 'Todas as etapas foram aprovadas. Este pedido está concluído.' : 'O fluxo foi encerrado após a rejeição. Nenhuma outra decisão está disponível.' }}</p>
        </template>
      </section>
    </div>
  </section>
</template>
