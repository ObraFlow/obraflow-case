import { AlertCard } from "@/components/ui/AlertCard";
import { useToast } from "@/components/ToastProvider";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Pencil, Plus, Upload } from "lucide-react";
import { replaceCoaSchema, type ProjectMember, type CoaConfiguration } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { cents } from "../thresholds";
import { CoaView } from "../view/CoaView";
import { CoaHistory } from "../view/CoaHistory";
import { ApproverNames } from "./ApproverNames";
import { CoaReconciliation } from "./CoaReconciliation";
import { DiscardDraftDialog, PublishConfirmation } from "./CoaDialogs";
import { axisOf, bandsOf, differsFrom, draftOf, type Draft } from "./coaDraft";
import { LimitBar } from "./LimitBar";
import { useCoaPublication } from "./useCoaPublication";
import { ThresholdAmountEditor } from "./ThresholdAmountEditor";
import { useNameSwap } from "./useNameSwap";
import { MAX_THRESHOLD, useThresholdDragging } from "./useThresholdDragging";
import styles from "./CoaWorkspace.module.css";

/** The published ladder with, on Edit, a local draft that is published whole and version-checked. */
export function CoaWorkspace({
  id,
  projectName,
  initial,
  members,
  onConfirmed,
  loading = false,
  readOnly = false,
  onBusyChange,
}: {
  id: string;
  projectName: string;
  initial: CoaConfiguration;
  members: ProjectMember[];
  onConfirmed: (value: CoaConfiguration) => void;
  loading?: boolean;
  readOnly?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const publication = useCoaPublication(id, initial, onConfirmed);
  const { success: successToast } = useToast();
  const { saved, baseVersion, pending, reading, conflict, remote, failure, details, clearErrors } = publication;
  const [editing, setEditing] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const modeAction = useRef<HTMLButtonElement>(null);
  const cancelEdit = useRef<HTMLButtonElement>(null);
  const previousMode = useRef(editing);
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial));
  // Any draft change invalidates server feedback about the previous draft.
  useEffect(() => {
    clearErrors();
  }, [draft, clearErrors]);
  const bar = useRef<HTMLDivElement>(null);
  const nameRow = useRef<HTMLDivElement>(null);
  const [amountEditing, setAmountEditing] = useState(false);
  const serverErrorId = useId();
  const serverError = (field: string) => details.find((detail) => detail.field === field)?.message;
  const fieldErrorId = (field: string) => `${serverErrorId}-${field}`;
  const { approvers, thresholds } = draft;
  const last = thresholds.at(-1) ?? 0n;
  useEffect(() => {
    onBusyChange?.(editing || pending || reading);
    return () => onBusyChange?.(false);
  }, [editing, pending, reading, onBusyChange]);
  const locked = readOnly || pending || reading || loading;
  const dragging = useThresholdDragging(
    cents(initial.bands.at(-2)?.upperLimit ?? "0")!,
    thresholds,
    (index, value) => {
      setDraft((current) => ({
        ...current,
        thresholds: current.thresholds.map((limit, position) => (position === index ? value : limit)),
      }));
    },
    bar,
    editing && !locked && !amountEditing,
  );
  const { axis } = dragging;
  const position = (value: bigint) => `${Number((value * 10000n) / axis) / 100}%`;
  useLayoutEffect(() => {
    if (previousMode.current !== editing)
      (modeAction.current?.disabled ? cancelEdit.current : modeAction.current)?.focus();
    previousMode.current = editing;
  }, [editing]);
  const boundaries = [0n, ...thresholds, axis];
  const columns = boundaries
    .slice(1)
    .map((value, index) => `${value - boundaries[index]}fr`)
    .join(" ");
  const people = members.filter((member) => member.isActive).map((member) => member.userId);
  const nameOf = (id: string) => members.find((member) => member.userId === id)?.displayName ?? id;
  const available = people.find((person) => !approvers.includes(person));
  const nameSwap = useNameSwap({
    approvers,
    nameRow,
    nameOf,
    onSwap: (from, to) =>
      setDraft((previous) => ({
        ...previous,
        approvers: previous.approvers.map((person, index) =>
          index === from ? previous.approvers[to] : index === to ? previous.approvers[from] : person,
        ),
      })),
  });
  const { swap } = nameSwap;
  const bands = bandsOf(draft);
  const parsed = replaceCoaSchema.safeParse({ expectedCoaVersion: baseVersion, bands });
  const inactive = approvers.filter((person) => !people.includes(person));
  const dirty = differsFrom(bands, saved);
  const unpublishable = locked || conflict || !dirty || !parsed.success || !!inactive.length || amountEditing;

  function loadConfirmed(configuration: CoaConfiguration) {
    setDraft(draftOf(configuration));
    setAmountEditing(false);
    nameSwap.reset();
    dragging.reset(cents(configuration.bands.at(-2)?.upperLimit ?? "0")!);
    setEditing(false);
  }
  async function saveDraft() {
    if (locked || amountEditing || conflict || inactive.length || !dirty) return;
    dragging.stop();
    const input = replaceCoaSchema.safeParse({ expectedCoaVersion: baseVersion, bands });
    if (!input.success) return;
    nameSwap.reset();
    nameSwap.cancelAnimations();
    const result = await publication.publish(input.data.bands);
    setConfirmSave(false);
    if (result) {
      loadConfirmed(result);
      successToast({
        id: `coa:${id}:${result.coaVersion}`,
        title: "Alçada publicada",
        description: `${projectName} · Versão ${result.coaVersion}. Pedidos existentes mantêm a configuração original.`,
      });
    }
  }
  async function discardDraft() {
    const result = await publication.discard();
    if (result) loadConfirmed(result);
    setDiscardOpen(false);
  }
  function startEditing() {
    if (!draft.approvers.length && people[0]) setDraft({ approvers: [people[0]], thresholds: [] });
    dragging.reset(last);
    setEditing(true);
  }
  function cancelEditing() {
    if (dirty || conflict) {
      setDiscardOpen(true);
      return;
    }
    setDraft(draftOf(saved));
    setEditing(false);
  }

  function addPerson() {
    if (locked) return;
    setDraft((current) => {
      const person = people.find((name) => !current.approvers.includes(name));
      const last = current.thresholds.at(-1) ?? 0n;
      if (!person || last >= MAX_THRESHOLD) return current;
      const candidate = last + (axis - last > 1n ? (axis - last) / 2n : 1n);
      const limit = candidate > MAX_THRESHOLD ? MAX_THRESHOLD : candidate;
      return { approvers: [...current.approvers, person], thresholds: [...current.thresholds, limit] };
    });
  }
  function changePerson(index: number, selected: string) {
    setDraft((current) => {
      const taken = current.approvers.some((person, position) => position !== index && person === selected);
      if (!people.includes(selected) || taken) return current;
      return {
        ...current,
        approvers: current.approvers.map((value, position) => (position === index ? selected : value)),
      };
    });
  }
  function removePerson(index: number) {
    if (locked || approvers.length <= 1) return;
    nameSwap.reset();
    setDraft((current) => {
      if (current.approvers.length <= 1) return current;
      const boundary = Math.min(index, current.thresholds.length - 1);
      return {
        approvers: current.approvers.filter((_, position) => position !== index),
        thresholds: current.thresholds.filter((_, position) => position !== boundary),
      };
    });
    nameSwap.announce(`Nível de ${nameOf(approvers[index])} removido.`);
    requestAnimationFrame(() => {
      const next = nameRow.current?.querySelector<HTMLButtonElement>(
        `[data-remove-section="${Math.min(index, approvers.length - 2)}"]`,
      );
      (next ?? nameRow.current?.querySelector<HTMLButtonElement>("button"))?.focus();
    });
  }

  if (!editing)
    return (
      <>
        {!people.length && (
          <AlertCard variant="warning">Adicione membros ativos à obra para configurar a alçada.</AlertCard>
        )}
        <CoaView
          version={saved.coaVersion}
          approvers={saved.bands.map((band) => nameOf(band.approverId))}
          thresholds={draftOf(saved).thresholds}
          visualMaximum={axisOf(saved)}
          actions={
            <Button
              ref={modeAction}
              type="button"
              variant="outline"
              disabled={readOnly || loading || !people.length}
              onClick={startEditing}
            >
              <Pencil aria-hidden="true" />
              Editar
            </Button>
          }
          footer={<CoaHistory id={id} nameOf={nameOf} />}
        />
      </>
    );

  const swapTarget = swap?.to;
  const swapHintLeft =
    swapTarget == null
      ? null
      : `clamp(6rem, ${position((boundaries[swapTarget] + boundaries[swapTarget + 1]) / 2n)}, calc(100% - 6rem))`;
  const serverDetails = details.filter((issue) => !/^bands\.\d+\.upperLimit$/.test(issue.field));
  return (
    <>
      <section className="panel p-5" aria-labelledby="published-coa-title" aria-busy={locked}>
        <fieldset className={styles.controls} disabled={locked}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 id="published-coa-title" className="font-semibold">
                Alçada de aprovação
              </h2>
              <p className="numeric text-sm text-muted-foreground">Versão: {baseVersion}</p>
              {dirty && (
                <span className="warning-chip" role="status">
                  Rascunho não publicado
                </span>
              )}
            </div>
            <div className={styles.actions}>
              {available && (
                <Button type="button" variant="outline" disabled={last >= MAX_THRESHOLD} onClick={addPerson}>
                  <Plus aria-hidden="true" />
                  Adicionar nível
                </Button>
              )}
              <Button ref={cancelEdit} type="button" variant="outline" onClick={cancelEditing}>
                Cancelar
              </Button>
              <Button
                ref={modeAction}
                type="button"
                variant="save"
                disabled={unpublishable}
                title={!dirty ? "Nenhuma alteração para publicar. Use Cancelar para voltar à visualização." : undefined}
                onClick={() => {
                  dragging.stop();
                  setConfirmSave(true);
                }}
              >
                <Upload aria-hidden="true" />
                {pending ? "Publicando…" : "Publicar alçada"}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">A publicação fica disponível após uma alteração.</p>
          <div className={styles.preview} aria-label="Editor da alçada de aprovação">
            <ApproverNames
              rowRef={nameRow}
              columns={columns}
              approvers={approvers}
              members={members}
              nameOf={nameOf}
              nameSwap={nameSwap}
              swapHintLeft={swapHintLeft}
              errorFor={serverError}
              errorIdFor={fieldErrorId}
              onChangePerson={changePerson}
              onRemove={removePerson}
            />
            <LimitBar
              barRef={bar}
              approvers={approvers}
              thresholds={thresholds}
              columns={columns}
              position={position}
              nameOf={nameOf}
              dragging={dragging}
            />
            <div className={styles.values}>
              {thresholds.map((value, index) => (
                <div
                  key={index}
                  className={styles.boundaryValue}
                  style={{ left: `clamp(4rem, ${position(value)}, calc(100% - 4rem))`, top: `${(index % 2) * 2}rem` }}
                >
                  <span className={styles.boundaryName}>Limite após {nameOf(approvers[index])}</span>
                  <ThresholdAmountEditor
                    name={nameOf(approvers[index])}
                    value={value}
                    minimum={index ? thresholds[index - 1] + 1n : 1n}
                    maximum={thresholds[index + 1] === undefined ? MAX_THRESHOLD : thresholds[index + 1] - 1n}
                    domainMaximum={thresholds[index + 1] === undefined}
                    disabled={locked}
                    serverError={serverError(`bands.${index}.upperLimit`)}
                    onOpenChange={setAmountEditing}
                    onConfirm={(confirmed) => {
                      dragging.reset(index === thresholds.length - 1 ? confirmed : last);
                      setDraft((current) => ({
                        ...current,
                        thresholds: current.thresholds.map((limit, position) =>
                          position === index ? confirmed : limit,
                        ),
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
            {!!approvers.length && (
              <p className={styles.unlimited}>{nameOf(approvers[approvers.length - 1])} · Sem limite superior</p>
            )}
          </div>
          {!!inactive.length && (
            <AlertCard variant="error" className="mt-3">
              Selecione membros ativos para substituir: {inactive.map(nameOf).join(", ")}.
            </AlertCard>
          )}
          {!parsed.success && (
            <AlertCard variant="error" className="mt-3">
              {parsed.error.issues[0]?.message}
            </AlertCard>
          )}
        </fieldset>
        {failure && !conflict && (
          <AlertCard variant="error" className="mt-4">
            {failure}
          </AlertCard>
        )}
        {!!serverDetails.length && (
          <ul className="mt-2 text-sm text-error">
            {serverDetails.map((issue, index) => (
              <li key={index}>
                {issue.field}: {issue.message}
              </li>
            ))}
          </ul>
        )}
        {conflict && (
          <CoaReconciliation
            failure={failure}
            reading={reading}
            remote={remote}
            locked={locked}
            nameOf={nameOf}
            onKeepDraft={publication.keepDraft}
            onUseSaved={(savedLadder) => {
              publication.accept(savedLadder);
              loadConfirmed(savedLadder);
            }}
            onRetry={() => void publication.compare()}
          />
        )}
      </section>
      <PublishConfirmation
        open={confirmSave}
        onOpenChange={setConfirmSave}
        baseVersion={baseVersion}
        bands={bands}
        nameOf={nameOf}
        pending={pending || reading}
        disabled={loading || conflict || !parsed.success || !!inactive.length || amountEditing}
        onConfirm={() => void saveDraft()}
      />
      <DiscardDraftDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        locked={locked}
        onDiscard={() => void discardDraft()}
      />
    </>
  );
}
