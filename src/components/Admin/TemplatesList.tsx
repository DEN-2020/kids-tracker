import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../db';
import styles from './Admin.module.css';
// 1. Добавляем импорт типа
import type { TranslationContent } from '../../translations'; 

interface DbTask {
  id: string;
  label: string;
  points: number;
  icon?: string;
  duration?: number;
  isAutoRepeat?: boolean;
  isAutoApprove?: boolean;
  isAutoPayout?: boolean;
  assignedTo?: string;
  lastCompleted?: string;
}

interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  role: 'child' | 'parent';
}

interface TemplatesListProps {
  t: TranslationContent; 
  tasks: DbTask[];
  users: UserProfile[];
  selectedChildId: string;
  copyToForm: (task: DbTask) => void;
}

export const TemplatesList = ({ t, tasks, users, selectedChildId, copyToForm }: TemplatesListProps) => {
  // Группируем задачи по владельцам
  const groupedTasks = tasks.reduce((acc, task) => {
    const key = task.assignedTo || 'all';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, DbTask[]>);

  // Сортируем: сначала общие, потом активный ребенок, потом остальные
  const sortedKeys = Object.keys(groupedTasks).sort((a, b) => {
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    if (a === selectedChildId) return -1;
    if (b === selectedChildId) return 1;
    return 0;
  });

  return (
    <div className={styles.templatesContainer}>
      {sortedKeys.map(groupId => {
        const groupTasks = groupedTasks[groupId];
        const owner = users.find(u => u.uid === groupId);
        const isSelectedGroup = groupId === selectedChildId;

        return (
          <div key={groupId} style={{ marginBottom: '25px' }}>
            {/* Заголовок группы */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
                padding: '0 5px'
            }}>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '900', 
                color: isSelectedGroup ? 'var(--accent-blue)' : '#888',
                textTransform: 'uppercase'
              }}>
                {/* 2. Используем перевод для "Всех" или имя владельца */}
                {groupId === 'all' 
                  ? `🌍 ${t.admin.templates}` // Или добавьте специальный ключ в translations.ts
                  : `👤 ${owner?.name || 'User'}`}
              </span>
              <div style={{ flex: 1, height: '1px', background: isSelectedGroup ? 'var(--accent-blue)' : '#eee', opacity: 0.5 }}></div>
            </div>

            {/* Список задач */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupTasks.map(task => (
                <div 
                  key={task.id} 
                  className={`${styles.templateItem} ${task.assignedTo === selectedChildId ? styles.templateSelected : ''}`}
                  style={{ 
                    opacity: (task.assignedTo === selectedChildId || groupId === 'all') ? 1 : 0.8,
                    borderLeft: task.assignedTo === selectedChildId ? '4px solid var(--accent-blue)' : '1px solid #eee'
                  }}
                >
                  <div className={styles.templateInfo}>
                    <span className={styles.templateIcon}>{task.icon || '📝'}</span>
                    <div>
                      <div className={styles.templateLabel}>{task.label}</div>
                      <div className={styles.templateSub}>
                        {task.points} pts {task.isAutoRepeat && ' • 🔄'}
                      </div>
                    </div>
                  </div>

                  <div className={styles.templateActions}>
                    <button onClick={() => copyToForm(task)} className={styles.copyBtn}>📋</button>
                    <button 
                     
                      onClick={() => window.confirm(t.familySettings.deleteConfirm) && deleteDoc(doc(db, "tasks_list", task.id))} 
                      className={styles.deleteBtn}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};