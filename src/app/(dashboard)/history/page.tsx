import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryClient from "./HistoryClient";

export const metadata = { title: "History — LifeLog" };

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all entry dates for the user (just date field, no content)
  const { data: entries } = await supabase
    .from("entries")
    .select("date")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("date", { ascending: false });

  const entryDates = new Set((entries ?? []).map((e) => e.date as string));

  return (
    <div className="min-h-screen paper-surface">
      <HistoryClient entryDates={entryDates} />
    </div>
  );
}
