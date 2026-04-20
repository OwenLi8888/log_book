import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GalleryClient from "./GalleryClient";

export const metadata = { title: "Gallery — LifeLog" };

interface MediaRow {
  id: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
  entry_id: string | null;
  entries: { date: string } | null;
}

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: media } = await supabase
    .from("media")
    .select("id, file_url, file_type, uploaded_at, entry_id, entries(date)")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  return (
    <div className="min-h-screen paper-surface">
      <GalleryClient media={(media ?? []) as unknown as MediaRow[]} />
    </div>
  );
}
