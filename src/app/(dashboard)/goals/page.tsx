import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoalsClient from "./GoalsClient";

export const metadata = { title: "Goals — LifeLog" };

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen paper-surface">
      <GoalsClient userId={user.id} />
    </div>
  );
}
