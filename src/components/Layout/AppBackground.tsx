import React, { useEffect } from 'react';

// Фоны
import loginBg from '/src/assets/bg/login.avif';
import tasksBg from '/src/assets/bg/tasks.avif';
import shopBg from '/src/assets/bg/shop.avif';
import adminBg from '/src/assets/bg/admin.avif';

interface AppBackgroundProps {
  activeTab: string;
  isAuth: boolean;
}

export const AppBackground: React.FC<AppBackgroundProps> = ({ activeTab, isAuth }) => {

  // 👉 Параллакс БЕЗ React state (только GPU transform)
  useEffect(() => {
    const el = document.getElementById('bg-layer');
    if (!el) return;

    const handler = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / 60;
      const y = (e.clientY - window.innerHeight / 2) / 60;

      el.style.transform =
        `translate3d(${x}px, ${y}px, 0) scale(1.05)`;
    };

    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const getBackgroundImage = () => {
    if (!isAuth) return loginBg;

    switch (activeTab) {
      case 'tasks': return tasksBg;
      case 'shop': return shopBg;
      case 'admin': return adminBg;
      default: return loginBg;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      overflow: 'hidden',
      backgroundColor: '#000',
      pointerEvents: 'none',
    }}>

      {/* 👉 Фоновое изображение */}
      <div
        id="bg-layer"
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '120%',
          height: '120%',
          backgroundImage: `url(${getBackgroundImage()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'translate3d(0,0,0) scale(1.05)',
          willChange: 'transform',
          transition: 'background-image 0.5s ease-in-out',
        }}
      />

      {/* 👉 Затемнение ВМЕСТО blur */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.55)',
      }} />

    </div>
  );
};