import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: '먹로그',
  description: '음식 사진 한 장으로 AI가 칼로리를 분석하고 그룹원과 식단을 비교해요',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-container">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
