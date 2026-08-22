#!/usr/bin/env node
/**
 * Headless Convex Auth key setup. Never run `npx @convex-dev/auth` —
 * that wizard hangs without a TTY.
 *
 * Requires `npx convex login` against the team's deployment first.
 *
 *   node scripts/set-convex-auth-keys.mjs
 *   SITE_URL=http://localhost:3001 node scripts/set-convex-auth-keys.mjs
 */
import { spawnSync } from "node:child_process";
import { generateKeyPair, exportPKCS8, exportJWK } from "jose";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

const { privateKey, publicKey } = await generateKeyPair("RS256", {
  extractable: true,
});
const jwt = (await exportPKCS8(privateKey)).trimEnd().replace(/\n/g, " ");
const jwks = JSON.stringify({
  keys: [{ use: "sig", ...(await exportJWK(publicKey)) }],
});

function setEnv(name, value) {
  const result = spawnSync(
    "npx",
    ["convex", "env", "set", `${name}=${value}`],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

setEnv("JWT_PRIVATE_KEY", jwt);
setEnv("JWKS", jwks);
setEnv("SITE_URL", siteUrl);
console.log(`SITE_URL set to ${siteUrl}`);
