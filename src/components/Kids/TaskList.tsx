import React, { useState, useRef } from 'react';
import coinSoundFile from '../../assets/coin.mp3';
import successSoundFile from '../../assets/success.mp3';
import holdSoundFile from '../../assets/hold.mp3';
import styles from './Tasks.module.css';
import { TaskItem } from './TaskItem'; // Импортируем наш новый компонент

// --- ИНТЕРФЕЙСЫ ---
interface Task {
  id: string;
  label: string;
  points: number;
  icon?: string;
  duration?: number;
  isAutoRepeat?: boolean;
  isAutoApprove?: boolean;
  isAutoPayout?: boolean;
  lastCompleted?: string;
}

interface DisplayTask extends Task {
  isDone: boolean;
  isInWork: boolean;
  isPending: boolean;
}

interface Approval {
  id: string;
  taskId: string;
  label: string;
  points: number;
  status: 'pending' | 'in_progress' | 'completed';
  userId: string;
}

interface TaskListProps {
  userRole?: 'child' | 'parent'; 
  t: {
    inProgress: string;
    availableTasks: string;
    done: string;
    statsTitle?: string;
  };
  availableTasks: Task[];
  myApprovals: Approval[];
  runningTimer: { id: string; timeLeft: number } | null;
  formatTime: (seconds: number) => string;
  startTaskTimer: (approvalId: string, minutes: number) => void;
  markAsDone: (approvalId: string) => Promise<void>;
  requestToStart: (task: Task) => Promise<void>;
}

