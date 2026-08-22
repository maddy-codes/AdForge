import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublic = createRouteMatcher([
  "/",
  "/sso-callback(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/generate",
  "/api/intel",
  "/api/avatar",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;
  if (req.cookies.get("adforge_guest")?.value === "1") return;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
