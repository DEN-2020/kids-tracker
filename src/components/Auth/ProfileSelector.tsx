import React from 'react';
import type { TranslationContent } from '../../translations';

interface UserProfile {
  uid: string;
  name: string;
  role: 'child' | 'parent';
  avatar: string;
  familyId: string;
}

interface ProfileSelectorProps {
  profile: UserProfile;
  t: TranslationContent; // Добавляем пропс перевода
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ profile, t }) => {
  return (
    <div style={{ 
      marginBottom: '20px', 
      padding: '15px', 
      borderRadius: '20px', 
      backgroundColor: 'var(--card-bg)', 
      border: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '32px' }}>{profile.avatar}</span>
        <div>
          <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{profile.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {profile.role === 'parent' 
              ? `👨‍👩‍👧‍👦 ${t.profile.roleLabel}: ${t.profile.parent}` 
              : `👶 ${t.profile.roleLabel}: ${t.profile.child}`}
          </div>
        </div>
      </div>
      
      <div style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '10px', color: 'var(--text-secondary)' }}>
        {t.profile.familyIdLabel}: <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{profile.familyId}</span>
      </div>
    </div>
  );
};