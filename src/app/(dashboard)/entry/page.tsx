import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EntryForm from "./EntryForm";

export const metadata = {
  title: "Entry — LifeLog",
};

const MIN_DATE = "2025-01-01";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function isValidDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && iso >= MIN_DATE && iso <= todayISO();
}

export default async function EntryPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const requestedDate = searchParams.date;
  const initialDate =
    requestedDate && isValidDate(requestedDate) ? requestedDate : todayISO();

  return (
    <div className="min-h-screen paper-surface">
      <EntryForm userId={user.id} initialDate={initialDate} />
    </div>
  );
}
