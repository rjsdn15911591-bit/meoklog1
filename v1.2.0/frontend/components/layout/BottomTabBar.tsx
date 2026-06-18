'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Camera, BookOpen, BarChart2, Users, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/camera', icon: Camera,   label: '카메라' },
  { href: '/log',    icon: BookOpen,  label: '로그'   },
  { href: '/analysis', icon: BarChart2, label: '분석' },
  { href: '/group',  icon: Users,    label: '그룹'   },
  { href: '/compare', icon: Trophy,  label: '비교'   },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-surface-card border-t border-hairline flex items-center justify-around h-16 px-2">
      {TABS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={cn(
              'flex flex-col items-center gap-[3px] px-3 py-2 rounded-xl transition-all duration-150 min-w-[44px] min-h-[44px] justify-center',
              isActive ? 'text-cobalt' : 'text-muted'
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={cn('font-kedu text-[11px] leading-none', isActive ? 'font-bold' : 'font-normal')}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
