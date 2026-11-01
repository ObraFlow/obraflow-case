import type { CoaBand, CoaConfiguration } from "@dokimos/shared";
import { brl } from "@/lib/format";
import { cents, decimal } from "../thresholds";

/** The ladder being edited: approvers in order and, between consecutive ones, the limit where one hands over. */
export type Draft = { approvers: string[]; thresholds: bigint[] };

export const amount = (value: bigint) => brl(decimal(value));

export const draftOf = (configuration: CoaConfiguration): Draft => ({
  approvers: configuration.bands.map((band) => band.approverId),
  thresholds: configuration.bands.slice(0, -1).map((band) => cents(band.upperLimit!)!),
});

export function bandsOf({ approvers, thresholds }: Draft): CoaBand[] {
  return approvers.map((approverId, index) => ({
    approverId,
    upperLimit: thresholds[index] === undefined ? null : decimal(thresholds[index]),
  }));
}

/** Whether the draft's ladder differs from the saved one; limits are compared as cents, not as text. */
export function differsFrom(bands: CoaBand[], saved: CoaConfiguration) {
  return (
    bands.length !== saved.bands.length ||
    bands.some((band, index) => {
      const original = saved.bands[index];
      if (!original || band.approverId !== original.approverId) return true;
      if (band.upperLimit === null || original.upperLimit === null) return band.upperLimit !== original.upperLimit;
      return cents(band.upperLimit) !== cents(original.upperLimit);
    })
  );
}

// Scale of the read-only view: it hugs the ladder (10% past the last limit, at least R$ 10.000,00) so the bar
// uses its width. The editor scale (scaleFor) is wider on purpose: 25% of room and R$ 50.000,00 at least,
// because limits are dragged to the right. Both are display scales only, never persisted amounts.
const VIEW_HEADROOM_PERCENT = 110n;
const VIEW_MIN_SCALE = 1000000n;
export const axisOf = (configuration: CoaConfiguration) => {
  const last = cents(configuration.bands.at(-2)?.upperLimit ?? "0")!;
  const headroom = (last * VIEW_HEADROOM_PERCENT + 99n) / 100n;
  return headroom > VIEW_MIN_SCALE ? headroom : VIEW_MIN_SCALE;
};
