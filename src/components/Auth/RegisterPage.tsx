import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { db } from '../../db';
import { doc, setDoc } from 'firebase/firestore';
import type { TranslationContent } from '../../translations';
import { familyExists, getJoinFamilyIdFromSearch, normalizeFamilyId } from '../../services/familyJoinLookup';
import { registerProfileMutation } from '../../services/server';
import s from './Auth.module.css'; 

interface UserProfile {
  uid: string;
  name: string;
  role: 'child' | 'parent';
  avatar: string;
  familyId: string;
  totalPoints: number;
  currentBalance: number;
}

interface RegisterPageProps {
  googleUid: string;
  initialName: string;
  initialAvatar?: string;
  onSuccess: (user: UserProfile) => void;
  t: TranslationContent; 
  lang: 'fi' | 'ru' | 'en';
}

export const RegisterPage = ({ googleUid, initialName, initialAvatar, onSuccess, t, lang }: RegisterPageProps) => {
  const [joinFamilyCode] = useState(() => getJoinFamilyIdFromSearch(window.location.search));
  const [name, setName] = useState(initialName || '');
  const [role, setRole] = useState<'child' | 'parent'>('child');
  const [avatar, setAvatar] = useState(initialAvatar || '👶');
  const [loading, setLoading] = useState(false);
  const [familyCode, setFamilyCode] = useState(() => joinFamilyCode);
  const [familyCodeError, setFamilyCodeError] = useState('');
  const isJoinFlow = Boolean(joinFamilyCode);

  const uiText = {
    en: {
      familyCodeInvalid: 'Family code was not found. Check the invite link or family code.',
      familyCodeLocked: 'Family code came from the invite link and cannot be changed here.',
      saveError: 'Error saving profile',
    },
    fi: {
      familyCodeInvalid: 'Perhekoodia ei loytynyt. Tarkista kutsulinkki tai perhekoodi.',
      familyCodeLocked: 'Perhekoodi tuli kutsulinkista, eika sita voi muuttaa tassa.',
      saveError: 'Profiilin tallennus epaonnistui',
    },
    ru: {
      familyCodeInvalid: 'Семейный код не найден. Проверьте ссылку приглашения или код семьи.',
      familyCodeLocked: 'Семейный код получен из ссылки-приглашения и не редактируется.',
      saveError: 'Не удалось сохранить профиль',
    },
  }[lang];

  useEffect(() => {
    if (initialName && !name) setName(initialName);
  }, [initialName, name]);

  const handleRegister = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      alert(t.auth.namePlaceholder);
      return;
    }

    const existingFamilyId = normalizeFamilyId(familyCode);
    setFamilyCodeError('');
    setLoading(true);
    try {
      if (existingFamilyId) {
        const existingFamily = await familyExists(existingFamilyId);

        if (!existingFamily) {
          setFamilyCodeError(uiText.familyCodeInvalid);
          return;
        }
      }

      const newUser = await registerProfileMutation<UserProfile>(
        {
          avatar,
          familyId: existingFamilyId || undefined,
          name: cleanName,
          role,
        },
        async () => {
          const familyId = existingFamilyId || `fam_${googleUid.slice(0, 5)}_${Math.random().toString(36).substr(2, 5)}`;
          const localUser: UserProfile = {
            uid: googleUid, name: cleanName, role, avatar, familyId,
            totalPoints: 0, currentBalance: 0
          };
          await setDoc(doc(db, "users", googleUid), localUser);
          return localUser;
        },
      );
      onSuccess(newUser);
    } catch (error) {
      console.error("Registration error:", error); // Исправляет ошибку ESLint
      alert(uiText.saveError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className={s.authPage} style={{ minHeight: 'auto' }}>
      <h2 className={s.mainTitle} style={{ fontSize: '24px' }}>{t.auth.finishRegistration}</h2>
      
      <div className={s.inputGroup}>
        <div className={s.avatarBig}>{avatar}</div>
        {/* Добавили id, name и autoComplete */}
        <input 
          id="reg-name"
          name="username"
          className={s.glassInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.auth.namePlaceholder}
          required
          autoComplete="name"
          style={{ textAlign: 'center' }}
        />
      </div>

      <div className={s.roleSelection}>
        <div 
          className={`${s.roleCard} ${role === 'child' ? s.roleCardActive : ''}`}
          onClick={() => { setRole('child'); setAvatar(initialAvatar || '👶'); }}
        >
          <div className={s.roleEmoji}>👶</div>
          <div className={s.roleLabel}>{t.auth.roleChild}</div>
        </div>
        
        <div 
          className={`${s.roleCard} ${role === 'parent' ? s.roleCardActive : ''}`}
          onClick={() => { setRole('parent'); setAvatar('🧔'); }}
        >
          <div className={s.roleEmoji}>🧔</div>
          <div className={s.roleLabel}>{t.auth.roleParent}</div>
        </div>
      </div>

      <div className={s.inputGroup}>
        <label htmlFor="family-code" className={s.label}>{t.auth.familyCodeLabel}</label>
        <input 
          id="family-code"
          name="familyCode"
          className={s.glassInput}
          value={familyCode}
          onChange={(e) => {
            setFamilyCode(e.target.value);
            if (familyCodeError) {
              setFamilyCodeError('');
            }
          }}
          placeholder={t.auth.familyCodePlaceholder}
          autoComplete="off"
          readOnly={isJoinFlow}
          aria-readonly={isJoinFlow}
          title={isJoinFlow ? uiText.familyCodeLocked : undefined}
          style={isJoinFlow ? { opacity: 0.8, cursor: 'not-allowed' } : undefined}
        />
        <p className={s.hint}>{isJoinFlow ? uiText.familyCodeLocked : t.auth.familyCodeHint}</p>
        {familyCodeError ? (
          <p className={s.hint} role="alert" style={{ color: '#ff7a7a' }}>
            {familyCodeError}
          </p>
        ) : null}
      </div>

      <button 
        type="submit"
        disabled={loading || !name.trim()}
        className={s.submitBtn}
        style={{ width: '100%', background: 'var(--accent-green)', fontSize: '18px' }}
      >
        {loading ? t.auth.loading : t.auth.startAdventure}
      </button>
    </form>
  );
};
