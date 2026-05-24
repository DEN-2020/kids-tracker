import { useEffect, useState, Suspense, lazy } from 'react'; 
import { auth } from './firebase'; 
import { onAuthStateChanged } from "firebase/auth";
import { fetchTranslations, type TranslationContent } from './translations';
import type { AppProfile } from './types';
import { PwaStatus } from './components/Layout/PwaStatus';



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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isTranslationsLoading, setIsTranslationsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsTranslationsLoading(true);

    fetchTranslations(lang)
      .then((translationsData) => {
        if (isActive) setT(translationsData);
      })
      .catch((err) => {
        console.error("Translations loading error:", err);
      })
      .finally(() => {
        if (isActive) setIsTranslationsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [lang]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
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
        console.error("Auth initialization error:", err);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Пока не загружены И данные, И переводы — показываем пустоту (или белый экран из index.html)
  if (isAuthLoading || isTranslationsLoading || !t) return null;

  return (
    <div className="app-root">
      <PwaStatus lang={lang} />
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
