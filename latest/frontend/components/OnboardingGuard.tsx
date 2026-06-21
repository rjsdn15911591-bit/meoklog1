'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function OnboardingGuard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const redirected = useRef(false);

  useEffect(() => {
    if (!user || redirected.current) return;
    if (!user.height) {
      redirected.current = true;
      router.replace('/onboarding');
    }
  }, [user, router]);

  return null;
}
