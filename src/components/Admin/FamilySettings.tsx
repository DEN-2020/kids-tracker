import { useState, useEffect } from 'react';
import { FirebaseError } from 'firebase/app';
import { auth } from '../../firebase'; import { db } from '../../db';
import { 
  collection, doc, setDoc, updateDoc, 
  deleteDoc, onSnapshot, query, where 
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react'; 
import type { TranslationContent } from '../../translations';
import { PrivacyPolicy } from '../Legal/PrivacyPolicy';
import { Instructions } from '../Legal/Instructions';
import {
  deleteFamilyMemberMutation,
  upsertFamilyMemberMutation,
} from '../../services/server';

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

const AVATAR_OPTIONS = ['👶', '🧒', '👦', '👧', '🦁', '🦊', '🦄', '🤖', '🧔', '👩', '👨', '👵', '👴', '🐱', '🐶', '🐯', '🐼'];

export const FamilySettings = ({ familyId, t, profile, lang, handleLogout }: { 
  familyId: string; 
  t: TranslationContent; 
  profile: UserProfile; 
  lang: string;
  handleLogout: () => Promise<void> | void;
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'child' | 'parent'>('child');
  const [avatar, setAvatar] = useState('👶');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const joinLink = `${window.location.origin}${window.location.pathname}?join=${familyId}`;

  useEffect(() => {
    const q = query(collection(db, "users"), where("familyId", "==", familyId));
    return onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    });
  }, [familyId]);

  const AvatarDisplay = ({ src, size = 40 }: { src: string, size?: number }) => (
    <div style={{ 
      width: `${size}px`, height: `${size}px`, borderRadius: '50%', 
      overflow: 'hidden', display: 'flex', alignItems: 'center', 
      justifyContent: 'center', background: 'var(--bg-color)', border: '1px solid var(--border-color)',
      fontSize: `${size * 0.6}px`, flexShrink: 0
    }}>
      {src?.startsWith('http') ? (
        <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        src || '👤'
      )}
    </div>
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(familyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDeleteAccountMessage = (type: 'missing-session' | 'reauth-required' | 'failed' | 'deleting') => {
    if (lang === 'fi') {
      if (type === 'missing-session') return 'Aktiivista käyttäjäistuntoa ei löytynyt. Kirjaudu ulos ja sisään uudelleen.';
      if (type === 'reauth-required') return 'Tilin poistaminen vaatii uuden kirjautumisen. Kirjaudu ulos, kirjaudu takaisin sisään ja yritä uudelleen.';
      if (type === 'deleting') return 'Poistetaan...';
      return 'Tilin poistaminen epäonnistui. Yritä uudelleen.';
    }

    if (lang === 'ru') {
      if (type === 'missing-session') return 'Не удалось подтвердить активную сессию. Выйдите и войдите снова.';
      if (type === 'reauth-required') return 'Для удаления аккаунта нужно заново подтвердить вход. Выйдите, войдите снова и повторите попытку.';
      if (type === 'deleting') return 'Удаление...';
      return 'Не удалось удалить аккаунт. Попробуйте ещё раз.';
    }

    if (type === 'missing-session') return 'Could not confirm the active session. Please sign out and sign in again.';
    if (type === 'reauth-required') return 'Deleting the account requires a fresh sign-in. Please sign out, sign back in, and try again.';
    if (type === 'deleting') return 'Deleting...';
    return 'Could not delete the account. Please try again.';
  };

  const deleteMyAccount = async () => {
    if (isDeletingAccount || !window.confirm(t.familySettings.deleteConfirm)) {
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== profile.uid) {
      alert(getDeleteAccountMessage('missing-session'));
      return;
    }

    setIsDeletingAccount(true);
    try {
      await currentUser.delete();

      try {
        await deleteDoc(doc(db, "users", profile.uid));
      } catch (cleanupError) {
        console.error("Delete profile cleanup error:", cleanupError);
      }

      await Promise.resolve(handleLogout()).catch((logoutError) => {
        console.error("Post-delete logout error:", logoutError);
      });
    } catch (err) {
      console.error("Delete account error:", err);
      if (err instanceof FirebaseError && err.code === 'auth/requires-recent-login') {
        alert(getDeleteAccountMessage('reauth-required'));
        return;
      }

      alert(getDeleteAccountMessage('failed'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const addMember = async () => {
    if (!name.trim()) return;
    const customId = `${role}_${Date.now()}`;
    try {
      await upsertFamilyMemberMutation(
        {
          avatar,
          name: name.trim(),
          role,
        },
        async () => {
          await setDoc(doc(db, "users", customId), {
            name: name.trim(),
            role,
            avatar,
            familyId,
            totalPoints: 0,
            currentBalance: 0
          });
        },
      );
      setName('');
      setAvatar('👶');
    } catch (err) { console.error(err); }
  };

  const startEdit = (m: Member) => {
    setEditId(m.id);
    setEditName(m.name);
    setEditAvatar(m.avatar);
  };

  const saveEdit = async (id: string) => {
    try {
      const member = members.find((entry) => entry.id === id);
      await upsertFamilyMemberMutation(
        {
          avatar: editAvatar,
          memberId: id,
          name: editName,
          role: member?.role === 'parent' ? 'parent' : 'child',
        },
        async () => updateDoc(doc(db, "users", id), { name: editName, avatar: editAvatar }),
      );
      setEditId(null);
    } catch (err) { console.error(err); }
  };

  const deleteMember = async (id: string) => {
    if (id === profile.uid) return;
    if (window.confirm(t.familySettings.deleteConfirm)) {
      await deleteFamilyMemberMutation(
        { memberId: id },
        async () => deleteDoc(doc(db, "users", id)),
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
      
      {/* ПРИГЛАШЕНИЕ */}
      <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '24px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '15px' }}>📢 {t.familySettings.inviteTitle}</h3>
        <div style={{ background: 'white', padding: '12px', display: 'inline-block', borderRadius: '16px', marginBottom: '15px' }}>
          <QRCodeSVG value={joinLink} size={150} />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={handleCopy} style={inviteBtnStyle}>
            {copied ? `✅` : `📋 ${familyId}`}
          </button>
          <button 
            onClick={() => navigator.share?.({ title: 'Kids Tracker', url: joinLink })} 
            style={{ ...inviteBtnStyle, background: 'var(--accent-green)' }}
          >
            🔗 {t.familySettings.shareLink}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '20px' }}>👨‍👩‍👧‍👦 {t.familySettings.title}</h3>
        
        {/* Список участников */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {members.map(m => (
            <div key={m.id} style={{ ...memberCardStyle, border: editId === m.id ? '1px solid var(--accent-blue)' : memberCardStyle.border }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <AvatarDisplay src={editId === m.id ? editAvatar : m.avatar} />
                
                {editId === m.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                    <input 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ background: 'var(--bg-color)', border: '1px solid #444', borderRadius: '8px', padding: '4px 8px', color: 'white' }}
                    />
                    <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', padding: '5px 0' }}>
                      {AVATAR_OPTIONS.slice(0, 10).map(emoji => (
                        <span key={emoji} onClick={() => setEditAvatar(emoji)} style={{ cursor: 'pointer', fontSize: '18px', opacity: editAvatar === emoji ? 1 : 0.4 }}>{emoji}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'white' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{m.role === 'child' ? `💰 ${m.totalPoints || 0}` : t.familySettings.adminStatus}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '5px' }}>
                {editId === m.id ? (
                  <button onClick={() => saveEdit(m.id)} style={{ ...iconBtn, color: 'var(--accent-green)' }}>✅</button>
                ) : (
                  <button onClick={() => startEdit(m)} style={iconBtn}>✏️</button>
                )}
                <button 
                  onClick={() => deleteMember(m.id)} 
                  style={{ ...iconBtn, color: '#ff4d4d', opacity: m.id === profile.uid ? 0.2 : 1 }}
                  disabled={m.id === profile.uid}
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {/* Форма добавления */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px 0', borderTop: '1px solid var(--border-color)' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.familySettings.namePlaceholder} style={inputStyle} />
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '5px' }}>
            {AVATAR_OPTIONS.map(emoji => (
              <button key={emoji} onClick={() => setAvatar(emoji)} style={{ fontSize: '22px', background: avatar === emoji ? 'var(--accent-blue)' : 'transparent', border: '1px solid #444', borderRadius: '12px', padding: '6px', cursor: 'pointer' }}>{emoji}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select value={role} onChange={e => setRole(e.target.value as 'child' | 'parent')} style={{ ...inputStyle, flex: 1 }}>
              <option value="child">{t.profile.child}</option>
              <option value="parent">{t.profile.parent}</option>
            </select>
            <button onClick={addMember} style={{ ...addBtnStyle, flex: 1 }}>{t.familySettings.addManual}</button>
          </div>
        </div>

        {/* Секция помощи и удаления (ИСПОЛЬЗУЕМ ВСЕ ПЕРЕМЕННЫЕ) */}
        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px dashed var(--border-color)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
            <button onClick={() => setShowPrivacy(true)} style={helpBtnStyle}>Privacy Policy</button>
            <button onClick={() => setShowInstructions(true)} style={helpBtnStyle}>
              ❓ {lang === 'fi' ? 'Ohjeet' : lang === 'ru' ? 'Инструкция' : 'Help'}
            </button>
          </div>
          <button
            onClick={deleteMyAccount}
            style={{ ...deleteAccBtnStyle, opacity: isDeletingAccount ? 0.7 : 1, cursor: isDeletingAccount ? 'wait' : 'pointer' }}
            disabled={isDeletingAccount}
          >
            {isDeletingAccount
              ? getDeleteAccountMessage('deleting')
              : lang === 'fi'
                ? 'Poista tilini'
                : lang === 'en'
                  ? 'Delete my account'
                  : 'Удалить мой аккаунт'}
          </button>
        </div>
      </div>

      {showPrivacy && <PrivacyPolicy lang={lang} onClose={() => setShowPrivacy(false)} />}
      {showInstructions && <Instructions t={t} lang={lang} onClose={() => setShowInstructions(false)} />}
    </div>
  );
};

const inviteBtnStyle = { padding: '10px 18px', borderRadius: '15px', border: 'none', background: 'var(--accent-blue)', color: 'white', fontWeight: 'bold' as const, cursor: 'pointer' };
const inputStyle = { padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'white' };
const addBtnStyle = { background: 'var(--accent-green)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, cursor: 'pointer' };
const memberCardStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' };
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '5px' };
const helpBtnStyle = { background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' };
const deleteAccBtnStyle = { background: 'none', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '8px 15px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' };
