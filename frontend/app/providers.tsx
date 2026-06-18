'use client';

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

/* DevPanel / DevSidebar / DevErrorListener — window 사용 → SSR 완전 제외 */
const DevPanel = dynamic(
  () => import('@/components/dev/DevPanel').then(m => m.DevPanel),
  { ssr: false }
);
const DevSidebar = dynamic(
  () => import('@/components/dev/DevSidebar').then(m => m.DevSidebar),
  { ssr: false }
);
const DevErrorListener = dynamic(
  () => import('@/components/dev/DevErrorListener').then(m => m.DevErrorListener),
  { ssr: false }
);

/* 로그인 후 NextAuth 세션 → authStore 동기화 */
function AuthInitializer() {
  const { data: session, status } = useSession();
  const { user, setUser, setAccessToken } = useAuthStore();

  useEffect(() => {
    if (status !== 'authenticated' || !session?.accessToken) return;
    setAccessToken(session.accessToken as string);
    if (!user) {
      userApi.getMe()
        .then((res) => setUser(res.data.data))
        .catch((err) => {
          if (err?.response?.status === 401) {
            signOut({ redirect: false });
          }
        });
    }
  }, [status, session?.accessToken]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />
        {children}
        <DevPanel />
        <DevSidebar />
        <DevErrorListener />
      </QueryClientProvider>
    </SessionProvider>
  );
}
