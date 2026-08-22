"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";

const COOKIE = "adforge_guest=1";

function readGuest() {
  return typeof document !== "undefined" && document.cookie.includes(COOKIE);
}

type Gate = {
  isLoaded: boolean;
  isSignedIn: boolean;
  isGuest: boolean;
  isIn: boolean;
  /**
   * Clerk being signed in isn't enough for Convex calls — the Convex socket
   * authenticates asynchronously after Clerk loads. Auth-required queries and
   * mutations must wait for this, or ctx.auth sees no identity. Always false
   * for guests.
   */
  convexReady: boolean;
  enterGuest: () => void;
  leaveGuest: () => void;
};

const GateContext = createContext<Gate | null>(null);

export function SessionGateProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { isAuthenticated: convexReady } = useConvexAuth();
  const [guest, setGuest] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setGuest(readGuest());
  }, []);

  useEffect(() => {
    if (clerkLoaded) return;
    const t = window.setTimeout(() => setTimedOut(true), 5000);
    return () => window.clearTimeout(t);
  }, [clerkLoaded]);

  const isLoaded = clerkLoaded || timedOut;

  const enterGuest = useCallback(() => {
    document.cookie = `${COOKIE}; path=/; max-age=86400; SameSite=Lax`;
    setGuest(true);
  }, []);

  const leaveGuest = useCallback(() => {
    document.cookie = "adforge_guest=; path=/; max-age=0; SameSite=Lax";
    setGuest(false);
  }, []);

  const value = useMemo<Gate>(
    () => ({
      isLoaded,
      isSignedIn: !!isSignedIn,
      isGuest: guest && !isSignedIn,
      isIn: !!isSignedIn || guest,
      convexReady,
      enterGuest,
      leaveGuest,
    }),
    [convexReady, enterGuest, guest, isLoaded, isSignedIn, leaveGuest],
  );

  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useSessionGate() {
  const ctx = useContext(GateContext);
  if (!ctx) {
    throw new Error("useSessionGate must be used inside SessionGateProvider");
  }
  return ctx;
}
