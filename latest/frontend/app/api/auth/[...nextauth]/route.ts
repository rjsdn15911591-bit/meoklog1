import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import axios from 'axios';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === 'google' && account.id_token) {
        try {
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
            id_token: account.id_token,
          });
          account.backendToken = res.data.data.access_token;
          account.userId = res.data.data.user.id;
        } catch (error) {
          console.error('Backend auth error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, account }: { token: JWT; account: { backendToken?: string; userId?: string } | null }) {
      if (account?.backendToken) {
        token.accessToken = account.backendToken;
        token.userId = account.userId;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.accessToken = (token.accessToken ?? '') as string;
      session.userId = (token.userId ?? '') as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export { handler as GET, handler as POST };
