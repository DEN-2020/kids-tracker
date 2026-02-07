import { useState, useEffect } from 'react';
import type { TranslationContent } from '../../translations';

interface HeaderProps {
  total: number;
  lang: 'fi' | 'ru' | 'en'; // Добавили 'en'
  setLang: (l: 'fi' | 'ru' | 'en') => void;
  t: TranslationContent;
}

export const Header = ({ total, lang, setLang, t }: HeaderProps) => {
  const [isDark, setIsDark] = useState(() => {
    const hasDarkClass = document.body.classList.contains('dark');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark && !hasDarkClass) document.body.classList.add('dark');
    return hasDarkClass || prefersDark;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const shouldBeDark = e.matches;
      document.body.classList.toggle('dark', shouldBeDark);
      setIsDark(shouldBeDark);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const newDarkStatus = document.body.classList.toggle('dark');
    setIsDark(newDarkStatus);
  };

  // Общий стиль для кнопок-флагов
  const flagStyle = (isActive: boolean) => ({
    fontSize: '22px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    transition: 'all 0.3s ease',
    filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'grayscale(1)',
    opacity: isActive ? 1 : 0.3,
    transform: isActive ? 'scale(1.2)' : 'scale(1)',
    padding: '0 4px'
  });

  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '20px', 
      backgroundColor: 'var(--card-bg)', 
      padding: '12px 16px', 
      borderRadius: '24px',
      boxShadow: 'var(--shadow)',
      border: '1px solid var(--border-color)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: '10px',
      zIndex: 100
    }}>
      {/* Баланс */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ 
          background: 'var(--accent-green)', 
          color: 'white', 
          width: '32px', 
          height: '32px', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
        }}>
          💰
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1, color: 'var(--text-main)' }}>
            {total}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t.points}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Переключатель темы */}
        <button 
          onClick={toggleTheme}
          style={{
            fontSize: '16px',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Разделитель */}
        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)' }} />

        {/* Языки */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={() => setLang('fi')} style={flagStyle(lang === 'fi')}>🇫🇮</button>
          <button onClick={() => setLang('ru')} style={flagStyle(lang === 'ru')}>🇷🇺</button>
          <button onClick={() => setLang('en')} style={flagStyle(lang === 'en')}>🇺🇸</button>
        </div>
      </div>
    </header>
  );
};