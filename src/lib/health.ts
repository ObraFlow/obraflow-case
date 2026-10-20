export async function checkReadiness(probe: () => Promise<unknown>) {
  try {
    await probe();
    return { ready: true as const };
  } catch {
    return { ready: false as const };
  }
}
