import { CoaSimulator } from "./CoaSimulator";
import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { brl } from "@/lib/format";
import { decimal } from "../thresholds";
import { levelColor } from "../levelColor";
import styles from "./CoaView.module.css";

export function CoaView({
  version,
  approvers,
  thresholds,
  visualMaximum,
  actions,
  footer,
  className,
  "data-testid": testId = "coa-view",
  allowSimulation = true,
}: {
  version: number;
  approvers: readonly string[];
  thresholds: readonly bigint[];
  visualMaximum: bigint;
  actions?: ReactNode;
  footer?: ReactNode;
  "data-testid"?: string;
  className?: string;
  allowSimulation?: boolean;
}) {
  const title = useId();
  const [activeRange, setActiveRange] = useState<number | null>(null);
  const boundaries = [0n, ...thresholds, visualMaximum];
  const columns = boundaries
    .slice(1)
    .map((value, index) => `${value - boundaries[index]}fr`)
    .join(" ");
  const position = (value: bigint) => Number((value * 10000n) / visualMaximum) / 100;
  const amount = (value: bigint) => brl(decimal(value));
  // Each range runs from just above the previous limit up to its own; the first starts at zero and the last is open.
  function rangeAt(index: number) {
    const upper = thresholds[index];
    const lower = thresholds[index - 1];
    if (approvers.length === 1) return "Qualquer valor";
    if (index === 0) return `De ${amount(0n)} até ${amount(upper)}`;
    if (upper === undefined) return `Acima de ${amount(lower)}`;
    return `De ${amount(lower + 1n)} até ${amount(upper)}`;
  }
  function rangeSentence(index: number, person: string) {
    const upper = thresholds[index];
    const lower = thresholds[index - 1];
    if (approvers.length === 1) return `Pedidos de qualquer valor precisam da confirmação apenas de ${person}.`;
    if (index === 0) return `Pedidos até ${amount(upper)} precisam da confirmação apenas de ${person}.`;
    if (upper === undefined) return `Pedidos acima de ${amount(lower)} precisam da confirmação de:`;
    return `Pedidos entre ${amount(lower + 1n)} e ${amount(upper)} precisam da aprovação de:`;
  }
  const rows = thresholds.map((value, index) => {
    let row = 0;
    for (let previous = index - 1; previous >= 0 && position(value) - position(thresholds[previous]) < 14; previous--)
      row++;
    return row;
  });

  return (
    <section className={`panel ${styles.card} ${className ?? ""}`} aria-labelledby={title} data-testid={testId}>
      <header className={styles.heading}>
        <div className={styles.identity}>
          <h2 id={title}>Alçada de aprovação</h2>
          <span>Versão: {version}</span>
        </div>
        {actions}
      </header>
      {approvers.length === 0 ? (
        <p className={styles.empty}>Nenhuma alçada configurada.</p>
      ) : (
        <figure className={styles.figure}>
          <figcaption className="mb-5 text-sm text-muted-foreground">
            A aprovação é cumulativa: cada faixa inclui os aprovadores anteriores. O último nível não tem limite de
            valor.
          </figcaption>
          <div>
            <div className={styles.ranges} style={{ gridTemplateColumns: columns }}>
              {approvers.map((person, index) => {
                const message = rangeSentence(index, person);
                const tooltipId = `${title}-range-${index}`;
                return (
                  <Tooltip.Root
                    key={index}
                    open={activeRange === index}
                    onOpenChange={(open) =>
                      setActiveRange((current) => (open ? index : current === index ? null : current))
                    }
                  >
                    <Tooltip.Trigger
                      render={<div role="group" tabIndex={0} />}
                      className={styles.range}
                      data-testid={`coa-range-${index + 1}`}
                      data-first={index === 0}
                      data-last={index === approvers.length - 1}
                      aria-label={message}
                      aria-describedby={activeRange === index ? tooltipId : undefined}
                      delay={200}
                      closeOnClick={false}
                      onPointerDown={(event) => {
                        if (event.pointerType === "touch") event.currentTarget.focus();
                      }}
                    >
                      <span className={styles.name} data-coa-name aria-hidden="true">
                        {person}
                      </span>
                      <div
                        className={styles.segment}
                        data-coa-segment
                        data-coa-level={index + 1}
                        aria-hidden="true"
                        style={{ background: levelColor(index) }}
                      />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Positioner
                        className={styles.tooltipPositioner}
                        side="top"
                        sideOffset={10}
                        collisionPadding={12}
                      >
                        <Tooltip.Popup
                          id={tooltipId}
                          role="tooltip"
                          className={styles.tooltip}
                          style={{ borderBlockStartColor: levelColor(index) }}
                        >
                          <div className={styles.tooltipHeading}>
                            <span>Nível {index + 1}</span>
                            <strong>{rangeAt(index)}</strong>
                          </div>
                          <p className={styles.tooltipMessage}>{message}</p>
                          <ol className={styles.tooltipApprovers} aria-label="Aprovadores em ordem">
                            {approvers.slice(0, index + 1).map((approver, position) => (
                              <li key={position}>
                                <span className={styles.tooltipStep} data-step={position + 1} aria-hidden="true" />
                                <span>{approver}</span>
                              </li>
                            ))}
                          </ol>
                          <p className={styles.tooltipFootnote}>
                            {index + 1} {index === 0 ? "aprovação" : "aprovações"}, em sequência · Versão {version}
                          </p>
                        </Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                );
              })}
              <div className={styles.bar} aria-hidden="true">
                {thresholds.map((value, index) => (
                  <span
                    key={index}
                    data-coa-boundary
                    className={styles.marker}
                    style={{ left: `${position(value)}%`, background: levelColor(index) }}
                  >
                    <ChevronRight size={14} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                ))}
              </div>
            </div>
            <div
              className={styles.limits}
              aria-hidden="true"
              style={{ minHeight: `${(Math.max(0, ...rows) + 1) * 1.5}rem` }}
            >
              {thresholds.map((value, index) => (
                <span
                  key={index}
                  className={styles.limit}
                  style={{
                    left: `clamp(4.75rem, ${position(value)}%, calc(100% - 4.75rem))`,
                    top: `${rows[index] * 1.5}rem`,
                  }}
                >
                  Até {amount(value)}
                </span>
              ))}
            </div>
          </div>
          <ol className={styles.details} aria-label="Faixas e cadeias efetivas">
            {approvers.map((person, index) => {
              const range = rangeAt(index);
              return (
                <li className={styles.detail} key={index} style={{ borderInlineStartColor: levelColor(index) }}>
                  <div className={styles.detailHeading}>
                    <span>Nível {index + 1}</span>
                    <h3>{range}</h3>
                  </div>
                  <p className={styles.effective}>
                    <span className="sr-only">Sequência de aprovação: </span>
                    {approvers.slice(0, index + 1).join(" → ")}
                  </p>
                </li>
              );
            })}
          </ol>
          {allowSimulation && <CoaSimulator approvers={approvers} thresholds={thresholds} version={version} />}
        </figure>
      )}
      {footer}
    </section>
  );
}
