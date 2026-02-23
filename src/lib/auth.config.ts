import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicItem = nextUrl.pathname.startsWith("/items/");
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/forgot-password");

      if (isPublicItem) return true;
      if (isAuthPage) {
        if (isLoggedIn)
          return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.firstName = (user as { firstName: string }).firstName;
        token.lastName = (user as { lastName: string }).lastName;
        token.image = (user as { image?: string | null }).image ?? null;
        token.role = (user as { role: string }).role;
        token.permissions = (user as { permissions: string[] }).permissions;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        // Use token.id with fallback to token.sub (default next-auth field)
        session.user.id = (token.id as string) ?? (token.sub as string);
        // Handle old tokens that may have `name` instead of firstName/lastName
        session.user.firstName = (token.firstName as string) ?? (token.name as string) ?? "";
        session.user.lastName = (token.lastName as string) ?? "";
        session.user.image = token.image as string | null;
        session.user.role = (token.role as string) ?? "";
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    },
  },
  providers: [],
};
