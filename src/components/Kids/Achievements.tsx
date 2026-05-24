import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../db';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, query, where } from 'firebase/firestore';
import styles from './Tasks.module.css'; 
import holdSoundFile from '../../assets/hold.mp3';
import successSoundFile from '../../assets/success.mp3';
import type { TranslationContent } from '../../translations';
import { activateAchievementMutation } from '../../services/server';

interface AchievementItem {
  id: string;
  threshold: number;
  icon: string;
  label: string; // Основное и единственное поле для названия
  type: 'title';
  familyId?: string;
  bonus?: string;
}

interface AchievementsProps {
  t: TranslationContent;
  totalPoints: number;
  userId: string;
  familyId: string;
  lang: 'fi' | 'ru' | 'en';
  isOnline?: boolean;
}

export const Achievements: React.FC<AchievementsProps> = ({ t, totalPoints, userId, familyId, lang, isOnline = true }) => {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [activatedIds, setActivatedIds] = useState<string[]>([]);
  const [holdId, setHoldId] = useState<string | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const holdSound = useRef(new Audio(holdSoundFile)).current;
  const successSound = useRef(new Audio(successSoundFile)).current;
  const visibleItems = userId && familyId ? items : [];
  const visibleActivatedIds = userId ? activatedIds : [];
  const uiText = {
    fi: {
      offline: 'Olet offline-tilassa. Tittelin aktivointi onnistuu, kun yhteys palautuu.',
      offlineShort: 'Offline',
      holdHint: 'Pidä 5s',
    },
    ru: {
      offline: 'Сейчас нет сети. Звание можно активировать после подключения.',
      offlineShort: 'Офлайн',
      holdHint: 'Удерживай 5 сек',
    },
    en: {
      offline: 'You are offline. Titles can be activated after reconnecting.',
      offlineShort: 'Offline',
      holdHint: 'Hold 5s',
    },
  }[lang];

  useEffect(() => {
    if (!userId || userId.trim() === "" || !familyId) return;

    const unsubItems = onSnapshot(
      query(collection(db, "achievements_list"), where("familyId", "==", familyId)),
      (snap) => {
        const nextItems = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AchievementItem))
          .filter((item) => item.type === 'title')
          .sort((a, b) => a.threshold - b.threshold);
        setItems(nextItems);
      },
      (err) => console.error("Achievements query error:", err),
    );

    const userRef = doc(db, "users", userId);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setActivatedIds(snap.data().activatedAchievements || []);
      }
    });

    return () => { unsubItems(); unsubUser(); };
  }, [familyId, userId]);

  const handleStartHold = (item: AchievementItem) => {
    if (!isOnline) return;
    if (totalPoints < item.threshold || visibleActivatedIds.includes(item.id)) return;

    setHoldId(item.id);
    holdSound.currentTime = 0;
    holdSound.loop = true;
    holdSound.play().catch(() => {});
    
    timerRef.current = window.setTimeout(async () => {
      holdSound.pause();
      successSound.currentTime = 0;
      successSound.play().catch(() => {});
      
      const userRef = doc(db, "users", userId);
      await activateAchievementMutation({
        achievementId: item.id,
        userId,
      }, async () => updateDoc(userRef, {
        activatedAchievements: arrayUnion(item.id)
      }));

      setHoldId(null);
    }, 5000);
  };

  const handleStopHold = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setHoldId(null);
    holdSound.pause();
    holdSound.loop = false;
  };

  return (
    <div style={{ padding: '10px' }}>
      <h3 style={{ color: 'var(--accent-orange)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <span>{t.achievements.title}</span>
        <span style={{ fontSize: '14px' }}>{totalPoints} XP</span>
      </h3>

      {!isOnline ? (
        <div className={styles.offlineActionBanner}>
          <span aria-hidden="true">📴</span>
          <span>{uiText.offline}</span>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {visibleItems.map((item) => {
          const isReached = totalPoints >= item.threshold;
          const isActivated = visibleActivatedIds.includes(item.id);
          const isHolding = holdId === item.id;
          const progress = Math.min((totalPoints / item.threshold) * 100, 100);

          return (
            <div 
              key={item.id}
              onMouseDown={() => handleStartHold(item)}
              onMouseUp={handleStopHold}
              onMouseLeave={handleStopHold}
              onTouchStart={() => handleStartHold(item)}
              onTouchEnd={handleStopHold}
              className={`
                ${styles.glassCard} 
                ${isReached ? styles.glassCardUnlocked : ''} 
                ${isHolding ? styles.shaking : ''}
                ${isHolding ? styles.glassCardHolding : ''}
                ${!isOnline ? styles.glassCardOffline : ''}
              `}
              style={{
                cursor: isOnline && isReached && !isActivated ? 'pointer' : 'default',
                opacity: isReached ? 1 : 0.8
              }}
            >
              {!isReached && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: `${progress}%`, 
                  background: 'linear-gradient(90deg, rgba(255,152,0,0) 0%, rgba(255,152,0,0.1) 100%)',
                  zIndex: 0, transition: 'width 0.5s ease'
                }} />
              )}

              {isHolding && <div className={styles.neonProgressBar} />}

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  fontSize: '40px', 
                  filter: isReached ? 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' : 'grayscale(1) opacity(0.4)',
                  transition: 'all 0.5s ease'
                }}>
                  {item.icon}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '18px', 
                    color: isReached ? '#fff' : 'rgba(255,255,255,0.4)',
                    textShadow: isReached ? '0 0 10px rgba(255,255,255,0.2)' : 'none'
                  }}>
                    {/* Приоритет: 1. Ключ из переводов, 2. Старое поле labelRu, 3. ID */}
                  {item.label || item.id}
                  </div>
                  
                  {item.bonus && (
                    <div style={{ 
                      marginTop: '5px', 
                      padding: '6px 12px', 
                      borderRadius: '12px',
                      background: isActivated ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.05)',
                      fontSize: '13px', 
                      color: isActivated ? '#4ade80' : 'rgba(255,255,255,0.3)',
                      border: isActivated ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid transparent'
                    }}>
                      🎁 {isActivated ? item.bonus : !isOnline && isReached
                          ? uiText.offlineShort
                          : isReached
                          ? uiText.holdHint
                          : `${t.achievements.needed} ${item.threshold - totalPoints} XP`}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '24px', filter: isReached ? 'none' : 'opacity(0.2)' }}>
                   {isActivated ? '🌟' : isReached ? '🔓' : '🔒'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fill5sec {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};
