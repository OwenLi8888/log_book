import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = { title: "Dashboard — LifeLog" };

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function last7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}

function formatDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${m}/${d}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayISO();
  const dates7 = last7Dates();
  const since7 = dates7[0];

  const [
    entryRes,
    habitsRes,
    habitLogsRes,
    sleepRes,
    nutritionRes,
    mediaRes,
    goalsRes,
  ] = await Promise.all([
    supabase.from("entries").select("id, highlight, mood").eq("user_id", user.id).eq("date", today).maybeSingle(),
    supabase.from("habits").select("id, name, color, icon").eq("user_id", user.id).eq("archived", false).order("sort_order"),
    supabase.from("habit_logs").select("habit_id, date, completed").eq("user_id", user.id).gte("date", since7).eq("completed", true),
    supabase.from("sleep").select("date, hours").eq("user_id", user.id).gte("date", since7).not("hours", "is", null),
    supabase.from("nutrition").select("date, calories").eq("user_id", user.id).gte("date", since7).not("calories", "is", null),
    supabase.from("media").select("id, file_url, file_type, uploaded_at").eq("user_id", user.id).order("uploaded_at", { ascending: false }).limit(5),
    supabase.from("goals").select("id, title, type, target, current, unit, deadline, completed").eq("user_id", user.id).eq("completed", false).order("deadline", { ascending: true }).limit(3),
  ]);

  const entry = entryRes.data;
  const habits = habitsRes.data ?? [];
  const habitLogs = habitLogsRes.data ?? [];
  const sleepData = sleepRes.data ?? [];
  const nutritionData = nutritionRes.data ?? [];
  const recentMedia = mediaRes.data ?? [];
  const goals = goalsRes.data ?? [];

  // Quick stats
  const avgSleep = sleepData.length
    ? Math.round((sleepData.reduce((s, r) => s + (r.hours ?? 0), 0) / sleepData.length) * 10) / 10
    : null;
  const avgCal = nutritionData.length
    ? Math.round(nutritionData.reduce((s, r) => s + (r.calories ?? 0), 0) / nutritionData.length)
    : null;

  // Habit log map: habitId -> Set<date>
  const logMap: Record<string, Set<string>> = {};
  for (const log of habitLogs) {
    if (!logMap[log.habit_id]) logMap[log.habit_id] = new Set();
    logMap[log.habit_id].add(log.date);
  }

  // Active streaks (habits completed today)
  const activeStreaks = habits.filter((h) => logMap[h.id]?.has(today)).length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h2 className="font-serif text-3xl font-medium text-navy">Dashboard</h2>
        <p className="font-sans text-sm text-ink-light mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Today's entry status */}
      <section className="mb-8">
        <div className={`flex items-center justify-between border rounded-xl p-5 ${
          entry ? "border-forest/30 bg-forest/5" : "border-ink/10 bg-ink/3"
        }`}>
          <div>
            <h3 className="font-serif text-lg text-navy mb-0.5">Today&apos;s Entry</h3>
            {entry ? (
              <p className="font-sans text-sm text-ink-light">
                {entry.highlight ? `"${entry.highlight.slice(0, 80)}…"` : "Entry started"}
              </p>
            ) : (
              <p className="font-sans text-sm text-ink-light">No entry yet today</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {entry && (
              <span className="font-sans text-xs text-forest font-medium bg-forest/10 px-3 py-1 rounded-full">
                ✓ Complete
              </span>
            )}
            <Link
              href="/entry"
              className="font-sans text-sm text-forest hover:text-forest-dark transition-colors font-medium"
            >
              {entry ? "View →" : "Write now →"}
            </Link>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mb-8">
        <h3 className="font-serif text-xl text-navy mb-4">Quick Stats</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Avg Sleep (7d)", value: avgSleep != null ? `${avgSleep}h` : "—", icon: "◐" },
            { label: "Avg Calories (7d)", value: avgCal != null ? `${avgCal} kcal` : "—", icon: "◆" },
            { label: "Active Streaks", value: String(activeStreaks), icon: "◈" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="border border-ink/10 rounded-xl p-4">
              <div className="font-sans text-xs text-ink-light mb-1 flex items-center gap-1.5">
                <span>{icon}</span> {label}
              </div>
              <div className="font-serif text-2xl text-navy">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Habit grid summary — last 7 days */}
      {habits.length > 0 && (
        <section className="mb-8">
          <h3 className="font-serif text-xl text-navy mb-4">Habits — Last 7 Days</h3>
          <div className="border border-ink/10 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex border-b border-ink/8 bg-ink/3">
              <div className="w-40 px-4 py-2 font-sans text-xs text-ink-light">Habit</div>
              <div className="flex flex-1">
                {dates7.map((d) => (
                  <div key={d} className="flex-1 text-center font-sans text-xs text-ink-light py-2">
                    {formatDate(d)}
                  </div>
                ))}
              </div>
            </div>
            {habits.slice(0, 8).map((h) => (
              <div key={h.id} className="flex border-b border-ink/6 last:border-0">
                <div className="w-40 px-4 py-3 flex items-center gap-2 shrink-0">
                  <span className="text-sm">{h.icon}</span>
                  <span className="font-sans text-sm text-ink truncate">{h.name}</span>
                </div>
                <div className="flex flex-1">
                  {dates7.map((d) => {
                    const done = logMap[h.id]?.has(d);
                    const isFuture = d > today;
                    return (
                      <div key={d} className="flex-1 flex items-center justify-center py-3">
                        <div
                          className="w-6 h-6 rounded-md"
                          style={{
                            backgroundColor: isFuture
                              ? "transparent"
                              : done
                              ? h.color
                              : "rgba(74,64,53,0.08)",
                            border: isFuture ? "1px dashed rgba(74,64,53,0.1)" : undefined,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent media */}
      {recentMedia.length > 0 && (
        <section className="mb-8">
          <h3 className="font-serif text-xl text-navy mb-4">Recent Photos & Videos</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentMedia.map((item) => (
              <div key={item.id} className="shrink-0">
                {item.file_type.startsWith("video/") ? (
                  <div className="w-28 h-28 bg-ink/10 rounded-xl flex items-center justify-center border border-ink/10">
                    <span className="text-3xl text-ink-light">▶</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.file_url}
                    alt=""
                    className="w-28 h-28 object-cover rounded-xl border border-ink/10"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Goal progress */}
      {goals.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-xl text-navy">Goals</h3>
            <Link href="/goals" className="font-sans text-sm text-forest hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {goals.map((goal) => {
              const progress =
                goal.type === "numeric" && goal.target && goal.target > 0
                  ? Math.min(100, Math.round(((goal.current ?? 0) / goal.target) * 100))
                  : null;
              const daysLeft = goal.deadline
                ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
                : null;
              return (
                <div key={goal.id} className="border border-ink/10 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-sans text-sm font-medium text-ink">{goal.title}</h4>
                    {daysLeft != null && (
                      <span className={`font-sans text-xs px-2 py-0.5 rounded-full ${
                        daysLeft < 7 ? "bg-red-100 text-red-600" : "bg-ink/8 text-ink-light"
                      }`}>
                        {daysLeft > 0 ? `${daysLeft}d left` : "Due today"}
                      </span>
                    )}
                  </div>
                  {progress != null && (
                    <div>
                      <div className="flex justify-between font-sans text-xs text-ink-light mb-1">
                        <span>{goal.current ?? 0} / {goal.target} {goal.unit}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-ink/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-forest rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
