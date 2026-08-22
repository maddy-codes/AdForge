"use client";

import { useState } from "react";
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
        <span className="text-white/30">…</span>
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

function SignedOut() {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);

  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await signIn("anonymous");
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="rounded-full border border-white/15 px-3 py-1.5 text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
    >
      {busy ? "Signing in…" : "Save my runs"}
    </button>
  );
}

function SignedIn() {
  const { signOut } = useAuthActions();
  const history = useQuery(api.jobs.history);

  return (
    <div className="flex items-center gap-3">
      {history !== undefined && (
        <span className="text-white/40">
          {history.length} saved run{history.length === 1 ? "" : "s"}
        </span>
      )}
      <button
        onClick={() => void signOut()}
        className="rounded-full border border-white/15 px-3 py-1.5 text-white/60 transition-colors hover:border-white/30 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
