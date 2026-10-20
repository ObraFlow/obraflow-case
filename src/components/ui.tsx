"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Step } from "@/lib/ui-types";
import { stepLabels } from "@/lib/ui-types";

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>, check: <path d="m5 12 4 4L19 6"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    building: <><path d="M4 21V5l8-2v18M12 8h8v13M2 21h20M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2"/></>,
    rules: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></>,
    file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5"/></>,
    arrow: <path d="m9 5 7 7-7 7"/>, back: <path d="m12 5-7 7 7 7M5 12h15"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    shield: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z"/><path d="m8 12 3 3 5-6"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.file}</svg>;
}
export function Loading({ label = "Carregando dados…" }: { label?: string }) { return <div className="loading-state" role="status"><span className="spinner"/>{label}<div className="skeleton-line"/><div className="skeleton-line short"/></div>; }
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) { return <div className="notice error" role="alert"><Icon name="info"/><div><strong>Não foi possível concluir</strong><p>{message}</p>{retry && <button className="text-button" onClick={retry}>Tentar novamente</button>}</div></div>; }
export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <div className="empty-state"><span className="empty-icon"><Icon name="file" size={30}/></span><h3>{title}</h3><p>{children}</p>{action}</div>; }
export function FieldError({ message, id }: { message?: string; id?: string }) { return message ? <span className="field-error" id={id}>{message}</span> : null; }
export function Chain({ steps }: { steps: Step[] }) { return <ol className="chain">{steps.map(step => <li key={step.id} className={`chain-step ${step.status.toLowerCase()}`}><span className="step-dot">{step.status === "APPROVED" ? <Icon name="check" size={12}/> : step.status === "REJECTED" ? <Icon name="close" size={12}/> : step.position}</span><span>{step.approver.name}<small>{stepLabels[step.status]}</small></span></li>)}</ol>; }
export function Modal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { onCloseRef.current = onClose; busyRef.current = busy; }, [onClose, busy]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    (root?.querySelector<HTMLElement>("textarea") ?? root?.querySelector<HTMLElement>("input") ?? root?.querySelector<HTMLElement>("button"))?.focus();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function key(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); onCloseRef.current(); }
      if (event.key === "Tab") {
        const controls = root?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]');
        if (!controls?.length) { event.preventDefault(); root?.focus(); return; }
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = before; previous?.focus(); };
  }, []);
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={ref}><div className="modal-heading"><h2 id="modal-title">{title}</h2><button disabled={busy} className="icon-button" onClick={onClose} aria-label="Fechar"><Icon name="close"/></button></div>{children}</div></div>;
}
