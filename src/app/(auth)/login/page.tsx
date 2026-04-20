"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/entry");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--paper)" }}>
      <div className="fixed left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-ink/20 to-transparent pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-serif text-5xl font-semibold text-navy mb-2">LifeLog</h1>
          <p className="font-sans text-ink-light text-sm italic">
            Your personal life journal
          </p>
        </div>

        <div className="auth-card paper-surface">
          <h2 className="font-serif text-2xl text-navy mb-1">Welcome back</h2>
          <p className="font-sans text-ink-light text-sm mb-8">
            Sign in to continue your journal
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block font-sans text-xs font-medium text-ink-light uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-transparent border-b-2 border-ink/20 px-0 py-2 font-sans text-ink placeholder-ink-light/50 focus:outline-none focus:border-forest transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block font-sans text-xs font-medium text-ink-light uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-transparent border-b-2 border-ink/20 px-0 py-2 font-sans text-ink placeholder-ink-light/50 focus:outline-none focus:border-forest transition-colors duration-200"
              />
            </div>

            {error && (
              <div className="text-sm font-sans text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest hover:bg-forest-dark text-paper font-sans font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Open Journal"}
            </button>
          </form>

          <p className="mt-6 text-center font-sans text-sm text-ink-light">
            New here?{" "}
            <Link href="/signup" className="text-forest hover:text-forest-dark font-medium transition-colors">
              Create an account
            </Link>
          </p>
        </div>

        <p className="text-center mt-8 font-sans text-xs text-ink-light/60 italic">
          &ldquo;The unexamined life is not worth living.&rdquo;
        </p>
      </div>
    </div>
  );
}
