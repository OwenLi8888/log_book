import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReflectionsClient from "./ReflectionsClient";

export const metadata = { title: "Reflections — LifeLog" };

export default async function ReflectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen paper-surface">
      <ReflectionsClient userId={user.id} />
    </div>
  );
}
