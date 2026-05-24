import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// 1. ДЕЛАЕМ APP ЛЕНИВЫМ
// Теперь основной код приложения не будет грузиться мгновенно
const App = lazy(() => import('./App.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 3. ИСПОЛЬЗУЕМ SUSPENSE */}
    {/* Пока App качается, пользователь видит пустоту или лоадер из index.html */}
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)
