import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

/**
 * Quick auth for the demo. Two providers:
 *  - Anonymous: zero-friction "sign in" so a judge can save/replay a run
 *    without creating an account.
 *  - Password: email + password, for the team's own accounts.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});
