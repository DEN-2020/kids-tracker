import { useState, useEffect } from 'react';
import { db } from '../../db';
import { 
  collection, addDoc, deleteDoc, doc, 
  updateDoc, onSnapshot, query, where
} from 'firebase/firestore';
import type { TranslationContent } from '../../translations';

import { AdminForm } from './AdminForm';
import { TemplatesList } from './TemplatesList';
import { AchievementsSettings } from './AchievementsSettings';
import { ShopSettings } from './ShopSettings';
import styles from './Admin.module.css';
import { isRecordedToday } from '../../utils/dayKey';
import { completeTransaction } from '../../services/database';
import { clearTasksMutation, upsertTaskMutation } from '../../services/server';

interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  role: 'child' | 'parent';
  familyId?: string;
}

interface AdminPanelProps {
  t: TranslationContent;
  selectedChildId: string;
  familyId: string;
  mode: 'check' | 'edit' | 'shop' | 'levels';
  lang: 'fi' | 'ru' | 'en';
}

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
  lastCompletedAt?: Date | { toDate: () => Date } | string;
  familyId?: string;
}

interface ApprovalRequest {
  id: string;
  label: string;
  points: number;
  taskId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  userId: string;
  icon?: string;
  familyId?: string;
}

export const AdminPanel = ({ t, selectedChildId, familyId, mode, lang }: AdminPanelProps) => {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [newLabel, setNewLabel] = useState('');
  const [newPoints, setNewPoints] = useState(10);
  const [newIcon, setNewIcon] = useState('📝');
  const [newDuration, setNewDuration] = useState<number>(0);
  const [autoRepeat, setAutoRepeat] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoPayout, setAutoPayout] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveTaskErrorByLang = {
    fi: 'Tehtävän tallennus epäonnistui',
    ru: 'Не удалось сохранить задачу',
    en: 'Failed to save task',
  } as const;

  useEffect(() => {
    if (!familyId) return;

    const unsubTasks = onSnapshot(query(collection(db, "tasks_list"), where("familyId", "==", familyId)), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as DbTask[]);
    });
    const unsubApps = onSnapshot(query(collection(db, "approvals"), where("familyId", "==", familyId)), (snap) => {
      setApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ApprovalRequest[]);
    });
    const unsubUsers = onSnapshot(query(collection(db, "users"), where("familyId", "==", familyId)), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
    });
    return () => { unsubTasks(); unsubApps(); unsubUsers(); };
  }, [familyId]);

  const scopedTasks = familyId ? tasks : [];
  const scopedApprovals = familyId ? approvals : [];
  const scopedUsers = familyId ? users : [];
  const currentChild = scopedUsers.find(u => u.uid === selectedChildId);

  const childTasks = scopedTasks.filter(t => t.assignedTo === selectedChildId || t.assignedTo === 'all');
  const maxPointsToday = childTasks.reduce((acc, t) => acc + t.points, 0);
  const earnedToday = childTasks
    .filter(t => isRecordedToday(t.lastCompleted, t.lastCompletedAt))
    .reduce((acc, t) => acc + t.points, 0);
  const adminProgressPercent = maxPointsToday > 0 ? Math.round((earnedToday / maxPointsToday) * 100) : 0;

  const copyToForm = (task: DbTask) => {
    setNewLabel(task.label);
    setNewPoints(task.points);
    setNewIcon(task.icon || '📝');
    setNewDuration(task.duration || 0);
    setAutoRepeat(!!task.isAutoRepeat);
    setAutoApprove(!!task.isAutoApprove);
    setAutoPayout(!!task.isAutoPayout);
    setEditingId(task.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

const handleFinalApprove = async (app: ApprovalRequest) => {
  if (!app.userId) return;

  // 1. Оптимистичное обновление: сразу убираем из списка на экране
  setApprovals(prev => prev.filter(item => item.id !== app.id));

  try {
    await completeTransaction(app.id, app.userId, app.points, app.taskId, {
      familyId,
      label: app.label,
    });
  } catch (err) { 
    console.error("Ошибка при одобрении:", err); 
    // В случае ошибки можно перезагрузить данные из базы, чтобы запрос вернулся в список
  }
};

const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !selectedChildId || !familyId) return;

    // Подготавливаем данные
    const taskData = { 
      label: newLabel, 
      points: Number(newPoints), 
      icon: newIcon,
      duration: newDuration > 0 ? Number(newDuration) : null,
      isAutoRepeat: autoRepeat, 
      isAutoApprove: autoApprove,
      isAutoPayout: autoPayout, 
      assignedTo: selectedChildId,
      familyId,
    };

    try {
      await upsertTaskMutation(
        { taskId: editingId, task: taskData },
        async () => {
          if (editingId) {
            await updateDoc(doc(db, "tasks_list", editingId), taskData);
            return;
          }

          await addDoc(collection(db, "tasks_list"), taskData);
        },
      );

      setEditingId(null);

      // СБРОС ФОРМЫ (Очищаем поля после успешного сохранения)
      setNewLabel(''); 
      setNewPoints(10); 
      setNewIcon('📝'); 
      setNewDuration(0);
      setAutoRepeat(false); 
      setAutoApprove(false); 
      setAutoPayout(false);

    } catch (error) {
      console.error("Ошибка при сохранении задачи:", error);
      alert(saveTaskErrorByLang[lang]);
    }
  };

  const clearOldTasks = async () => {
    if (!window.confirm(t.admin.clearConfirm)) return;
    const tasksToDelete = tasks.filter(t => 
      (t.assignedTo === selectedChildId || t.assignedTo === 'all') && !t.isAutoRepeat
    );
    try {
      await clearTasksMutation(
        { selectedChildId },
        async () => Promise.all(tasksToDelete.map(task => deleteDoc(doc(db, "tasks_list", task.id)))),
      );
    } catch (err) { console.error(err); }
  };

