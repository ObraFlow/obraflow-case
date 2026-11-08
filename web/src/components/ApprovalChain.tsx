import type { Step, StepStatus } from '../api/types'
import { Icon } from './Icon'

const STEP_LABEL: Record<StepStatus, string> = {
  WAITING: 'próxima etapa',
  PENDING: 'aguardando decisão',
  APPROVED: 'aprovou',
  REJECTED: 'rejeitou',
  CANCELED: 'não chegou a decidir',
}

const firstName = (name: string) => name.split(' ')[0]

// Versão compacta da alçada, usada na lista e na prévia do pedido.
export function ApprovalChain({ steps, compact }: { steps: Array<Pick<Step, 'status' | 'approver'>>; compact?: boolean }) {
  return (
    <ol className="chain" aria-label="Cadeia de aprovação">
      {steps.map((s, i) => (
        // a seta mora junto do passo seguinte: se a linha quebrar, ela não fica sobrando no fim
        <li key={i} className="chain-item">
          {i > 0 && (
            <span className="chain-sep" aria-hidden="true">
              →
            </span>
          )}
          <span className="chain-step" data-status={s.status} title={`${s.approver.name}: ${STEP_LABEL[s.status]}`}>
            <span className="chain-dot">
              {s.status === 'APPROVED' ? <Icon name="check" size={10} /> : s.status === 'REJECTED' ? <Icon name="x" size={10} /> : i + 1}
            </span>
            {compact ? firstName(s.approver.name) : s.approver.name}
            <span className="visually-hidden">: {STEP_LABEL[s.status]}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
