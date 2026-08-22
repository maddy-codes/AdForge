"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useSessionGate } from "./useSessionGate";

export default function AuthWidget() {
  const { signOut } = useAuth();
  const { isSignedIn, isGuest, leaveGuest } = useSessionGate();
  const router = useRouter();

  async function out() {
    leaveGuest();
    if (isSignedIn) await signOut({ redirectUrl: "/" });
    else router.replace("/");
  }

  return (
    <div className="flex items-center gap-2 text-xs">
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
