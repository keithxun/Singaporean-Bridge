import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Singaporean Bridge',
  description: 'Play Singapore Bridge online',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
