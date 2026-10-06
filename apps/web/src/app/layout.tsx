import type { Metadata, Viewport } from 'next';
import { MotionProvider } from '@/components/ui/MotionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: '누가 가장 그럴까?',
  description: 'OJT 아이스브레이킹 게임',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f8fa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
