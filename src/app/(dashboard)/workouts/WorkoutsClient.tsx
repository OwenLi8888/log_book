"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

type Range = "30d" | "90d" | "all";

interface WorkoutRow {
  date: string;
  weight: number | null;
  sets: number | null;
  reps: number | null;
}

interface ChartPoint {
  date: string;
  weight: number;
}


export default function WorkoutsClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [exercises, setExercises] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [range, setRange] = useState<Range>("90d");
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Load distinct exercises on mount
  useEffect(() => {
    async function loadExercises() {
      const { data: rows } = await supabase
        .from("workouts")
        .select("exercise")
        .eq("user_id", userId)
        .order("exercise");
      const unique = Array.from(new Set((rows ?? []).map((r) => r.exercise)));
      setExercises(unique);
      if (unique.length > 0) setSelected(unique[0]);
    }
    loadExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!selected) return;
    async function loadData() {
      setLoading(true);
      let query = supabase
        .from("workouts")
        .select("date, weight, sets, reps")
        .eq("user_id", userId)
        .eq("exercise", selected)
        .not("weight", "is", null)
        .order("date");

      if (range !== "all") {
        const days = range === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte("date", since.toISOString().split("T")[0]);
      }

      const { data: rows } = await query;
      // One point per date: max weight lifted that day
      const byDate: Record<string, number> = {};
      for (const row of (rows ?? []) as WorkoutRow[]) {
        if (row.weight != null) {
          byDate[row.date] = Math.max(byDate[row.date] ?? 0, row.weight);
        }
      }
      const points: ChartPoint[] = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, weight]) => ({ date, weight }));
      setData(points);
      setLoading(false);
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selected, range]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-medium text-navy">Workouts</h2>
        <p className="font-sans text-sm text-ink-light mt-1">Lift progression tracker</p>
      </div>

      {exercises.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-serif text-2xl text-navy/40 mb-2">No workout data yet</p>
          <p className="font-sans text-sm text-ink-light">Log sets on the Daily Entry page to see your progression.</p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="flex-1 min-w-48">
              <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">
                Exercise
              </label>
              <input
                list="ex-list"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
              />
              <datalist id="ex-list">
                {exercises.map((ex) => <option key={ex} value={ex} />)}
              </datalist>
            </div>
            <div>
              <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">
                Range
              </label>
              <div className="flex rounded-lg border border-ink/15 overflow-hidden">
                {(["30d", "90d", "all"] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-4 py-2 font-sans text-sm transition-colors ${
                      range === r
                        ? "bg-forest text-paper"
                        : "text-ink-light hover:text-ink hover:bg-ink/5"
                    }`}
                  >
                    {r === "all" ? "All time" : r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="border border-ink/10 rounded-xl p-6">
            <h3 className="font-serif text-lg text-navy mb-1">{selected}</h3>
            <p className="font-sans text-xs text-ink-light mb-6">Max weight lifted per day (kg)</p>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="font-sans text-sm text-ink-light animate-pulse">Loading…</div>
              </div>
            ) : data.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="font-sans text-sm text-ink-light">No weight data for this exercise in this range.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,64,53,0.08)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#7a6e5f", fontFamily: "var(--font-inter)" }}
                    tickFormatter={(v: string) => {
                      const [,m,d] = v.split("-");
                      return `${m}/${d}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#7a6e5f", fontFamily: "var(--font-inter)" }}
                    tickFormatter={(v: number) => `${v}kg`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#faf8f4",
                      border: "1px solid rgba(74,64,53,0.15)",
                      borderRadius: 8,
                      fontFamily: "var(--font-inter)",
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v} kg`, "Max weight"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#4a7c59"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#4a7c59" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
