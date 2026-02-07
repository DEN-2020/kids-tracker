import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { 
  collection, doc, setDoc, updateDoc, 
  deleteDoc, onSnapshot, query, where 
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react'; 
import type { TranslationContent } from '../../translations';
import { PrivacyPolicy } from '../Legal/PrivacyPolicy';
import { Instructions } from '../Legal/Instructions'; // Добавляем импорт

interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
  totalPoints?: number;
}

interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  role: 'child' | 'parent';
  familyId: string;
}

export const FamilySettings = ({ familyId, t, profile, lang, handleLogout }: { 
  familyId: string; 
  t: TranslationContent; 
  profile: UserProfile; 
  lang: string;
  handleLogout: () => void;
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'child' | 'parent'>('child');
  const [avatar, setAvatar] = useState('👶');
  const [editId, setEditId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false); // Состояние для инструкции

  const joinLink = `${window.location.origin}${window.location.pathname}?join=${familyId}`;

  useEffect(() => {
    const q = query(collection(db, "users"), where("familyId", "==", familyId));
    return onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    });
  }, [familyId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(familyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.familySettings.inviteTitle,
          text: `${t.familySettings.inviteTitle}: ${familyId}`,
          url: joinLink,
        });
      } catch (err) { console.log(err); }
    } else {
      handleCopy();
    }
  };

  const deleteMyAccount = async () => {
    if (window.confirm(t.familySettings.deleteConfirm)) {
      try {
        await deleteDoc(doc(db, "users", profile.uid));
        await auth.currentUser?.delete(); 
        handleLogout();
      } catch (err) {
        console.error("Delete account error:", err);
        handleLogout(); 
      }
    }
  };

  const addMember = async () => {
    if (!name.trim()) return;
    const customId = `${role}_${name.toLowerCase().trim().replace(/\s+/g, '_')}`;
    try {
      await setDoc(doc(db, "users", customId), {
        name: name.trim(),
        role,
        avatar,
        familyId,
        totalPoints: 0,
        currentBalance: 0
      });
      setName('');
    } catch (err) { console.error(err); }
  };

  const updateMember = async (id: string, newName: string, newAvatar: string) => {
    try {
      await updateDoc(doc(db, "users", id), { name: newName, avatar: newAvatar });
      setEditId(null);
    } catch (err) { console.error(err); }
  };

  const deleteMember = async (id: string) => {
    if (window.confirm(t.familySettings.deleteConfirm)) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
      
      {/* ПРИГЛАШЕНИЕ */}
      <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '24px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '15px' }}>📢 {t.familySettings.inviteTitle}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>{t.familySettings.inviteDesc}</p>
        <div style={{ background: 'white', padding: '12px', display: 'inline-block', borderRadius: '16px', marginBottom: '15px' }}>
          <QRCodeSVG value={joinLink} size={150} />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={handleCopy} style={inviteBtnStyle}>
            {copied ? `✅ ${t.familySettings.copied}` : `📋 ${t.familySettings.copyCode}: ${familyId}`}
          </button>
          <button onClick={handleShare} style={{ ...inviteBtnStyle, background: 'var(--accent-green)' }}>
            🔗 {t.familySettings.shareLink}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '15px' }}>👨‍👩‍👧‍👦 {t.familySettings.title}</h3>
        
        {/* Список участников */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {members.map(m => (
            <div key={m.id} style={memberCardStyle}>
              {editId === m.id ? (
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <input 
                    autoFocus
                    defaultValue={m.name} 
                    onBlur={(e) => updateMember(m.id, e.target.value, m.avatar)}
                    onKeyDown={(e) => e.key === 'Enter' && updateMember(m.id, e.currentTarget.value, m.avatar)}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--accent-blue)' }} 
                  />
                  <button onClick={() => setEditId(null)}>❌</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{m.avatar}</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{m.name} {m.role === 'parent' ? '👤' : '⭐️'}</div>
                      <div style={{ fontSize: '11px', opacity: 0.6 }}>
                        {m.role === 'child' ? `${t.familySettings.pointsBalance}: ${m.totalPoints || 0}` : t.familySettings.adminStatus}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setEditId(m.id)} style={iconBtn}>✏️</button>
                    <button onClick={() => deleteMember(m.id)} style={{ ...iconBtn, color: '#ff4d4d' }}>🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Форма добавления */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 0', borderTop: '1px solid var(--border-color)' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.familySettings.namePlaceholder} style={inputStyle} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              value={role} 
              onChange={e => {
                  const r = e.target.value as 'child' | 'parent';
                  setRole(r);
                  setAvatar(r === 'child' ? '👶' : '🧔');
              }} 
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="child">{t.profile.child}</option>
              <option value="parent">{t.profile.parent}</option>
            </select>
            <input value={avatar} onChange={e => setAvatar(e.target.value)} style={{ ...inputStyle, width: '60px', textAlign: 'center' }} />
          </div>
          <button onClick={addMember} style={addBtnStyle}>{t.familySettings.addManual}</button>
        </div>

        {/* Нижняя панель с кнопками помощи и удаления */}
        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px dashed var(--border-color)', textAlign: 'center' }}>
           <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
             <button 
               onClick={() => setShowPrivacy(true)} 
               style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
             >
               Privacy Policy / Tietosuoja
             </button>
             <button 
               onClick={() => setShowInstructions(true)} 
               style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
             >
               ❓ {lang === 'fi' ? 'Ohjeet' : lang === 'ru' ? 'Инструкция' : 'Help'}
             </button>
           </div>
           
           <button 
             onClick={deleteMyAccount}
             style={{ background: 'none', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '8px 15px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}
           >
             {lang === 'fi' ? 'Poista tilini' : 'Удалить мой аккаунт'}
           </button>
        </div>
      </div>

      {/* Модальные окна */}
      {showPrivacy && <PrivacyPolicy lang={lang} onClose={() => setShowPrivacy(false)} />}
      {showInstructions && <Instructions t={t} lang={lang} onClose={() => setShowInstructions(false)} />}
    </div>
  );
};

const inputStyle = { padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' };
const addBtnStyle = { padding: '12px', background: 'var(--accent-green)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, cursor: 'pointer' };
const inviteBtnStyle = { padding: '10px 15px', borderRadius: '12px', border: 'none', background: 'var(--accent-blue)', color: 'white', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: '14px' };
const memberCardStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-color)', borderRadius: '16px' };
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' };