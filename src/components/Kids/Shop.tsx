import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../firebase';
// Исправлен импорт типов (добавлено type)
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import styles from './Tasks.module.css'; 
import holdSoundFile from '../../assets/hold.mp3';
import successSoundFile from '../../assets/success.mp3';
import type { TranslationContent } from '../../translations';

interface ShopItem {
  id: string;
  threshold: number;
  icon: string;
  type: 'reward' | 'exchange';
  label?: string;
  labelRu?: string;
  labels?: { [key: string]: string };
  description?: string;
}

interface ShopProps {
  t: TranslationContent;
  currentBalance: number;
  userId: string;
  lang: string;
}

export const Shop: React.FC<ShopProps> = ({ t, currentBalance, userId, lang }) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [shakingErrorId, setShakingErrorId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const holdSound = useRef(new Audio(holdSoundFile)).current;
  const successSound = useRef(new Audio(successSoundFile)).current;

  useEffect(() => {
    console.log("SHOP: Start listening. User:", userId);
    const unsub = onSnapshot(collection(db, "achievements_list"), (snap) => {
      const data = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
        id: d.id,
        ...d.data()
      } as ShopItem))
      .filter(item => item.type === 'reward' || item.type === 'exchange')
      .sort((a, b) => a.threshold - b.threshold);

      setItems(data);
      setIsLoaded(true);
    }, (err) => {
      console.error("SHOP Error:", err);
      setIsLoaded(true);
    });
    return () => unsub();
  }, [userId]);

  const getItemName = (item: ShopItem) => {
    return item.label || item.labelRu || (item.labels ? (item.labels[lang] || item.labels['ru']) : '—');
  };

  const handleStartHold = (item: ShopItem) => {
    if (currentBalance < item.threshold) {
      setShakingErrorId(item.id);
      setTimeout(() => setShakingErrorId(null), 500);
      return;
    }
    setHoldId(item.id);
    holdSound.currentTime = 0;
    holdSound.play().catch(() => {});
    timerRef.current = window.setTimeout(async () => {
      const itemName = getItemName(item);
      holdSound.pause();
      successSound.currentTime = 0;
      successSound.play().catch(() => {});
      await addDoc(collection(db, "approvals"), {
        userId,
        label: `${t.admin.typeReward}: ${itemName}`,
        points: -item.threshold,
        icon: item.icon,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
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
        <span style={{ color: 'var(--accent-green)' }}>{t.admin.shopSettingsTitle}</span> 
        <span style={{ color: 'var(--text-main)' }}>💰 {currentBalance}</span>
      </h3>
      
      <div className={styles.tasksGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
        {items.map((item) => {
          const itemName = getItemName(item);
          // ТЕПЕРЬ ПЕРЕМЕННЫЕ ИСПОЛЬЗУЮТСЯ - ОШИБКИ ИСЧЕЗНУТ
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
                ${canAfford ? (styles.shopCardAffordable || '') : (styles.shopCardLocked || '')}
                ${isHolding ? (styles.shakingIntense || '') : ''} 
                ${isError ? (styles.insufficientFunds || '') : ''}
              `}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: isError ? '2px solid red' : '1px solid #444',
                padding: '15px',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '140px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Прогресс бар при удержании */}
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
                background: canAfford ? 'var(--accent-green)' : '#666',
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