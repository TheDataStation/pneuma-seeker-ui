// src/components/admin/AdminPanel.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import UsersPanel from "./UsersPanel";
import GroupsPanel from "./GroupsPanel";
import type { User } from "@/lib/types";

type Tab = "users" | "groups";

export default function AdminPanel({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<Tab>("users");

  return (
    <div className="min-h-screen px-6 py-8 md:px-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate/60 hover:text-ember transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
            Back to app
          </Link>
          <h1 className="font-display text-3xl text-ink">Admin panel</h1>
          <p className="mt-1 text-sm text-slate/60">Signed in as <span className="font-medium text-ink">{user.email}</span></p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-sand-strong/60 bg-sand/40 dark:bg-white/[0.03] p-1 w-fit">
        {(["users", "groups"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-all duration-200 ${
              activeTab === tab
                ? "bg-white dark:bg-card text-ink shadow-sm"
                : "text-slate/60 hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="panel rounded-2xl p-6">
        {activeTab === "users" && <UsersPanel />}
        {activeTab === "groups" && <GroupsPanel />}
      </div>
    </div>
  );
}
