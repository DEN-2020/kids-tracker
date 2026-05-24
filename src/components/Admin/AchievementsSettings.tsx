import { useState, useEffect } from 'react';
import { db } from '../../db';
import { collection, onSnapshot, setDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import styles from './Admin.module.css';
import type { TranslationContent } from '../../translations';
import { deleteCatalogItemMutation, upsertCatalogItemMutation } from '../../services/server';

interface Achievement {
  id: string;
  threshold: number;
  icon: string;
  label: string; // Одно название для всех
  type: 'title';
  bonus?: string;
  familyId?: string;
}

const QUICK_ICONS = ['🏆', '💎', '⭐', '🥇', '🥈', '🥉', '🚀', '👑', '🧙', '🦸', '👾', '🌟'];

export const AchievementsSettings = ({ t, familyId }: { t: TranslationContent; familyId: string }) => {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loadedFamilyId, setLoadedFamilyId] = useState('');

  // Состояние формы
  const [label, setLabel] = useState('');
  const [bonus, setBonus] = useState('');
  const [threshold, setThreshold] = useState(100);
  const [icon, setIcon] = useState('🏆');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const adm = t.admin || {};
  const loading = !!familyId && loadedFamilyId !== familyId;
  const visibleItems = familyId && loadedFamilyId === familyId ? items : [];

  useEffect(() => {
    if (!familyId) return;

    const unsub = onSnapshot(query(collection(db, "achievements_list"), where("familyId", "==", familyId)), (snap) => {
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
      setLoadedFamilyId(familyId);
    });
    return unsub;
  }, [familyId]);

  const saveItem = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setSaveError('Введите название достижения.');
      return;
    }

    if (!familyId) {
      setSaveError('Семья ещё не загрузилась. Попробуй ещё раз.');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    const id = `title_${Date.now()}`;
    const itemData = {
      threshold,
      icon,
      label: trimmedLabel,
      bonus: bonus.trim(),
      familyId,
      type: 'title' as const,
    };

    try {
      await upsertCatalogItemMutation(
        { itemId: id, item: itemData },
        async () => setDoc(doc(db, "achievements_list", id), itemData),
      );
      setLabel('');
      setBonus('');
    } catch (error) {
      console.error('Failed to save achievement', error);
      setSaveError('Не удалось добавить достижение. Попробуй ещё раз.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm(t.familySettings.deleteConfirm)) return;
    await deleteCatalogItemMutation(
      { itemId },
      async () => deleteDoc(doc(db, "achievements_list", itemId)),
    );
  };

  if (loading) return <div className={styles.spinner}>⌛</div>;

  return (
    <div className={styles.card}>
      <h3 style={{ color: 'var(--accent-orange)' }}>{t.admin.levelsTitle}</h3>

      <div className={styles.mainForm} style={{ position: 'relative', background: 'var(--bg-color)', padding: '15px', borderRadius: '20px', marginBottom: '20px' }}>
        {isSaving ? (
          <div className={styles.formBusyOverlay}>
            <div className={styles.formBusyOverlayCard}>
              <span className={styles.inlineSpinner} aria-hidden="true" />
              <span>{t.loading}</span>
            </div>
          </div>
        ) : null}

        {/* ВЫБОР ИКОНКИ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px', background: '#fff', padding: '10px', borderRadius: '12px' }}>
          {QUICK_ICONS.map(i => (
            <span
              key={i}
              onClick={() => {
                if (isSaving) return;
                setIcon(i);
              }}
              style={{
                fontSize: '24px', cursor: isSaving ? 'wait' : 'pointer', padding: '5px',
                borderRadius: '8px', background: icon === i ? '#fff3e0' : 'transparent',
                border: icon === i ? '1px solid var(--accent-orange)' : '1px solid transparent',
                opacity: isSaving ? 0.6 : 1,
              }}
            >{i}</span>
          ))}
        </div>

        {/* НАЗВАНИЕ УРОВНЯ */}
        <div className={styles.inputRow}>
          <input
            className={styles.labelInput}
            value={label}
            onChange={e => {
              setLabel(e.target.value);
              if (saveError) setSaveError('');
            }}
            // Используем универсальный placeholder из переводов
            placeholder={adm.placeholderName || "Название уровня..."}
            disabled={isSaving}
          />
        </div>

        <div className={styles.inputRow} style={{ marginTop: '10px' }}>
          <input
            className={styles.labelInput}
            value={bonus}
            onChange={e => {
              setBonus(e.target.value);
              if (saveError) setSaveError('');
            }}
            placeholder={adm.placeholderBonus || "🎁 Приз за достижение..."}
            disabled={isSaving}
            style={{ borderColor: 'var(--accent-green)' }}
          />
        </div>

        <div style={{ marginTop: '10px' }}>
          <span style={{ fontSize: '12px' }}>{t.achievements.needed} (XP)</span>
          <input
            type="number"
            className={styles.numberInput}
            value={threshold}
            onChange={e => {
              setThreshold(Number(e.target.value));
              if (saveError) setSaveError('');
            }}
            disabled={isSaving}
          />
        </div>

        {saveError ? <div className={`${styles.formMessage} ${styles.formError}`}>{saveError}</div> : null}

        <button onClick={saveItem} className={styles.submitBtn} style={{ marginTop: '15px', background: 'var(--accent-orange)' }} disabled={isSaving}>
          <span className={styles.submitBtnContent}>
            {isSaving ? <span className={styles.inlineSpinner} aria-hidden="true" /> : null}
            <span>{isSaving ? t.loading : `➕ ${adm.btnAdd}`}</span>
          </span>
        </button>
      </div>

      {/* СПИСОК УРОВНЕЙ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visibleItems.map((item) => (
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
              onClick={() => handleDeleteItem(item.id)}
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
