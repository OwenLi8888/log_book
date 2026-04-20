import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SleepClient from "./SleepClient";

export const metadata = { title: "Sleep — LifeLog" };

export default async function SleepPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("sleep_target")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen paper-surface">
      <SleepClient userId={user.id} sleepTarget={profile?.sleep_target ?? 8} />
    </div>
  );
}
