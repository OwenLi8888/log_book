"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase
        .from("users")
        .update({ display_name: displayName.trim() })
        .eq("id", data.user.id);
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
            Begin your story
          </p>
        </div>

        <div className="auth-card paper-surface">
          <h2 className="font-serif text-2xl text-navy mb-1">Start your journal</h2>
          <p className="font-sans text-ink-light text-sm mb-8">
            Create an account to begin logging your life
          </p>

          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <label className="block font-sans text-xs font-medium text-ink-light uppercase tracking-widest mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                required
                autoComplete="name"
                className="w-full bg-transparent border-b-2 border-ink/20 px-0 py-2 font-sans text-ink placeholder-ink-light/50 focus:outline-none focus:border-forest transition-colors duration-200"
              />
            </div>

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
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
                className="w-full bg-transparent border-b-2 border-ink/20 px-0 py-2 font-sans text-ink placeholder-ink-light/50 focus:outline-none focus:border-forest transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block font-sans text-xs font-medium text-ink-light uppercase tracking-widest mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
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
              {loading ? "Creating journal…" : "Create Journal"}
            </button>
          </form>

          <p className="mt-6 text-center font-sans text-sm text-ink-light">
            Already have an account?{" "}
            <Link href="/login" className="text-forest hover:text-forest-dark font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
