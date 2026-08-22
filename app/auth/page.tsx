"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated } from "convex/react";
import AppShell from "../components/AppShell";

function friendlyAuthError(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("InvalidAccountId"))
    return "No account with that email yet. Create one below.";
  if (raw.includes("InvalidSecret")) return "Wrong password.";
  if (raw.includes("TooManyFailedAttempts"))
    return "Too many attempts. Wait a minute and try again.";
  if (raw.toLowerCase().includes("at least 8"))
    return "Password needs at least 8 characters.";
  return raw || "Couldn’t sign in.";
}

export default function AuthPage() {
  return (
    <AppShell status="Account">
      <header className="rise mb-10 max-w-xl">
        <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
          Optional
        </p>
        <h1 className="font-display text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.04em] md:text-5xl">
          Save your forge runs.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
          The demo works signed out. Sign in only if you want a history of
          past brand films without re-calling the partners.
        </p>
      </header>

      <Suspense>
        <AuthPanel />
      </Suspense>
    </AppShell>
  );
}

function AuthPanel() {
  return (
    <>
      <Unauthenticated>
        <AuthForm />
      </Unauthenticated>
      <Authenticated>
        <AlreadyIn />
      </Authenticated>
    </>
  );
}

function AlreadyIn() {
  return (
    <div className="rise max-w-md rounded-[28px] border border-hairline bg-surface p-6">
      <p className="font-display text-lg font-semibold tracking-tight">
        You’re signed in.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Forge runs from this browser will land in your history.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/runs"
          className="rounded-full bg-ink px-4 py-2 font-display text-[12px] font-semibold tracking-wide text-mint uppercase"
        >
          View runs
        </Link>
        <Link
          href="/forge"
          className="rounded-full border border-hairline bg-surface px-4 py-2 font-display text-[12px] font-semibold tracking-wide text-ink uppercase"
        >
          Back to forge
        </Link>
      </div>
    </div>
  );
}

function AuthForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email, password, flow: mode });
      router.replace(next);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function guest() {
    setBusy(true);
    setError(null);
    try {
      await signIn("anonymous");
      router.replace(next);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rise max-w-md rounded-[28px] border border-hairline bg-surface p-6 shadow-[0_20px_50px_-30px_rgb(17_17_17/0.4)]"
      style={{ animationDelay: "80ms" }}
    >
      <div className="mb-5 flex gap-1 rounded-full bg-canvas p-1">
        {(
          [
            ["signIn", "Sign in"],
            ["signUp", "Create account"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              setError(null);
            }}
            className={`flex-1 rounded-full px-3 py-1.5 font-display text-[12px] font-semibold tracking-wide uppercase ${
              mode === id ? "bg-ink text-mint" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl bg-canvas px-4 py-3 font-mono text-sm outline-none placeholder:text-muted/50"
            placeholder="you@studio.com"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signUp" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl bg-canvas px-4 py-3 font-mono text-sm outline-none placeholder:text-muted/50"
            placeholder="8+ characters"
          />
        </label>
        {error && (
          <p className="font-display text-sm font-semibold text-danger">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="cta-pop mt-2 rounded-2xl bg-coral px-8 py-3.5 font-display text-base font-bold text-white transition-transform disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
        >
          {busy
            ? "Working…"
            : mode === "signUp"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <div className="mt-6 border-t border-hairline pt-5">
        <button
          type="button"
          onClick={() => void guest()}
          disabled={busy}
          className="w-full rounded-full border border-hairline px-4 py-2.5 font-display text-[12px] font-semibold tracking-wide text-ink uppercase hover:bg-canvas disabled:opacity-40"
        >
          Skip — save as guest
        </button>
        <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
          Guest sessions stay on this browser. Judges never have to type a
          password.
        </p>
      </div>
    </div>
  );
}
