import type { RefObject } from "react";
import { levelColor } from "../levelColor";
import { amount } from "./coaDraft";
import { MAX_THRESHOLD, type useThresholdDragging } from "./useThresholdDragging";
import styles from "./CoaWorkspace.module.css";

/**
 * The proportional bar: one colored segment per approver and, between them, a draggable slider per limit.
 * The sliders only describe and move the limit; exact amounts are entered in the values row beneath.
 */
export function LimitBar({
  barRef,
  approvers,
  thresholds,
  columns,
  position,
  nameOf,
  dragging,
}: {
  barRef: RefObject<HTMLDivElement | null>;
  approvers: string[];
  thresholds: bigint[];
  /** The grid template giving every segment a width proportional to its range. */
  columns: string;
  position: (value: bigint) => string;
  nameOf: (id: string) => string;
  dragging: ReturnType<typeof useThresholdDragging>;
}) {
  /** Screen-reader summary of one level: who approves, up to which amount, and everyone who approves before. */
  function segmentLabel(index: number) {
    const limit = thresholds[index] === undefined ? "Sem limite superior" : `Até ${amount(thresholds[index])}`;
    const chain = approvers
      .slice(0, index + 1)
      .map(nameOf)
      .join(" → ");
    return `Nível ${index + 1}: ${nameOf(approvers[index])}. ${limit}. Cadeia: ${chain}.`;
  }
  function tickDescription(index: number, lower: bigint, upper: bigint) {
    return [
      `De ${amount(lower)} até ${amount(upper)}.`,
      "Arraste ou use as setas para ajustar.",
      "Segure na borda direita para aumentar continuamente.",
      `Para informar cada centavo, use Editar limite após ${nameOf(approvers[index])}.`,
    ].join(" ");
  }
  return (
    <div
      ref={barRef}
      className={styles.bar}
      style={{ gridTemplateColumns: columns }}
      role="group"
      aria-label="Limites da alçada de aprovação"
    >
      {approvers.map((person, index) => (
        <div
          key={index}
          className={styles.segment}
          data-coa-segment
          data-coa-level={index + 1}
          style={{ background: levelColor(index) }}
          role="img"
          aria-label={segmentLabel(index)}
          title={nameOf(person)}
        />
      ))}
      {thresholds.map((value, index) => {
        const lower = index === 0 ? 1n : thresholds[index - 1] + 1n;
        const upper = thresholds[index + 1] === undefined ? MAX_THRESHOLD : thresholds[index + 1] - 1n;
        // ARIA numbers describe position, never lossy monetary cents. Convert
        // only the bounded ratio; valuetext and exact entry retain every cent.
        const range = upper - lower;
        const accessiblePosition = range ? Number(((value - lower) * 1000000n) / range) / 10000 : 0;
        return (
          <button
            key={index}
            type="button"
            className={styles.tick}
            style={{ left: position(value) }}
            role="slider"
            aria-label={`Limite após ${nameOf(approvers[index])}`}
            aria-orientation="horizontal"
            aria-description={tickDescription(index, lower, upper)}
            aria-valuemin={0}
            aria-valuemax={range ? 100 : 0}
            aria-valuenow={accessiblePosition}
            aria-valuetext={amount(value)}
            onKeyDown={(event) => dragging.keyboard(event, index)}
            onPointerDown={(event) => dragging.pointerDown(event, index)}
            onPointerMove={dragging.pointerMove}
            onPointerUp={dragging.stop}
            onPointerCancel={dragging.stop}
            onLostPointerCapture={dragging.stop}
          />
        );
      })}
    </div>
  );
}
