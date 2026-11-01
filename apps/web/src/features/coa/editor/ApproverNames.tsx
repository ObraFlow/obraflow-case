import { useId, type RefObject } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import type { ProjectMember } from "@dokimos/shared";
import { SingleSelect } from "@/components/ui/Select";
import { levelColor } from "../levelColor";
import type { useNameSwap } from "./useNameSwap";
import styles from "./CoaWorkspace.module.css";

/**
 * The row of approvers above the bar: each section picks a person, can be removed, and can trade places with
 * another by dragging its handle (or with the keyboard). Section widths follow the ranges of the bar below.
 */
export function ApproverNames({
  rowRef,
  columns,
  approvers,
  members,
  nameOf,
  nameSwap,
  swapHintLeft,
  errorFor,
  errorIdFor,
  onChangePerson,
  onRemove,
}: {
  rowRef: RefObject<HTMLDivElement | null>;
  columns: string;
  approvers: string[];
  members: ProjectMember[];
  nameOf: (id: string) => string;
  nameSwap: ReturnType<typeof useNameSwap>;
  /** CSS position of the swap hint, centered over the section the dragged person would take. */
  swapHintLeft: string | null;
  /** The server's message for a field of the published ladder, if any. */
  errorFor: (field: string) => string | undefined;
  errorIdFor: (field: string) => string;
  onChangePerson: (index: number, userId: string) => void;
  onRemove: (index: number) => void;
}) {
  const instructions = useId();
  const { swap, swapText, announcement } = nameSwap;
  return (
    <>
      <p id={instructions} className="sr-only">
        Arraste a alça sobre outro aprovador para trocar. Pelo teclado, pressione Espaço, escolha com as setas e
        confirme com Enter. Escape cancela.
      </p>
      <p role="status" className="sr-only">
        {swapText || announcement}
      </p>
      <div ref={rowRef} className={styles.names} style={{ gridTemplateColumns: columns }}>
        {approvers.map((person, index) => {
          const field = `bands.${index}.approverId`;
          return (
            <div
              key={index}
              data-person-section={index}
              data-swap-target={!!swapText && swap?.to === index}
              data-dragging={swap?.from === index}
              className={styles.person}
              style={{ borderInlineStartColor: levelColor(index) }}
            >
              <span className={styles.mobileLevel}>Nível {index + 1}</span>
              <div className={styles.personIdentity} data-person-identity={person}>
                <button
                  type="button"
                  className={styles.nameHandle}
                  aria-label={`Arrastar ${nameOf(person)} para trocar`}
                  aria-describedby={instructions}
                  aria-pressed={swap?.from === index}
                  {...nameSwap.grip(index)}
                >
                  <GripVertical size={16} aria-hidden="true" />
                </button>
                <SingleSelect
                  aria-label={`Aprovador do nível ${index + 1}`}
                  value={person}
                  aria-invalid={!!errorFor(field)}
                  aria-describedby={errorFor(field) ? errorIdFor(field) : undefined}
                  onValueChange={(userId) => onChangePerson(index, userId)}
                  className={styles.personSelect}
                  options={members
                    .filter((member) => member.isActive || approvers.includes(member.userId))
                    .map((member) => ({
                      value: member.userId,
                      label: member.displayName + (!member.isActive ? " (inativo)" : ""),
                      disabled:
                        !member.isActive ||
                        approvers.some((selected, position) => position !== index && selected === member.userId),
                    }))}
                />
                <button
                  type="button"
                  className={styles.removeSegment}
                  data-remove-section={index}
                  aria-label={`Remover nível de ${nameOf(person)}`}
                  title={
                    approvers.length === 1
                      ? "É necessário manter pelo menos um nível"
                      : `Remover nível de ${nameOf(person)}`
                  }
                  disabled={approvers.length === 1}
                  onClick={() => onRemove(index)}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
              {errorFor(field) && (
                <p id={errorIdFor(field)} className={styles.fieldError}>
                  {errorFor(field)}
                </p>
              )}
            </div>
          );
        })}
        {swapText && swapHintLeft && (
          <span className={styles.swapHint} aria-hidden="true" style={{ left: swapHintLeft }}>
            {swapText}
          </span>
        )}
      </div>
      {swap?.point &&
        createPortal(
          <span
            className={styles.draggedPerson}
            data-testid="dragged-person"
            aria-hidden="true"
            style={{
              left: `clamp(.5rem, ${swap.point.x + 14}px, calc(100vw - 7rem))`,
              top: `clamp(.5rem, ${swap.point.y + 14}px, calc(100dvh - 3rem))`,
            }}
          >
            <GripVertical size={14} />
            {nameOf(approvers[swap.from])}
          </span>,
          document.body,
        )}
    </>
  );
}
