'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showSettings?: boolean;
  rightContent?: React.ReactNode;
  className?: string;
  lightTitle?: boolean;
}

export function Header({ title, showBack = false, showSettings = false, rightContent, className, lightTitle = false }: HeaderProps) {
  const router = useRouter();

  return (
    <header className={cn('flex items-center justify-between px-[22px] py-3 bg-canvas', className)}>
      <div className="flex items-center gap-xs flex-1">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-start text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className={cn('font-kedu text-[28px] text-ink leading-tight tracking-[-0.5px]', lightTitle ? 'font-light' : 'font-bold')}>
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-xs">
        {rightContent}
        {showSettings && (
          <button
            onClick={() => router.push('/settings')}
            className="min-w-[44px] min-h-[44px] flex items-center justify-end text-muted hover:text-ink transition-colors rounded-lg"
          >
            <Settings size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
