import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Async',
  description: 'AI Agent Workspace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-text-primary">
        {children}
      </body>
    </html>
  );
}
