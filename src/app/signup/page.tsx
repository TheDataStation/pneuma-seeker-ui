// src/app/signup/page.tsx
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { login, register, ApiError } from "@/lib/api";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setIsSubmitting(true);

    try {
      await register({ email, password });
      await login({ email, password });

      const redirectTo = searchParams.get("next") ?? "/";
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create account.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="panel w-full max-w-lg rounded-[15px] p-8">
        <h1 className="font-display mt-2 text-3xl">Create an account</h1>
        <p className="mt-2 text-sm text-slate/70">
          Sign up to start using Pneuma-Seeker.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em]">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-sand-strong/70 bg-white px-4 py-3 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em]">
              Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-sand-strong/70 bg-white px-4 py-3 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="cursor-pointer duration-300 hover:brightness-90 w-full rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-sm">
          <Link className="hover:text-ink" href="/login">
            Already have an account?
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate/70">
          Loading...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
