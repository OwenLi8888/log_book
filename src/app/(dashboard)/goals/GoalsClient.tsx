"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  type: "numeric" | "binary";
  target: number | null;
  current: number | null;
  unit: string | null;
  deadline: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

const BLANK: Partial<Goal> = {
  title: "",
  description: "",
  type: "numeric",
  target: null,
  current: 0,
  unit: "",
  deadline: "",
  completed: false,
};

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const [y, m, d] = deadline.split("-").map(Number);
  const due = new Date(y, m - 1, d).getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((due - now.getTime()) / 86400000);
}

function formatDeadline(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProgressRing({ pct, color = "#4a7c59" }: { pct: number; color?: string }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(74,64,53,0.1)" strokeWidth="6" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text x="40" y="44" textAnchor="middle" fontSize="13" fontWeight="600" fill={color} fontFamily="var(--font-playfair)">
        {Math.min(Math.round(pct), 100)}%
      </text>
    </svg>
  );
}

export default function GoalsClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; editing: Goal | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Partial<Goal>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [progressModal, setProgressModal] = useState<{ open: boolean; goal: Goal | null; value: string }>({ open: false, goal: null, value: "" });

  const loadGoals = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("deadline", { ascending: true, nullsFirst: false });
    setGoals(data ?? []);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  function openCreate() {
    setForm({ ...BLANK });
    setModal({ open: true, editing: null });
  }

  function openEdit(g: Goal) {
    setForm({
      title: g.title,
      description: g.description ?? "",
      type: g.type,
      target: g.target ?? null,
      current: g.current ?? 0,
      unit: g.unit ?? "",
      deadline: g.deadline ?? "",
    });
    setModal({ open: true, editing: g });
  }

  async function handleSave() {
    if (!form.title?.trim()) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      title: form.title!,
      description: form.description || null,
      type: form.type ?? "numeric",
      target: form.type === "numeric" ? (form.target ?? null) : null,
      current: form.type === "numeric" ? (form.current ?? 0) : 0,
      unit: form.type === "numeric" ? (form.unit || null) : null,
      deadline: form.deadline || null,
    };
    if (modal.editing) {
      await supabase.from("goals").update(payload).eq("id", modal.editing.id);
    } else {
      await supabase.from("goals").insert(payload);
    }
    setSaving(false);
    setModal({ open: false, editing: null });
    loadGoals();
  }

  async function handleComplete(g: Goal) {
    await supabase.from("goals").update({
      completed: true,
      completed_at: new Date().toISOString(),
    }).eq("id", g.id);
    loadGoals();
  }

  async function handleReopen(g: Goal) {
    await supabase.from("goals").update({
      completed: false,
      completed_at: null,
    }).eq("id", g.id);
    loadGoals();
  }

  async function handleDelete(g: Goal) {
    if (!confirm(`Delete "${g.title}"?`)) return;
    await supabase.from("goals").delete().eq("id", g.id);
    loadGoals();
  }

  async function handleUpdateProgress() {
    if (!progressModal.goal) return;
    const val = parseFloat(progressModal.value);
    if (isNaN(val)) return;
    await supabase.from("goals").update({ current: val }).eq("id", progressModal.goal.id);
    setProgressModal({ open: false, goal: null, value: "" });
    loadGoals();
  }

  const today = todayISO();
  const active = goals.filter((g) => !g.completed);
  const archived = goals.filter((g) => g.completed);
  const total = goals.length;
  const completedCount = archived.length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-navy">Goals</h2>
          <p className="font-sans text-sm text-ink-light mt-1">
            {total > 0
              ? `${completedCount} of ${total} goals completed`
              : "Set your intentions"}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="font-sans text-sm bg-forest text-paper px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          + New goal
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-ink/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-serif text-2xl text-navy/40 mb-2">No active goals</p>
          <p className="font-sans text-sm text-ink-light">Create your first goal to start tracking your progress.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {active.map((g) => {
            const dl = daysLeft(g.deadline);
            const isOverdue = dl !== null && dl < 0;
            const isDueSoon = dl !== null && dl >= 0 && dl <= 7;
            const pct =
              g.type === "numeric" && g.target && g.target > 0
                ? ((g.current ?? 0) / g.target) * 100
                : 0;

            return (
              <div
                key={g.id}
                className={`border rounded-xl p-5 relative ${
                  isOverdue
                    ? "border-red-300 bg-red-50/50"
                    : "border-ink/10"
                }`}
              >
                {isOverdue && (
                  <span className="absolute top-4 right-4 font-sans text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-medium">
                    Overdue
                  </span>
                )}
                <div className="flex items-start gap-4">
                  {g.type === "numeric" && (
                    <ProgressRing pct={pct} color={isOverdue ? "#dc2626" : "#4a7c59"} />
                  )}
                  {g.type === "binary" && (
                    <div className="shrink-0 w-12 h-12 rounded-full border-2 border-ink/20 flex items-center justify-center mt-1">
                      <span className="text-xl text-ink-light">○</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg text-navy leading-tight">{g.title}</h3>
                    </div>
                    {g.description && (
                      <p className="font-sans text-sm text-ink-light mt-0.5 leading-snug">{g.description}</p>
                    )}

                    {g.type === "numeric" && g.target != null && (
                      <div className="mt-2">
                        <div className="flex justify-between font-sans text-xs text-ink-light mb-1">
                          <span>
                            {g.current ?? 0} / {g.target}
                            {g.unit ? ` ${g.unit}` : ""}
                          </span>
                        </div>
                        <div className="h-1.5 bg-ink/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: isOverdue ? "#dc2626" : "#4a7c59",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {g.deadline && (
                        <span
                          className={`font-sans text-xs px-2 py-0.5 rounded-full ${
                            isOverdue
                              ? "bg-red-100 text-red-600"
                              : isDueSoon
                              ? "bg-amber-100 text-amber-700"
                              : "bg-ink/8 text-ink-light"
                          }`}
                        >
                          {isOverdue
                            ? `Due ${formatDeadline(g.deadline)}`
                            : dl === 0
                            ? "Due today"
                            : `${dl}d left · ${formatDeadline(g.deadline)}`}
                        </span>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        {g.type === "numeric" && (
                          <button
                            onClick={() =>
                              setProgressModal({
                                open: true,
                                goal: g,
                                value: String(g.current ?? 0),
                              })
                            }
                            className="font-sans text-xs text-forest hover:underline"
                          >
                            Update
                          </button>
                        )}
                        <button
                          onClick={() => handleComplete(g)}
                          className="font-sans text-xs text-forest hover:underline"
                        >
                          Mark complete
                        </button>
                        <button
                          onClick={() => openEdit(g)}
                          className="font-sans text-xs text-ink-light hover:text-ink"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(g)}
                          className="font-sans text-xs text-ink-light hover:text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed / Archive */}
      {archived.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setShowArchive((v) => !v)}
            className="font-sans text-sm text-ink-light hover:text-ink flex items-center gap-2 mb-4 transition-colors"
          >
            <span>{showArchive ? "▾" : "▸"}</span>
            Completed ({archived.length})
          </button>

          {showArchive && (
            <div className="space-y-3">
              {archived.map((g) => (
                <div
                  key={g.id}
                  className="border border-ink/8 rounded-xl p-4 opacity-60 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-forest text-lg shrink-0">✓</span>
                    <div className="min-w-0">
                      <p className="font-sans text-sm text-ink truncate line-through">{g.title}</p>
                      {g.completed_at && (
                        <p className="font-sans text-xs text-ink-light">
                          Completed {new Date(g.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleReopen(g)}
                    className="font-sans text-xs text-ink-light hover:text-ink shrink-0"
                  >
                    Reopen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper rounded-xl shadow-lg border border-ink/10 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-xl text-navy mb-5">
              {modal.editing ? "Edit goal" : "New goal"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">Title *</label>
                <input
                  autoFocus
                  value={form.title ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
                  placeholder="Run a 5K, Read 12 books…"
                />
              </div>

              <div>
                <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">Description</label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest resize-none"
                  placeholder="Why does this goal matter?"
                />
              </div>

              <div>
                <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">Type</label>
                <div className="flex gap-3">
                  {(["numeric", "binary"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-2 rounded-lg border-2 font-sans text-sm capitalize transition-all ${
                        form.type === t
                          ? "border-forest bg-forest/10 text-forest font-medium"
                          : "border-ink/15 text-ink-light hover:border-ink/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="font-sans text-xs text-ink-light mt-1.5">
                  {form.type === "numeric"
                    ? "Track progress toward a number (e.g. 100 books, 50 workouts)"
                    : "Simply done or not done (e.g. Learn to cook pasta)"}
                </p>
              </div>

              {form.type === "numeric" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">Target</label>
                    <input
                      type="number"
                      value={form.target ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, target: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
                      placeholder="100"
                      min="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">Unit</label>
                    <input
                      value={form.unit ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
                      placeholder="books, km, sessions…"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">Deadline</label>
                <input
                  type="date"
                  value={form.deadline ?? ""}
                  min={today}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="w-full bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
                />
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
                disabled={saving || !form.title?.trim()}
                className="font-sans text-sm bg-forest text-paper px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress update modal */}
      {progressModal.open && progressModal.goal && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper rounded-xl shadow-lg border border-ink/10 p-6 w-full max-w-xs">
            <h3 className="font-serif text-xl text-navy mb-1">Update progress</h3>
            <p className="font-sans text-sm text-ink-light mb-4">{progressModal.goal.title}</p>
            <label className="font-sans text-xs text-ink-light uppercase tracking-wide mb-1.5 block">
              Current value{progressModal.goal.unit ? ` (${progressModal.goal.unit})` : ""}
            </label>
            <input
              autoFocus
              type="number"
              value={progressModal.value}
              onChange={(e) => setProgressModal((p) => ({ ...p, value: e.target.value }))}
              className="w-full bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest mb-1"
              min="0"
              max={progressModal.goal.target ?? undefined}
            />
            {progressModal.goal.target != null && (
              <p className="font-sans text-xs text-ink-light mb-4">Target: {progressModal.goal.target} {progressModal.goal.unit}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProgressModal({ open: false, goal: null, value: "" })}
                className="font-sans text-sm text-ink-light hover:text-ink px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProgress}
                className="font-sans text-sm bg-forest text-paper px-5 py-2 rounded-lg hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
