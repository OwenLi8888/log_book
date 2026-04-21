"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import HabitCheckin from "@/components/entry/HabitCheckin";
import WorkoutLog from "@/components/entry/WorkoutLog";
import NutritionLog from "@/components/entry/NutritionLog";
import SleepLog from "@/components/entry/SleepLog";
import MediaUpload from "@/components/entry/MediaUpload";

const THUMB_DIAMETER = 18; // px — must match .mood-slider thumb width in globals.css

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function formatDisplayDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EntryForm({ userId, initialDate }: { userId: string; initialDate?: string }) {
  const supabase = createClient();

  const [selectedDate, setSelectedDate] = useState(initialDate ?? todayISO());
  const [highlight, setHighlight] = useState("");
  const [lowlight, setLowlight] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  // Load entry for selected date
  useEffect(() => {
    async function loadEntry() {
      setLoading(true);
      const { data } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", userId)
        .eq("date", selectedDate)
        .is("deleted_at", null)
        .maybeSingle();

      if (data) {
        setHighlight(data.highlight ?? "");
        setLowlight(data.lowlight ?? "");
        setMood(data.mood ?? null);
        setNotes(data.notes ?? "");
      } else {
        setHighlight("");
        setLowlight("");
        setMood(null);
        setNotes("");
      }
      setLoading(false);
    }

    loadEntry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, userId]);

  const doSave = useCallback(async () => {
    const payload = {
      user_id: userId,
      date: selectedDate,
      highlight: highlight || null,
      lowlight: lowlight || null,
      mood: mood,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("entries")
      .upsert(payload, { onConflict: "user_id,date" });
  }, [supabase, userId, selectedDate, highlight, lowlight, mood, notes]);

  const { markDirty, save, status } = useAutoSave(doSave, 30_000);

  function handleChange(
    setter: (v: string) => void,
    maxLen?: number
  ) {
    return (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const val = maxLen ? e.target.value.slice(0, maxLen) : e.target.value;
      setter(val);
      markDirty();
    };
  }

  function handleMoodChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMood(parseInt(e.target.value, 10));
    markDirty();
  }

  const saveStatusLabel: Record<typeof status, string> = {
    saved: "Saved",
    saving: "Saving…",
    unsaved: "Unsaved",
    error: "Save failed",
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Date picker row */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h2 className="font-serif text-3xl font-medium text-navy">
            {formatDisplayDate(selectedDate)}
          </h2>
          <p className="font-sans text-sm text-ink-light mt-1">
            {selectedDate === todayISO() ? "Today" : "Past entry"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Save status */}
          {!loading && (
            <span className={`status-dot ${status} font-sans text-xs text-ink-light`}>
              {saveStatusLabel[status]}
            </span>
          )}

          {/* Date input */}
          <input
            type="date"
            value={selectedDate}
            min="2025-01-01"
            max={todayISO()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="font-sans text-sm text-ink bg-paper-dark border border-ink/15 rounded px-3 py-1.5 focus:outline-none focus:border-forest cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-8 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-ink/8 rounded" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Highlight */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <label className="font-serif text-xl text-navy">
                Highlight of the Day
              </label>
              <span className="font-sans text-xs text-ink-light">
                {highlight.length}/500
              </span>
            </div>
            <p className="font-sans text-xs text-ink-light mb-3 italic">
              What was the best part of today?
            </p>
            <textarea
              value={highlight}
              onChange={handleChange(setHighlight, 500)}
              onBlur={save}
              placeholder="Write your highlight here…"
              rows={4}
              className="journal-field journal-lines w-full leading-8 resize-none"
            />
          </section>

          {/* Lowlight */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <label className="font-serif text-xl text-navy">
                Lowlight of the Day
              </label>
              <span className="font-sans text-xs text-ink-light">
                {lowlight.length}/500
              </span>
            </div>
            <p className="font-sans text-xs text-ink-light mb-3 italic">
              What was challenging or didn&apos;t go as planned?
            </p>
            <textarea
              value={lowlight}
              onChange={handleChange(setLowlight, 500)}
              onBlur={save}
              placeholder="Write your lowlight here…"
              rows={4}
              className="journal-field journal-lines w-full leading-8 resize-none"
            />
          </section>

          {/* Mood */}
          <section>
            <label className="font-serif text-xl text-navy block mb-5">
              How are you feeling?
            </label>
            <div className="space-y-2">
              {/* Value bubble tracks thumb */}
              <div className="relative h-6 select-none pointer-events-none">
                {mood != null && (
                  <span
                    className="absolute -translate-x-1/2 font-serif text-base font-medium text-forest"
                    style={{
                      left: `calc(${((mood - 1) / 99) * 100}% + ${(0.5 - (mood - 1) / 99) * THUMB_DIAMETER}px)`,
                    }}
                  >
                    {mood}
                  </span>
                )}
              </div>

              {/* Slider */}
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={mood ?? 50}
                onChange={handleMoodChange}
                onBlur={save}
                className="mood-slider"
              />

              {/* End labels */}
              <div className="flex justify-between">
                <span className="font-sans text-xs text-ink-light">Rough</span>
                <span className="font-sans text-xs text-ink-light">Great</span>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <label className="font-serif text-xl text-navy block mb-3">
              Notes
            </label>
            <p className="font-sans text-xs text-ink-light mb-3 italic">
              Anything else worth capturing — thoughts, ideas, gratitude…
            </p>
            <textarea
              value={notes}
              onChange={handleChange(setNotes)}
              onBlur={save}
              placeholder="Free write here…"
              rows={8}
              className="journal-field journal-lines w-full leading-8 resize-none"
            />
          </section>

          {/* Habit check-in */}
          <section>
            <label className="font-serif text-xl text-navy block mb-4">
              Habits
            </label>
            <HabitCheckin userId={userId} selectedDate={selectedDate} />
          </section>

          {/* Workout */}
          <section>
            <label className="font-serif text-xl text-navy block mb-4">
              Workouts
            </label>
            <WorkoutLog userId={userId} selectedDate={selectedDate} />
          </section>

          {/* Nutrition */}
          <section>
            <label className="font-serif text-xl text-navy block mb-4">
              Nutrition
            </label>
            <NutritionLog userId={userId} selectedDate={selectedDate} />
          </section>

          {/* Sleep */}
          <section>
            <label className="font-serif text-xl text-navy block mb-4">
              Sleep
            </label>
            <SleepLog userId={userId} selectedDate={selectedDate} />
          </section>

          {/* Media */}
          <section>
            <label className="font-serif text-xl text-navy block mb-4">
              Photos & Videos
            </label>
            <MediaUpload userId={userId} selectedDate={selectedDate} />
          </section>

          {/* Manual save button */}
          <div className="flex justify-end pt-4 border-t border-ink/10">
            <button
              type="button"
              onClick={save}
              disabled={status === "saving" || status === "saved"}
              className="font-sans text-sm text-forest hover:text-forest-dark font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === "saving" ? "Saving…" : status === "saved" ? "All saved" : "Save entry"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
