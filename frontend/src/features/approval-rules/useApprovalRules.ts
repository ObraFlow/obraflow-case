import { computed, onMounted, ref } from 'vue'
import { apiRequest } from '../../shared/api/http'
import { toEditableBand, type Band, type BandResponse, type User, type Work } from './types'

/** Owns loading, editing, and persistence state for approval rules. */
export function useApprovalRules() {
  const works = ref<Work[]>([])
  const users = ref<User[]>([])
  const bands = ref<Band[]>([])
  const workId = ref<number | null>(null)
  const loading = ref(true)
  const bandsLoading = ref(false)
  const saving = ref(false)
  const creatingWork = ref(false)
  const creatingUser = ref(false)
  const error = ref('')
  const notice = ref('')
  const workName = ref('')
  const workCode = ref('')
  const userName = ref('')
  const userEmail = ref('')
  const selectedWork = computed(() => works.value.find(work => work.id === workId.value))
  let bandsRequestId = 0

  async function loadBands() {
    const requestedWorkId = workId.value
    const requestId = ++bandsRequestId
    bands.value = []
    if (!requestedWorkId) {
      bandsLoading.value = false
      return
    }
    bandsLoading.value = true
    try {
      const saved = await apiRequest<BandResponse[]>(`/api/works/${requestedWorkId}/approval-bands`)
      if (requestId === bandsRequestId && requestedWorkId === workId.value) {
        bands.value = saved.map(toEditableBand)
      }
    } finally {
      if (requestId === bandsRequestId) bandsLoading.value = false
    }
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const [workList, userList] = await Promise.all([
        apiRequest<Work[]>('/api/works'),
        apiRequest<User[]>('/api/users'),
      ])
      works.value = workList
      users.value = userList
      if (!works.value.some(work => work.id === workId.value)) workId.value = works.value[0]?.id ?? null
      await loadBands()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Falha ao carregar cadastros.'
    } finally {
      loading.value = false
    }
  }

  async function selectWork() {
    const selectedId = workId.value
    error.value = ''
    notice.value = ''
    try {
      await loadBands()
    } catch (cause) {
      if (workId.value === selectedId) {
        error.value = cause instanceof Error ? cause.message : 'Falha ao carregar regras.'
      }
    }
  }

  function addBand() {
    const last = bands.value.at(-1)
    if (last) last.maxAmount = last.maxAmount ?? Math.max(last.minAmount + 1, 10000)
    bands.value.push({ minAmount: last?.maxAmount ?? 0, maxAmount: null, approverIds: [] })
  }

  function removeBand(index: number) {
    bands.value.splice(index, 1)
  }

  function moveApprover(band: Band, index: number, direction: number) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= band.approverIds.length) return
    ;[band.approverIds[index], band.approverIds[nextIndex]] = [band.approverIds[nextIndex], band.approverIds[index]]
  }

  function toggleApprover(band: Band, id: number) {
    band.approverIds = band.approverIds.includes(id)
      ? band.approverIds.filter(approverId => approverId !== id)
      : [...band.approverIds, id]
  }

  function money(value: number | null) {
    return value === null
      ? 'Sem limite'
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  async function save() {
    if (!workId.value) return
    saving.value = true
    error.value = ''
    notice.value = ''
    try {
      const saved = await apiRequest<BandResponse[]>(`/api/works/${workId.value}/approval-bands`, {
        method: 'PUT',
        body: JSON.stringify(bands.value.map(({ minAmount, maxAmount, approverIds }) => ({ minAmount, maxAmount, approverIds }))),
      })
      bands.value = saved.map(toEditableBand)
      notice.value = 'Regras salvas com sucesso.'
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Não foi possível salvar as regras.'
    } finally {
      saving.value = false
    }
  }

  async function createWork() {
    creatingWork.value = true
    error.value = ''
    try {
      const work = await apiRequest<Work>('/api/works', {
        method: 'POST', body: JSON.stringify({ name: workName.value, code: workCode.value }),
      })
      works.value.push(work)
      workId.value = work.id
      bands.value = []
      workName.value = ''
      workCode.value = ''
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Falha ao cadastrar obra.'
    } finally {
      creatingWork.value = false
    }
  }

  async function createUser() {
    creatingUser.value = true
    error.value = ''
    try {
      const user = await apiRequest<User>('/api/users', {
        method: 'POST', body: JSON.stringify({ name: userName.value, email: userEmail.value }),
      })
      users.value.push(user)
      userName.value = ''
      userEmail.value = ''
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Falha ao cadastrar usuário.'
    } finally {
      creatingUser.value = false
    }
  }

  onMounted(load)

  return {
    works, users, bands, workId, loading, bandsLoading, saving, creatingWork, creatingUser, error, notice,
    workName, workCode, userName, userEmail, selectedWork,
    load, selectWork, addBand, removeBand, moveApprover, toggleApprover, money, save, createWork, createUser,
  }
}
