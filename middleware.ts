import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

/**
 * Auth is optional everywhere. This app has exactly one page (`/`) and it
 * must keep working for a signed-out judge (CLAUDE.md: "no auth" on the demo
 * path) — so the middleware only refreshes the auth cookie, it never
 * redirects or blocks a route.
 */
export default convexAuthNextjsMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
