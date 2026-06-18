'use client';

import { useEffect } from 'react';
import { useDevStore } from '@/store/devStore';

/* React 내부 경고는 에러가 아니므로 제외 */
const IGNORE_PATTERNS = [
  'Warning:',
  'Each child in a list',
  'unique "key" prop',
  'ReactDOM.render is no longer supported',
  'act(...)',
  'validateDOMNesting',
];

function shouldIgnore(msg: string): boolean {
  return IGNORE_PATTERNS.some(p => msg.includes(p));
}

export function DevErrorListener() {
  const devMode   = useDevStore(s => s.devMode);
  const pushError = useDevStore(s => s.pushError);

  useEffect(() => {
    if (!devMode) return;

    /* ── window.onerror — 런타임 JS 에러 ── */
    const prevOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      pushError({
        type: 'runtime',
        message: String(message).replace(/^Uncaught\s+/, ''),
        source: source ? source.replace(window.location.origin, '') : undefined,
        line: lineno,
        col: colno,
        stack: error?.stack,
      });
      if (typeof prevOnError === 'function') {
        return prevOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    /* ── unhandledrejection — Promise 미처리 거부 ── */
    function onUnhandled(e: PromiseRejectionEvent) {
      const reason = e.reason;
      pushError({
        type: 'promise',
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
      });
    }
    window.addEventListener('unhandledrejection', onUnhandled);

    /* ── console.error 인터셉트 ── */
    const origConsoleError = console.error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error = (...args: any[]) => {
      origConsoleError(...args);
      const msg = args
        .map(a => (typeof a === 'string' ? a : a instanceof Error ? a.message : JSON.stringify(a)))
        .join(' ');
      if (!shouldIgnore(msg)) {
        pushError({ type: 'console', message: msg });
      }
    };

    return () => {
      window.onerror = prevOnError;
      window.removeEventListener('unhandledrejection', onUnhandled);
      console.error = origConsoleError;
    };
  }, [devMode, pushError]);

  return null;
}
