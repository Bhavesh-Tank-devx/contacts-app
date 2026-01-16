import NextAuth, { User } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "Strapi",
      credentials: {
        identifier: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // skipCSRFCheck: true,
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;
        
        const { identifier, password } = credentials;

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/local`, {
            method: "POST",
            body: JSON.stringify({ identifier, password }),
            headers: { "Content-Type": "application/json" },
          });

          const data = await res.json();

          if (!res.ok || !data.jwt) {
            return null;
          }

          const userRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate[]=role`, {
            headers: { Authorization: `Bearer ${data.jwt}` },
          });
          
          const userData = await userRes.json();

          return {
            id: userData.id, // Keep as number here
            name: userData.username,
            email: userData.email,
            jwt: data.jwt,
            role: userData.role?.name || "Authenticated",
          } as any; // FIX 1: Cast to 'any' to bypass 'id is string' check
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as number; // FIX 2: Explicit cast
        token.jwt = user.jwt;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // FIX 3: Force assignment. TypeScript thinks id is 'never' due to merge conflict
        // We cast session.user to 'any' temporarily to allow the assignment
        (session.user as any).id = token.id as number;
        session.user.jwt = token.jwt;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});