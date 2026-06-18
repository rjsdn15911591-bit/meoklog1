import dynamic from 'next/dynamic';

const LogContent = dynamic(() => import('./LogContent'), { ssr: false });

export default function LogPage() {
  return <LogContent />;
}
