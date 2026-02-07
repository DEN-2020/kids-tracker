import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import styles from './Admin.module.css';
import type { TranslationContent } from '../../translations';

interface Achievement {
  id: string;
  threshold: number;
  icon: string;
  label: string; // Одно название для всех
  type: 'title';
  bonus?: string;
}

const QUICK_ICONS = ['🏆', '💎', '⭐', '🥇', '🥈', '🥉', '🚀', '👑', '🧙', '🦸', '👾', '🌟'];

export const AchievementsSettings = ({ t }: { t: TranslationContent }) => {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояние формы
  const [label, setLabel] = useState('');
  const [bonus, setBonus] = useState('');
  const [threshold, setThreshold] = useState(100);
  const [icon, setIcon] = useState('🏆');

  const adm = t.admin || {};

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "achievements_list"), (snap) => {
      const data = snap.docs
        .map(d => {
          const itemData = d.data();
          return { 
            id: d.id, 
            ...itemData,
            // Поддержка старых данных (если раньше был translationKey)
            label: itemData.label || itemData.labelRu || itemData.translationKey || ''
          } as Achievement;
        })
        .filter(item => item.type === 'title');
      setItems(data.sort((a, b) => a.threshold - b.threshold));
      setLoading(false);
    });
    return unsub;
  }, []);

  const saveItem = async () => {
    if (!label) return;
    const id = `title_${Date.now()}`;
    await setDoc(doc(db, "achievements_list", id), {
      threshold,
      icon,
      label, 
      bonus,
      type: 'title'
    });
    setLabel('');
    setBonus('');
  };

  if (loading) return <div className={styles.spinner}>⌛</div>;

  return (
    <div className={styles.card}>
      <h3 style={{ color: 'var(--accent-orange)' }}>{t.admin.levelsTitle}</h3>
      
      <div className={styles.mainForm} style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '20px', marginBottom: '20px' }}>
        
        {/* ВЫБОР ИКОНКИ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px', background: '#fff', padding: '10px', borderRadius: '12px' }}>
          {QUICK_ICONS.map(i => (
            <span 
              key={i} 
              onClick={() => setIcon(i)}
              style={{ 
                fontSize: '24px', cursor: 'pointer', padding: '5px',
                borderRadius: '8px', background: icon === i ? '#fff3e0' : 'transparent',
                border: icon === i ? '1px solid var(--accent-orange)' : '1px solid transparent'
              }}
            >{i}</span>
          ))}
        </div>

        {/* НАЗВАНИЕ УРОВНЯ */}
        <div className={styles.inputRow}>
          <input 
            className={styles.labelInput} 
            value={label} 
            onChange={e => setLabel(e.target.value)} 
            // Используем универсальный placeholder из переводов
            placeholder={adm.placeholderName || "Название уровня..."} 
          />
        </div>

        <div className={styles.inputRow} style={{ marginTop: '10px' }}>
          <input 
            className={styles.labelInput} 
            value={bonus} 
            onChange={e => setBonus(e.target.value)} 
            placeholder={adm.placeholderBonus || "🎁 Приз за достижение..."} 
            style={{ borderColor: 'var(--accent-green)' }}
          />
        </div>

        <div style={{ marginTop: '10px' }}>
          <span style={{ fontSize: '12px' }}>{t.achievements.needed} (XP)</span>
          <input 
            type="number" 
            className={styles.numberInput} 
            value={threshold} 
            onChange={e => setThreshold(Number(e.target.value))} 
          />
        </div>

        <button onClick={saveItem} className={styles.submitBtn} style={{ marginTop: '15px', background: 'var(--accent-orange)' }}>
          ➕ {adm.btnAdd}
        </button>
      </div>

      {/* СПИСОК УРОВНЕЙ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => (
          <div key={item.id} className={styles.templateItem} style={{ borderLeft: '4px solid var(--accent-orange)' }}>
            <div className={styles.templateInfo}>
              <span style={{ fontSize: '28px' }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 'bold' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--accent-orange)', fontWeight: 'bold' }}>
                  {item.threshold} XP
                </div>
                {item.bonus && (
                  <div style={{ fontSize: '11px', color: 'var(--accent-green)' }}>
                    🎁 {item.bonus}
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={() => window.confirm(t.familySettings.deleteConfirm) && deleteDoc(doc(db, "achievements_list", item.id))} 
              className={styles.deleteBtn}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};