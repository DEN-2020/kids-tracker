import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import styles from './Admin.module.css';
import type { TranslationContent } from '../../translations';

interface ShopItem {
  id: string;
  threshold: number;
  icon: string;
  type: 'reward' | 'exchange';
  label: string;
  description?: string; 
  valueInEuro?: number;
}

const SHOP_ICONS = ['🎁', '🍦', '🎮', '🚲', '🎬', '💶', '🍕', '🧸', '🕙', '📱', '⚽', '🍩'];

export const ShopSettings = ({ t }: { t: TranslationContent }) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояние формы
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState(''); // Состояние для описания
  const [threshold, setThreshold] = useState(50);
  const [icon, setIcon] = useState('🎁');
  const [type, setType] = useState<'reward' | 'exchange'>('reward');
  const [euroValue, setEuroValue] = useState(0);

  const adm = t.admin || {}; 

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "achievements_list"), (snap) => {
      const data = snap.docs.map(d => {
        const itemData = d.data();
        return { 
          id: d.id, 
          ...itemData,
          label: itemData.label || itemData.labels?.ru || itemData.labelRu || ''
        } as ShopItem;
      });
      
      const filtered = data
        .filter(item => item.type === 'reward' || item.type === 'exchange')
        .sort((a, b) => a.threshold - b.threshold);
        
      setItems(filtered);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveItem = async () => {
    if (!label) return;
    const id = `${type}_${Date.now()}`;
    await setDoc(doc(db, "achievements_list", id), {
      threshold,
      icon,
      type,
      label,
      description, // Сохраняем описание
      ...(type === 'exchange' && { valueInEuro: euroValue })
    });
    setLabel(''); 
    setDescription(''); // Сбрасываем поле
    setEuroValue(0);
  };

  if (loading) return <div className={styles.spinner}>⌛</div>;

  return (
    <div className={styles.card} style={{ borderTop: '4px solid var(--accent-green)' }}>
      <h3 style={{ color: 'var(--accent-green)' }}>
        🛒 {adm.shopSettingsTitle}
      </h3>

      <div className={styles.mainForm} style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '20px', marginBottom: '20px' }}>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button onClick={() => setType('reward')} className={styles.actionButton} 
            style={{ flex: 1, background: type === 'reward' ? 'var(--accent-green)' : 'white', color: type === 'reward' ? 'white' : 'black' }}>
            🎁 {adm.typeReward}
          </button>
          <button onClick={() => setType('exchange')} className={styles.actionButton} 
            style={{ flex: 1, background: type === 'exchange' ? 'var(--accent-blue)' : 'white', color: type === 'exchange' ? 'white' : 'black' }}>
            💶 {adm.typeMoney}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
          {SHOP_ICONS.map(i => (
            <span key={i} onClick={() => setIcon(i)} style={{ fontSize: '24px', cursor: 'pointer', padding: '5px', borderRadius: '8px', background: icon === i ? '#e8f5e9' : 'transparent', border: icon === i ? '1px solid var(--accent-green)' : '1px solid transparent' }}>{i}</span>
          ))}
        </div>

        {/* Название */}
        <input 
          className={styles.labelInput} 
          value={label} 
          onChange={e => setLabel(e.target.value)} 
          placeholder={adm.placeholderName} 
          style={{ marginBottom: '10px' }} 
        />

        {/* Новое поле: Описание */}
        <input 
          className={styles.labelInput} 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          placeholder={adm.placeholderDesc} 
          style={{ marginBottom: '10px', fontSize: '14px', borderColor: '#eee' }} 
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '11px' }}>{adm.labelPricePoints}</span>
            <input type="number" className={styles.numberInput} value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
          </div>
          {type === 'exchange' && (
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '11px' }}>{adm.labelAmountEuro}</span>
              <input type="number" className={styles.numberInput} value={euroValue} onChange={e => setEuroValue(Number(e.target.value))} />
            </div>
          )}
        </div>

        <button onClick={saveItem} className={styles.submitBtn} style={{ marginTop: '15px', background: 'var(--accent-green)' }}>
          ➕ {adm.btnAdd}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => (
          <div key={item.id} className={styles.templateItem} style={{ borderLeft: `4px solid ${item.type === 'reward' ? 'var(--accent-green)' : 'var(--accent-blue)'}` }}>
            <div className={styles.templateInfo}>
              <span style={{ fontSize: '24px' }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.label}</div>
                {item.description && (
                  <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>{item.description}</div>
                )}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {item.threshold} pts {item.valueInEuro ? ` → ${item.valueInEuro}€` : ''}
                </div>
              </div>
            </div>
            <button 
              onClick={() => window.confirm(t.familySettings.deleteConfirm) && deleteDoc(doc(db, "achievements_list", item.id))} 
              className={styles.deleteBtn}
            >&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
};