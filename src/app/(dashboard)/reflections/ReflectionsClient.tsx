"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReflectionType = "weekly" | "monthly";

interface Reflection {
  id: string;
  type: ReflectionType;
  date: string;
  content: Record<string, string>;
  auto_stats: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

function sundayOfWeek(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatWeekRange(sundayISO: string) {
  const [y, m, d] = sundayISO.split("-").map(Number);
  const sun = new Date(y, m - 1, d);
  const sat = new Date(sun);
  sat.setDate(sat.getDate() + 6);
  return `${sun.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sat.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatMonthYear(firstISO: string) {
  const [y, m] = firstISO.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const WEEKLY_PROMPTS: { key: string; label: string; placeholder: string }[] = [
  { key: "went_well", label: "What went well this week?", placeholder: "Moments of progress, wins, things that flowed…" },
  { key: "didnt_go_well", label: "What didn't go well?", placeholder: "Challenges, friction, missed intentions…" },
  { key: "focus_next_week", label: "What's your focus next week?", placeholder: "One theme or intention to carry forward…" },
];

const MONTHLY_PROMPTS: { key: string; label: string; placeholder: string }[] = [
  { key: "biggest_win", label: "Biggest win this month?", placeholder: "Something you're proud of…" },
  { key: "biggest_lesson", label: "Biggest lesson learned?", placeholder: "What did this month teach you?…" },
  { key: "habit_trend_notes", label: "How did your habits trend?", placeholder: "Patterns you noticed, what held, what slipped…" },
];

function StatsPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-forest/8 border border-forest/20 rounded-lg px-3 py-1.5">
      <span className="font-sans text-xs text-forest font-medium">{label}</span>
      <span className="font-sans text-xs text-ink font-semibold">{value}</span>
    </div>
  );
}

export default function ReflectionsClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState<ReflectionType>("weekly");
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEditor, setActiveEditor] = useState<{ type: ReflectionType; date: string } | null>(null);
  const [editorContent, setEditorContent] = useState<Record<string, string>>({});
  const [autoStats, setAutoStats] = useState<Record<string, number> | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewReflection, setViewReflection] = useState<Reflection | null>(null);

  const loadReflections = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reflections")
      .select("*")
      .eq("user_id", userId)
      .eq("type", tab)
      .order("date", { ascending: false });
    setReflections((data ?? []) as Reflection[]);
    setLoading(false);
  }, [supabase, userId, tab]);

  useEffect(() => {
    loadReflections();
    setActiveEditor(null);
    setViewReflection(null);
  }, [loadReflections]);

  async function computeWeeklyStats(sundayISO: string): Promise<Record<string, number>> {
    const [y, m, d] = sundayISO.split("-").map(Number);
    const sun = new Date(y, m - 1, d);
    const dates: string[] = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(sun);
      day.setDate(day.getDate() + i);
      return day.toISOString().split("T")[0];
    });
    const sat = dates[6];

    const { data: habits } = await supabase
      .from("habits")
      .select("id")
      .eq("user_id", userId)
      .eq("archived", false);

    if (!habits || habits.length === 0) return { habit_completion_rate: 0 };

    const { data: logs } = await supabase
      .from("habit_logs")
      .select("habit_id, date")
      .eq("user_id", userId)
      .eq("completed", true)
      .gte("date", sundayISO)
      .lte("date", sat);

    const possible = habits.length * 7;
    const done = (logs ?? []).length;
    return { habit_completion_rate: possible > 0 ? Math.round((done / possible) * 100) : 0 };
  }

  async function computeMonthlyStats(firstISO: string): Promise<Record<string, number>> {
    const [y, m] = firstISO.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const lastISO = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const [habitsRes, logsRes, sleepRes, nutritionRes] = await Promise.all([
      supabase.from("habits").select("id").eq("user_id", userId).eq("archived", false),
      supabase.from("habit_logs").select("id").eq("user_id", userId).eq("completed", true).gte("date", firstISO).lte("date", lastISO),
      supabase.from("sleep").select("hours").eq("user_id", userId).gte("date", firstISO).lte("date", lastISO).not("hours", "is", null),
      supabase.from("nutrition").select("calories").eq("user_id", userId).gte("date", firstISO).lte("date", lastISO).not("calories", "is", null),
    ]);

    const habitCount = (habitsRes.data ?? []).length;
    const logCount = (logsRes.data ?? []).length;
    const possible = habitCount * lastDay;
    const habitRate = possible > 0 ? Math.round((logCount / possible) * 100) : 0;

    const sleepArr = (sleepRes.data ?? []).map((r) => r.hours ?? 0);
    const avgSleep = sleepArr.length
      ? Math.round((sleepArr.reduce((s, v) => s + v, 0) / sleepArr.length) * 10) / 10
      : 0;

    const calArr = (nutritionRes.data ?? []).map((r) => r.calories ?? 0);
    const avgCal = calArr.length
      ? Math.round(calArr.reduce((s, v) => s + v, 0) / calArr.length)
      : 0;

    return { habit_completion_rate: habitRate, avg_sleep: avgSleep, avg_calories: avgCal };
  }

  async function openNewEditor(type: ReflectionType) {
    const date = type === "weekly" ? sundayOfWeek(new Date()) : firstOfMonth();

    // Check for existing
    const { data: existing } = await supabase
      .from("reflections")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("date", date)
      .maybeSingle();

    if (existing) {
      setEditorContent(existing.content as Record<string, string>);
      setAutoStats(existing.auto_stats as Record<string, number> | null);
    } else {
      setEditorContent({});
      const stats =
        type === "weekly"
          ? await computeWeeklyStats(date)
          : await computeMonthlyStats(date);
      setAutoStats(stats);
    }

    setActiveEditor({ type, date });
  }

  async function handleSave() {
    if (!activeEditor) return;
    setSaving(true);

    await supabase.from("reflections").upsert({
      user_id: userId,
      type: activeEditor.type,
      date: activeEditor.date,
      content: editorContent,
      auto_stats: autoStats,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,type,date" });

    setSaving(false);
    setActiveEditor(null);
    loadReflections();
  }

  const prompts = tab === "weekly" ? WEEKLY_PROMPTS : MONTHLY_PROMPTS;

  // Date label for the new reflection button
  const newDate = tab === "weekly" ? sundayOfWeek(new Date()) : firstOfMonth();
  const newLabel = tab === "weekly" ? formatWeekRange(newDate) : formatMonthYear(newDate);
  const alreadyExists = reflections.some((r) => r.date === newDate);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-medium text-navy">Reflections</h2>
        <p className="font-sans text-sm text-ink-light mt-1">Review your journey, learn from your patterns</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-ink/5 rounded-lg p-1 w-fit">
        {(["weekly", "monthly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-sans text-sm px-4 py-1.5 rounded-md capitalize transition-all ${
              tab === t ? "bg-paper text-navy font-medium shadow-sm" : "text-ink-light hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* New reflection CTA */}
      {!alreadyExists && !activeEditor && (
        <div className="border border-forest/30 bg-forest/5 rounded-xl p-5 mb-8 flex items-center justify-between">
          <div>
            <p className="font-serif text-lg text-navy">
              {tab === "weekly" ? "Weekly Reflection" : "Monthly Reflection"}
            </p>
            <p className="font-sans text-sm text-ink-light mt-0.5">{newLabel}</p>
          </div>
          <button
            onClick={() => openNewEditor(tab)}
            className="font-sans text-sm bg-forest text-paper px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shrink-0"
          >
            Write now →
          </button>
        </div>
      )}

      {/* Editor */}
      {activeEditor && (
        <div className="border border-ink/15 rounded-xl p-6 mb-8 bg-paper">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-serif text-xl text-navy capitalize">
                {activeEditor.type === "weekly" ? "Weekly" : "Monthly"} Reflection
              </h3>
              <p className="font-sans text-sm text-ink-light mt-0.5">
                {activeEditor.type === "weekly"
                  ? formatWeekRange(activeEditor.date)
                  : formatMonthYear(activeEditor.date)}
              </p>
            </div>
            <button
              onClick={() => setActiveEditor(null)}
              className="font-sans text-sm text-ink-light hover:text-ink"
            >
              ✕
            </button>
          </div>

          {/* Auto stats */}
          {autoStats && (
            <div className="flex flex-wrap gap-2 mb-6">
              {autoStats.habit_completion_rate !== undefined && (
                <StatsPill label="Habit rate" value={`${autoStats.habit_completion_rate}%`} />
              )}
              {autoStats.avg_sleep !== undefined && autoStats.avg_sleep > 0 && (
                <StatsPill label="Avg sleep" value={`${autoStats.avg_sleep}h`} />
              )}
              {autoStats.avg_calories !== undefined && autoStats.avg_calories > 0 && (
                <StatsPill label="Avg calories" value={`${autoStats.avg_calories} kcal`} />
              )}
            </div>
          )}

          {/* Structured prompts */}
          <div className="space-y-5 mb-6">
            {prompts.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="font-serif text-base text-navy block mb-2">{label}</label>
                <textarea
                  value={editorContent[key] ?? ""}
                  onChange={(e) => setEditorContent((c) => ({ ...c, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={3}
                  className="journal-field journal-lines w-full leading-8 resize-none"
                />
              </div>
            ))}
          </div>

          {/* Free write */}
          <div className="mb-6">
            <label className="font-serif text-base text-navy block mb-2">Free write</label>
            <textarea
              value={editorContent["free_write"] ?? ""}
              onChange={(e) => setEditorContent((c) => ({ ...c, free_write: e.target.value }))}
              placeholder="Anything else on your mind — stream of consciousness, gratitude, ideas…"
              rows={5}
              className="journal-field journal-lines w-full leading-8 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="font-sans text-sm bg-forest text-paper px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? "Saving…" : "Save reflection"}
            </button>
          </div>
        </div>
      )}

      {/* Past reflections list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-ink/5 rounded-xl animate-pulse" />)}
        </div>
      ) : reflections.length === 0 ? (
        !activeEditor && (
          <div className="text-center py-16">
            <p className="font-serif text-xl text-navy/40">No {tab} reflections yet</p>
            <p className="font-sans text-sm text-ink-light mt-1">Your reflections will appear here.</p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <h3 className="font-serif text-lg text-navy mb-2">Past reflections</h3>
          {reflections.map((r) => {
            const label =
              r.type === "weekly" ? formatWeekRange(r.date) : formatMonthYear(r.date);
            const preview =
              r.content?.went_well ||
              r.content?.biggest_win ||
              r.content?.free_write ||
              "";
            return (
              <div
                key={r.id}
                className="border border-ink/10 rounded-xl p-4 cursor-pointer hover:border-ink/20 transition-colors"
                onClick={() => setViewReflection(viewReflection?.id === r.id ? null : r)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-sans text-sm font-medium text-ink">{label}</p>
                    {preview && (
                      <p className="font-sans text-xs text-ink-light mt-0.5 line-clamp-1">
                        {preview.slice(0, 100)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditorContent(r.content ?? {});
                        setAutoStats(r.auto_stats as Record<string, number> | null);
                        setActiveEditor({ type: r.type, date: r.date });
                        setViewReflection(null);
                      }}
                      className="font-sans text-xs text-ink-light hover:text-ink"
                    >
                      Edit
                    </button>
                    <span className="text-ink-light text-xs">{viewReflection?.id === r.id ? "▴" : "▾"}</span>
                  </div>
                </div>

                {viewReflection?.id === r.id && (
                  <div className="mt-4 pt-4 border-t border-ink/8 space-y-4">
                    {r.auto_stats && (
                      <div className="flex flex-wrap gap-2">
                        {r.auto_stats.habit_completion_rate !== undefined && (
                          <StatsPill label="Habit rate" value={`${r.auto_stats.habit_completion_rate}%`} />
                        )}
                        {r.auto_stats.avg_sleep !== undefined && Number(r.auto_stats.avg_sleep) > 0 && (
                          <StatsPill label="Avg sleep" value={`${r.auto_stats.avg_sleep}h`} />
                        )}
                        {r.auto_stats.avg_calories !== undefined && Number(r.auto_stats.avg_calories) > 0 && (
                          <StatsPill label="Avg calories" value={`${r.auto_stats.avg_calories} kcal`} />
                        )}
                      </div>
                    )}
                    {prompts.map(({ key, label: lbl }) =>
                      r.content?.[key] ? (
                        <div key={key}>
                          <p className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1">{lbl}</p>
                          <p className="font-sans text-sm text-ink whitespace-pre-wrap">{r.content[key]}</p>
                        </div>
                      ) : null
                    )}
                    {r.content?.free_write && (
                      <div>
                        <p className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1">Free write</p>
                        <p className="font-sans text-sm text-ink whitespace-pre-wrap">{r.content.free_write}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
