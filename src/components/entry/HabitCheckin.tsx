"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Habit {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  category: string | null;
}

interface Props {
  userId: string;
  selectedDate: string;
}

export default function HabitCheckin({ userId, selectedDate }: Props) {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [habitsRes, logsRes] = await Promise.all([
        supabase
          .from("habits")
          .select("id, name, color, icon, category")
          .eq("user_id", userId)
          .eq("archived", false)
          .order("sort_order"),
        supabase
          .from("habit_logs")
          .select("habit_id, completed")
          .eq("user_id", userId)
          .eq("date", selectedDate),
      ]);

      setHabits(habitsRes.data ?? []);
      const done = new Set<string>();
      for (const log of logsRes.data ?? []) {
        if (log.completed) done.add(log.habit_id);
      }
      setCompleted(done);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedDate]);

  async function toggle(habitId: string) {
    const isCompleted = completed.has(habitId);
    const next = new Set(completed);
    if (isCompleted) {
      next.delete(habitId);
    } else {
      next.add(habitId);
    }
    setCompleted(next);

    await supabase.from("habit_logs").upsert(
      { habit_id: habitId, user_id: userId, date: selectedDate, completed: !isCompleted },
      { onConflict: "habit_id,date" }
    );
  }

  if (loading) return <div className="h-16 bg-ink/5 rounded-lg animate-pulse" />;
  if (habits.length === 0) return (
    <p className="font-sans text-sm text-ink-light italic">
      No habits yet —{" "}
      <a href="/habits" className="text-forest hover:underline">create some</a>.
    </p>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {habits.map((h) => {
        const done = completed.has(h.id);
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => toggle(h.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 font-sans text-sm transition-all duration-150 select-none"
            style={{
              borderColor: done ? h.color : "rgba(74,64,53,0.15)",
              backgroundColor: done ? `${h.color}18` : "transparent",
              color: done ? h.color : "var(--ink-light)",
            }}
          >
            <span>{h.icon ?? "✓"}</span>
            <span>{h.name}</span>
            {done && <span className="opacity-70">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
