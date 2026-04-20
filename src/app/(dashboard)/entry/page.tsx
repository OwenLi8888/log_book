import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EntryForm from "./EntryForm";

export const metadata = {
  title: "Today's Entry — LifeLog",
};

export default async function EntryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen paper-surface">
      <EntryForm userId={user.id} />
    </div>
  );
}
