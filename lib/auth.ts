// lib/auth.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DefaultSession } from 'next-auth';
import { STRAPI_URL } from './strapi.server';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      jwt: string;
      role: string;
    } & DefaultSession['user'];
  }
  interface JWT {
    jwt: string;
    role: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: credentials.username,
              password: credentials.password,
            }),
          });

          const data = await res.json();
          if (!res.ok) return null;

          // Return user object
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.username || data.user.email,
            jwt: data.jwt,
            role: data.user.role?.name || 'Member', // Default to Member
          };
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.jwt = user.jwt;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.sub!;
      (session.user as any).jwt = token.jwt as string;
      (session.user as any).role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});