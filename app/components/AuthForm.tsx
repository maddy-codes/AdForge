"use client";

import { FormEvent, useState } from "react";
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useSessionGate } from "./useSessionGate";

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.26-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function AuthForm() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { enterGuest } = useSessionGate();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState<"google" | "password" | "guest" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function google() {
    if (!clerk.loaded) {
      setError("Sign-in isn’t ready yet. Try again in a moment.");
      return;
    }
    setBusy("google");
    setError(null);
    try {
      const origin = window.location.origin;
      const { error: err } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: `${origin}/`,
        redirectCallbackUrl: `${origin}/sso-callback`,
      });
      if (err) {
        setError(err.message || "Google sign-in failed.");
        setBusy(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setBusy(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy("password");
    setError(null);
    try {
      if (needsCode) {
        if (!signUp) return;
        const { error: err } = await signUp.verifications.verifyEmailCode({
          code,
        });
        if (err) {
          setError(err.message);
          setBusy(null);
          return;
        }
        await signUp.finalize();
        return;
      }

      if (mode === "signIn") {
        if (!signIn) return;
        const { error: err } = await signIn.password({
          emailAddress: email,
          password,
        });
        if (err) {
          setError(err.message);
          setBusy(null);
          return;
        }
        await signIn.finalize();
        return;
      }

      if (!signUp) return;
      const { error: err } = await signUp.password({
        emailAddress: email,
        password,
      });
      if (err) {
        setError(err.message);
        setBusy(null);
        return;
      }
      if (signUp.status === "complete") {
        await signUp.finalize();
        return;
      }
      await signUp.verifications.sendEmailCode();
      setNeedsCode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t sign in.");
    }
    setBusy(null);
  }

  return (
    <div className="rise w-full max-w-[320px] rounded-2xl border border-hairline bg-surface p-4 shadow-[0_16px_40px_-28px_rgb(17_17_17/0.45)]">
      <div className="mb-3 flex gap-1 rounded-full bg-canvas p-0.5">
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
              setNeedsCode(false);
              setCode("");
              setError(null);
            }}
            className={`flex-1 rounded-full px-2.5 py-1 font-display text-[11px] font-semibold tracking-wide uppercase ${
              mode === id ? "bg-ink text-mint" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void google()}
        disabled={busy !== null || !clerk.loaded}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2 text-[13px] font-medium text-ink hover:bg-canvas disabled:opacity-40"
      >
        <GoogleMark />
        {busy === "google" ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className="my-3 flex items-center gap-2 text-[10px] font-semibold tracking-wide text-muted uppercase">
        <span className="h-px flex-1 bg-hairline" />
        or email
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        {needsCode ? (
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-xl bg-canvas px-3 py-2 font-mono text-[13px] outline-none placeholder:text-muted/50"
            placeholder="Email code"
          />
        ) : (
          <>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl bg-canvas px-3 py-2 font-mono text-[13px] outline-none placeholder:text-muted/50"
              placeholder="Email"
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete={
                mode === "signUp" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl bg-canvas px-3 py-2 font-mono text-[13px] outline-none placeholder:text-muted/50"
              placeholder="Password"
            />
          </>
        )}
        {error && (
          <p className="font-display text-xs font-semibold text-danger">{error}</p>
        )}
        <button
          type="submit"
          disabled={
            busy !== null ||
            (needsCode ? !code : !email || !password)
          }
          className="rounded-xl bg-coral px-3 py-2 font-display text-[13px] font-semibold text-white disabled:opacity-40"
        >
          {busy === "password"
            ? "Working…"
            : needsCode
              ? "Verify"
              : mode === "signUp"
                ? "Create account"
                : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => enterGuest()}
        disabled={busy !== null}
        className="mt-3 w-full text-center font-display text-[11px] font-semibold tracking-wide text-muted uppercase hover:text-ink disabled:opacity-40"
      >
        Continue as guest
      </button>
    </div>
  );
}
