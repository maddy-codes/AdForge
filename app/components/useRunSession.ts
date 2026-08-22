"use client";

import { useEffect, useState } from "react";
import { ensureRunSession } from "@/lib/runSession";

export function useRunSession() {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  useEffect(() => {
    setSessionId(ensureRunSession());
  }, []);
  return sessionId;
}
