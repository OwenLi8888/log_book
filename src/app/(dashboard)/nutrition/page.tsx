import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NutritionClient from "./NutritionClient";

export const metadata = { title: "Nutrition — LifeLog" };

export default async function NutritionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("calorie_target")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen paper-surface">
      <NutritionClient userId={user.id} calorieTarget={profile?.calorie_target ?? 2000} />
    </div>
  );
}
