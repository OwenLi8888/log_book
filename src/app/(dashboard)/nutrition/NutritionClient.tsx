"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface ChartPoint {
  date: string;
  calories: number;
}

interface Props {
  userId: string;
  calorieTarget: number;
}

type Range = "30d" | "90d" | "all";

function dotColor(val: number, target: number) {
  const ratio = val / target;
  if (ratio > 1.05) return "#ef4444";
  if (ratio >= 0.95) return "#4a7c59";
  return "#f59e0b";
}

export default function NutritionClient({ userId, calorieTarget }: Props) {
  const supabase = createClient();
  const [data, setData] = useState<ChartPoint[]>([]);
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(calorieTarget);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(calorieTarget));

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from("nutrition")
        .select("date, calories")
        .eq("user_id", userId)
        .not("calories", "is", null)
        .order("date");

      if (range !== "all") {
        const days = range === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte("date", since.toISOString().split("T")[0]);
      }

      const { data: rows } = await query;
      setData((rows ?? []).map((r) => ({ date: r.date, calories: r.calories! })));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, range]);

  async function saveTarget() {
    const val = Number(targetInput);
    if (!val || val < 500) return;
    await supabase.from("users").update({ calorie_target: val }).eq("id", userId);
    setTarget(val);
    setEditingTarget(false);
  }

  const avg7 = data.length
    ? Math.round(data.slice(-7).reduce((s, p) => s + p.calories, 0) / Math.min(data.slice(-7).length, 7))
    : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-navy">Nutrition</h2>
          <p className="font-sans text-sm text-ink-light mt-1">Calorie and macro trends</p>
        </div>
        <div className="text-right">
          {editingTarget ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="w-24 bg-paper-dark border border-ink/15 rounded px-2 py-1 font-sans text-sm text-ink focus:outline-none focus:border-forest"
              />
              <button onClick={saveTarget} className="font-sans text-sm text-forest font-medium">Save</button>
              <button onClick={() => setEditingTarget(false)} className="font-sans text-sm text-ink-light">×</button>
            </div>
          ) : (
            <button
              onClick={() => { setTargetInput(String(target)); setEditingTarget(true); }}
              className="font-sans text-sm text-ink-light hover:text-ink transition-colors"
            >
              Target: {target} kcal ✎
            </button>
          )}
          {avg7 != null && (
            <p className="font-sans text-xs text-ink-light mt-1">
              7d avg:{" "}
              <span style={{ color: dotColor(avg7, target) }} className="font-medium">
                {avg7} kcal
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Range buttons */}
      <div className="flex gap-0 mb-8 rounded-lg border border-ink/15 overflow-hidden w-fit">
        {(["30d", "90d", "all"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 font-sans text-sm transition-colors ${
              range === r ? "bg-forest text-paper" : "text-ink-light hover:text-ink hover:bg-ink/5"
            }`}
          >
            {r === "all" ? "All time" : r}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-5 mb-4">
        {[
          { color: "#4a7c59", label: "At target (±5%)" },
          { color: "#f59e0b", label: "Below target" },
          { color: "#ef4444", label: "Above target" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-sans text-xs text-ink-light">{label}</span>
          </div>
        ))}
      </div>

      <div className="border border-ink/10 rounded-xl p-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="font-sans text-sm text-ink-light animate-pulse">Loading…</div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="font-sans text-sm text-ink-light">No nutrition data yet. Log calories on the Daily Entry page.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,64,53,0.08)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#7a6e5f", fontFamily: "var(--font-inter)" }}
                tickFormatter={(v: string) => { const [,m,d] = v.split("-"); return `${m}/${d}`; }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#7a6e5f", fontFamily: "var(--font-inter)" }}
                tickFormatter={(v: number) => `${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#faf8f4",
                  border: "1px solid rgba(74,64,53,0.15)",
                  borderRadius: 8,
                  fontFamily: "var(--font-inter)",
                  fontSize: 12,
                }}
                formatter={(v) => [`${v} kcal`, "Calories"]}
              />
              <ReferenceLine
                y={target}
                stroke="#4a7c59"
                strokeDasharray="6 3"
                label={{ value: `Target: ${target}`, position: "insideTopRight", fontSize: 11, fill: "#4a7c59" }}
              />
              <Line
                type="monotone"
                dataKey="calories"
                stroke="#4a7c59"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartPoint };
                  return (
                    <circle
                      key={payload.date}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={dotColor(payload.calories, target)}
                      stroke="none"
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
