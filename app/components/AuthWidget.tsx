"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Optional account layer, top-right corner. Never gates the generate flow —
 * a signed-out visitor gets the full demo; signing in just adds a saved
 * history of past runs. See middleware.ts for the "never redirect" rule.
 */
export default function AuthWidget() {
  return (
    <div className="text-xs">
      <AuthLoading>
        <span className="rounded-full bg-surface px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-muted/50 uppercase">
          …
        </span>
      </AuthLoading>
      <Unauthenticated>
        <SignedOut />
      </Unauthenticated>
      <Authenticated>
        <SignedIn />
      </Authenticated>
    </div>
  );
}

const pill =
  "rounded-full px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide uppercase";

function SignedOut() {
  const path = usePathname();
  const on = path === "/auth";

  return (
    <Link
      href="/auth"
      className={`${pill} ${
        on ? "bg-ink text-mint" : "border border-hairline bg-surface text-ink hover:bg-ink hover:text-mint"
      }`}
    >
      Sign in
    </Link>
  );
}

function SignedIn() {
  const { signOut } = useAuthActions();
  const path = usePathname();
  const history = useQuery(api.generations.list);
  const onRuns = path === "/runs";
  const count = history?.length ?? 0;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/runs"
        className={`${pill} ${
          onRuns ? "bg-ink text-mint" : "bg-surface text-muted hover:text-ink"
        }`}
      >
        Runs{history !== undefined ? ` · ${count}` : ""}
      </Link>
      <button
        onClick={() => void signOut()}
        className={`${pill} border border-hairline bg-surface text-muted hover:text-ink`}
      >
        Sign out
      </button>
    </div>
  );
}
