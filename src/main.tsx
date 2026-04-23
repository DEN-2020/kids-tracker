import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// 1. ДЕЛАЕМ APP ЛЕНИВЫМ
// Теперь основной код приложения не будет грузиться мгновенно
const App = lazy(() => import('./App.tsx'));

// 2. ВЫНОСИМ PWA В ОТДЕЛЬНУЮ ФУНКЦИЮ
// Чтобы не блокировать основной поток при загрузке
const initPWA = async () => {
  const { registerSW } = await import('virtual:pwa-register');
  const updateSW = registerSW({
    immediate: false,
    onNeedRefresh() {
      if (confirm('Доступно обновление. Обновить?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('Приложение готово к работе оффлайн');
    },
  });
};

initPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 3. ИСПОЛЬЗУЕМ SUSPENSE */}
    {/* Пока App качается, пользователь видит пустоту или лоадер из index.html */}
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)