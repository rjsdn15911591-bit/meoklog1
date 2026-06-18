import dynamic from 'next/dynamic';

const AnalysisContent = dynamic(() => import('./AnalysisContent'), { ssr: false });

export default function AnalysisPage() {
  return <AnalysisContent />;
}
