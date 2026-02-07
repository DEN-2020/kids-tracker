import React from 'react';

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
    // Минимальный отступ для Safe Area, чтобы не «задирать» футер слишком высоко
    paddingBottom: 'env(safe-area-inset-bottom, 5px)' 
  }}>
    {children}
    
    <div style={{ 
      padding: '4px 0 6px 0', // Очень компактные отступы
      fontSize: '9px', 
      color: 'var(--text-secondary)', 
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      opacity: 0.5,
      textAlign: 'center',
      width: '100%'
    }}>
      {/* Всё в одну строку через разделитель */}
      Kids Tracker 2026 • <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold' }}>TEST MODE</span> • Cloud Synced
    </div>
  </footer>
);