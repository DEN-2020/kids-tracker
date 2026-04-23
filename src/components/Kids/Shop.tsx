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
}

export const Shop: React.FC<ShopProps> = ({ t, currentBalance, userId, familyId, lang, userRole }) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [shakingErrorId, setShakingErrorId] = useState<string | null>(null);
  const [loadedFamilyId, setLoadedFamilyId] = useState('');
  
  const timerRef = useRef<number | null>(null);
  const holdSound = useRef(new Audio(holdSoundFile)).current;
  const successSound = useRef(new Audio(successSoundFile)).current;
  const isLoaded = !familyId || loadedFamilyId === familyId;
  const visibleItems = isLoaded ? items : [];
  const uiText = {
    fi: {
      purchaseSent: 'Tilaus lähetetty!',
      confirmPurchase: (itemName: string) => `Osta "${itemName}"?`,
    },
    ru: {
      purchaseSent: 'Запрос отправлен!',
      confirmPurchase: (itemName: string) => `Купить "${itemName}"?`,
    },
    en: {
      purchaseSent: 'Request sent!',
      confirmPurchase: (itemName: string) => `Buy "${itemName}"?`,
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
    try {
      successSound.currentTime = 0;
      successSound.play().catch(() => {});

      await submitApprovalMutation({
        familyId,
        icon: item.icon,
        label: `${t.admin.typeReward}: ${itemName}`,
        points: -Number(item.threshold),
        status: 'pending',
        userId,
      }, async () => addDoc(collection(db, "approvals"), {
        userId,
        familyId,
        label: `${t.admin.typeReward}: ${itemName}`,
        points: -Number(item.threshold),
        icon: item.icon,
        status: 'pending',
        createdAt: new Date().toISOString()
      }));

      alert(uiText.purchaseSent);
    } catch (error) {
      console.error("Ошибка покупки:", error);
    }
  };

  const handleStartHold = (item: ShopItem) => {
    if (holdId) return;

    // ЛОГИКА ДЛЯ РОДИТЕЛЯ: Мгновенное подтверждение
    if (userRole === 'parent') {
      const confirmMsg = uiText.confirmPurchase(getItemName(item));
      if (window.confirm(confirmMsg)) {
        executePurchase(item);
      }
      return;
    }

    // ЛОГИКА ДЛЯ РЕБЕНКА
    const price = Number(item.threshold);
    const balance = Number(currentBalance);

    if (balance < price) {
      setShakingErrorId(item.id);
      setTimeout(() => setShakingErrorId(null), 500);
      return;
    }

    setHoldId(item.id);
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
      
      <div className={styles.tasksGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
        {visibleItems.map((item) => {
          const itemName = getItemName(item);
          const isHolding = holdId === item.id;
          const isError = shakingErrorId === item.id;
          const canAfford = currentBalance >= item.threshold;

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
                ${canAfford || userRole === 'parent' ? (styles.shopCardAffordable || '') : (styles.shopCardLocked || '')}
                ${isHolding ? (styles.shakingIntense || '') : ''} 
                ${isError ? (styles.insufficientFunds || '') : ''}
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
                cursor: 'pointer'
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

              <div style={{fontSize: '40px'}}>{item.icon}</div>
              <div style={{fontWeight: 'bold', textAlign: 'center', color: 'white'}}>{itemName}</div>
              
              <div style={{
                background: (canAfford || userRole === 'parent') ? 'var(--accent-green)' : '#666',
                color: 'white',
                padding: '2px 10px',
                borderRadius: '10px',
                marginTop: 'auto',
                fontSize: '14px'
              }}>
                {item.threshold} pts
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
