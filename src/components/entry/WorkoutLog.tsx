"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MUSCLE_GROUPS = ["chest","back","legs","shoulders","arms","core","cardio"] as const;
type MuscleGroup = typeof MUSCLE_GROUPS[number];

interface WorkoutSet {
  id: string;
  exercise: string;
  muscle_group: string | null;
  sets: number | null;
  reps: number | null;
  weight: number | null;
}

interface Props {
  userId: string;
  selectedDate: string;
}

const BLANK_FORM = {
  exercise: "",
  muscle_group: "" as MuscleGroup | "",
  sets: "",
  reps: "",
  weight: "",
};

export default function WorkoutLog({ userId, selectedDate }: Props) {
  const supabase = createClient();
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const exerciseRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [setsRes, exRes] = await Promise.all([
        supabase
          .from("workouts")
          .select("id, exercise, muscle_group, sets, reps, weight")
          .eq("user_id", userId)
          .eq("date", selectedDate)
          .order("created_at"),
        supabase
          .from("workouts")
          .select("exercise")
          .eq("user_id", userId)
          .order("exercise"),
      ]);
      setSets(setsRes.data ?? []);
      const unique = Array.from(new Set((exRes.data ?? []).map((r) => r.exercise)));
      setExercises(unique);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedDate]);

  async function handleAdd() {
    if (!form.exercise.trim()) return;
    setAdding(true);
    const { data } = await supabase
      .from("workouts")
      .insert({
        user_id: userId,
        date: selectedDate,
        exercise: form.exercise.trim(),
        muscle_group: form.muscle_group || null,
        sets: form.sets ? Number(form.sets) : null,
        reps: form.reps ? Number(form.reps) : null,
        weight: form.weight ? Number(form.weight) : null,
      })
      .select("id, exercise, muscle_group, sets, reps, weight")
      .single();

    if (data) {
      setSets((prev) => [...prev, data]);
      if (!exercises.includes(form.exercise.trim())) {
        setExercises((prev) => [...prev, form.exercise.trim()].sort());
      }
    }
    setForm(BLANK_FORM);
    setAdding(false);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("workouts").delete().eq("id", id);
    setSets((prev) => prev.filter((s) => s.id !== id));
  }

  const grouped = sets.reduce<Record<string, WorkoutSet[]>>((acc, s) => {
    const key = s.exercise;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  if (loading) return <div className="h-12 bg-ink/5 rounded-lg animate-pulse" />;

  return (
    <div>
      {Object.keys(grouped).length > 0 && (
        <div className="space-y-3 mb-4">
          {Object.entries(grouped).map(([exercise, entries]) => (
            <div key={exercise} className="border border-ink/10 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-ink/4 flex items-center justify-between">
                <span className="font-sans text-sm font-medium text-ink">{exercise}</span>
                {entries[0].muscle_group && (
                  <span className="font-sans text-xs text-ink-light capitalize px-2 py-0.5 bg-ink/6 rounded-full">
                    {entries[0].muscle_group}
                  </span>
                )}
              </div>
              <div className="divide-y divide-ink/6">
                {entries.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2">
                    <span className="font-sans text-xs text-ink-light">Set {i + 1}</span>
                    <div className="flex items-center gap-4">
                      {s.sets != null && (
                        <span className="font-sans text-sm text-ink">
                          {s.sets} × {s.reps ?? "?"} {s.weight != null ? `@ ${s.weight}kg` : ""}
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="font-sans text-xs text-ink-light hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="border border-ink/15 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                ref={exerciseRef}
                list="exercise-list"
                value={form.exercise}
                onChange={(e) => setForm((f) => ({ ...f, exercise: e.target.value }))}
                placeholder="Exercise name"
                className="w-full bg-paper-dark border border-ink/15 rounded px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
              />
              <datalist id="exercise-list">
                {exercises.map((ex) => <option key={ex} value={ex} />)}
              </datalist>
            </div>
            <select
              value={form.muscle_group}
              onChange={(e) => setForm((f) => ({ ...f, muscle_group: e.target.value as MuscleGroup | "" }))}
              className="bg-paper-dark border border-ink/15 rounded px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
            >
              <option value="">Muscle group</option>
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g} className="capitalize">{g}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <input
              type="number"
              min={1}
              value={form.sets}
              onChange={(e) => setForm((f) => ({ ...f, sets: e.target.value }))}
              placeholder="Sets"
              className="w-full bg-paper-dark border border-ink/15 rounded px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
            />
            <input
              type="number"
              min={1}
              value={form.reps}
              onChange={(e) => setForm((f) => ({ ...f, reps: e.target.value }))}
              placeholder="Reps"
              className="w-full bg-paper-dark border border-ink/15 rounded px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
            />
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              placeholder="Weight (kg)"
              className="w-full bg-paper-dark border border-ink/15 rounded px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowForm(false); setForm(BLANK_FORM); }}
              className="font-sans text-sm text-ink-light hover:text-ink px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !form.exercise.trim()}
              className="font-sans text-sm bg-forest text-paper px-4 py-1.5 rounded-lg hover:bg-forest-dark transition-colors disabled:opacity-40"
            >
              {adding ? "Adding…" : "Add set"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setShowForm(true); setTimeout(() => exerciseRef.current?.focus(), 50); }}
          className="font-sans text-sm text-forest hover:text-forest-dark transition-colors"
        >
          + Log a set
        </button>
      )}
    </div>
  );
}
