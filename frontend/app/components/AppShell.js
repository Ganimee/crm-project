'use client';

import { usePathname } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { isDarkMode } = useTheme();

  const hideSidebar =
    pathname === '/' ||
    pathname.startsWith('/sifre-unuttum') ||
    pathname.startsWith('/sifre-sifirla');

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: isDarkMode ? '#050506' : '#f4f4f5',
        color: isDarkMode ? '#fff' : '#111',
        transition: '0.3s ease',
      }}
    >
      {!hideSidebar && <Sidebar />}

      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}