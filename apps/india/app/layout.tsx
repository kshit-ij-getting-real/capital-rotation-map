import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Capital Rotation Map',
  description: 'Interactive treemap for capital rotation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
