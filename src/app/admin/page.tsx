// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/lib/api";
import AdminPanel from "@/components/admin/AdminPanel";
import type { User } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "forbidden">("loading");

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        if (u.group_name !== "admin") {
          setStatus("forbidden");
          setTimeout(() => router.push("/"), 2000);
        } else {
          setUser(u);
          setStatus("ready");
        }
      })
      .catch(() => {
        router.push("/login?next=/admin");
      });
  }, [router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate/70">
        Loading...
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="panel rounded-[15px] px-8 py-6 text-center">
          <p className="text-sm font-semibold text-[#800000]">Access denied</p>
          <p className="mt-1 text-xs text-slate/70">Redirecting you home…</p>
        </div>
      </div>
    );
  }

  return <AdminPanel user={user!} />;
}
