"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/api";
import type { User } from "@/lib/types";
import MemoryPanel from "@/components/memory/MemoryPanel";

export default function MemoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  const { push } = router;
  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u);
        setStatus("ready");
      })
      .catch(() => {
        push("/login?next=/memory");
      });
  }, [push]);

  if (status === "loading" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate/70">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 md:px-12">
      <div className="mb-8">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate/60 hover:text-ember transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to app
        </Link>
        <h1 className="font-display text-3xl text-ink">Memory</h1>
        <p className="mt-1 text-sm text-slate/60">
          Knowledge and preferences Pneuma remembers across conversations.
        </p>
      </div>

      <MemoryPanel />
    </div>
  );
}
