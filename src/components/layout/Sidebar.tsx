"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/entry", label: "Today's Entry", icon: "✦" },
  { href: "/habits", label: "Habits", icon: "◈" },
  { href: "/workouts", label: "Workouts", icon: "◉" },
  { href: "/nutrition", label: "Nutrition", icon: "◆" },
  { href: "/sleep", label: "Sleep", icon: "◐" },
  { href: "/goals", label: "Goals", icon: "◎" },
  { href: "/reflections", label: "Reflections", icon: "◇" },
  { href: "/history", label: "History", icon: "▦" },
  { href: "/gallery", label: "Gallery", icon: "▣" },
];

export default function Sidebar({ displayName }: { displayName?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-56 flex flex-col paper-surface border-r border-ink/10 z-40">
      {/* Spine line */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-ink/15 to-transparent" />

      {/* Logo */}
      <div className="px-6 pt-8 pb-6 border-b border-ink/8">
        <h1 className="font-serif text-2xl font-semibold text-navy">LifeLog</h1>
        {displayName && (
          <p className="font-sans text-xs text-ink-light mt-0.5 truncate">
            {displayName}&apos;s journal
          </p>
        )}
      </div>

      {/* Nav links */}
      <div className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-2.5 font-sans text-sm transition-all duration-150 ${
                isActive
                  ? "nav-link-active text-forest font-medium"
                  : "text-ink-light hover:text-ink hover:bg-ink/4"
              }`}
            >
              <span className="text-base leading-none w-4 text-center opacity-70">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-ink/8">
        <button
          onClick={handleSignOut}
          className="w-full text-left font-sans text-sm text-ink-light hover:text-ink transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
