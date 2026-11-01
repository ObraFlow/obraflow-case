import { useCallback, useEffect, useState } from "react";
import type { ProjectListItem } from "@dokimos/shared";
import { getProjects } from "@/features/projects/api";
import { getSuppliers } from "@/features/suppliers/api";
import { creationProjects } from "../creationProjects";

export type OrderReferences = {
  projects: ProjectListItem[];
  suppliers: { id: string; name: string; isActive: boolean }[];
};

/** What an order can be created with: the person's projects and the active suppliers. `reload` reads them again. */
export function useOrderReferences(userId: string) {
  const [references, setReferences] = useState<OrderReferences | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReferences(null);
    setError(null);
    async function load() {
      const [projects, suppliers] = await Promise.all([
        getProjects(controller.signal),
        getSuppliers(controller.signal),
      ]);
      const choices = creationProjects(projects.data);
      if (!controller.signal.aborted)
        setReferences({ projects: choices, suppliers: suppliers.data.filter((supplier) => supplier.isActive) });
    }
    void load().catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure);
    });
    return () => controller.abort();
  }, [attempt, userId]);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { references, error, reload };
}
