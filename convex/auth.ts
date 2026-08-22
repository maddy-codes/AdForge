import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

/**
 * Optional auth for saved forge history. Providers:
 *  - Password: email + password at `/auth`
 *  - Anonymous: "Skip — save as guest" on the same page, for judges
 *
 * Never gates `/forge` / `/intel` / `/avatar`.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});
