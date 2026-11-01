<script setup lang="ts">
import { reactive } from 'vue'
import { useOrderForm } from './useOrderForm'

const form = reactive(useOrderForm())

function money(index: number) {
  const cents = form.lineCents(index)
  return cents === null ? '—' : form.formatCurrencyCents(cents)
}
</script>

<template>
  <section class="order-view" aria-labelledby="order-heading">
    <div class="order-heading">
      <div>
        <p class="eyebrow">COMPRAS · NOVA SOLICITAÇÃO</p>
        <h2 id="order-heading">Cadastrar <span>pedido</span></h2>
        <p>Informe os dados da compra e adicione os itens. O total define a alçada de aprovação.</p>
      </div>
      <div class="order-total" aria-live="polite">
        <span>Total do pedido</span>
        <strong>{{ form.totalLabel }}</strong>
      </div>
    </div>

    <div v-if="form.loading" class="panel loading" role="status">Carregando obras e fornecedores…</div>
    <div v-else-if="form.error && !form.works.length && !form.suppliers.length" class="panel load-error">
      <div class="alert" role="alert">{{ form.error }}</div>
      <button class="secondary-button" type="button" @click="form.load">Tentar novamente</button>
    </div>
    <div v-else-if="!form.works.length || !form.suppliers.length" class="panel empty" role="status">
      <h3>{{ !form.works.length ? 'Nenhuma obra cadastrada' : 'Nenhum fornecedor disponível' }}</h3>
      <p>{{ !form.works.length ? 'Cadastre uma obra e configure suas faixas de aprovação antes de criar um pedido.' : 'Cadastre um fornecedor para poder registrar uma compra.' }}</p>
      <button class="secondary-button" type="button" @click="form.load">Atualizar cadastros</button>
    </div>

    <form v-else class="panel order-form" @submit.prevent="form.submit">
      <div v-if="form.error" class="alert" role="alert">{{ form.error }}</div>
      <div v-if="form.notice" class="success" role="status">
        <span>{{ form.notice }}<template v-if="form.createdOrderId"> Nº {{ form.createdOrderId }}.</template></span>
      </div>

      <section class="form-section" aria-labelledby="general-heading">
        <div class="section-title"><span>01</span><div><h3 id="general-heading">Dados gerais</h3><p>Defina o contexto da solicitação.</p></div></div>
        <div class="order-fields">
          <label>Obra
            <select v-model.number="form.workId" required aria-label="Obra" :aria-describedby="form.generalError('work') ? 'work-error' : undefined">
              <option :value="null" disabled>Selecione uma obra</option>
              <option v-for="work in form.works" :key="work.id" :value="work.id">{{ work.name }} · {{ work.code }}</option>
            </select>
            <small v-if="form.generalError('work')" id="work-error" class="field-error">{{ form.generalError('work') }}</small>
          </label>
          <label>Fornecedor
            <select v-model.number="form.supplierId" required aria-label="Fornecedor" :aria-describedby="form.generalError('supplier') ? 'supplier-error' : undefined">
              <option :value="null" disabled>Selecione um fornecedor</option>
              <option v-for="supplier in form.suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
            </select>
            <small v-if="form.generalError('supplier')" id="supplier-error" class="field-error">{{ form.generalError('supplier') }}</small>
          </label>
          <label>Data do pedido
            <input v-model="form.orderDate" type="date" required aria-label="Data do pedido" :aria-describedby="form.generalError('date') ? 'date-error' : undefined" />
            <small v-if="form.generalError('date')" id="date-error" class="field-error">{{ form.generalError('date') }}</small>
          </label>
          <label class="notes-field">Observações internas <span class="optional">Opcional</span>
            <textarea v-model="form.internalNotes" maxlength="2000" rows="3" placeholder="Justificativa ou informações úteis para a aprovação"></textarea>
          </label>
        </div>
      </section>

      <section class="form-section items-section" aria-labelledby="items-heading">
        <div class="section-title"><span>02</span><div><h3 id="items-heading">Itens do pedido</h3><p>Inclua materiais ou serviços desta compra.</p></div>
          <button class="secondary-button add-item" type="button" @click="form.addItem">＋ Adicionar item</button>
        </div>

        <article v-for="(item, index) in form.items" :key="index" class="order-item">
          <header><strong>Item {{ String(index + 1).padStart(2, '0') }}</strong>
            <button v-if="form.items.length > 1" class="remove-button" type="button" :aria-label="`Remover item ${index + 1}`" @click="form.removeItem(index)">Remover</button>
          </header>
          <div class="item-fields">
            <label class="description-field">Descrição
              <input v-model="item.description" maxlength="250" required :aria-describedby="form.itemError(index, 'description') ? `description-error-${index}` : undefined" placeholder="Ex.: Cimento CP-II 50 kg" />
              <small v-if="form.itemError(index, 'description')" :id="`description-error-${index}`" class="field-error">{{ form.itemError(index, 'description') }}</small>
            </label>
            <label>Quantidade
              <input v-model="item.quantity" type="text" inputmode="decimal" required :aria-describedby="form.itemError(index, 'quantity') ? `quantity-error-${index}` : undefined" placeholder="0,000" />
              <small v-if="form.itemError(index, 'quantity')" :id="`quantity-error-${index}`" class="field-error">{{ form.itemError(index, 'quantity') }}</small>
            </label>
            <label>Unidade
              <input v-model="item.unit" maxlength="20" required :aria-describedby="form.itemError(index, 'unit') ? `unit-error-${index}` : undefined" placeholder="un, kg, m²…" />
              <small v-if="form.itemError(index, 'unit')" :id="`unit-error-${index}`" class="field-error">{{ form.itemError(index, 'unit') }}</small>
            </label>
            <label>Preço unitário
              <input v-model="item.unitPrice" type="text" inputmode="decimal" required :aria-describedby="form.itemError(index, 'unitPrice') ? `price-error-${index}` : undefined" placeholder="0,00" />
              <small v-if="form.itemError(index, 'unitPrice')" :id="`price-error-${index}`" class="field-error">{{ form.itemError(index, 'unitPrice') }}</small>
            </label>
            <div class="line-total"><span>Total do item</span><strong>{{ money(index) }}</strong></div>
          </div>
        </article>
      </section>

      <div class="submit-row">
        <p>Os valores são recalculados e validados pelo sistema antes de salvar.</p>
        <button class="primary-button submit-order" type="submit" :disabled="!form.valid || form.saving">
          {{ form.saving ? 'Cadastrando…' : 'Cadastrar pedido' }}
        </button>
      </div>
    </form>
  </section>
</template>
