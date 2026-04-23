import React, { useState, useRef } from 'react';
import coinSoundFile from '../../assets/coin.mp3';
import successSoundFile from '../../assets/success.mp3';
import holdSoundFile from '../../assets/hold.mp3';
import styles from './Tasks.module.css';
import { TaskItem } from './TaskItem';
import { isRecordedToday } from '../../utils/dayKey';

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
  lastCompletedAt?: Date | { toDate: () => Date } | string;
  assignedTo?: string;
}

interface DisplayTask extends Task {
  isDone: boolean;
  isInWork: boolean;
  isPending: boolean;
}

interface Approval {
  id: string;
  taskId?: string;
  label: string;
  points: number;
  status: 'pending' | 'in_progress' | 'completed';
  userId: string;
}

interface TaskListProps {
  userRole?: 'child' | 'parent'; 
  lang?: 'fi' | 'ru' | 'en';
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

const textByLang = {
  fi: {
    dayGoal: 'Päivän tavoite',
    parentStartConfirm: 'Haluatko merkitä tämän tehdyksi?',
    parentApproveConfirm: 'Hyväksytkö?',
    waiting: 'Odottaa...',
    hoursShort: 't',
    minutesShort: 'min',
  },
  ru: {
    dayGoal: 'Цель на день',
    parentStartConfirm: 'Выполнить за ребенка?',
    parentApproveConfirm: 'Подтвердить?',
    waiting: 'Ждем...',
    hoursShort: 'ч',
    minutesShort: 'м',
  },
  en: {
    dayGoal: 'Daily goal',
    parentStartConfirm: 'Mark this as done for the child?',
    parentApproveConfirm: 'Approve this task?',
    waiting: 'Waiting...',
    hoursShort: 'h',
    minutesShort: 'm',
  },
} as const;

const resolveTaskListLang = (
  explicitLang: TaskListProps['lang'],
  t: TaskListProps['t'],
): keyof typeof textByLang => {
  if (explicitLang) return explicitLang;

  const doneLabel = t.done.trim().toUpperCase();
  if (doneLabel.startsWith('VALMIS')) return 'fi';
  if (doneLabel.startsWith('ГОТОВО')) return 'ru';
  return 'en';
};

export const TaskList: React.FC<TaskListProps> = ({ 
  t, availableTasks, myApprovals, runningTimer, 
  formatTime, startTaskTimer, markAsDone, requestToStart,
  userRole,
  lang,
}) => {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({
    coin: new Audio(coinSoundFile),
    success: new Audio(successSoundFile),
    hold: new Audio(holdSoundFile)
  });

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [coins, setCoins] = useState<{id: number, left: string}[]>([]);
  const [holdId, setHoldId] = useState<string | null>(null);
  
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdSoundInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const uiText = textByLang[resolveTaskListLang(lang, t)];

  // --- ЛОГИКА ЗВУКА ---
  const playSound = (type: 'coin' | 'success' | 'hold', volume = 0.5) => {
    const audio = audioRefs.current[type];
    if (!audio) return;
    try {
      audio.pause();
      Object.assign(audio, { currentTime: 0, volume: volume });
      audio.play().catch(() => {});
    } catch {
      // Игнорируем ошибки автоплея
    }
  };

  const stopHoldSound = () => {
    if (holdSoundInterval.current) {
      clearInterval(holdSoundInterval.current);
      holdSoundInterval.current = null;
    }
    const audio = audioRefs.current.hold;
    if (audio) {
      audio.pause();
      Object.assign(audio, { currentTime: 0 });
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
    
    requestAnimationFrame(async () => {
      try {
        await requestToStart(task);
        spawnCoins();
        playSound('coin'); 
      } catch {
        console.error("Execute error");
      } finally {
        setApprovingId(null);
      }
    });
  };

  const startHolding = (task: DisplayTask) => {
    const hasActiveRequest = myApprovals.some(a => a.taskId === task.id);
    if (hasActiveRequest || task.isDone || task.isInWork || task.isPending || approvingId === task.id || holdId === task.id) return;

    if (userRole === 'parent') {
      Promise.resolve().then(() => {
        const confirmAction = window.confirm(uiText.parentStartConfirm);
        if (confirmAction) executeRequest(task);
      });
      return;
    }

    stopHoldSound();
    setHoldId(task.id);
    playSound('hold', 0.2);
    holdSoundInterval.current = setInterval(() => playSound('hold', 0.2), 600);
    holdTimer.current = setTimeout(() => executeRequest(task), 5000);
  };

  // ТА САМАЯ ФУНКЦИЯ, КОТОРУЮ ПОТЕРЯЛИ
  const stopHolding = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    stopHoldSound();
    setHoldId(null);
  };

  const handleDoneClick = async (e: React.MouseEvent, approvalId: string) => {
    e.stopPropagation();
    if (approvingId === approvalId) return;

    if (userRole === 'parent') {
      Promise.resolve().then(async () => {
        const confirmAction = window.confirm(uiText.parentApproveConfirm);
        if (!confirmAction) return;

        setApprovingId(approvalId); 
        try {
          await markAsDone(approvalId);
          spawnCoins();
          playSound('success'); 
        } catch {
          console.error("Confirm error");
        } finally {
          setApprovingId(null);
        }
      });
      return;
    }
    
    setApprovingId(approvalId); 
    try {
      await markAsDone(approvalId);
      spawnCoins();
      playSound('success'); 
    } catch {
      setApprovingId(null);
    }
  };

  // --- ВЫЧИСЛЕНИЯ ---
  const allTasksForToday: DisplayTask[] = availableTasks.map(task => {
    const approval = myApprovals.find(a => a.taskId === task.id);
    const isDone = isRecordedToday(task.lastCompleted, task.lastCompletedAt) || approval?.status === 'completed';
    
    return { 
      ...task, 
      isDone, 
      isInWork: approval?.status === 'in_progress', 
      isPending: approval?.status === 'pending' 
    };
  });

  const pointsEarnedToday = allTasksForToday.filter(t => t.isDone).reduce((acc, t) => acc + t.points, 0);
  const totalPointsPossible = allTasksForToday.reduce((acc, t) => acc + t.points, 0);
  const progressPercent = totalPointsPossible > 0 ? Math.round((pointsEarnedToday / totalPointsPossible) * 100) : 0;

  const getDeadlineInfo = () => {
    const now = new Date();
    const deadline = new Date();
    deadline.setHours(21, 0, 0, 0);
    const diffMs = deadline.getTime() - now.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return {
      text: diffMs > 0
        ? `${hours}${uiText.hoursShort} ${minutes}${uiText.minutesShort}`
        : `0${uiText.hoursShort} 0${uiText.minutesShort}`
    };
  };
  const deadline = getDeadlineInfo();

  return (
    <>
      {coins.map(c => <div key={c.id} className={styles.coin} style={{ left: c.left }}>💰</div>)}

      <div className={styles.statsCard}>
        <div className={styles.statsInfo}>
          <span style={{ fontWeight: '800', fontSize: '14px' }}>{uiText.dayGoal}</span>
          <span style={{ fontWeight: '800', color: 'var(--accent-blue)' }}>{pointsEarnedToday} / {totalPointsPossible} 🏆</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? 'var(--accent-green)' : 'var(--accent-blue)' }} />
        </div>
      </div>

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
                <button 
                  onClick={(e) => handleDoneClick(e, a.id)} 
                  disabled={isProcessing} 
                  className="payout-btn"
                  style={{ zIndex: 999, position: 'relative', cursor: 'pointer' }}
                >
                  {isProcessing ? '⏳' : t.done}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ color: 'var(--accent-blue)', marginBottom: '15px' }}>{t.availableTasks}</h3>
      <div className={styles.tasksGrid}>
        {allTasksForToday.map(task => {
          if (task.isDone || task.isInWork || approvingId === task.id) return null;
          const isWaiting = task.isPending || myApprovals.some(a => a.taskId === task.id);

          return (
            <TaskItem 
              key={task.id}
              task={task}
              isWaiting={isWaiting}
              isHolding={holdId === task.id}
              deadlineText={deadline.text}
              waitingLabel={uiText.waiting}
              onStart={() => startHolding(task)}
              onStop={stopHolding}
            />
          );
        })}
      </div>
    </>
  );
};