return (
    <div className={styles.panelContainer}>
      {mode === 'check' && (
        <div className={styles.leftCol}>
          <div className={styles.card} style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--bg-color) 100%)' }}>
            <div className={styles.statsHeader}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {t.admin.dailyLoad} {/* ИСПРАВЛЕНО */}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900' }}>
                    {earnedToday} <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ {maxPointsToday} pts</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--accent-blue)' }}>{adminProgressPercent}%</div>
                </div>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${adminProgressPercent}%`, backgroundColor: adminProgressPercent === 100 ? 'var(--accent-green)' : 'var(--accent-blue)' }} />
            </div>
          </div>

          <section style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--accent-orange)', fontSize: '18px', marginBottom: '15px' }}>
              🔔 {t.admin.requests} ({currentChild?.name || '...'}) {/* ИСПРАВЛЕНО */}
            </h3>
            {scopedApprovals.filter(a => a.userId === selectedChildId).length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--border-color)' }}>
                ☕ {t.admin.noRequests} {/* ИСПРАВЛЕНО */}
              </div>
            ) : (
              scopedApprovals.filter(a => a.userId === selectedChildId).map(a => (
                <div key={a.id} className={styles.requestItem}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{a.icon} {a.label}</div>
                    <div style={{ color: a.points < 0 ? 'var(--accent-orange)' : 'var(--accent-green)', fontWeight: 'bold' }}>
                      {a.points > 0 ? `+${a.points}` : a.points}
                    </div>
                  </div>
                  <button onClick={() => handleFinalApprove(a)} style={{ padding: '12px 20px', background: 'var(--accent-green)', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold' }}>OK</button>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {mode === 'edit' && (
        <div className={styles.leftCol}>
          <AdminForm 
            t={t}
            currentChild={currentChild}
            onSubmit={addTask}
            editingId={editingId}
            onCancel={() => setEditingId(null)}
            formState={{ newLabel, newPoints, newIcon, newDuration, autoRepeat, autoApprove, autoPayout }}
            setters={{ setNewLabel, setNewPoints, setNewIcon, setNewDuration, setAutoRepeat, setAutoApprove, setAutoPayout }}
          />
          <div style={{ marginTop: '30px' }}>
            <button onClick={clearOldTasks} className={styles.clearButton} style={{ marginBottom: '20px', width: '100%' }}>
              🗑️ {t.admin.clearOld} {/* ИСПРАВЛЕНО */}
            </button>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '15px' }}>
              📜 {t.admin.templates}: {/* ИСПРАВЛЕНО */}
            </h4>
            <TemplatesList t={t} tasks={scopedTasks} users={scopedUsers} selectedChildId={selectedChildId} copyToForm={copyToForm} />
          </div>
        </div>
      )}

      {mode === 'shop' && (
        <div className={styles.leftCol}>
          <ShopSettings t={t} familyId={familyId} />
        </div>
      )}

      {mode === 'levels' && (
        <div className={styles.leftCol}>
          <AchievementsSettings t={t} familyId={familyId} />
        </div>
      )}
    </div>
  );
};
