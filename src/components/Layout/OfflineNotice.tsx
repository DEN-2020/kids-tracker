import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const offlineText = {
  fi: 'Offline-tila. Aiemmin avatut tiedot ovat käytettävissä.',
  ru: 'Офлайн-режим. Ранее открытые данные доступны из кеша.',
  en: 'Offline mode. Previously opened data is available from cache.',
} as const;

interface OfflineNoticeProps {
  lang: keyof typeof offlineText;
}

export const OfflineNotice = ({ lang }: OfflineNoticeProps) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-notice" role="status" aria-live="polite">
      <WifiOff size={16} aria-hidden="true" />
      <span>{offlineText[lang]}</span>
    </div>
  );
};
