import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';


export const metadata: Metadata = {
  title: 'Workbench UI - Sophia Intel AI',
  description: 'AI-powered development workspace with Agno framework',
  keywords: ['AI', 'Agno', 'MCP', 'Development', 'Workspace'],
  authors: [{ name: 'AI Cherry' }],
  openGraph: {
    title: 'Workbench UI',
    description: 'AI-powered development workspace',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
