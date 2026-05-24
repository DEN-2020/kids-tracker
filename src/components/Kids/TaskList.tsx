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
  runningTimer: { taskId: string; timeLeft: number } | null;
  formatTime: (seconds: number) => string;
  startTaskTimer: (taskId: string, minutes: number) => void;
  markAsDone: (approvalId: string) => Promise<void>;
  requestToStart: (task: Task) => Promise<void>;
}

type ParentConfirmAction =
  | {
      kind: 'task';
      task: DisplayTask;
    }
  | {
      kind: 'approval';
      approval: Approval;
    };

const textByLang = {
  fi: {
    dayGoal: 'Päivän tavoite',
    parentTaskConfirmTitle: 'Merkitäänkö tehtävä tehdyksi?',
    parentApprovalConfirmTitle: 'Hyväksytäänkö suoritus?',
    waiting: 'Odottaa...',
    processing: 'Suoritetaan...',
    syncing: 'Synkronoidaan pilveen...',
    hoursShort: 't',
    minutesShort: 'min',
    timerHint: 'Ajastin',
    cancel: 'Peruuta',
    confirm: 'Vahvista',
  },
  ru: {
    dayGoal: 'Цель на день',
    parentTaskConfirmTitle: 'Отметить задачу выполненной?',
    parentApprovalConfirmTitle: 'Подтвердить выполнение?',
    waiting: 'Ждем...',
    processing: 'Выполняется...',
    syncing: 'Синхронизация с облаком...',
    hoursShort: 'ч',
    minutesShort: 'м',
    timerHint: 'Таймер',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
  },
  en: {
    dayGoal: 'Daily goal',
    parentTaskConfirmTitle: 'Mark this task as done?',
    parentApprovalConfirmTitle: 'Approve this completion?',
    waiting: 'Waiting...',
    processing: 'Processing...',
    syncing: 'Syncing with cloud...',
    hoursShort: 'h',
    minutesShort: 'm',
    timerHint: 'Timer',
    cancel: 'Cancel',
    confirm: 'Confirm',
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
  const [parentConfirmAction, setParentConfirmAction] = useState<ParentConfirmAction | null>(null);

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
    setParentConfirmAction(null);
    setApprovingId(task.id);
    const startedAt = Date.now();
    const minimumProcessingMs = userRole === 'parent' ? 500 : 0;

    requestAnimationFrame(async () => {
      try {
        await requestToStart(task);
        spawnCoins();
        playSound('coin');
      } catch {
        console.error("Execute error");
      } finally {
        const elapsedMs = Date.now() - startedAt;
        if (minimumProcessingMs > elapsedMs) {
          await new Promise((resolve) => window.setTimeout(resolve, minimumProcessingMs - elapsedMs));
        }
        setApprovingId(null);
      }
    });
  };

  const startHolding = (task: DisplayTask) => {
    const hasActiveRequest = myApprovals.some(a => a.taskId === task.id);
    if (hasActiveRequest || task.isDone || task.isInWork || task.isPending || approvingId === task.id || holdId === task.id) return;

    if (userRole === 'parent') {
      setParentConfirmAction({ kind: 'task', task });
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

  const settleApproval = async (approval: Approval) => {
    if (approvingId === approval.id) return;

    setParentConfirmAction(null);
    setApprovingId(approval.id);
    try {
      await markAsDone(approval.id);
      spawnCoins();
      playSound('success');
    } catch {
      setApprovingId(null);
    }
  };

  const handleDoneClick = async (e: React.MouseEvent, approval: Approval) => {
    e.stopPropagation();
    if (approvingId === approval.id) return;

    if (userRole === 'parent') {
      setParentConfirmAction({ kind: 'approval', approval });
      return;
    }

    await settleApproval(approval);
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
  const formatDuration = (minutes?: number) => {
    if (!minutes || minutes <= 0) return null;
    return `${minutes}${uiText.minutesShort}`;
  };
  const confirmIcon = parentConfirmAction?.kind === 'task'
    ? parentConfirmAction.task.icon || '📝'
    : parentConfirmAction?.approval.label ? '✅' : '📝';
  const confirmLabel = parentConfirmAction?.kind === 'task'
    ? parentConfirmAction.task.label
    : parentConfirmAction?.approval.label || '';
  const confirmPoints = parentConfirmAction?.kind === 'task'
    ? parentConfirmAction.task.points
    : parentConfirmAction?.approval.points || 0;
  const confirmTitle = parentConfirmAction?.kind === 'task'
    ? uiText.parentTaskConfirmTitle
    : uiText.parentApprovalConfirmTitle;
  const confirmBusy = !!parentConfirmAction && (
    parentConfirmAction.kind === 'task'
      ? approvingId === parentConfirmAction.task.id
      : approvingId === parentConfirmAction.approval.id
  );

  const confirmParentAction = async () => {
    const action = parentConfirmAction;
    if (!action) return;

    if (action.kind === 'task') {
      await executeRequest(action.task);
      return;
    }

    await settleApproval(action.approval);
  };

  return (
    <>
      {coins.map(c => <div key={c.id} className={styles.coin} style={{ left: c.left }}>💰</div>)}

      {parentConfirmAction && (
        <div className={styles.confirmOverlay} onClick={() => {
          if (confirmBusy) return;
          setParentConfirmAction(null);
        }}>
          <div className={styles.confirmSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>{confirmIcon}</div>
            <div className={styles.confirmTitle}>{confirmTitle}</div>
            <div className={styles.confirmLabel}>{confirmLabel}</div>
            <div className={styles.confirmPoints}>+{confirmPoints}</div>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.confirmCancelBtn} onClick={() => setParentConfirmAction(null)} disabled={confirmBusy}>
                {uiText.cancel}
              </button>
              <button type="button" className={styles.confirmOkBtn} onClick={() => void confirmParentAction()} disabled={confirmBusy}>
                <span className={styles.confirmBtnContent}>
                  {confirmBusy ? <span className={styles.inlineSpinner} aria-hidden="true" /> : null}
                  <span>{confirmBusy ? uiText.syncing : uiText.confirm}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {approvingId ? (
        <div className={styles.syncBanner}>
          <span className={styles.inlineSpinnerLight} aria-hidden="true" />
          <span>{uiText.syncing}</span>
        </div>
      ) : null}

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
          const timerIsRunning = runningTimer?.taskId === a.taskId;
          const runningTimerText = timerIsRunning && runningTimer
            ? formatTime(runningTimer.timeLeft)
            : null;
          return (
            <div key={a.id} className={`${styles.activeTaskCard} ${isProcessing ? 'task-approving' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold' }}>{isProcessing ? '🚀...' : a.label}</span>
                {runningTimerText && <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>⏱️ {runningTimerText}</span>}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {!isProcessing && taskInfo?.duration && (
                  <button onClick={() => startTaskTimer(taskInfo.id, taskInfo.duration!)} style={{ padding: '10px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '12px' }}>
                    {timerIsRunning ? '⏱️' : '▶️'}
                  </button>
                )}
                <button
                  onClick={(e) => void handleDoneClick(e, a)}
                  disabled={isProcessing}
                  className="payout-btn"
                  style={{ zIndex: 999, position: 'relative', cursor: 'pointer' }}
                >
                  {isProcessing ? (
                    <span className={styles.confirmBtnContent}>
                      <span className={styles.inlineSpinner} aria-hidden="true" />
                      <span>{uiText.processing}</span>
                    </span>
                  ) : t.done}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ color: 'var(--accent-blue)', marginBottom: '15px' }}>{t.availableTasks}</h3>
      <div className={styles.tasksGrid}>
        {allTasksForToday.map(task => {
          if (task.isDone || task.isInWork) return null;
          const isProcessing = approvingId === task.id;
          const isWaiting = !isProcessing && (task.isPending || myApprovals.some(a => a.taskId === task.id));
          const taskDuration = task.duration;
          const taskTimerText = runningTimer?.taskId === task.id && runningTimer
            ? formatTime(runningTimer.timeLeft)
            : formatDuration(taskDuration);

          return (
            <TaskItem
              key={task.id}
              task={task}
              isWaiting={isWaiting}
              isHolding={holdId === task.id}
              isProcessing={isProcessing}
              deadlineText={deadline.text}
              timerText={taskTimerText}
              timerLabel={uiText.timerHint}
              processingLabel={uiText.processing}
              waitingLabel={uiText.waiting}
              onTimerClick={typeof taskDuration === 'number' ? () => startTaskTimer(task.id, taskDuration) : undefined}
              onStart={() => startHolding(task)}
              onStop={stopHolding}
            />
          );
        })}
      </div>
    </>
  );
};
