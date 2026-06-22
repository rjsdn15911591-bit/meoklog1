import dynamic from 'next/dynamic';

const GroupDetailContent = dynamic(() => import('./GroupDetailContent'), { ssr: false });

export default function GroupDetailPage() {
  return <GroupDetailContent />;
}
