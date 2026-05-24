import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../db';
import { collection, onSnapshot, addDoc, query, where } from 'firebase/firestore';
import styles from './Tasks.module.css'; 
import holdSoundFile from '../../assets/hold.mp3';
import successSoundFile from '../../assets/success.mp3';
import type { TranslationContent } from '../../translations';
import { submitApprovalMutation } from '../../services/server';

interface ShopItem {
  id: string;
  threshold: number;
  icon: string;
  type: 'reward' | 'exchange';
  familyId?: string;
  label?: string;
  labelRu?: string;
  labels?: { [key: string]: string };
  description?: string;
}

interface ShopProps {
  t: TranslationContent;
  currentBalance: number;
  userId: string;
  familyId: string;
  lang: 'fi' | 'ru' | 'en';
  userRole?: 'child' | 'parent'; // ДОБАВИЛИ РОЛЬ
  isOnline?: boolean;
}

export const Shop: React.FC<ShopProps> = ({ t, currentBalance, userId, familyId, lang, userRole, isOnline = true }) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [shakingErrorId, setShakingErrorId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [loadedFamilyId, setLoadedFamilyId] = useState('');
  
  const timerRef = useRef<number | null>(null);
  const holdSound = useRef(new Audio(holdSoundFile)).current;
  const successSound = useRef(new Audio(successSoundFile)).current;
  const isLoaded = !familyId || loadedFamilyId === familyId;
  const visibleItems = isLoaded ? items : [];
  const uiText = {
    fi: {
      purchaseSent: 'Ostopyyntö lähetetty.',
      confirmPurchase: (itemName: string) => `Osta "${itemName}"?`,
      insufficientFunds: 'Pisteet eivät riitä tähän ostoon.',
      purchaseFailed: 'Osto epäonnistui. Tarkista saldo ja odottavat pyynnöt.',
      syncing: 'Synkronoidaan pilveen...',
      submitting: 'Lähetetään...',
      offline: 'Olet offline-tilassa. Ostot onnistuvat, kun yhteys palautuu.',
      offlineShort: 'Offline',
    },
    ru: {
      purchaseSent: 'Запрос на покупку отправлен.',
      confirmPurchase: (itemName: string) => `Купить "${itemName}"?`,
      insufficientFunds: 'Недостаточно баллов для этой покупки.',
      purchaseFailed: 'Покупка не прошла. Проверь баланс и ожидающие заявки.',
      syncing: 'Синхронизация с облаком...',
      submitting: 'Отправляем...',
      offline: 'Сейчас нет сети. Покупки можно отправить после подключения.',
      offlineShort: 'Офлайн',
    },
    en: {
      purchaseSent: 'Purchase request sent.',
      confirmPurchase: (itemName: string) => `Buy "${itemName}"?`,
      insufficientFunds: 'Not enough points for this purchase.',
      purchaseFailed: 'Purchase failed. Check the balance and pending requests.',
      syncing: 'Syncing with cloud...',
      submitting: 'Submitting...',
      offline: 'You are offline. Purchases can be sent after reconnecting.',
      offlineShort: 'Offline',
    },
  }[lang];

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "achievements_list"), where("familyId", "==", familyId)),
      (snap) => {
        const nextItems = snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          } as ShopItem))
          .filter((item) => item.type === 'reward' || item.type === 'exchange')
          .sort((a, b) => a.threshold - b.threshold);
        setItems(nextItems);
        setLoadedFamilyId(familyId);
      },
      (err) => {
        console.error("SHOP query error:", err);
        setItems([]);
        setLoadedFamilyId(familyId);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  const getItemName = (item: ShopItem) => {
    return (
      item.labels?.[lang]
      || item.label
      || item.labelRu
      || item.labels?.en
      || item.labels?.ru
      || item.labels?.fi
      || '—'
    );
  };

  // Вынесли логику отправки в отдельную функцию для удобства
  const executePurchase = async (item: ShopItem) => {
    const itemName = getItemName(item);
    const itemTypeLabel = item.type === 'exchange' ? t.admin.typeMoney : t.admin.typeReward;
    const purchaseLabel = `${itemTypeLabel}: ${itemName}`;

    setSubmittingId(item.id);
    setFeedback(null);

    try {
      await submitApprovalMutation({
        icon: item.icon,
        itemId: item.id,
        label: purchaseLabel,
        points: -Number(item.threshold),
        status: 'pending',
        userId,
      }, async () => addDoc(collection(db, "approvals"), {
        approvalType: 'purchase',
        itemId: item.id,
        userId,
        familyId,
        label: purchaseLabel,
        points: -Number(item.threshold),
        icon: item.icon,
        status: 'pending',
        createdAt: new Date().toISOString()
      }));
      successSound.currentTime = 0;
      successSound.play().catch(() => {});
      setFeedback({ tone: 'success', text: uiText.purchaseSent });
    } catch (error) {
      console.error("Ошибка покупки:", error);
      setShakingErrorId(item.id);
      setFeedback({ tone: 'error', text: uiText.purchaseFailed });
      window.setTimeout(() => setShakingErrorId(null), 500);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleStartHold = (item: ShopItem) => {
    if (holdId || submittingId) return;

    if (!isOnline) {
      setFeedback({ tone: 'error', text: uiText.offline });
      setShakingErrorId(item.id);
      setTimeout(() => setShakingErrorId(null), 500);
      return;
    }

    const price = Number(item.threshold);
    const balance = Number(currentBalance);

    if (balance < price) {
      setFeedback({ tone: 'error', text: uiText.insufficientFunds });
      setShakingErrorId(item.id);
      setTimeout(() => setShakingErrorId(null), 500);
      return;
    }

    // ЛОГИКА ДЛЯ РОДИТЕЛЯ: Мгновенное подтверждение
    if (userRole === 'parent') {
      const confirmMsg = uiText.confirmPurchase(getItemName(item));
      if (window.confirm(confirmMsg)) {
        executePurchase(item);
      }
      return;
    }

    setHoldId(item.id);
    setFeedback(null);
    holdSound.currentTime = 0;
    holdSound.play().catch(() => {});

    timerRef.current = window.setTimeout(async () => {
      if (Number(currentBalance) < Number(item.threshold)) {
        setHoldId(null);
        setShakingErrorId(item.id);
        setTimeout(() => setShakingErrorId(null), 500);
        return;
      }

      holdSound.pause();
      await executePurchase(item);
      setHoldId(null);
    }, 5000); 
  };

  const handleStopHold = () => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    setHoldId(null);
    holdSound.pause();
  };

  if (!isLoaded) return <div style={{color: 'white', padding: '20px'}}>Loading...</div>;

  return (
    <div style={{ padding: '10px' }}>
      <h3 className={styles.statsInfo}>
        <span style={{ color: 'var(--accent-green)' }}>{t.shop?.title || 'Shop'}</span> 
        <span style={{ color: 'var(--text-main)' }}> 💰 {currentBalance}</span>
      </h3>

      {feedback ? (
        <div
          style={{
            marginBottom: '14px',
            padding: '12px 14px',
            borderRadius: '14px',
            fontWeight: 700,
            color: feedback.tone === 'success' ? '#c8facc' : '#ffd7d7',
            background: feedback.tone === 'success' ? 'rgba(76, 175, 80, 0.14)' : 'rgba(255, 82, 82, 0.14)',
            border: feedback.tone === 'success'
              ? '1px solid rgba(76, 175, 80, 0.35)'
              : '1px solid rgba(255, 82, 82, 0.35)',
          }}
        >
          {feedback.text}
        </div>
      ) : null}

      {submittingId ? (
        <div className={styles.syncBanner} style={{ marginBottom: '14px' }}>
          <span className={styles.inlineSpinnerLight} aria-hidden="true" />
          <span>{uiText.syncing}</span>
        </div>
      ) : null}

      {!isOnline ? (
        <div className={styles.offlineActionBanner}>
          <span aria-hidden="true">📴</span>
          <span>{uiText.offline}</span>
        </div>
      ) : null}
      
      <div className={styles.tasksGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
        {visibleItems.map((item) => {
          const itemName = getItemName(item);
          const isHolding = holdId === item.id;
          const isError = shakingErrorId === item.id;
          const isSubmitting = submittingId === item.id;
          const canAfford = currentBalance >= item.threshold;
          const isDisabled = isSubmitting || !isOnline;

          return (
            <div 
              key={item.id}
              onMouseDown={() => handleStartHold(item)}
              onMouseUp={handleStopHold}
              onMouseLeave={handleStopHold}
              onTouchStart={() => handleStartHold(item)}
              onTouchEnd={handleStopHold}
              className={`
                ${styles.shopCard || ''} 
                ${canAfford ? (styles.shopCardAffordable || '') : (styles.shopCardLocked || '')}
                ${isHolding ? (styles.shakingIntense || '') : ''} 
                ${isError ? (styles.insufficientFunds || '') : ''}
                ${!isOnline ? styles.taskOffline : ''}
              `}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: isError ? '2px solid red' : isHolding ? '2px solid var(--accent-green)' : '1px solid #444',
                padding: '15px',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '140px',
                position: 'relative',
                overflow: 'hidden',
                touchAction: 'none', 
                userSelect: 'none',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.68 : 1,
                pointerEvents: isSubmitting ? 'none' : 'auto',
              }}
            >
              {isHolding && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '5px',
                  background: 'var(--accent-green)',
                  width: '100%',
                  animation: 'holdProgress 5s linear forwards'
                }} />
              )}

              {isSubmitting ? (
                <div className={styles.shopSubmittingOverlay}>
                  <span className={styles.inlineSpinner} aria-hidden="true" />
                  <span className={styles.shopSubmittingText}>{uiText.submitting}</span>
                </div>
              ) : null}

              <div style={{fontSize: '40px'}}>{item.icon}</div>
              <div style={{fontWeight: 'bold', textAlign: 'center', color: 'white'}}>{itemName}</div>
              
              <div style={{
                background: canAfford ? 'var(--accent-green)' : '#666',
                color: 'white',
                padding: '2px 10px',
                borderRadius: '10px',
                marginTop: 'auto',
                fontSize: '14px'
              }}>
                {isOnline ? `${item.threshold} pts` : uiText.offlineShort}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
