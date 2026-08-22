"use client";

import { HandleSSOCallback } from "@clerk/react";
import { useRouter } from "next/navigation";

export default function SsoCallbackPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <HandleSSOCallback
        navigateToApp={({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          if (url.startsWith("http")) {
            window.location.href = url;
            return;
          }
          router.replace(url);
        }}
        navigateToSignIn={() => router.replace("/")}
        navigateToSignUp={() => router.replace("/")}
      />
    </div>
  );
}
