'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastProps {
  visible: boolean;
  message: string;
}

export function Toast({ visible, message }: ToastProps) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-24 flex justify-center z-[300] pointer-events-none transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <div className="inline-flex items-center gap-1.5 bg-ink/90 text-white font-kedu text-sm px-4 py-2.5 rounded-pill shadow-lg">
        <Check size={14} className="text-sage" />
        {message}
      </div>
    </div>
  );
}
