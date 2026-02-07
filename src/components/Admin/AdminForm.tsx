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
  onClick: () => void;
  activeColor: string;
}

interface AdminFormProps {
  t: TranslationContent;
  currentChild: UserProfile | undefined;
  onSubmit: (e: React.FormEvent) => void;
  editingId: string | null;
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

const ActionButton = ({ active, icon, label, onClick, activeColor }: ActionButtonProps) => (
  <div 
    onClick={onClick}
    className={styles.actionButton}
    style={{
      border: active ? `2px solid ${activeColor}` : '2px solid var(--border-color)',
      backgroundColor: active ? `${activeColor}15` : 'var(--card-bg)',
      cursor: 'pointer'
    }}
  >
    <span className={styles.actionIcon}>{icon}</span>
    <span 
      className={styles.actionLabel}
      style={{ color: active ? activeColor : 'var(--text-secondary)' }}
    >
      {label}
    </span>
  </div>
);

export const AdminForm = ({ t, currentChild, onSubmit, editingId, onCancel, formState, setters }: AdminFormProps) => {
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
            <span key={icon} onClick={() => setters.setNewIcon(icon)} style={{ 
              fontSize: '24px', 
              cursor: 'pointer', 
              transform: formState.newIcon === icon ? 'scale(1.3)' : 'scale(1)', 
              transition: 'transform 0.2s', 
              filter: formState.newIcon === icon ? 'none' : 'grayscale(0.5) opacity(0.7)' 
            }}>
              {icon}
            </span>
          ))}
        </div>

        <div className={styles.inputRow}>
          <input className={styles.iconInput} value={formState.newIcon} onChange={e => setters.setNewIcon(e.target.value)} placeholder="📝" />
          <input className={styles.labelInput} value={formState.newLabel} onChange={e => setters.setNewLabel(e.target.value)} placeholder={t.taskName} />
        </div>

        <div className={styles.gridRow}>
          <div className={styles.inputGroup}>
            <span className={styles.inputHint}>{t.adminForm.pointsLabel}</span>
            <input className={styles.numberInput} type="number" value={formState.newPoints} onChange={e => setters.setNewPoints(Number(e.target.value))} />
          </div>
          <div className={styles.inputGroup}>
            <span className={styles.inputHint}>{t.adminForm.minutesLabel}</span>
            <input className={styles.numberInput} type="number" value={formState.newDuration} onChange={e => setters.setNewDuration(Number(e.target.value))} />
          </div>
        </div>

        {/* ActionButtons остаются так же (Daily, Auto, Payout - обычно понятны без перевода, но можно и их вынести) */}
        <div className={styles.buttonGroup}>
          <ActionButton active={formState.autoRepeat} icon="🔄" label="Daily" activeColor="#FF9800" onClick={() => setters.setAutoRepeat(!formState.autoRepeat)} />
          <ActionButton active={formState.autoApprove} icon="⚡" label="Auto" activeColor="#2196F3" onClick={() => setters.setAutoApprove(!formState.autoApprove)} />
          <ActionButton active={formState.autoPayout} icon="💰" label="Payout" activeColor="#4CAF50" onClick={() => setters.setAutoPayout(!formState.autoPayout)} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className={styles.submitBtn} style={{ flex: 2 }}>
            {editingId ? t.adminForm.saveBtn : `＋ ${t.adminForm.createBtn}`}
          </button>
          
          {editingId && (
            <button 
              type="button" 
              onClick={onCancel} 
              className={styles.submitBtn} 
              style={{ flex: 1, background: 'var(--text-secondary)', fontSize: '12px' }}
            >
              {t.adminForm.copyAsNewBtn}
            </button>
          )}
        </div>
      </form>
    </section>
  );
};