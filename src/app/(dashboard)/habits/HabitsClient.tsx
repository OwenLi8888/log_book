"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import HabitGrid from "@/components/habits/HabitGrid";

const COLORS = [
  "#4a7c59", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316",
];
const ICONS = ["✓", "★", "♦", "●", "▲", "♥", "⚡", "🔥", "💪", "🧘", "📚", "🏃"];

interface Habit {
  id: string;
  name: string;
  category: string | null;
  color: string;
  icon: string | null;
  archived: boolean;
  sort_order: number;
}

interface HabitWithStats extends Habit {
  completedDates: Set<string>;
  currentStreak: number;
  longestStreak: number;
}

function computeStreaks(dates: Set<string>): { current: number; longest: number } {
  if (dates.size === 0) return { current: 0, longest: 0 };

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let current = 0;
  let longest = 0;
  let run = 0;
  let prevDate: string | null = null;

  // Current streak
  let cursor = today;
  for (let i = 0; i < 400; i++) {
    if (dates.has(cursor)) {
      current++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().split("T")[0];
    } else if (cursor === today && dates.has(yesterday)) {
      const d = new Date(yesterday);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().split("T")[0];
      current++;
    } else {
      break;
    }
  }

  // Longest streak
  const allSorted = Array.from(dates).sort();
  for (const date of allSorted) {
    if (!prevDate) {
      run = 1;
    } else {
      const prev = new Date(prevDate);
      prev.setDate(prev.getDate() + 1);
      const expected = prev.toISOString().split("T")[0];
      run = expected === date ? run + 1 : 1;
    }
    if (run > longest) longest = run;
    prevDate = date;
  }

  return { current, longest };
}

const BLANK: Partial<Habit> = { name: "", category: "", color: "#4a7c59", icon: "✓", archived: false };

export default function HabitsClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; editing: Habit | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Partial<Habit>>(BLANK);
  const [saving, setSaving] = useState(false);

  const loadHabits = useCallback(async () => {
    setLoading(true);
    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order");

    if (!habitsData) { setLoading(false); return; }

    // Fetch all habit logs from app start date so year navigation works
    const { data: logs } = await supabase
      .from("habit_logs")
      .select("habit_id, date, completed")
      .eq("user_id", userId)
      .gte("date", "2025-01-01")
      .eq("completed", true);

    const logsByHabit: Record<string, Set<string>> = {};
    for (const log of logs ?? []) {
      if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = new Set();
      logsByHabit[log.habit_id].add(log.date);
    }

    const withStats: HabitWithStats[] = habitsData.map((h) => {
      const completed = logsByHabit[h.id] ?? new Set<string>();
      const { current, longest } = computeStreaks(completed);
      return { ...h, completedDates: completed, currentStreak: current, longestStreak: longest };
    });

    setHabits(withStats);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => { loadHabits(); }, [loadHabits]);

  function openCreate() {
    setForm({ ...BLANK });
    setModal({ open: true, editing: null });
  }

  function openEdit(h: Habit) {
    setForm({ name: h.name, category: h.category ?? "", color: h.color, icon: h.icon ?? "✓", archived: h.archived });
    setModal({ open: true, editing: h });
  }

  async function handleSave() {
    if (!form.name?.trim()) return;
    setSaving(true);
    if (modal.editing) {
      await supabase.from("habits").update({
        name: form.name,
        category: form.category || null,
        color: form.color,
        icon: form.icon,
      }).eq("id", modal.editing.id);
    } else {
      await supabase.from("habits").insert({
        user_id: userId,
        name: form.name!,
        category: form.category || null,
        color: form.color ?? "#4a7c59",
        icon: form.icon ?? "✓",
        sort_order: habits.length,
      });
    }
    setSaving(false);
    setModal({ open: false, editing: null });
    loadHabits();
  }

  async function handleArchive(h: Habit) {
    await supabase.from("habits").update({ archived: !h.archived }).eq("id", h.id);
    loadHabits();
  }

  const visible = habits.filter((h) => showArchived || !h.archived);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-navy">Habits</h2>
          <p className="font-sans text-sm text-ink-light mt-1">Track your daily rituals</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="font-sans text-sm text-ink-light hover:text-ink transition-colors"
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          <button
            onClick={openCreate}
            className="font-sans text-sm bg-forest text-paper px-4 py-2 rounded-lg hover:bg-forest-dark transition-colors"
          >
            + New habit
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-ink/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-serif text-2xl text-navy/40 mb-2">No habits yet</p>
          <p className="font-sans text-sm text-ink-light">Create your first habit to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {visible.map((h) => (
            <div
              key={h.id}
              className={`border border-ink/10 rounded-xl p-5 ${h.archived ? "opacity-50" : ""}`}
              style={{ borderLeftColor: h.color, borderLeftWidth: 3 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{h.icon}</span>
                  <div>
                    <h3 className="font-serif text-lg text-navy">{h.name}</h3>
                    {h.category && (
                      <span className="font-sans text-xs text-ink-light">{h.category}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-6 text-center">
                    <div>
                      <div className="font-serif text-2xl font-medium" style={{ color: h.color }}>
                        {h.currentStreak}
                      </div>
                      <div className="font-sans text-xs text-ink-light">current</div>
                    </div>
                    <div>
                      <div className="font-serif text-2xl font-medium text-navy">
                        {h.longestStreak}
                      </div>
                      <div className="font-sans text-xs text-ink-light">longest</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(h)}
                      className="font-sans text-xs text-ink-light hover:text-ink transition-colors px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleArchive(h)}
                      className="font-sans text-xs text-ink-light hover:text-ink transition-colors px-2 py-1"
                    >
                      {h.archived ? "Unarchive" : "Archive"}
                    </button>
                  </div>
                </div>
              </div>
              <HabitGrid color={h.color} completedDates={h.completedDates} />
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper rounded-xl shadow-paper-lg border border-ink/10 p-6 w-full max-w-md">
            <h3 className="font-serif text-xl text-navy mb-5">
              {modal.editing ? "Edit habit" : "New habit"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">
                  Name *
                </label>
                <input
                  autoFocus
                  value={form.name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
                  placeholder="Morning run, Journaling…"
                />
              </div>
              <div>
                <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">
                  Category
                </label>
                <input
                  value={form.category ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
                  placeholder="Health, Mindfulness, Learning…"
                />
              </div>
              <div>
                <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                      className={`w-9 h-9 rounded-lg border-2 text-base transition-all ${
                        form.icon === ic
                          ? "border-forest bg-forest/10"
                          : "border-ink/15 hover:border-ink/30"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        form.color === c ? "border-navy scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModal({ open: false, editing: null })}
                className="font-sans text-sm text-ink-light hover:text-ink px-4 py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name?.trim()}
                className="font-sans text-sm bg-forest text-paper px-5 py-2 rounded-lg hover:bg-forest-dark transition-colors disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
