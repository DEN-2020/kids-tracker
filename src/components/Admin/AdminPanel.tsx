import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, addDoc, deleteDoc, doc, 
  setDoc, increment, onSnapshot 
} from 'firebase/firestore';
import type { TranslationContent } from '../../translations';

import { AdminForm } from './AdminForm';
import { TemplatesList } from './TemplatesList';
import { AchievementsSettings } from './AchievementsSettings';
import { ShopSettings } from './ShopSettings';
import styles from './Admin.module.css';

interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  role: 'child' | 'parent';
}

interface AdminPanelProps {
  t: TranslationContent;
  selectedChildId: string;
  mode: 'check' | 'edit' | 'shop' | 'levels';
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
}

interface ApprovalRequest {
  id: string;
  label: string;
  points: number;
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed';
  userId: string;
  icon?: string;
}

export const AdminPanel = ({ t, selectedChildId, mode }: AdminPanelProps) => {
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

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, "tasks_list"), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as DbTask[]);
    });
    const unsubApps = onSnapshot(collection(db, "approvals"), (snap) => {
      setApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ApprovalRequest[]);
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
    });
    return () => { unsubTasks(); unsubApps(); unsubUsers(); };
  }, []);

  const currentChild = users.find(u => u.uid === selectedChildId);
  const today = new Date().toISOString().split('T')[0];

  const childTasks = tasks.filter(t => t.assignedTo === selectedChildId || t.assignedTo === 'all');
  const maxPointsToday = childTasks.reduce((acc, t) => acc + t.points, 0);
  const earnedToday = childTasks
    .filter(t => t.lastCompleted === today)
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
    try {
      const userRef = doc(db, "users", app.userId);
      const isPurchase = app.points < 0;

      if (isPurchase) {
        await setDoc(userRef, { currentBalance: increment(app.points) }, { merge: true });
      } else {
        await setDoc(userRef, { 
          totalPoints: increment(app.points),
          currentBalance: increment(app.points) 
        }, { merge: true });
      }
      
      await addDoc(collection(db, "history"), {
        userId: app.userId,
        label: app.label,
        points: app.points,
        date: new Date(),
        type: isPurchase ? 'spend' : 'earn'
      });

      if (app.taskId) {
        const originalTask = tasks.find(t => t.id === app.taskId);
        if (originalTask) {
          if (originalTask.isAutoRepeat) {
            await setDoc(doc(db, "tasks_list", originalTask.id), { lastCompleted: today }, { merge: true });
          } else {
            await deleteDoc(doc(db, "tasks_list", originalTask.id));
          }
        }
      }
      await deleteDoc(doc(db, "approvals", app.id));
    } catch (err) { console.error(err); }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !selectedChildId) return;
    const taskData = { 
      label: newLabel, points: Number(newPoints), icon: newIcon,
      duration: newDuration > 0 ? Number(newDuration) : null,
      isAutoRepeat: autoRepeat, isAutoApprove: autoApprove,
      isAutoPayout: autoPayout, assignedTo: selectedChildId 
    };
    if (editingId) {
      await setDoc(doc(db, "tasks_list", editingId), taskData, { merge: true });
      setEditingId(null);
    } else {
      await addDoc(collection(db, "tasks_list"), taskData);
    }
    setNewLabel(''); setNewPoints(10); setNewIcon('📝'); setNewDuration(0);
    setAutoRepeat(false); setAutoApprove(false); setAutoPayout(false);
  };

  const clearOldTasks = async () => {
    if (!window.confirm(t.admin.clearConfirm)) return;
    const tasksToDelete = tasks.filter(t => 
      (t.assignedTo === selectedChildId || t.assignedTo === 'all') && !t.isAutoRepeat
    );
    try {
      await Promise.all(tasksToDelete.map(task => deleteDoc(doc(db, "tasks_list", task.id))));
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
            {approvals.filter(a => a.userId === selectedChildId).length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--border-color)' }}>
                ☕ {t.admin.noRequests} {/* ИСПРАВЛЕНО */}
              </div>
            ) : (
              approvals.filter(a => a.userId === selectedChildId).map(a => (
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
            <TemplatesList t={t} tasks={tasks} users={users} selectedChildId={selectedChildId} copyToForm={copyToForm} />
          </div>
        </div>
      )}

      {mode === 'shop' && (
        <div className={styles.leftCol}>
          <ShopSettings t={t} />
        </div>
      )}

      {mode === 'levels' && (
        <div className={styles.leftCol}>
          <AchievementsSettings t={t} />
        </div>
      )}
    </div>
  );
};