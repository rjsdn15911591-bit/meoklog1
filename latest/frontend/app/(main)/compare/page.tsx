import dynamic from 'next/dynamic';

const CompareContent = dynamic(() => import('./CompareContent'), { ssr: false });

export default function ComparePage() {
  return <CompareContent />;
}
