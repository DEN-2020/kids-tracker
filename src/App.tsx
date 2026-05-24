import { useEffect, useState, Suspense, lazy } from 'react'; 
import { auth } from './firebase'; 
import { onAuthStateChanged } from "firebase/auth";
import { fetchTranslations, type TranslationContent } from './translations';
import type { AppProfile } from './types';
import { OfflineNotice } from './components/Layout/OfflineNotice';



// Ленивая загрузка страниц
const LoginPage = lazy(() => import('./components/Auth/LoginPage').then(m => ({ default: m.LoginPage })));
const AuthenticatedApp = lazy(() => import('./AuthenticatedApp'));

function App() {
  const [lang, setLang] = useState<'fi' | 'ru' | 'en'>(() => {
    const browserLang = navigator.language.split('-')[0];
    return (['fi', 'ru', 'en'].includes(browserLang) ? browserLang as 'fi' | 'ru' | 'en' : 'en');
  });
  
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [t, setT] = useState<TranslationContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = onAuthStateChanged(auth, async (user) => {
      try {
        // 1. Загружаем переводы
        const translationsData = await fetchTranslations(lang);
        setT(translationsData);

        // 2. Загружаем профиль, если юзер залогинен
        if (user) {
          const { fetchUserProfile } = await import('./services/profile');
          const data = await fetchUserProfile(user.uid);
          
          if (data) {
            setProfile(data);
          } else {
            setProfile({ 
              uid: user.uid, 
              name: user.displayName || '', 
              avatar: user.photoURL || '👶' 
            });
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => initApp();
  }, [lang]); // Перезагружаем, если сменился язык

  // Пока не загружены И данные, И переводы — показываем пустоту (или белый экран из index.html)
  if (isLoading || !t) return null;

  return (
    <div className="app-root">
      <OfflineNotice lang={lang} />
      <Suspense fallback={<div className="spinner"></div>}>
        {!profile ? (
          // Передаем t в LoginPage, так как теперь это стейт
          <LoginPage lang={lang} t={t} onLoginError={console.error} />
        ) : (
          <AuthenticatedApp 
            initialProfile={profile} 
            lang={lang} 
            setLang={setLang} 
            t={t} 
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
