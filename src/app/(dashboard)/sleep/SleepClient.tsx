"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface ChartPoint {
  date: string;
  hours: number;
}

interface Props {
  userId: string;
  sleepTarget: number;
}

type Range = "30d" | "90d" | "all";

function rollingAvg(data: ChartPoint[], days: number): number | null {
  const slice = data.slice(-days);
  if (slice.length === 0) return null;
  return Math.round((slice.reduce((s, p) => s + p.hours, 0) / slice.length) * 10) / 10;
}

export default function SleepClient({ userId, sleepTarget }: Props) {
  const supabase = createClient();
  const [data, setData] = useState<ChartPoint[]>([]);
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [refLine, setRefLine] = useState(sleepTarget);
  const [editRef, setEditRef] = useState(false);
  const [refInput, setRefInput] = useState(String(sleepTarget));

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from("sleep")
        .select("date, hours")
        .eq("user_id", userId)
        .not("hours", "is", null)
        .order("date");

      if (range !== "all") {
        const days = range === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte("date", since.toISOString().split("T")[0]);
      }

      const { data: rows } = await query;
      setData((rows ?? []).map((r) => ({ date: r.date, hours: r.hours! })));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, range]);

  async function saveRef() {
    const val = Number(refInput);
    if (!val || val < 0 || val > 24) return;
    await supabase.from("users").update({ sleep_target: val }).eq("id", userId);
    setRefLine(val);
    setEditRef(false);
  }

  const avg7 = rollingAvg(data, 7);
  const avg30 = rollingAvg(data, 30);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-navy">Sleep</h2>
          <p className="font-sans text-sm text-ink-light mt-1">Your nightly rest trends</p>
        </div>
        <div className="text-right">
          {editRef ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                className="w-20 bg-paper-dark border border-ink/15 rounded px-2 py-1 font-sans text-sm text-ink focus:outline-none focus:border-forest"
              />
              <span className="font-sans text-sm text-ink-light">hours</span>
              <button onClick={saveRef} className="font-sans text-sm text-forest font-medium">Save</button>
              <button onClick={() => setEditRef(false)} className="font-sans text-sm text-ink-light">×</button>
            </div>
          ) : (
            <button
              onClick={() => { setRefInput(String(refLine)); setEditRef(true); }}
              className="font-sans text-sm text-ink-light hover:text-ink transition-colors"
            >
              Target: {refLine}h ✎
            </button>
          )}
        </div>
      </div>

      {/* Rolling avg pills */}
      <div className="flex gap-4 mb-6">
        {[
          { label: "7-day avg", val: avg7 },
          { label: "30-day avg", val: avg30 },
        ].map(({ label, val }) => (
          <div key={label} className="bg-ink/5 rounded-lg px-4 py-2">
            <div className="font-sans text-xs text-ink-light">{label}</div>
            <div className="font-serif text-xl text-navy">
              {val != null ? `${val}h` : "—"}
            </div>
          </div>
        ))}
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

      <div className="border border-ink/10 rounded-xl p-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="font-sans text-sm text-ink-light animate-pulse">Loading…</div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="font-sans text-sm text-ink-light">No sleep data yet. Log sleep on the Daily Entry page.</p>
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
                domain={[0, 12]}
                tick={{ fontSize: 11, fill: "#7a6e5f", fontFamily: "var(--font-inter)" }}
                tickFormatter={(v: number) => `${v}h`}
              />
              <Tooltip
                contentStyle={{
                  background: "#faf8f4",
                  border: "1px solid rgba(74,64,53,0.15)",
                  borderRadius: 8,
                  fontFamily: "var(--font-inter)",
                  fontSize: 12,
                }}
                formatter={(v) => [`${v}h`, "Hours slept"]}
              />
              <ReferenceLine
                y={refLine}
                stroke="#4a7c59"
                strokeDasharray="6 3"
                label={{ value: `${refLine}h target`, position: "insideTopRight", fontSize: 11, fill: "#4a7c59" }}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
