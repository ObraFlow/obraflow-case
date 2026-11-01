import type { Locator } from "@playwright/test";

/** Read the exact announced money, independently of the slider's position scale. */
export async function thresholdCents(slider: Locator): Promise<bigint> {
  const announced = await slider.getAttribute("aria-valuetext");
  if (!announced?.startsWith("R$ ")) throw new Error("Expected an exact reais value");
  return BigInt(announced.replace(/\D/g, ""));
}
