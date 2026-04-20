import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export function useAutoSave(
  saveFn: () => Promise<void>,
  intervalMs: number = 30_000
) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const isDirty = useRef(false);
  const saveFnRef = useRef(saveFn);

  // Keep ref current so interval closure doesn't stale
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  const markDirty = useCallback(() => {
    isDirty.current = true;
    setStatus("unsaved");
  }, []);

  const save = useCallback(async () => {
    if (!isDirty.current) return;
    setStatus("saving");
    try {
      await saveFnRef.current();
      isDirty.current = false;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  // Periodic auto-save
  useEffect(() => {
    const id = setInterval(() => {
      if (isDirty.current) save();
    }, intervalMs);
    return () => clearInterval(id);
  }, [save, intervalMs]);

  return { markDirty, save, status };
}
