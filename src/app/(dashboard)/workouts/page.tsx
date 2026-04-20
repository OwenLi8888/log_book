import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkoutsClient from "./WorkoutsClient";

export const metadata = { title: "Workouts — LifeLog" };

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen paper-surface">
      <WorkoutsClient userId={user.id} />
    </div>
  );
}
