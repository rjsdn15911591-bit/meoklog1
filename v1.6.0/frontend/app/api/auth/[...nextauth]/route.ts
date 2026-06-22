import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await axios.post(`${API_URL}/auth/refresh`, {
      refresh_token: token.refreshToken,
    });
    const data = res.data.data;
    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

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
          const res = await axios.post(`${API_URL}/auth/google`, {
            id_token: account.id_token,
          });
          const data = res.data.data;
          account.backendToken = data.access_token;
          account.backendRefreshToken = data.refresh_token;
          account.accessTokenExpires = Date.now() + data.expires_in * 1000;
          account.userId = data.user.id;
        } catch (error) {
          console.error('Backend auth error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, account }: { token: JWT; account: Record<string, unknown> | null }) {
      if (account?.backendToken) {
        token.accessToken = account.backendToken as string;
        token.refreshToken = account.backendRefreshToken as string;
        token.accessTokenExpires = account.accessTokenExpires as number;
        token.userId = account.userId as string;
        return token;
      }

      // 아직 만료 안 됨
      if (Date.now() < (token.accessTokenExpires as number ?? 0)) {
        return token;
      }

      // 만료됨 → refresh
      return refreshAccessToken(token);
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.accessToken = (token.accessToken ?? '') as string;
      session.refreshToken = (token.refreshToken ?? '') as string;
      session.userId = (token.userId ?? '') as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export { handler as GET, handler as POST };
