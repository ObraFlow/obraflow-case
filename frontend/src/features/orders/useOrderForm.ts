import { computed, onMounted, ref } from 'vue'
import { apiRequest } from '../../shared/api/http'
import { decimalString, formatCurrencyCents, lineTotalCents, parseDecimalScaled } from './orderMath'

type Work = { id: number; name: string; code: string }
type Supplier = { id: number; name: string; taxId: string; active: boolean }
type OrderItem = { description: string; quantity: string; unit: string; unitPrice: string }
type OrderResponse = { id: number; total: number }

function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function useOrderForm() {
  const works = ref<Work[]>([])
  const suppliers = ref<Supplier[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')
  const notice = ref('')
  const createdOrderId = ref<number | null>(null)
  const workId = ref<number | null>(null)
  const supplierId = ref<number | null>(null)
  const orderDate = ref(todayLocal())
  const internalNotes = ref('')
  const items = ref<OrderItem[]>([emptyItem()])

  function emptyItem(): OrderItem {
    return { description: '', quantity: '', unit: '', unitPrice: '' }
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const [workList, supplierList] = await Promise.all([
        apiRequest<Work[]>('/api/works'),
        apiRequest<Supplier[]>('/api/suppliers'),
      ])
      works.value = workList
      suppliers.value = supplierList.filter(supplier => supplier.active)
      if (!works.value.some(work => work.id === workId.value)) workId.value = works.value[0]?.id ?? null
      if (!suppliers.value.some(supplier => supplier.id === supplierId.value)) supplierId.value = null
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Falha ao carregar obras e fornecedores.'
    } finally {
      loading.value = false
    }
  }

  function itemError(index: number, field: keyof OrderItem): string {
    const item = items.value[index]
    if (!item) return ''
    if (field === 'description' && !item.description.trim()) return 'Informe a descrição do item.'
    if (field === 'unit' && !item.unit.trim()) return 'Informe a unidade do item.'
    if (field === 'quantity') {
      const quantity = parseDecimalScaled(item.quantity, 3)
      if (quantity === null || quantity <= 0n) return 'Informe uma quantidade numérica maior que zero, com até 3 casas decimais.'
      if (item.quantity.replace(',', '.').split('.')[0].length > 9) return 'A quantidade pode ter até 9 dígitos inteiros.'
    }
    if (field === 'unitPrice') {
      const price = parseDecimalScaled(item.unitPrice, 2)
      if (price === null) return 'Informe um preço não negativo, com até 2 casas decimais.'
      if (item.unitPrice.replace(',', '.').split('.')[0].length > 12) return 'O preço pode ter até 12 dígitos inteiros.'
    }
    return ''
  }

  function lineCents(index: number) {
    const item = items.value[index]
    return item ? lineTotalCents(item.quantity, item.unitPrice) : null
  }

  const totalCents = computed(() => items.value.reduce((sum, _, index) => sum + (lineCents(index) ?? 0n), 0n))
  const totalLabel = computed(() => formatCurrencyCents(totalCents.value))
  const valid = computed(() => Boolean(workId.value && supplierId.value && orderDate.value && items.value.length > 0
    && items.value.every((_, index) => (['description', 'quantity', 'unit', 'unitPrice'] as const)
      .every(field => !itemError(index, field)))))

  function generalError(field: 'work' | 'supplier' | 'date') {
    if (field === 'work' && !workId.value) return 'Selecione uma obra.'
    if (field === 'supplier' && !supplierId.value) return 'Selecione um fornecedor.'
    if (field === 'date' && !orderDate.value) return 'Informe a data do pedido.'
    return ''
  }

  function addItem() { items.value.push(emptyItem()) }

  function removeItem(index: number) { items.value.splice(index, 1) }

  async function submit() {
    if (!valid.value || saving.value || loading.value) return
    saving.value = true
    error.value = ''
    notice.value = ''
    createdOrderId.value = null
    try {
      const result = await apiRequest<OrderResponse>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          workId: workId.value,
          supplierId: supplierId.value,
          orderDate: orderDate.value,
          internalNotes: internalNotes.value.trim() || null,
          items: items.value.map(item => ({
            description: item.description.trim(),
            quantity: decimalString(item.quantity, 3),
            unit: item.unit.trim(),
            unitPrice: decimalString(item.unitPrice, 2),
          })),
        }),
      })
      createdOrderId.value = result.id
      notice.value = 'Pedido cadastrado com sucesso. A cadeia inicial de aprovação foi registrada.'
      items.value = [emptyItem()]
      internalNotes.value = ''
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Não foi possível cadastrar o pedido.'
    } finally {
      saving.value = false
    }
  }

  onMounted(load)

  return {
    works, suppliers, loading, saving, error, notice, createdOrderId, workId, supplierId, orderDate,
    internalNotes, items, valid, totalLabel, load, generalError, itemError, lineCents, addItem, removeItem, submit,
    formatCurrencyCents,
  }
}
