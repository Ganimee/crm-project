'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Grid3X3,
  Users,
  UserRoundSearch,
  Megaphone,
  ShieldCheck,
  FileText,
  Settings,
  Download,
  ChevronLeft,
  Menu,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';

import { useTheme } from '../context/ThemeContext';

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();

 const { isDarkMode, toggleTheme } = useTheme();
 const darkMode = isDarkMode;

 const [collapsed, setCollapsed] = useState(false);
 const [hovered, setHovered] = useState(null);

 const styles = getStyles(darkMode, collapsed);
  

  const menu = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'RFM Matrisi', icon: Grid3X3, path: '/rfm-matrisi' },
    { name: 'Müşteri Listesi', icon: Users, path: '/musteri-listesi' },
    { name: 'Müşteri 360°', icon: UserRoundSearch, path: '/musteri-360' },
    { name: 'Kampanya', icon: Megaphone, path: '/kampanya' },
    { name: 'Yetkilendirme', icon: ShieldCheck, path: '/yetki' },
    { name: 'Log Kayıtları', icon: FileText, path: '/log-kayit' },
    { name: 'Veri Yönetimi', icon: Download, path: '/veri-yonetimi' },
    { name: 'Çıkış', icon: LogOut, action: 'logout' },
  ];

  const handleMenuClick = (item) => {
  if (item.action === 'logout') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');

    router.push('/');
    return;
  }

  router.push(item.path);
};

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.card}>
          <div style={styles.logoImageBox}>
  <img
    src={darkMode ? '/logo_dark.png' : '/logo.png'}
    alt="Sportink Logo"
    style={styles.logoImg}
  />

            {!collapsed && (
        <div style={styles.brandText}>
           
        </div>
       )}
          </div>

          <div style={styles.menuContainer}>
            {menu.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              const isHovered = hovered === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => handleMenuClick(item)}
                  onMouseEnter={() => setHovered(item.name)}
                  onMouseLeave={() => setHovered(null)}
                  style={styles.menuItem(isActive, isHovered)}
                >
                  <Icon size={20} />
                  {!collapsed && <span>{item.name}</span>}
                </button>
              );
            })}
          </div>

          <button
            style={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
          </button>
        </div>
      </aside>

     

      <main style={styles.main}>
        <button
          style={styles.darkBtn}
          onClick={toggleTheme}
        >
           {darkMode ? <Moon size={22} /> : <Sun size={22} />}
        </button>
      </main>
    </div>
  );
}

const getStyles = (darkMode, collapsed) => ({
  page: {
    display: 'flex',
    minHeight: '100vh',
    background: darkMode ? '#050506' : '#f4f4f5',
    color: darkMode ? '#fff' : '#111',
    transition: '0.3s ease',
  },

  sidebar: {
    width: collapsed ? 110 : 300,
    padding: 20,
    transition: '0.3s ease',
  },

  card: {
    height: '100%',
    background: darkMode ? '#111216' : '#ffffff',
    borderRadius: 30,
    border: '1px solid',
    borderColor: darkMode
     ? 'rgba(255,255,255,0.1)'
     : 'rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    transition: '0.3s ease',
  },

  logo: {
    minHeight: 90,   
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    padding: '30px 25px 45px',
    justifyContent: collapsed ? 'center' : 'flex-start',
  },

  logoBox: {
    width: 48,
    height: 48,
    background: '#e11d48',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    color: '#fff',
    boxShadow: '0 0 25px rgba(225,29,72,0.65)',
  },

  brandTitle: {
    fontWeight: 900,
    color: darkMode ? '#fff' : '#111',
    
  },

  brandSubTitle: {
    fontSize: 10,
    color: '#e11d48',
    fontWeight: 700,
    letterSpacing: 1,
  },

  menuContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    padding: '0 20px',
    flex: 1,
  },

  menuItem: (activeItem, hoverItem) => ({
    height: 56,
    borderRadius: 18,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    padding: collapsed ? 0 : '0 18px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    fontWeight: 600,
    fontSize: 14,

    background: activeItem || hoverItem ? '#e11d48' : 'transparent',
    color: activeItem || hoverItem ? '#fff' : darkMode ? '#9ca3af' : '#52525b',

    boxShadow:
      activeItem || hoverItem
        ? '0 12px 28px rgba(225,29,72,0.45)'
        : 'none',

    transform: hoverItem ? 'translateX(6px) scale(1.03)' : 'translateX(0) scale(1)',
    transition: 'all 0.25s ease',
  }),

  collapseBtn: {
    margin: 20,
    height: 55,
    borderRadius: 18,
    border: darkMode
      ? '1px solid rgba(255,255,255,0.1)'
      : '1px solid rgba(0,0,0,0.08)',
    background: darkMode ? 'rgba(255,255,255,0.05)' : '#f4f4f5',
    color: darkMode ? '#fff' : '#111',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  main: {
    flex: 1,
    position: 'relative',
  },

darkBtn: {
  position: 'fixed',
  top: 10,
  right: 30,
  width: 50,
  height: 50,
  borderRadius: 15,
  border: darkMode
    ? '1px solid rgba(255,255,255,0.1)'
    : '1px solid rgba(0,0,0,0.08)',
  background: darkMode ? '#111216' : '#ffffff',
  color: darkMode ? '#fff' : '#111',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
},
  logoImageBox: {
  width: collapsed ? 48 : 100,
  height: 55,
  minWidth: collapsed ? 60 : 250,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  height: 50,           
  marginTop: 25, 
  marginBottom: 20,
},

logoImg: {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  display: 'block',
},

brandText: {
  fontSize: 11,
  color: '#e11d48',
  fontWeight: 700,
  letterSpacing: 1,
},
bottomArea: {
  marginTop: 'auto',
  padding: 20,
  display: 'flex',
  justifyContent: 'space-between',
},


});