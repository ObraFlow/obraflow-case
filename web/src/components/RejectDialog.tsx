import { useState } from 'react'
import { Dialog } from './Dialog'

const MIN = 5

export function RejectDialog(props: {
  open: boolean
  orderCode: string
  busy: boolean
  serverError: string | null
  onSubmit: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)
  const trimmed = reason.trim()
  const error = !trimmed
    ? 'O motivo é obrigatório: ele fica registrado no histórico do pedido.'
    : trimmed.length < MIN
      ? `Escreva pelo menos ${MIN} caracteres.`
      : null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (error) {
      setShowError(true)
      return
    }
    props.onSubmit(trimmed)
  }

  function close() {
    setReason('')
    setShowError(false)
    props.onClose()
  }

  const invalid = showError && !!error

  return (
    <Dialog open={props.open} onClose={close} labelledBy="reject-title">
      <form onSubmit={submit} noValidate>
        <div className="dialog-body">
          <div>
            <span className="eyebrow">{props.orderCode}</span>
            <h2 id="reject-title" style={{ marginTop: 6 }}>
              Rejeitar pedido
            </h2>
          </div>
          <p className="muted small">
            A rejeição encerra o fluxo: as próximas etapas não serão chamadas e o solicitante precisará abrir um novo pedido.
          </p>
          <div className="field">
            <label htmlFor="reject-reason">
              Motivo<span className="req">*</span>
            </label>
            <textarea
              id="reject-reason"
              className="textarea"
              rows={4}
              maxLength={1000}
              autoFocus
              placeholder="Ex.: preço acima da última cotação; já existe contrato vigente…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => trimmed && setShowError(true)}
              aria-invalid={invalid}
              aria-describedby="reject-reason-msg"
            />
            <span id="reject-reason-msg" className={invalid ? 'field-error' : 'field-hint'}>
              {invalid ? error : `${trimmed.length}/1000`}
            </span>
          </div>
          {props.serverError && (
            <div className="notice notice-danger" role="alert">
              {props.serverError}
            </div>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-reject" disabled={props.busy}>
            {props.busy ? 'Rejeitando…' : 'Rejeitar pedido'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
