import '@xyflow/react/dist/style.css';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NodeAtlas | Node.js Dependency Intelligence & Security Graph',
  description: 'GitHub-connected Node.js Dependency Intelligence & Security Graph SaaS platform powered by graph database engine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
