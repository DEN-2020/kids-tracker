import { useEffect, useState, useCallback } from 'react';
import { db, auth, googleProvider } from './firebase'; 
import { 
  doc, collection, addDoc, getDoc,
  updateDoc, onSnapshot, query, where, increment
} from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { translations } from './translations';

// Компоненты
import { Header } from './components/Layout/Header';
import { Navbar } from './components/Layout/Navbar';
import { AdminPanel } from './components/Admin/AdminPanel';
import { Stats } from './components/Stats';
import { Achievements } from './components/Kids/Achievements';
import { Shop } from './components/Kids/Shop';
import { Footer } from './components/Layout/Footer';
import { FamilySettings } from './components/Admin/FamilySettings';
import { RegisterPage } from './components/Auth/RegisterPage';
import { TaskList } from './components/Kids/TaskList';
import { ProfileSelector } from './components/Auth/ProfileSelector';

// --- ИНТЕРФЕЙСЫ ---
interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  role: 'child' | 'parent';
  totalPoints?: number;   
  currentBalance?: number; 
  familyId: string;
}

export interface Task {
  id: string;
  label: string;
  points: number;
  icon?: string;
  duration?: number;
  isAutoRepeat?: boolean;
  isAutoApprove?: boolean;
  isAutoPayout?: boolean;
  lastCompleted?: string;
  assignedTo?: string;
}

