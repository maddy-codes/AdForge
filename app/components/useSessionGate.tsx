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

const COOKIE = "adforge_guest=1";

function readGuest() {
  return typeof document !== "undefined" && document.cookie.includes(COOKIE);
}

type Gate = {
  isLoaded: boolean;
  isSignedIn: boolean;
  isGuest: boolean;
  isIn: boolean;
  enterGuest: () => void;
  leaveGuest: () => void;
};

const GateContext = createContext<Gate | null>(null);

export function SessionGateProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
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
      enterGuest,
      leaveGuest,
    }),
    [enterGuest, guest, isLoaded, isSignedIn, leaveGuest],
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
