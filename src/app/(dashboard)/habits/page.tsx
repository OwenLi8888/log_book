import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HabitsClient from "./HabitsClient";

export const metadata = { title: "Habits — LifeLog" };

export default async function HabitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen paper-surface">
      <HabitsClient userId={user.id} />
    </div>
  );
}
