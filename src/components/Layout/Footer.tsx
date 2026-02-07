import React from 'react';
// Импортируем версию из package.json (если конфиг позволяет)
// Или просто задаем вручную, что даже надежнее для контроля
const APP_VERSION = "1.0.2"; 
const BUILD_DATE = "07.02.2026"; // Можешь обновлять вручную перед деплоем

interface FooterProps {
  children: React.ReactNode;
}

export const Footer = ({ children }: FooterProps) => (
  <footer style={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'var(--nav-bg)', 
    borderTop: '1px solid var(--border-color)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: 'var(--shadow)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'background-color 0.4s ease, border-color 0.4s ease',
    paddingBottom: 'env(safe-area-inset-bottom, 5px)' 
  }}>
    {children}
    
    <div style={{ 
      padding: '4px 0 6px 0',
      fontSize: '9px', 
      color: 'var(--text-secondary)', 
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      opacity: 0.5,
      textAlign: 'center',
      width: '100%'
    }}>
      v.{APP_VERSION} ({BUILD_DATE}) • Kids Tracker • <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold' }}>TEST MODE</span>
    </div>
  </footer>
);