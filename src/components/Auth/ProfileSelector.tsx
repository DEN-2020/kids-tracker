import React, { useRef } from 'react';
import { LogOut, Camera, Home, User } from 'lucide-react';
import type { TranslationContent } from '../../translations';
import {
  AvatarUploadValidationError,
  AVATAR_FILE_ACCEPT,
  type AvatarUploadValidationErrorCode,
  validateAvatarFile,
} from '../../services/storage';
import s from './Profile.module.css'; // Импорт стилей

interface UserProfile {
  uid: string;
  name: string;
  role: 'child' | 'parent';
  avatar: string;
  familyId: string;
}

interface ProfileSelectorProps {
  profile: UserProfile;
  lang: 'fi' | 'ru' | 'en';
  t: TranslationContent;
  onLogout: () => void;
  onUploadPhoto?: (file: File) => Promise<void> | void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ profile, lang, t, onLogout, onUploadPhoto }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isImageAvatar = profile.avatar && profile.avatar.startsWith('http');

  const handleAvatarClick = () => fileInputRef.current?.click();

  const getAvatarValidationMessage = (code: AvatarUploadValidationErrorCode) => {
    if (code === 'invalid-type') {
      if (lang === 'ru') return 'Неподдерживаемый формат аватара. Используйте JPG, PNG, WEBP или GIF.';
      if (lang === 'fi') return 'Avatar-kuvan formaatti ei ole tuettu. Käytä JPG-, PNG-, WEBP- tai GIF-tiedostoa.';
      return 'Unsupported avatar format. Use JPG, PNG, WEBP, or GIF.';
    }

    if (lang === 'ru') return 'Файл слишком большой. Максимальный размер аватара: 5 МБ.';
    if (lang === 'fi') return 'Tiedosto on liian suuri. Avatarin enimmäiskoko on 5 Mt.';
    return 'File is too large. Avatar size must be 5 MB or less.';
  };

  const getAvatarUploadErrorMessage = () => {
    if (lang === 'ru') return 'Не удалось загрузить аватар. Попробуйте ещё раз.';
    if (lang === 'fi') return 'Avatarin lataus epäonnistui. Yritä uudelleen.';
    return 'Could not upload the avatar. Please try again.';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];

    if (!file || !onUploadPhoto) {
      input.value = '';
      return;
    }

    try {
      validateAvatarFile(file);
      await Promise.resolve(onUploadPhoto(file));
    } catch (error) {
      if (error instanceof AvatarUploadValidationError) {
        alert(getAvatarValidationMessage(error.code));
      } else {
        console.error('Avatar upload error:', error);
        alert(getAvatarUploadErrorMessage());
      }
    } finally {
      input.value = '';
    }
  };

  return (
    <div className={s.card}>
      <div className={s.topRow}>
        <div className={s.userInfo}>
          {/* Аватар */}
          <div className={s.avatarWrapper} onClick={handleAvatarClick}>
            {isImageAvatar ? (
              <img src={profile.avatar} alt="Profile" className={s.avatarImage} />
            ) : (
              <User size={30} color="var(--accent-blue)" />
            )}
            
            <div className={s.cameraOverlay}>
              <Camera size={20} color="white" />
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept={AVATAR_FILE_ACCEPT}
            style={{ display: 'none' }} 
          />

          <div>
            <div className={s.userName}>{profile.name}</div>
            <span className={`${s.roleBadge} ${profile.role === 'parent' ? s.roleParent : s.roleChild}`}>
              {profile.role === 'parent' ? t.profile.parent : t.profile.child}
            </span>
          </div>
        </div>

        <button className={s.logoutBtn} onClick={onLogout}>
          <LogOut size={20} />
        </button>
      </div>

      {/* Поле Family ID */}
      <div className={s.familySection}>
        <div className={s.familyContent}>
          <Home size={16} color="var(--text-secondary)" />
          <div className={s.familyInfo}>
            <span className={s.familyLabel}>{t.profile.familyIdLabel}</span>
            <span className={s.familyId}>{profile.familyId}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
