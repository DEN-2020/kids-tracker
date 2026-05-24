
import { useEffect, useState, Suspense, lazy } from 'react';
import { auth } from './firebase';
import { db } from './db'; 
import { doc, collection, onSnapshot, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";

import type { AppProfile, UserProfile, Task, Approval } from './types'; 
import type { TranslationContent } from './translations';
import { completeTransaction, createTaskApproval } from './services/database';
import { Header } from './components/Layout/Header';
import { Navbar } from './components/Layout/Navbar';
import { Footer } from './components/Layout/Footer';
import { useOnlineStatus } from './hooks/useOnlineStatus';

const AppBackground = lazy(() => import('./components/Layout/AppBackground').then(m => ({ default: m.AppBackground })));
const RegisterPage = lazy(() => import('./components/Auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ProfileSelector = lazy(() => import('./components/Auth/ProfileSelector').then(m => ({ default: m.ProfileSelector })));
const TaskList = lazy(() => import('./components/Kids/TaskList').then(m => ({ default: m.TaskList })));
const AdminPanel = lazy(() => import('./components/Admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const Stats = lazy(() => import('./components/Stats').then(m => ({ default: m.Stats })));
const Achievements = lazy(() => import('./components/Kids/Achievements').then(m => ({ default: m.Achievements })));
const Shop = lazy(() => import('./components/Kids/Shop').then(m => ({ default: m.Shop })));
const FamilySettings = lazy(() => import('./components/Admin/FamilySettings').then(m => ({ default: m.FamilySettings })));


interface AuthenticatedAppProps {
  initialProfile: AppProfile;
  lang: 'fi' | 'ru' | 'en';
  setLang: React.Dispatch<React.SetStateAction<'fi' | 'ru' | 'en'>>;
  t: TranslationContent; 
}

export default function AuthenticatedApp({ initialProfile, lang, setLang, t }: AuthenticatedAppProps) {
  const [profile, setProfile] = useState<AppProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats' | 'admin' | 'awards' | 'shop'>('tasks');
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  // ИСПРАВЛЕНО: Убраны any из стейтов
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myApprovals, setMyApprovals] = useState<Approval[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [currentXp, setCurrentXp] = useState<number>(0);
  const [runningTimer, setRunningTimer] = useState<{ taskId: string, timeLeft: number } | null>(null);
  const [adminSubTab, setAdminSubTab] = useState<'tasks' | 'edit' | 'shop' | 'levels' | 'family'>('tasks');
  const runningTimerTaskId = runningTimer?.taskId;
  const isOnline = useOnlineStatus();

  const isFullProfile = (p: AppProfile): p is UserProfile => !!p.familyId;

  useEffect(() => {
    if (!isFullProfile(profile) || profile.role !== 'parent') return;
    const q = query(collection(db, "users"), where("familyId", "==", profile.familyId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const members = snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];
      setFamilyMembers(members);
      const children = members.filter(m => m.role === 'child');
      if (children.length > 0 && !selectedChildId) setSelectedChildId(children[0].uid);
    });
    return () => unsubscribe();
  }, [profile, selectedChildId]);

  useEffect(() => {
    if (!isFullProfile(profile)) {
      setAvailableTasks([]);
      setMyApprovals([]);
      return;
    }

    const targetId = isFullProfile(profile) && profile.role === 'child' ? profile.uid : selectedChildId;
    if (!targetId) {
      setAvailableTasks([]);
      setMyApprovals([]);
      return;
    }

    const unsubPoints = onSnapshot(doc(db, "users", targetId), (snap) => {
      if (snap.exists()) {
        setCurrentBalance(Number(snap.data().currentBalance) || 0);
        setCurrentXp(Number(snap.data().totalPoints) || 0);
      }
    });

    const unsubTasks = onSnapshot(
      query(collection(db, "tasks_list"), where("familyId", "==", profile.familyId)),
      (snap) => {
        const nextTasks = snap.docs
          .map((d) => ({ id: d.id, ...d.data() })) as Task[];
        setAvailableTasks(
          nextTasks.filter((task) => task.assignedTo === 'all' || task.assignedTo === targetId),
        );
      },
      (err) => console.error("Tasks family scope error:", err),
    );

    const unsubApprovals = onSnapshot(
      query(collection(db, "approvals"), where("familyId", "==", profile.familyId)),
      (snap) => {
        const nextApprovals = snap.docs
          .map((d) => ({ id: d.id, ...d.data() })) as Approval[];
        setMyApprovals(nextApprovals.filter((approval) => approval.userId === targetId));
      },
      (err) => console.error("Approvals family scope error:", err),
    );

    return () => {
      unsubPoints();
      unsubTasks();
      unsubApprovals();
    };
  }, [selectedChildId, profile]);

  useEffect(() => {
    if (!runningTimerTaskId) return;

    const intervalId = window.setInterval(() => {
      setRunningTimer((currentTimer) => {
        if (!currentTimer) return null;
        if (currentTimer.timeLeft <= 1) return null;
        return { ...currentTimer, timeLeft: currentTimer.timeLeft - 1 };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [runningTimerTaskId]);

  useEffect(() => {
    if (!runningTimerTaskId) return;

    const timerTaskStillVisible = availableTasks.some((task) => task.id === runningTimerTaskId);
    const timerTaskStillInProgress = myApprovals.some(
      (approval) => approval.taskId === runningTimerTaskId && approval.status === 'in_progress',
    );

    if (!timerTaskStillVisible && !timerTaskStillInProgress) {
      setRunningTimer(null);
    }
  }, [availableTasks, myApprovals, runningTimerTaskId]);

const handleUploadPhoto = async (file: File) => {
  const { uploadAvatar } = await import('./services/storage');
  const photoURL = await uploadAvatar(profile.uid, file);
  setProfile(p => ({ ...p, avatar: photoURL }));
};

  if (!isFullProfile(profile)) {
    return (
      <Suspense fallback={null}>
        <RegisterPage 
          googleUid={profile.uid} initialName={profile.name} initialAvatar={profile.avatar}
          t={t} lang={lang} onSuccess={(data: UserProfile) => setProfile(data)} 
        />
      </Suspense>
    );
  }

  const currentChildData = profile.role === 'parent' 
    ? familyMembers.find(m => m.uid === selectedChildId) 
    : profile;

  return (
    <>
      <Suspense fallback={null}><AppBackground activeTab={activeTab} isAuth={true} /></Suspense>
      <div style={{ padding: '20px 20px 160px 20px', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <Suspense fallback={null}>
          <ProfileSelector profile={profile} lang={lang} t={t} onLogout={() => signOut(auth)} onUploadPhoto={handleUploadPhoto} />
        </Suspense>

        {profile.role === 'parent' && (
          <div className="child-selector" style={{ marginBottom: '20px', display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
            {familyMembers.filter(m => m.role === 'child').map(child => (
              <button key={child.uid} onClick={() => setSelectedChildId(child.uid)} style={{
                padding: '8px 15px', borderRadius: '15px', border: 'none',
                backgroundColor: selectedChildId === child.uid ? 'var(--accent-blue)' : 'var(--card-bg)',
                color: selectedChildId === child.uid ? 'white' : 'var(--text-main)',
              }}>{child.avatar} {child.name}</button>
            ))}
          </div>
        )}

        <Header total={currentBalance} lang={lang} setLang={setLang} t={t} />

        <Suspense fallback={<div>{t.loading}</div>}>
          {activeTab === 'tasks' && <TaskList t={t} lang={lang} isOnline={isOnline} userRole={profile.role} availableTasks={availableTasks} myApprovals={myApprovals} runningTimer={runningTimer} formatTime={(s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`} startTaskTimer={(taskId, m) => setRunningTimer({ taskId, timeLeft: m * 60 })} markAsDone={async (id) => { const app = myApprovals.find(a => a.id === id); if (app) { await completeTransaction(app.id, app.userId, app.points, app.taskId, { familyId: profile.familyId, label: app.label }); if (runningTimer?.taskId === app.taskId) setRunningTimer(null); } }} requestToStart={async (task) => { const targetId = profile.role === 'parent' ? selectedChildId : profile.uid; if (profile.role === 'parent' || task.isAutoApprove) { await completeTransaction(`direct_${Date.now()}`, targetId, task.points, task.id, { familyId: profile.familyId, label: task.label }); } else { await createTaskApproval(task, profile); } }} />}
          {activeTab === 'stats' && <Stats t={t} lang={lang} childId={currentChildData?.uid || ''} familyId={profile.familyId} />}
          {activeTab === 'awards' && <Achievements t={t} lang={lang} isOnline={isOnline} totalPoints={profile.role === 'parent' ? (currentChildData?.totalPoints || 0) : currentXp} userId={currentChildData?.uid || ''} familyId={profile.familyId} />}
          {activeTab === 'shop' && <Shop t={t} lang={lang} isOnline={isOnline} currentBalance={currentBalance} userId={currentChildData?.uid || ''} familyId={profile.familyId} userRole={profile.role} />}
          {activeTab === 'admin' && profile.role === 'parent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '16px' }}>
                  {(['tasks', 'edit', 'shop', 'levels', 'family'] as const).map((tab) => (
                    <button key={tab} onClick={() => setAdminSubTab(tab)} style={{ flex: 1, padding: '12px 5px', borderRadius: '12px', border: 'none', cursor: 'pointer', backgroundColor: adminSubTab === tab ? 'var(--accent-blue)' : 'transparent', color: adminSubTab === tab ? 'white' : 'var(--text-secondary)' }}>
                      {tab === 'tasks' ? '✅' : tab === 'edit' ? '📝' : tab === 'shop' ? '🛒' : tab === 'levels' ? '🏆' : '👥'}
                    </button>
                  ))}
               </div>
               {adminSubTab === 'family' ? <FamilySettings familyId={profile.familyId} t={t} profile={profile} lang={lang} handleLogout={() => signOut(auth)} /> : <AdminPanel t={t} selectedChildId={selectedChildId} familyId={profile.familyId} mode={adminSubTab === 'tasks' ? 'check' : adminSubTab} lang={lang} />}
            </div>
          )}
        </Suspense>

        <Footer>
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} t={t} userRole={profile.role} />
        </Footer>
      </div>
    </>
  );
}
