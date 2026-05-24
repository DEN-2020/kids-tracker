import React from 'react';
import type { TranslationContent } from '../../translations';
import styles from './Admin.module.css';

interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  role: 'child' | 'parent';
}

interface ActionButtonProps {
  active: boolean;
  icon: string;
  label: string;
  note: string;
  onClick: () => void;
  activeColor: string;
  disabled?: boolean;
}

interface AdminFormProps {
  t: TranslationContent;
  lang: 'fi' | 'ru' | 'en';
  currentChild: UserProfile | undefined;
  onSubmit: (e: React.FormEvent) => void;
  editingId: string | null;
  isSubmitting: boolean;
  onCancel: () => void; // Добавили функцию отмены
  formState: {
    newLabel: string;
    newPoints: number;
    newIcon: string;
    newDuration: number;
    autoRepeat: boolean;
    autoApprove: boolean;
    autoPayout: boolean;
  };
  setters: {
    setNewLabel: (val: string) => void;
    setNewPoints: (val: number) => void;
    setNewIcon: (val: string) => void;
    setNewDuration: (val: number) => void;
    setAutoRepeat: (val: boolean) => void;
    setAutoApprove: (val: boolean) => void;
    setAutoPayout: (val: boolean) => void;
  };
}

const QUICK_ICONS = ['📝', '🧹', '🐱', '📚', '🏃', '🥦', '🦷', '😴', '🎮', '💡', '🎨', '⚽'];