export const TaskList: React.FC<TaskListProps> = ({ 
  t, availableTasks, myApprovals, runningTimer, 
  formatTime, startTaskTimer, markAsDone, requestToStart,
  userRole 
}) => {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [processingDoneIds, setProcessingDoneIds] = useState<string[]>([]);
  const [coins, setCoins] = useState<{id: number, left: string}[]>([]);
  const [holdId, setHoldId] = useState<string | null>(null);
  
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdSoundInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // --- ЛОГИКА ЗВУКА И ЭФФЕКТОВ ---
  const playSound = (soundFile: string, volume = 0.5) => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
    }
    const audio = new Audio(soundFile);
    audio.volume = volume;
    currentAudio.current = audio;
    audio.play().catch(() => {});
  };

  const stopHoldSound = () => {
    if (holdSoundInterval.current) {
      clearInterval(holdSoundInterval.current);
      holdSoundInterval.current = null;
    }
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
    }
  };

  const spawnCoins = () => {
    const newCoins = Array.from({ length: 15 }).map((_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100 + 'vw'
    }));
    setCoins(newCoins);
    setTimeout(() => setCoins([]), 1200);
  };

  // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
  const executeRequest = async (task: Task) => {
    stopHoldSound();
    setHoldId(null);
    setApprovingId(task.id);
    spawnCoins();
    playSound(coinSoundFile);
    
    setTimeout(async () => {
      await requestToStart(task);
      setApprovingId(null);
    }, 800);
  };

  const startHolding = (task: DisplayTask) => {
    const hasActiveRequest = myApprovals.some(a => a.taskId === task.id);
    if (hasActiveRequest || task.isDone || task.isInWork || task.isPending || approvingId === task.id || holdId === task.id) return;

    if (userRole === 'parent') {
      const confirmAction = window.confirm(t.statsTitle === 'Tilastot' ? 'Haluatko merkitä tämän tehdyksi?' : 'Выполнить за ребенка?');
      if (confirmAction) executeRequest(task);
      return;
    }

    stopHoldSound();
    setHoldId(task.id);
    playSound(holdSoundFile, 0.2);
    holdSoundInterval.current = setInterval(() => playSound(holdSoundFile, 0.2), 600);
    holdTimer.current = setTimeout(() => executeRequest(task), 5000);
  };

  const stopHolding = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    stopHoldSound();
    setHoldId(null);
  };

  const handleDoneClick = async (approvalId: string, taskId: string) => {
    if (userRole === 'parent') {
        const confirmAction = window.confirm(t.statsTitle === 'Tilastot' ? 'Hyväksytkö?' : 'Подтвердить?');
        if (!confirmAction) return;
    }
    setApprovingId(approvalId);
    setProcessingDoneIds(prev => [...prev, taskId]);
    spawnCoins();
    playSound(successSoundFile);
    
    setTimeout(async () => {
      await markAsDone(approvalId);
      setApprovingId(null);
      setTimeout(() => setProcessingDoneIds(prev => prev.filter(id => id !== taskId)), 2000);
    }, 800);
  };

  // --- ВЫЧИСЛЕНИЯ ДЛЯ ВЕРСТКИ ---
  const allTasksForToday: DisplayTask[] = availableTasks.map(task => {
    const isDone = task.lastCompleted === today;
    const approval = myApprovals.find(a => a.taskId === task.id);
    return { ...task, isDone, isInWork: approval?.status === 'in_progress', isPending: approval?.status === 'pending' };
  });

  const pointsEarnedToday = allTasksForToday.filter(t => t.isDone).reduce((acc, t) => acc + t.points, 0);
  const totalPointsPossible = allTasksForToday.reduce((acc, t) => acc + t.points, 0);
  const progressPercent = totalPointsPossible > 0 ? Math.round((pointsEarnedToday / totalPointsPossible) * 100) : 0;

  const getDeadlineInfo = () => {
    const now = new Date();
    const deadline = new Date();
    deadline.setHours(21, 0, 0, 0);
    const diffMs = deadline.getTime() - now.getTime();
    return {
      text: diffMs > 0 ? `${Math.floor(diffMs / 3600000)}ч ${Math.floor((diffMs % 3600000) / 60000)}м` : 'Время вышло'
    };
  };
  const deadline = getDeadlineInfo();

  return (
    <>
      {coins.map(c => <div key={c.id} className={styles.coin} style={{ left: c.left }}>💰</div>)}

      {/* Прогресс */}
      <div className={styles.statsCard}>
        <div className={styles.statsInfo}>
          <span style={{ fontWeight: '800', fontSize: '14px' }}>{t.statsTitle === 'Tilastot' ? 'Päivän tavoite' : 'Цель на день'}</span>
          <span style={{ fontWeight: '800', color: 'var(--accent-blue)' }}>{pointsEarnedToday} / {totalPointsPossible} 🏆</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? 'var(--accent-green)' : 'var(--accent-blue)' }} />
        </div>
      </div>

      {/* В работе */}
      <h3 style={{ color: 'var(--accent-green)', marginBottom: '15px' }}>{t.inProgress}</h3>
      <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
        {myApprovals.filter(a => a.status === 'in_progress').map(a => {
          const isProcessing = approvingId === a.id;
          const taskInfo = availableTasks.find(task => task.id === a.taskId);
          return (
            <div key={a.id} className={`${styles.activeTaskCard} ${isProcessing ? 'task-approving' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold' }}>{isProcessing ? '🚀...' : a.label}</span>
                {runningTimer?.id === a.id && <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>⏱️ {formatTime(runningTimer.timeLeft)}</span>}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {!isProcessing && !runningTimer && taskInfo?.duration && (
                  <button onClick={() => startTaskTimer(a.id, taskInfo.duration!)} style={{ padding: '10px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '12px' }}>▶️</button>
                )}
                <button onClick={() => handleDoneClick(a.id, a.taskId)} disabled={isProcessing} className="payout-btn">
                  {isProcessing ? '⏳' : t.done}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Доступные (ИСПОЛЬЗУЕМ TASKITEM) */}
      <h3 style={{ color: 'var(--accent-blue)', marginBottom: '15px' }}>{t.availableTasks}</h3>
      <div className={styles.tasksGrid}>
        {allTasksForToday.map(task => {
          if (task.isDone || task.isInWork || approvingId === task.id || processingDoneIds.includes(task.id)) return null;
          
          const isWaiting = task.isPending || myApprovals.some(a => a.taskId === task.id);

          return (
            <TaskItem 
              key={task.id}
              task={task}
              isWaiting={isWaiting}
              isHolding={holdId === task.id}
              deadlineText={deadline.text}
              waitingLabel={t.statsTitle === 'Tilastot' ? 'Odottaa...' : 'Ждем...'}
              onStart={() => startHolding(task)}
              onStop={stopHolding}
            />
          );
        })}
      </div>
    </>
  );
};