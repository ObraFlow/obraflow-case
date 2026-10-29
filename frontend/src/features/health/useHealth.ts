import { onMounted, ref } from 'vue'
import { apiRequest } from '../../shared/api/http'

type HealthResponse = { status: string; database: string }

/** Loads API and database status for the health indicator. */
export function useHealth() {
  const loading = ref(true)
  const error = ref('')
  const health = ref<HealthResponse | null>(null)

  async function loadHealth() {
    loading.value = true
    error.value = ''
    try {
      health.value = await apiRequest<HealthResponse>('/api/health')
    } catch {
      health.value = null
      error.value = 'Não foi possível conectar à API. Confira se o backend e o banco estão iniciados.'
    } finally {
      loading.value = false
    }
  }

  onMounted(loadHealth)

  return { loading, error, health, loadHealth }
}
