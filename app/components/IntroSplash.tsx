"use client";

import { useEffect, useState } from "react";

/**
 * The landing assembling itself: cream canvas, the same four orbs as the
 * page, the same wordmark as the nav. Not a loader on top of a different system.
 */

const ORBS = [
  {
    className:
      "orb orb-coral intro-orb top-[-8%] left-[-8%] h-[28rem] w-[28rem] opacity-80",
    delay: "0ms",
  },
  {
    className:
      "orb orb-mint intro-orb top-[8%] right-[-6%] h-[22rem] w-[22rem] opacity-90",
    delay: "90ms",
  },
  {
    className:
      "orb orb-lilac intro-orb right-[18%] bottom-[-10%] h-[26rem] w-[26rem] opacity-75",
    delay: "160ms",
  },
  {
    className:
      "orb orb-coral intro-orb top-[48%] left-[8%] h-40 w-40 opacity-50",
    delay: "230ms",
  },
] as const;

export default function IntroSplash({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      return;
    }

    const exit = window.setTimeout(() => setExiting(true), 1280);
    const done = window.setTimeout(onDone, 1780);
    return () => {
      window.clearTimeout(exit);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div className={`intro-splash ${exiting ? "is-exiting" : ""}`} aria-hidden>
      {ORBS.map((orb) => (
        <span
          key={orb.delay}
          className={orb.className}
          style={{ animationDelay: orb.delay }}
        />
      ))}
      <p className="intro-mark">
        AdForge
        <span className="ml-1 inline-block h-2 w-2 rounded-full bg-coral" />
      </p>
    </div>
  );
}