export interface Approval {
  id: string;
  taskId: string;
  label: string;
  points: number;
  status: 'pending' | 'in_progress' | 'completed';
  userId: string;
  icon?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats' | 'admin' | 'awards' | 'shop'>('tasks');
  const [lang, setLang] = useState<'fi' | 'ru' | 'en'>('fi');
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myApprovals, setMyApprovals] = useState<Approval[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [runningTimer, setRunningTimer] = useState<{ id: string, timeLeft: number } | null>(null);
 
  const t = translations[lang];

  const [adminSubTab, setAdminSubTab] = useState<'tasks' | 'edit' | 'shop' | 'levels' | 'family'>('tasks');

  const subTabStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '12px 5px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    backgroundColor: isActive ? 'var(--accent-blue)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-secondary)',
    transition: '0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px'
  });

  // 1. Ссылки-приглашения
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
      sessionStorage.setItem('pending_family_code', joinCode);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 2. Авторизация и Семья
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      let unsubFamily: (() => void) | undefined;
      try {
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setProfile(userData);
            setIsAuth(true);

            const q = query(collection(db, "users"), where("familyId", "==", userData.familyId));
            unsubFamily = onSnapshot(q, (snap) => {
              const members = snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];
              setFamilyMembers(members);
              const children = members.filter(m => m.role === 'child');
              if (children.length > 0 && !selectedChildId) {
                setSelectedChildId(children[0].uid);
              }
            });
          } else {
            setProfile({ uid: user.uid, name: user.displayName || '', avatar: '👶', role: 'child', familyId: '' });
            setIsAuth(false);
          }
        } else {
          setProfile(null);
          setIsAuth(false);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      } finally {
        setIsLoading(false);
      }
      return () => { if (unsubFamily) unsubFamily(); };
    });
    return () => unsubscribeAuth();
  }, [selectedChildId]);

  // 3. Загрузка задач
  useEffect(() => {
    if (!isAuth || !profile) return;
    const unsub = onSnapshot(collection(db, "tasks_list"), (snap) => {
      const allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
      const targetId = profile.role === 'child' ? profile.uid : selectedChildId;
      setAvailableTasks(allTasks.filter(t => !t.assignedTo || t.assignedTo === 'all' || t.assignedTo === targetId));
    });
    return () => unsub();
  }, [isAuth, selectedChildId, profile]);

  // 4. Подписка на баллы выбранного ребенка
  useEffect(() => {
    if (!isAuth || !profile) return;
    const targetUid = profile.role === 'child' ? profile.uid : selectedChildId;
    if (!targetUid) return;

    const unsubPoints = onSnapshot(doc(db, "users", targetUid), (docSnap) => {
      if (docSnap.exists()) {
        setTotalPoints(docSnap.data().totalPoints || 0);
      }
    });

    const qApps = query(collection(db, "approvals"), where("userId", "==", targetUid));
    const unsubApps = onSnapshot(qApps, (snap) => {
      setMyApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Approval[]);
    });
    return () => { unsubPoints(); unsubApps(); };
  }, [isAuth, selectedChildId, profile]);

  // 5. Таймер
  useEffect(() => {
    let interval: number | undefined;
    if (runningTimer && runningTimer.timeLeft > 0) {
      interval = window.setInterval(() => {
        setRunningTimer(prev => (prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null));
      }, 1000);
    } else if (runningTimer && runningTimer.timeLeft === 0) {
      alert(lang === 'ru' ? "Время вышло!" : "Aika loppui!");
      setRunningTimer(null);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [runningTimer, lang]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startTaskTimer = useCallback((approvalId: string, minutes: number) => {
    setRunningTimer({ id: approvalId, timeLeft: minutes * 60 });
  }, []);

  const handleLogin = async () => { signInWithPopup(auth, googleProvider).catch(console.error); };
  const handleLogout = async () => { signOut(auth).catch(console.error); };

  const requestToStart = async (task: Task) => {
    if (!profile) return;
    await addDoc(collection(db, "approvals"), {
      taskId: task.id, label: task.label, points: task.points,
      status: task.isAutoApprove ? "in_progress" : "pending",
      userId: profile.uid, familyId: profile.familyId, createdAt: new Date(), icon: task.icon || '📝'
    });
  };

  const markAsDone = async (approvalId: string) => {
    if (!profile) return;
    const approval = myApprovals.find(a => a.id === approvalId);
    if (!approval) return;
    const taskTemplate = availableTasks.find(t => t.id === approval.taskId);

    if (taskTemplate?.isAutoPayout) {
      await updateDoc(doc(db, "users", approval.userId), { totalPoints: increment(approval.points) });
      await addDoc(collection(db, "history"), { userId: approval.userId, label: approval.label, points: approval.points, date: new Date(), type: 'earn' });
      await updateDoc(doc(db, "approvals", approvalId), { status: "completed" });
    } else {
      await updateDoc(doc(db, "approvals", approvalId), { status: "completed", completedAt: new Date() });
    }
    if (taskTemplate) {
      await updateDoc(doc(db, "tasks_list", taskTemplate.id), { lastCompleted: new Date().toISOString().split('T')[0] });
    }
    if (runningTimer?.id === approvalId) setRunningTimer(null);
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}><h2>Загрузка...</h2></div>;
  }

  // ОПРЕДЕЛЯЕМ, ЧЬИ ДАННЫЕ ПОКАЗЫВАТЬ
// --- УЛУЧШЕННЫЙ ПОИСК ДАННЫХ РЕБЕНКА ---
  const currentChildData = profile?.role === 'parent' 
    ? familyMembers.find(m => m.uid === selectedChildId) 
    : profile;

  // ДОБАВЬ ЭТОТ ЛОГ ДЛЯ ПРОВЕРКИ РОЛИ
  console.log("ROLE CHECK:", { 
    myRole: profile?.role, 
    membersCount: familyMembers.length,
    selectedId: selectedChildId 
  });

  // Если мы зашли как ребенок, но profile.role не 'child', 
  // или если мы родитель и еще не подгрузились члены семьи - 
  // нам нужно подстраховаться для отрисовки.
  const canShowContent = !!currentChildData?.uid;


console.log("CHECK:", {
  activeTab,
  hasProfile: !!profile,
  childId: currentChildData?.uid,
  balance: currentChildData?.currentBalance
});


  return (
    <div style={{ padding: '20px 20px 160px 20px', maxWidth: '800px', margin: '0 auto', minHeight: '100vh' }}>
      {!profile ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '20px' }}>
          <h1 style={{ color: 'var(--text-main)' }}>Kids Tracker 🚀</h1>
          <button onClick={handleLogin} style={{ padding: '15px 30px', fontSize: '18px', borderRadius: '15px', background: 'var(--accent-blue)', color: 'white', border: 'none', fontWeight: 'bold' }}>Войти через Google</button>
        </div>
      ) : !isAuth ? (
        <RegisterPage googleUid={profile.uid} initialName={profile.name} t={t} onSuccess={(userData) => { setProfile(userData); setIsAuth(true); }} />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>🚪 Выйти</button>
          </div>

          <ProfileSelector profile={profile} t={t} />

          {profile.role === 'parent' && (
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              {familyMembers.filter(m => m.role === 'child').map(child => (
                <button key={child.uid} onClick={() => setSelectedChildId(child.uid)} style={{
                  padding: '8px 15px', borderRadius: '15px', border: 'none', cursor: 'pointer',
                  backgroundColor: selectedChildId === child.uid ? 'var(--accent-blue)' : 'var(--card-bg)',
                  color: selectedChildId === child.uid ? 'white' : 'var(--text-main)',
                }}>{child.avatar} {child.name}</button>
              ))}
            </div>
          )}

          <Header total={totalPoints} lang={lang} setLang={setLang} t={t} />

          {activeTab === 'tasks' && (
            <TaskList t={t} availableTasks={availableTasks} myApprovals={myApprovals} runningTimer={runningTimer} formatTime={formatTime} startTaskTimer={startTaskTimer} markAsDone={markAsDone} requestToStart={requestToStart} />
          )}

    {activeTab === 'stats' && (
      <Stats 
        t={t} 
        lang={lang} // Передаем текущий язык для работы с датами и текстом
        childId={profile.role === 'parent' ? selectedChildId : profile.uid} 
      />
    )}

{/* --- ДОСТИЖЕНИЯ --- */}
          {activeTab === 'awards' && profile && (
            <Achievements 
              t={t} 
              // Если данных ребенка еще нет, показываем 0, но компонент отрисовываем
              totalPoints={currentChildData?.totalPoints || 0} 
              userId={currentChildData?.uid || profile.uid} 
            />
          )}

          {/* --- МАГАЗИН --- */}
          {activeTab === 'shop' && profile && (
            <Shop 
              t={t} 
              lang={lang} 
              currentBalance={currentChildData?.currentBalance || 0} 
              userId={currentChildData?.uid || profile.uid} 
            />
          )}
          {!canShowContent && activeTab !== 'admin' && (
             <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '12px', marginTop: '10px' }}>
                {lang === 'ru' ? 'Синхронизация профиля...' : 'Profiilin synkronointi...'}
             </div>
          )}

          {activeTab === 'admin' && profile.role === 'parent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '16px' }}>
            {(['tasks', 'edit', 'shop', 'levels', 'family'] as const).map((tab) => (
  <button 
    key={tab} 
    onClick={() => setAdminSubTab(tab)} 
    style={subTabStyle(adminSubTab === tab)}
  >
    {tab === 'tasks' && '✅'}
    {tab === 'edit' && '📝'}
    {tab === 'shop' && '🛒'}
    {tab === 'levels' && '🏆'}
    {tab === 'family' && '👥'}
  </button>
))}
              </div>
              {adminSubTab === 'tasks' && <AdminPanel t={t} selectedChildId={selectedChildId} mode="check" />}
              {adminSubTab === 'edit' && <AdminPanel t={t} selectedChildId={selectedChildId} mode="edit" />}
              {adminSubTab === 'shop' && <AdminPanel t={t} selectedChildId={selectedChildId} mode="shop" />}
              {adminSubTab === 'levels' && <AdminPanel t={t} selectedChildId={selectedChildId} mode="levels" />}
            {adminSubTab === 'family' && (
  <FamilySettings 
    familyId={profile.familyId} 
    t={t} 
    profile={profile} 
    lang={lang} 
    handleLogout={handleLogout} 
  />
)}
            </div>
          )}
          
          <Footer>
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} t={t} userRole={profile.role} />
          </Footer>
        </>
      )}
    </div>
  );
}

export default App;