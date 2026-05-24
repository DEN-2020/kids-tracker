import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const pwaText = {
  fi: {
    install: 'Asenna Kids Tracker laitteelle.',
    installAction: 'Asenna',
    offline: 'Offline-tila. Aiemmin avatut tiedot ovat käytettävissä.',
    offlineReady: 'Sovellus on valmis offline-käyttöön.',
    update: 'Uusi versio on saatavilla.',
    updateAction: 'Päivitä',
    dismiss: 'Sulje',
  },
  ru: {
    install: 'Установить Kids Tracker на устройство.',
    installAction: 'Установить',
    offline: 'Офлайн-режим. Ранее открытые данные доступны из кеша.',
    offlineReady: 'Приложение готово к работе офлайн.',
    update: 'Доступна новая версия приложения.',
    updateAction: 'Обновить',
    dismiss: 'Закрыть',
  },
  en: {
    install: 'Install Kids Tracker on this device.',
    installAction: 'Install',
    offline: 'Offline mode. Previously opened data is available from cache.',
    offlineReady: 'The app is ready to work offline.',
    update: 'A new app version is available.',
    updateAction: 'Update',
    dismiss: 'Dismiss',
  },
} as const;

interface PwaStatusProps {
  lang: keyof typeof pwaText;
}

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

const schedulePwaInit = (callback: () => void) => {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  };

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(callback, { timeout: 3000 });
    return;
  }

  globalThis.setTimeout(callback, 1000);
};

export const PwaStatus = ({ lang }: PwaStatusProps) => {
  const isOnline = useOnlineStatus();
  const { canInstall, dismissInstall, promptInstall } = useInstallPrompt();
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<UpdateServiceWorker | null>(null);
  const text = pwaText[lang];

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    schedulePwaInit(() => {
      if (cancelled) return;

      void import('virtual:pwa-register').then(({ registerSW }) => {
        if (cancelled) return;

        const nextUpdateSW = registerSW({
          immediate: false,
          onNeedRefresh() {
            setUpdateSW(() => nextUpdateSW);
          },
          onOfflineReady() {
            setOfflineReady(true);
          },
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isOnline && !offlineReady && !updateSW && !canInstall) return null;

  return (
    <div className="pwa-toast-stack" aria-live="polite">
      {!isOnline && (
        <div className="pwa-toast pwa-toast-warning" role="status">
          <WifiOff size={16} aria-hidden="true" />
          <span>{text.offline}</span>
        </div>
      )}

      {updateSW && (
        <div className="pwa-toast pwa-toast-info" role="status">
          <RefreshCw size={16} aria-hidden="true" />
          <span>{text.update}</span>
          <button className="pwa-toast-action" type="button" onClick={() => void updateSW(true)}>
            {text.updateAction}
          </button>
          <button
            aria-label={text.dismiss}
            className="pwa-toast-icon"
            type="button"
            onClick={() => setUpdateSW(null)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {offlineReady && (
        <div className="pwa-toast pwa-toast-success" role="status">
          <Download size={16} aria-hidden="true" />
          <span>{text.offlineReady}</span>
          <button
            aria-label={text.dismiss}
            className="pwa-toast-icon"
            type="button"
            onClick={() => setOfflineReady(false)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {canInstall && (
        <div className="pwa-toast pwa-toast-info" role="status">
          <Download size={16} aria-hidden="true" />
          <span>{text.install}</span>
          <button className="pwa-toast-action" type="button" onClick={() => void promptInstall()}>
            {text.installAction}
          </button>
          <button
            aria-label={text.dismiss}
            className="pwa-toast-icon"
            type="button"
            onClick={dismissInstall}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};
