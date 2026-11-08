import { useEffect, useRef, type ReactNode } from 'react'

// <dialog> nativo aberto com showModal(): foco preso, Esc fecha e o resto
// da página fica inerte, sem lib de modal.
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={labelledBy} onClose={onClose}>
      {open && children}
    </dialog>
  )
}

export function ConfirmDialog(props: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={props.open} onClose={props.onClose} labelledBy="confirm-title">
      <div className="dialog-body">
        <h2 id="confirm-title">{props.title}</h2>
        <div className="muted">{props.children}</div>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={props.onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className={`btn ${props.danger ? 'btn-reject' : 'btn-primary'}`}
          disabled={props.busy}
          onClick={props.onConfirm}
        >
          {props.busy ? 'Aguarde…' : props.confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
