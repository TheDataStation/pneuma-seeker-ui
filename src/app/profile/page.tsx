"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, updateMe, changePassword } from "@/lib/api";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  // Username form
  const [username, setUsername] = useState("");
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const { push } = router;
  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u);
        setUsername(u.username);
        setStatus("ready");
      })
      .catch(() => {
        push("/login?next=/profile");
      });
  }, [push]);

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError("");
    setUsernameSuccess(false);
    if (!username.trim()) {
      setUsernameError("Username cannot be empty.");
      return;
    }
    setUsernameSubmitting(true);
    try {
      const updated = await updateMe({ username: username.trim() });
      setUser(updated);
      setUsernameSuccess(true);
    } catch (err: unknown) {
      setUsernameError(err instanceof Error ? err.message : "Failed to update username.");
    } finally {
      setUsernameSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate/70">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-sand dark:bg-sand px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-ink">Profile settings</h1>
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.22em] text-slate hover:text-ink transition-colors"
          >
            Back
          </Link>
        </div>

        {/* User info */}
        <div className="panel rounded-2xl px-6 py-4 text-sm text-slate space-y-1">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.22em]">Email</span>
            <p className="mt-0.5 text-ink">{user?.email}</p>
          </div>
          <div className="pt-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em]">Group</span>
            <p className="mt-0.5 text-ink">{user?.group_name ?? "—"}</p>
          </div>
        </div>

        {/* Update username */}
        <form onSubmit={handleUsernameSubmit} className="panel rounded-2xl px-6 py-6 space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate">
            Update username
          </h2>
          <div className="space-y-2">
            <label htmlFor="username" className="text-xs font-semibold uppercase tracking-[0.22em]">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setUsernameSuccess(false); }}
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-3 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
              autoComplete="username"
            />
          </div>
          {usernameError && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {usernameError}
            </div>
          )}
          {usernameSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              Username updated.
            </div>
          )}
          <button
            type="submit"
            disabled={usernameSubmitting}
            className="cursor-pointer w-full rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:brightness-90 disabled:opacity-60"
          >
            {usernameSubmitting ? "Saving..." : "Save username"}
          </button>
        </form>

        {/* Change password */}
        <form onSubmit={handlePasswordSubmit} className="panel rounded-2xl px-6 py-6 space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate">
            Change password
          </h2>
          <div className="space-y-2">
            <label htmlFor="current-password" className="text-xs font-semibold uppercase tracking-[0.22em]">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPasswordSuccess(false); }}
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-3 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-[0.22em]">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordSuccess(false); }}
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-3 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-[0.22em]">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSuccess(false); }}
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-3 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
              autoComplete="new-password"
            />
          </div>
          {passwordError && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              Password changed successfully.
            </div>
          )}
          <button
            type="submit"
            disabled={passwordSubmitting}
            className="cursor-pointer w-full rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:brightness-90 disabled:opacity-60"
          >
            {passwordSubmitting ? "Saving..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