const ActionButton = ({ active, icon, label, note, onClick, activeColor, disabled = false }: ActionButtonProps) => (
  <div
    onClick={() => {
      if (disabled) return;
      onClick();
    }}
    className={styles.actionButton}
    style={{
      opacity: disabled ? 0.45 : 1,
      border: active ? `2px solid ${activeColor}` : '2px solid var(--border-color)',
      backgroundColor: active ? `${activeColor}15` : 'var(--card-bg)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }}
  >
    <span className={styles.actionIcon}>{icon}</span>
    <span
      className={styles.actionLabel}
      style={{ color: active ? activeColor : 'var(--text-secondary)' }}
    >
      {label}
    </span>
    <span className={styles.actionNote}>{note}</span>
  </div>
);

export const AdminForm = ({ t, lang, currentChild, onSubmit, editingId, isSubmitting, onCancel, formState, setters }: AdminFormProps) => {
  const uiText = {
    fi: {
      pointsHint: 'Kuinka monta pistettä tehtävästä saa.',
      timerHint: 'Valinnainen lapsen ajastin. Ei takaraja eikä pakollinen odotus.',
      repeatLabel: 'Joka päivä',
      repeatNote: 'Palaa huomenna uudelleen.',
      autoLabel: 'Ilman vanhempaa',
      autoNote: 'Lapsi voi merkitä valmiiksi itse.',
      payoutLabel: 'Pisteet heti',
      payoutNote: 'Toimii vain Auto-tilan kanssa.',
      savingLabel: 'Tallennetaan...',
    },
    ru: {
      pointsHint: 'Сколько баллов дать за выполнение.',
      timerHint: 'Необязательный таймер для ребёнка. Не дедлайн и не обязательное ожидание.',
      repeatLabel: 'Каждый день',
      repeatNote: 'Завтра появится снова.',
      autoLabel: 'Без родителя',
      autoNote: 'Ребёнок сможет отметить сам.',
      payoutLabel: 'Баллы сразу',
      payoutNote: 'Работает только вместе с AUTO.',
      savingLabel: 'Сохраняем...',
    },
    en: {
      pointsHint: 'How many points the task gives.',
      timerHint: 'Optional child timer. Not a deadline and not required waiting.',
      repeatLabel: 'Every day',
      repeatNote: 'Shows up again tomorrow.',
      autoLabel: 'No parent',
      autoNote: 'Child can mark it themselves.',
      payoutLabel: 'Points now',
      payoutNote: 'Works only with Auto mode.',
      savingLabel: 'Saving...',
    },
  }[lang];

  const toggleAutoApprove = () => {
    const nextValue = !formState.autoApprove;
    setters.setAutoApprove(nextValue);
    if (!nextValue && formState.autoPayout) {
      setters.setAutoPayout(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.formHeader}>
        <span className={styles.formAvatar}>{currentChild?.avatar || '👤'}</span>
        <div>
          <h3 style={{ margin: 0 }}>
            {editingId ? t.adminForm.editTitle : t.adminForm.createTitle}
          </h3>
          <span className={styles.targetChild}>
            {t.adminForm.forLabel}: {currentChild?.name?.toUpperCase() || '...'}
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className={styles.mainForm}>
        {/* Иконки без изменений */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px', padding: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '12px' }}>
          {QUICK_ICONS.map(icon => (
            <span key={icon} onClick={() => {
              if (isSubmitting) return;
              setters.setNewIcon(icon);
            }} style={{
              fontSize: '24px',
              cursor: isSubmitting ? 'wait' : 'pointer',
              transform: formState.newIcon === icon ? 'scale(1.3)' : 'scale(1)',
              transition: 'transform 0.2s',
              filter: formState.newIcon === icon ? 'none' : 'grayscale(0.5) opacity(0.7)',
              opacity: isSubmitting ? 0.6 : 1,
            }}>
              {icon}
            </span>
          ))}
        </div>

        <div className={styles.inputRow}>
          <input className={styles.iconInput} value={formState.newIcon} onChange={e => setters.setNewIcon(e.target.value)} placeholder="📝" disabled={isSubmitting} />
          <input className={styles.labelInput} value={formState.newLabel} onChange={e => setters.setNewLabel(e.target.value)} placeholder={t.taskName} disabled={isSubmitting} />
        </div>

        <div className={styles.gridRow}>
          <div className={styles.inputGroup}>
            <span className={styles.inputHint}>{t.adminForm.pointsLabel}</span>
            <input className={styles.numberInput} type="number" value={formState.newPoints} onChange={e => setters.setNewPoints(Number(e.target.value))} disabled={isSubmitting} />
            <span className={styles.inputHelp}>{uiText.pointsHint}</span>
          </div>
          <div className={styles.inputGroup}>
            <span className={styles.inputHint}>{t.adminForm.minutesLabel}</span>
            <input className={styles.numberInput} type="number" value={formState.newDuration} onChange={e => setters.setNewDuration(Number(e.target.value))} disabled={isSubmitting} />
            <span className={styles.inputHelp}>{uiText.timerHint}</span>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <ActionButton active={formState.autoRepeat} icon="🔄" label={uiText.repeatLabel} note={uiText.repeatNote} activeColor="#FF9800" onClick={() => setters.setAutoRepeat(!formState.autoRepeat)} disabled={isSubmitting} />
          <ActionButton active={formState.autoApprove} icon="⚡" label={uiText.autoLabel} note={uiText.autoNote} activeColor="#2196F3" onClick={toggleAutoApprove} disabled={isSubmitting} />
          <ActionButton active={formState.autoPayout} disabled={isSubmitting || !formState.autoApprove} icon="💰" label={uiText.payoutLabel} note={uiText.payoutNote} activeColor="#4CAF50" onClick={() => {
            if (!formState.autoApprove) return;
            setters.setAutoPayout(!formState.autoPayout);
          }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className={styles.submitBtn} style={{ flex: 2 }} disabled={isSubmitting}>
            <span className={styles.submitBtnContent}>
              {isSubmitting ? <span className={styles.inlineSpinner} aria-hidden="true" /> : null}
              <span>{isSubmitting ? uiText.savingLabel : editingId ? t.adminForm.saveBtn : `＋ ${t.adminForm.createBtn}`}</span>
            </span>
          </button>

          {editingId && (
            <button
              type="button"
              onClick={onCancel}
              className={styles.submitBtn}
              style={{ flex: 1, background: 'var(--text-secondary)', fontSize: '12px' }}
              disabled={isSubmitting}
            >
              {t.adminForm.copyAsNewBtn}
            </button>
          )}
        </div>
      </form>
    </section>
  );
};
