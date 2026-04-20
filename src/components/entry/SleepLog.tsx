"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAutoSave } from "@/lib/hooks/useAutoSave";

interface Props {
  userId: string;
  selectedDate: string;
}

export default function SleepLog({ userId, selectedDate }: Props) {
  const supabase = createClient();
  const [hours, setHours] = useState<number | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("sleep")
        .select("hours, quality")
        .eq("user_id", userId)
        .eq("date", selectedDate)
        .maybeSingle();
      setHours(data?.hours ?? null);
      setQuality(data?.quality ?? null);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedDate]);

  const doSave = useCallback(async () => {
    if (hours == null) return;
    await supabase.from("sleep").upsert(
      {
        user_id: userId,
        date: selectedDate,
        hours,
        quality,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );
  }, [supabase, userId, selectedDate, hours, quality]);

  const { markDirty, save } = useAutoSave(doSave, 3_000);

  function handleHours(e: React.ChangeEvent<HTMLInputElement>) {
    setHours(Number(e.target.value));
    markDirty();
  }

  function handleQuality(v: number) {
    setQuality((prev) => (prev === v ? null : v));
    markDirty();
    setTimeout(save, 100);
  }

  if (loading) return <div className="h-16 bg-ink/5 rounded-lg animate-pulse" />;

  return (
    <div className="flex flex-wrap items-end gap-8">
      {/* Hours slider */}
      <div className="flex-1 min-w-48">
        <div className="flex items-baseline justify-between mb-2">
          <label className="font-sans text-xs text-ink-light">Hours slept</label>
          <span className="font-serif text-lg text-navy">
            {hours != null ? `${hours}h` : "—"}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={24}
          step={0.5}
          value={hours ?? 0}
          onChange={handleHours}
          onMouseUp={save}
          onTouchEnd={save}
          className="w-full accent-forest cursor-pointer"
        />
        <div className="flex justify-between font-sans text-xs text-ink-light mt-1">
          <span>0h</span>
          <span>8h</span>
          <span>16h</span>
          <span>24h</span>
        </div>
      </div>

      {/* Quality */}
      <div>
        <label className="font-sans text-xs text-ink-light block mb-2">Quality</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => handleQuality(v)}
              className={`text-xl transition-all ${
                quality != null && v <= quality ? "opacity-100" : "opacity-25 hover:opacity-60"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
