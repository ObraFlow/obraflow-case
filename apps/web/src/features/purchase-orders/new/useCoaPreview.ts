import { useRefreshFailure } from "@/components/ToastProvider";
import { useEffect, useState } from "react";
import { getProjectMembers } from "@/features/projects/api";
import { type ProjectMember, type CoaConfiguration } from "@dokimos/shared";
import { getCoa } from "@/features/coa/api";

export function useCoaPreview(projectId: string, open: boolean) {
  const notifyRefreshFailure = useRefreshFailure();
  const [data, setData] = useState<{ configuration: CoaConfiguration; members: ProjectMember[] } | null>(null);
  const [failure, setFailure] = useState<{ projectId: string; error: unknown } | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!projectId || !open) return;
    const controller = new AbortController();
    setLoading(true);
    void Promise.allSettled([getCoa(projectId, controller.signal), getProjectMembers(projectId, controller.signal)])
      .then(([configuration, members]) => {
        if (configuration.status === "rejected") throw configuration.reason;
        if (members.status === "rejected") throw members.reason;
        if (!controller.signal.aborted) {
          setData({ configuration: configuration.value, members: members.value.data });
          setFailure(null);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setFailure({ projectId, error });
          if (attempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [projectId, open, attempt, notifyRefreshFailure]);
  return {
    loading,
    // Results carry their project, so switching the selection never shows the previous project's ladder.
    data: projectId && data?.configuration.projectId === projectId ? data : null,
    error: failure?.projectId === projectId ? failure.error : null,
    retry: () => setAttempt((value) => value + 1),
  };
}
