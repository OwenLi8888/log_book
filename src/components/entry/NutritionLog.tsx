"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAutoSave } from "@/lib/hooks/useAutoSave";

interface Props {
  userId: string;
  selectedDate: string;
}

export default function NutritionLog({ userId, selectedDate }: Props) {
  const supabase = createClient();
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("nutrition")
        .select("calories, protein, carbs, fat")
        .eq("user_id", userId)
        .eq("date", selectedDate)
        .maybeSingle();
      setCalories(data?.calories != null ? String(data.calories) : "");
      setProtein(data?.protein != null ? String(data.protein) : "");
      setCarbs(data?.carbs != null ? String(data.carbs) : "");
      setFat(data?.fat != null ? String(data.fat) : "");
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedDate]);

  const doSave = useCallback(async () => {
    if (!calories) return;
    await supabase.from("nutrition").upsert(
      {
        user_id: userId,
        date: selectedDate,
        calories: calories ? Number(calories) : null,
        protein: protein ? Number(protein) : null,
        carbs: carbs ? Number(carbs) : null,
        fat: fat ? Number(fat) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );
  }, [supabase, userId, selectedDate, calories, protein, carbs, fat]);

  const { markDirty, save } = useAutoSave(doSave, 5_000);

  function handleNum(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      markDirty();
    };
  }

  if (loading) return <div className="h-16 bg-ink/5 rounded-lg animate-pulse" />;

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col">
        <label className="font-sans text-xs text-ink-light mb-1">Calories *</label>
        <input
          type="number"
          min={0}
          value={calories}
          onChange={handleNum(setCalories)}
          onBlur={save}
          placeholder="e.g. 2200"
          className="w-28 bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
        />
      </div>
      <div className="flex flex-col">
        <label className="font-sans text-xs text-ink-light mb-1">Protein (g)</label>
        <input
          type="number"
          min={0}
          value={protein}
          onChange={handleNum(setProtein)}
          onBlur={save}
          placeholder="—"
          className="w-24 bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
        />
      </div>
      <div className="flex flex-col">
        <label className="font-sans text-xs text-ink-light mb-1">Carbs (g)</label>
        <input
          type="number"
          min={0}
          value={carbs}
          onChange={handleNum(setCarbs)}
          onBlur={save}
          placeholder="—"
          className="w-24 bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
        />
      </div>
      <div className="flex flex-col">
        <label className="font-sans text-xs text-ink-light mb-1">Fat (g)</label>
        <input
          type="number"
          min={0}
          value={fat}
          onChange={handleNum(setFat)}
          onBlur={save}
          placeholder="—"
          className="w-24 bg-paper-dark border border-ink/15 rounded-lg px-3 py-2 font-sans text-sm text-ink focus:outline-none focus:border-forest"
        />
      </div>
    </div>
  );
}
