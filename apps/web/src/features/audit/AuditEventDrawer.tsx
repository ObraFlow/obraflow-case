import { projectPath } from "@/lib/paths";
import { FormSection } from "@/components/ui/FormSection";
import { Disclosure } from "@/components/ui/Disclosure";
import type { AuditEvent } from "@dokimos/shared";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/Drawer";
import { brl, date, timestamp, plural, roleLabel } from "@/lib/format";
import { resourceNoun } from "./eventTypes";

export function AuditEventDrawer({
  event,
  label,
  href,
  open,
  onOpenChange,
  loading,
}: {
  event?: AuditEvent;
  label: string;
  href: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {!event ? (
          <>
            <DrawerTitle>Detalhes do evento</DrawerTitle>
            <DrawerDescription>
              {loading
                ? "Carregando registro…"
                : "Este evento não está na página atual. Feche os detalhes e atualize ou ajuste os filtros."}
            </DrawerDescription>
          </>
        ) : (
          <>
            <header className="space-y-2 pr-7">
              <p className="eyebrow">AUDITORIA · SOMENTE LEITURA</p>
              <DrawerTitle>{label}</DrawerTitle>
              <DrawerDescription>{event.resource.name}</DrawerDescription>
            </header>
            <dl className="grid min-w-0 gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Quando</dt>
                <dd className="mt-1">
                  <time dateTime={event.occurredAt}>{timestamp(event.occurredAt)}</time>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Responsável</dt>
                <dd className="mt-1 break-words">
                  {event.actor.displayName}
                  {event.actor.kind === "SYSTEM" ? " · Sistema" : ""}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Obra</dt>
                <dd className="mt-1 break-words">
                  {event.project ? (
                    <Link className="text-link" to={projectPath(event.project.id)}>
                      {event.project.name}
                    </Link>
                  ) : (
                    "Global · sem vínculo com uma obra"
                  )}
                </dd>
              </div>
            </dl>
            <FormSection className="text-sm" title="Detalhes">
              {event.type.startsWith("PROJECT_") && "projectName" in event.details && (
                <>
                  <dl className="space-y-3 rounded-lg border p-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Nome registrado da obra</dt>
                      <dd className="break-words">{event.details.projectName}</dd>
                    </div>
                    {event.details.previousName !== null && (
                      <div>
                        <dt className="text-xs text-muted-foreground">Nome anterior</dt>
                        <dd className="break-words">{event.details.previousName}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-muted-foreground">Situação registrada</dt>
                      <dd>{event.details.isActive ? "Ativa" : "Arquivada"}</dd>
                    </div>
                    {event.details.member && (
                      <>
                        <div>
                          <dt className="text-xs text-muted-foreground">Membro</dt>
                          <dd className="break-words">
                            {event.details.member.displayName} · @{event.details.member.username}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Vínculo registrado</dt>
                          <dd>{event.type === "PROJECT_MEMBER_ADDED" ? "Adicionado à obra" : "Removido da obra"}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  <p className="text-muted-foreground">
                    Nome e situação da obra registrados nesta operação. Renomeações posteriores não os alteram.
                  </p>
                </>
              )}
              {(event.type === "SUPPLIER_CREATED" || event.type === "SUPPLIER_DISABLED") && (
                <dl className="space-y-3 rounded-lg border p-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Fornecedor registrado</dt>
                    <dd className="break-words">{event.details.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Situação registrada</dt>
                    <dd>{event.details.isActive ? "Ativo" : "Inativo"}</dd>
                  </div>
                </dl>
              )}
              {event.type === "SUPPLIER_RENAMED" && (
                <>
                  <dl className="space-y-3 rounded-lg border p-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Nome anterior</dt>
                      <dd className="break-words">{event.details.previousName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Nome registrado do fornecedor</dt>
                      <dd className="break-words">{event.details.name}</dd>
                    </div>
                  </dl>
                  <p className="text-muted-foreground">
                    Nomes registrados nesta alteração. O fornecedor é o mesmo e os pedidos anteriores continuam ligados
                    a ele.
                  </p>
                </>
              )}
              {event.type === "ORDER_CREATED" && (
                <>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Total original do pedido</p>
                    <p className="mt-1 text-2xl font-semibold">{brl(event.details.total)}</p>
                    <p className="mt-2">
                      {event.details.itemCount} {plural(event.details.itemCount, "item", "itens")} · Data:{" "}
                      {date(event.details.orderDate)}
                    </p>
                  </div>
                  <p>
                    Fornecedor: <strong>{event.details.supplier.name}</strong>
                  </p>
                  <p>Alçada aplicada: versão {event.details.coaVersion}</p>
                  <h2 className="font-semibold">Aprovadores originais do pedido</h2>
                  <ol className="space-y-2">
                    {event.details.steps.map((step) => (
                      <li key={step.stepIndex} className="rounded-lg border p-3">
                        <p>
                          {step.stepIndex + 1}. {step.approverName}
                        </p>
                      </li>
                    ))}
                  </ol>
                </>
              )}
              {(event.type === "STEP_APPROVED" || event.type === "STEP_REJECTED") && (
                <>
                  <h2 className="font-semibold">Decisão · Etapa {event.details.stepIndex + 1}</h2>
                  <p>
                    Aprovador: <strong>{event.details.approverName}</strong>
                  </p>
                  <p>Alçada original: versão {event.details.coaVersion}</p>
                  {event.details.reason !== null && (
                    <div className="rounded-lg border p-4">
                      <h3 className="font-semibold">Motivo</h3>
                      <p className="mt-2 whitespace-pre-wrap break-words">{event.details.reason}</p>
                    </div>
                  )}
                </>
              )}
              {event.type === "COA_REVISED" && (
                <>
                  <h2 className="font-semibold">Alçada publicada · versão {event.details.version}</h2>
                  <p className="text-muted-foreground">
                    Alçada completa publicada nesta versão. Cada nível inclui os aprovadores anteriores.
                  </p>
                  <ol className="space-y-3">
                    {event.details.bands.map((band, index) => (
                      <li key={band.approverId} className="space-y-2 rounded-lg border p-4">
                        <h3 className="font-semibold">
                          Nível {index + 1} · {band.approverName}
                        </h3>
                        <p>{band.upperLimit === null ? "Sem limite" : `Até ${brl(band.upperLimit)}`}</p>
                        <p className="break-words">
                          Cadeia:{" "}
                          {event.details.bands
                            .slice(0, index + 1)
                            .map((step) => step.approverName)
                            .join(" → ")}
                        </p>
                      </li>
                    ))}
                  </ol>
                </>
              )}
              {(event.type === "USER_CREATED" || event.type === "USER_DISABLED") && (
                <dl className="space-y-3 rounded-lg border p-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Nome</dt>
                    <dd className="break-words">{event.details.displayName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Usuário</dt>
                    <dd className="break-words">{event.details.username}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Perfil</dt>
                    <dd>{roleLabel(event.details.role)}</dd>
                  </div>
                </dl>
              )}
            </FormSection>
            <Disclosure title="Referências técnicas">
              <div className="min-w-0 space-y-3 text-xs text-muted-foreground">
                <p className="break-all">
                  Tipo: {event.type} · {event.resource.kind}
                </p>
                <p className="break-all">Recurso: {event.resource.id}</p>
                <p className="break-all">
                  Ator: {event.actor.id ?? event.actor.kind} · {event.actor.kind}
                </p>
                <p className="break-all">Evento: {event.id}</p>
                <p className="break-all">
                  Data completa: <time dateTime={event.occurredAt}>{event.occurredAt}</time>
                </p>
                {event.project && <p className="break-all">Obra: {event.project.id}</p>}
                {event.type === "ORDER_CREATED" && (
                  <>
                    <p className="break-all">Fornecedor: {event.details.supplier.id}</p>
                    {event.details.steps.map((step) => (
                      <p className="break-all" key={step.stepIndex}>
                        Etapa {step.stepIndex + 1}: {step.approverId}
                      </p>
                    ))}
                  </>
                )}
                {(event.type === "STEP_APPROVED" || event.type === "STEP_REJECTED") && (
                  <p className="break-all">Aprovador: {event.details.approverId}</p>
                )}
                {"projectName" in event.details && event.details.member && (
                  <p className="break-all">Membro: {event.details.member.userId}</p>
                )}
                {event.type === "COA_REVISED" &&
                  event.details.bands.map((band, index) => (
                    <p className="break-all" key={index}>
                      Nível {index + 1}: {band.approverId}
                    </p>
                  ))}
              </div>
            </Disclosure>
            <Link className="text-link inline-flex items-center gap-2 self-start text-sm" to={href}>
              Abrir {resourceNoun(event.resource.kind)}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
