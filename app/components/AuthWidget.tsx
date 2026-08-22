"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSessionGate } from "./useSessionGate";

export default function AuthWidget() {
  const { signOut } = useAuth();
  const { isSignedIn, isGuest, leaveGuest } = useSessionGate();
  const router = useRouter();
  const path = usePathname();
  const history = useQuery(api.generations.list);
  const onRuns = path === "/runs";
  const count = history?.length ?? 0;

  async function out() {
    leaveGuest();
    if (isSignedIn) await signOut({ redirectUrl: "/" });
    else router.replace("/");
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {isSignedIn && (
        <Link
          href="/runs"
          className={`rounded-full px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide uppercase ${
            onRuns ? "bg-ink text-mint" : "bg-surface text-muted hover:text-ink"
          }`}
        >
          Runs{history !== undefined ? ` · ${count}` : ""}
        </Link>
      )}
      {isGuest && (
        <span className="rounded-full bg-surface px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
          Guest
        </span>
      )}
      <button
        onClick={() => void out()}
        className="rounded-full border border-hairline bg-surface px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-muted uppercase hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}
