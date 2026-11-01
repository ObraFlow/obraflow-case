// A financial request outlives its form. Store only its project, never draft data.
// On reload we cannot know whether the server committed: restore as uncertain.
type Submission = { projectId: string; pending: boolean };
const submissions = new Map<string, Submission | null>();
const listeners = new Set<() => void>();
const key = (userId: string) => `obraflow.purchaseOrderSubmission.${userId}`;

export function getSubmission(userId: string): Submission | null {
  if (!submissions.has(userId)) {
    const projectId = sessionStorage.getItem(key(userId));
    submissions.set(userId, projectId ? { projectId, pending: false } : null);
  }
  return submissions.get(userId)!;
}
export function subscribeSubmission(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publish(userId: string, submission: Submission | null) {
  submissions.set(userId, submission);
  listeners.forEach((listener) => listener());
}
export function beginSubmission(userId: string, projectId: string) {
  if (getSubmission(userId)) return false;
  // If storage is unavailable, fail before issuing a non-idempotent request.
  sessionStorage.setItem(key(userId), projectId);
  publish(userId, { projectId, pending: true });
  return true;
}
export function settleSubmission(userId: string, uncertain: boolean) {
  const submission = getSubmission(userId);
  if (!submission) return;
  if (!uncertain) {
    try {
      sessionStorage.removeItem(key(userId));
      publish(userId, null);
      return;
    } catch {
      /* Keep a conservative recovery block if the marker cannot be cleared. */
    }
  }
  publish(userId, { ...submission, pending: false });
}
export function acknowledgeSubmission(userId: string, expected: Submission) {
  // A successful read never releases a POST that is still running in this tab.
  if (getSubmission(userId) !== expected || expected.pending) return;
  sessionStorage.removeItem(key(userId));
  publish(userId, null);
}
