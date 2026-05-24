import React from 'react';
import styles from './Tasks.module.css';

interface Task {
  id: string;
  label: string;
  points: number;
  icon?: string;
  lastCompleted?: string;
  isPending?: boolean;
  isInWork?: boolean;
  assignedTo?: string; 
  duration?: number;
  isAutoRepeat?: boolean;
  isAutoApprove?: boolean;
  isAutoPayout?: boolean;
}

interface TaskItemProps {
  task: Task;
  isWaiting: boolean;
  isHolding: boolean;
  isProcessing: boolean;
  deadlineText: string;
  timerText?: string | null;
  timerLabel: string;
  processingLabel: string;
  waitingLabel: string;
  disabledLabel?: string;
  isDisabled?: boolean;
  onTimerClick?: () => void;
  onStart: () => void;
  onStop: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  isWaiting, 
  isHolding, 
  isProcessing,
  deadlineText, 
  timerText,
  timerLabel,
  processingLabel,
  waitingLabel,
  disabledLabel,
  isDisabled = false,
  onTimerClick,
  onStart, 
  onStop 
}) => {
  const markers = [
    task.duration != null ? { icon: '⏱', label: 'Has duration' } : null,
    task.isAutoRepeat ? { icon: '🔄', label: 'Auto repeat' } : null,
    task.isAutoApprove ? { icon: '⚡', label: 'Auto approve' } : null,
    task.isAutoPayout ? { icon: '💰', label: 'Auto payout' } : null,
  ].filter((marker): marker is { icon: string; label: string } => marker !== null);

  // Функция-фильтр для нажатий
  const handlePress = (e: React.MouseEvent | React.TouchEvent, action: 'start' | 'stop') => {
    // Если нажали на кнопку внутри карточки — ничего не делаем, пусть работает кнопка
    if ((e.target as HTMLElement).closest('button')) return;
    if (isDisabled) return;

    if (action === 'start') {
      if (!isWaiting && !isProcessing) onStart();
    } else {
      onStop();
    }
  };

  return (
    <div 
      className={`
        ${styles.taskCard} 
        ${isHolding ? 'shaking-intense' : ''} 
        ${isProcessing ? styles.taskProcessing : ''}
        ${isWaiting ? styles.taskWaiting : ''}
        ${isDisabled ? styles.taskOffline : ''}
      `}
      // Используем нашу функцию-фильтр
      onMouseDown={(e) => handlePress(e, 'start')}
      onMouseUp={(e) => handlePress(e, 'stop')}
      onMouseLeave={(e) => handlePress(e, 'stop')}
      onTouchStart={(e) => handlePress(e, 'start')}
      onTouchEnd={(e) => handlePress(e, 'stop')}
      
      style={{ 
        transform: isHolding ? 'scale(0.95)' : 'scale(1)',
        touchAction: 'manipulation', // Убирает задержку в 300мс на мобильных
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {markers.length > 0 && (
        <div className={styles.taskMarkers}>
          {markers.map((marker) => (
            <span
              key={marker.label}
              className={styles.taskMarker}
              role="img"
              aria-label={marker.label}
              title={marker.label}
            >
              {marker.icon}
            </span>
          ))}
        </div>
      )}

      <div className={styles.deadlineTag}>
        {isDisabled ? '📴' : isWaiting || isProcessing ? '⏳' : `🕘 ${deadlineText}`}
      </div>

      {isHolding && !isWaiting && !isProcessing && (
        <svg className="loading-ring" width="100%" height="100%" viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <circle cx="50" cy="50" r="48" style={{ fill: 'none', stroke: 'var(--accent-orange)', strokeWidth: 4, strokeDasharray: '302', strokeDashoffset: '302', animation: 'borderFill 5s linear forwards', strokeLinecap: 'round' }} />
        </svg>
      )}

      {isProcessing && (
        <svg className={styles.processingRing} width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true">
          <circle className={styles.processingRingTrack} cx="50" cy="50" r="46" />
          <circle className={styles.processingRingArc} cx="50" cy="50" r="46" />
        </svg>
      )}

      <span className={styles.taskIcon} style={{ filter: isWaiting || isProcessing ? 'grayscale(1)' : 'none' }}>
        {task.icon || '📝'}
      </span>
      
      <div className={isWaiting || isProcessing ? styles.waitingText : styles.taskLabel}>
        {task.label}
      </div>

      {isProcessing ? (
        <div className={styles.processingMeta}>
          <span className={styles.inlineSpinnerLight} aria-hidden="true" />
          <span>{processingLabel}</span>
        </div>
      ) : (
        <div className={isWaiting ? styles.waitingText : styles.taskPoints}>
          {isDisabled && disabledLabel ? disabledLabel : isWaiting ? waitingLabel : `+${task.points}`}
        </div>
      )}

      {task.duration ? (
        <button
          type="button"
          onClick={onTimerClick}
          className={styles.timerChip}
          aria-label={timerLabel}
          title={timerLabel}
          disabled={isProcessing}
        >
          ⏱ {timerText}
        </button>
      ) : null}
    </div>
  );
};
