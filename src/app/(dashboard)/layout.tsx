import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex" style={{ background: "var(--paper)" }}>
      <Sidebar displayName={profile?.display_name} />
      {/* Main content — offset by sidebar width */}
      <main className="ml-56 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
}
