import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { TranslationContent } from '../../translations';


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
  onSuccess: (user: UserProfile) => void;
  t: TranslationContent; // Теперь тут жесткий тип!
}

export const RegisterPage = ({ googleUid, initialName, onSuccess, t }: RegisterPageProps) => {
  const [name, setName] = useState(initialName || '');
  const [role, setRole] = useState<'child' | 'parent'>('child');
  const [avatar, setAvatar] = useState('👶');
  const [loading, setLoading] = useState(false);
  const [familyCode, setFamilyCode] = useState('');

useEffect(() => {
    // Проверяем, нет ли сохраненного кода приглашения
    const pendingCode = sessionStorage.getItem('pending_family_code');
    if (pendingCode) {
      setFamilyCode(pendingCode);
      // Если код есть, обычно это ребенок вступает в семью
      setRole('child'); 
      setAvatar('👶');
    }
  }, []);

  const handleRegister = async () => {
    if (!name.trim()) return alert("Введите имя!");
    setLoading(true);

    try {
      // Если код не введен, создаем уникальный ID для новой семьи
      const finalFamilyId = familyCode.trim() || "fam_" + Math.random().toString(36).substring(2, 9);

      const userData: UserProfile = {
        uid: googleUid,
        name: name.trim(),
        role: role,
        avatar: avatar,
        familyId: finalFamilyId,
        totalPoints: 0,
        currentBalance: 0
      };

      await setDoc(doc(db, "users", googleUid), userData);
      onSuccess(userData);
    } catch (e) {
      console.error(e);
      alert("Ошибка при создании профиля.");
    } finally {
      setLoading(false);
    }
  };

return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 24px', 
      maxWidth: '450px', margin: '60px auto', background: 'var(--card-bg)', 
      borderRadius: '32px', textAlign: 'center', border: '1px solid var(--border-color)' 
    }}>
      <h2 style={{ color: 'var(--accent-blue)', fontSize: '24px' }}>{t.auth.welcome}</h2>
      
      <div style={{ fontSize: '80px', margin: '10px 0' }}>{avatar}</div>

      <input 
        value={name} 
        onChange={e => setName(e.target.value)} 
        placeholder={t.auth.namePlaceholder} 
        style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
      />

      {/* КАРТОЧКИ РОЛЕЙ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div 
          onClick={() => { setRole('child'); setAvatar('👶'); }}
          style={{ 
            padding: '20px', borderRadius: '20px', cursor: 'pointer',
            background: role === 'child' ? 'rgba(0,122,255,0.15)' : 'var(--bg-color)',
            border: `2px solid ${role === 'child' ? 'var(--accent-blue)' : 'transparent'}`,
            transition: '0.2s'
          }}
        >
           <div style={{ fontSize: '32px' }}>👶</div>
           <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{t.auth.roleChild}</div>
        </div>
        <div 
          onClick={() => { setRole('parent'); setAvatar('🧔'); }}
          style={{ 
            padding: '20px', borderRadius: '20px', cursor: 'pointer',
            background: role === 'parent' ? 'rgba(0,122,255,0.15)' : 'var(--bg-color)',
            border: `2px solid ${role === 'parent' ? 'var(--accent-blue)' : 'transparent'}`,
            transition: '0.2s'
          }}
        >
           <div style={{ fontSize: '32px' }}>🧔</div>
           <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{t.auth.roleParent}</div>
        </div>
      </div>

      <div style={{ textAlign: 'left', marginTop: '10px' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '10px' }}>{t.auth.familyCodeLabel}</label>
        <input 
          value={familyCode} 
          placeholder={t.auth.familyCodePlaceholder}
          onChange={e => setFamilyCode(e.target.value)} 
          style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', marginTop: '5px', boxSizing: 'border-box' }}
        />
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 10px 0' }}>{t.auth.familyCodeHint}</p>
      </div>

      <button 
        onClick={handleRegister} 
        disabled={loading}
        style={{ 
          padding: '18px', background: 'var(--accent-green)', color: 'white', 
          border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' 
        }}
      >
        {loading ? t.auth.loading : t.auth.startAdventure}
      </button>
    </div>
  );
};