import { useCallback, useEffect, useRef, useState } from "react";
import { type CoaBand, type CoaConfiguration } from "@dokimos/shared";
import { ApiError, errorMessage, type FieldIssue, isUncertainOutcome } from "@/lib/api";
import { getCoa, replaceCoa } from "@/features/coa/api";

/**
 * Publication of the whole ladder, version-checked. The draft itself belongs to the editor; this keeps the
 * saved ladder, the version the draft was based on, and the conflict flow. After a conflict or an unknown
 * outcome it reads the saved ladder and waits: the draft is kept or discarded only by an explicit choice.
 */
export function useCoaPublication(
  id: string,
  initial: CoaConfiguration,
  onConfirmed: (value: CoaConfiguration) => void,
) {
  const [saved, setSaved] = useState(initial);
  // The version the draft was started from; sent as the expected version so a concurrent publication is a 409.
  const [baseVersion, setBaseVersion] = useState(initial.coaVersion);
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [remote, setRemote] = useState<CoaConfiguration | null>(null);
  const [failure, setFailure] = useState("");
  const [details, setDetails] = useState<FieldIssue[]>([]);
  const busy = useRef(false),
    live = useRef(true);
  const readController = useRef<AbortController | null>(null);
  const clearErrors = useCallback(() => {
    setFailure("");
    setDetails([]);
  }, []);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      readController.current?.abort();
    };
  }, []);

  function accept(value: CoaConfiguration) {
    setSaved(value);
    setBaseVersion(value.coaVersion);
    setRemote(null);
    setConflict(false);
    setFailure("");
    setDetails([]);
    onConfirmed(value);
  }
  async function compare() {
    readController.current?.abort();
    const controller = new AbortController();
    readController.current = controller;
    setReading(true);
    setConflict(true);
    setRemote(null);
    try {
      const latest = await getCoa(id, controller.signal);
      if (live.current && !controller.signal.aborted) {
        setRemote(latest);
        setSaved(latest);
        onConfirmed(latest);
      }
    } catch (error) {
      if (live.current && !controller.signal.aborted)
        setFailure(`Não foi possível consultar a versão publicada. ${errorMessage(error)}`);
    } finally {
      if (live.current && !controller.signal.aborted) setReading(false);
    }
  }
  async function publish(bands: CoaBand[]) {
    if (busy.current || conflict || reading) return null;
    busy.current = true;
    setPending(true);
    setFailure("");
    setDetails([]);
    try {
      const result = await replaceCoa(id, { expectedCoaVersion: baseVersion, bands });
      if (!live.current) return null;
      accept(result);
      return result;
    } catch (error) {
      if (!live.current) return null;
      setFailure(errorMessage(error));
      if (error instanceof ApiError && error.status === 400) setDetails(error.details);
      // A failed response may follow a committed transaction. Read; never replay it.
      if (isUncertainOutcome(error) || (error instanceof ApiError && error.status === 409)) await compare();
      return null;
    } finally {
      busy.current = false;
      if (live.current) setPending(false);
    }
  }
  /** Keep the local draft over the newer saved ladder: it is rebased on that version, then published explicitly. */
  function keepDraft() {
    if (!remote || pending || reading) return;
    setBaseVersion(remote.coaVersion);
    setConflict(false);
    setRemote(null);
    setFailure("");
    setDetails([]);
  }
  async function discard() {
    if (busy.current || reading) return null;
    busy.current = true;
    setPending(true);
    setFailure("");
    try {
      const result = await getCoa(id);
      if (!live.current) return null;
      accept(result);
      return result;
    } catch (error) {
      if (live.current) setFailure(errorMessage(error));
      return null;
    } finally {
      busy.current = false;
      if (live.current) setPending(false);
    }
  }
  return {
    saved,
    baseVersion,
    pending,
    reading,
    conflict,
    remote,
    failure,
    details,
    publish,
    compare,
    keepDraft,
    accept,
    discard,
    clearErrors,
  };
}
