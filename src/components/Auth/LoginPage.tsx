import React, { useState, useCallback } from 'react';
import { FirebaseError } from "firebase/app";
import { auth, googleProvider } from '../../firebase';
import type { TranslationContent } from '../../translations';
import s from './Auth.module.css';
import { GoogleIcon } from './GoogleIcon';

interface LoginPageProps {
  onLoginError?: (error: unknown) => void;
  lang?: 'fi' | 'ru' | 'en';
  t: TranslationContent;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginError, lang = 'en', t }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof FirebaseError) {
      const code = error.code;
      if (lang === 'fi') {
        if (code === 'auth/email-already-in-use') return 'Sähköposti on jo käytössä';
        if (code === 'auth/invalid-credential') return 'Väärä sähköposti tai salasana';
      }
      if (lang === 'ru') {
        if (code === 'auth/email-already-in-use') return 'Эта почта уже занята';
        if (code === 'auth/invalid-credential') return 'Неверная почта или пароль';
        if (code === 'auth/weak-password') return 'Пароль должен быть от 6 символов';
      }
      return error.message;
    }
    return lang === 'ru' ? 'Произошла ошибка' : 'An error occurred';
  }, [lang]);

  // ДИНАМИЧЕСКИЙ ВХОД ЧЕРЕЗ GOOGLE
  const handleGoogleLogin = async () => {
    setLocalError(null);
    setIsLoading(true);
    try {
      // Загружаем только нужную функцию по клику
      const { signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user') {
        setIsLoading(false);
        return;
      }
      setLocalError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // ДИНАМИЧЕСКИЙ ВХОД ЧЕРЕЗ EMAIL
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 6) {
      setLocalError(lang === 'ru' ? 'Мин. 6 символов' : 'Min 6 chars');
      return;
    }

    setIsLoading(true);
    try {
      // Импортируем тяжелые методы только когда они реально нужны
      const { 
        signInWithEmailAndPassword, 
        createUserWithEmailAndPassword 
      } = await import("firebase/auth");

      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setLocalError(getErrorMessage(err));
      onLoginError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <main className={s.authPage}> 
      <h1 className={s.mainTitle}>Kids Tracker 🚀</h1>
      
      <form 
        onSubmit={handleEmailAuth} 
        className={s.glassForm}
        aria-label={isRegistering ? "Registration form" : "Login form"}
      >
        <h2 className={s.formTitle}>
          {isRegistering ? t.auth.welcome : (lang === 'ru' ? 'Вход' : 'Login')}
        </h2>

        {localError && <div className={s.errorBox} role="alert">{localError}</div>}
        
        <div className={s.inputWrapper}>
          <input 
            type="email" 
            className={s.glassInput}
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className={s.inputWrapper}>
          <input 
            type="password" 
            className={s.glassInput}
            placeholder={lang === 'ru' ? 'Пароль' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isRegistering ? "new-password" : "current-password"} 
          />
        </div>
        
        <button type="submit" disabled={isLoading} className={s.submitBtn}>
          {isLoading ? '...' : (isRegistering ? t.auth.startAdventure : (lang === 'ru' ? 'Войти' : 'Sign In'))}
        </button>

        <button 
          type="button"
          onClick={() => { setIsRegistering(!isRegistering); setLocalError(null); }}
          className={s.switchBtn}
        >
          {isRegistering 
            ? (lang === 'ru' ? 'Уже есть аккаунт? Войти' : 'Have an account? Login') 
            : (lang === 'ru' ? 'Нет аккаунта? Регистрация' : 'No account? Register')}
        </button>
      </form>

      <div className={s.divider}>{lang === 'ru' ? 'или' : 'or'}</div>

      <button onClick={handleGoogleLogin} disabled={isLoading} className={s.googleBtn}>
        <GoogleIcon />
        <span>{lang === 'ru' ? 'Войти через Google' : 'Sign in with Google'}</span>
      </button>
  </main>
);
};