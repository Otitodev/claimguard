import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

/**
 * Better Auth server instance.
 *
 * Auth data (user/session/account/jwks tables) lives in a free Neon Postgres
 * (DATABASE_URL) — separate from the app's Aurora database, which the FastAPI
 * backend owns. The `jwt` plugin exposes a JWKS endpoint at /api/auth/jwks and
 * mints ES256 JWTs (ES256 verifies cleanly with PyJWT on the FastAPI side); the
 * frontend forwards that JWT as a Bearer token so the backend can derive the
 * authenticated practice instead of trusting a query param.
 */
export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000",
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    jwt({
      jwks: {
        keyPairConfig: { alg: "ES256" },
      },
    }),
    // nextCookies must be the last plugin so it can set cookies on responses.
    nextCookies(),
  ],
});
