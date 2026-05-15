import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Singaporean Bridge', description: 'Play Singapore Bridge online' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
