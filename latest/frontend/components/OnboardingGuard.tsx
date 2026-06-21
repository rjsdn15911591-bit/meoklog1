'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function OnboardingGuard() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    if (user.height) return;
    if (sessionStorage.getItem('onboarding-skipped') === 'true') return;
    router.replace('/onboarding');
  }, [user, router]);

  return null;
}
