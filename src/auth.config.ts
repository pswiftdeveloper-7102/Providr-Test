import type { NextAuthConfig } from "next-auth";

// Edge-safe portion of the auth config. Used by middleware.
// No providers, no DB, no bcrypt — those live in auth.ts.
export default {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ request: { nextUrl }, auth }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isAppRoute =
        path.startsWith("/provider") ||
        path.startsWith("/sc") ||
        path.startsWith("/profile");
      const isAuthPage = path === "/login" || path === "/signup";

      if (isAppRoute && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/provider", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;