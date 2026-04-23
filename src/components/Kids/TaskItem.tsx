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
}

interface TaskItemProps {
  task: Task;
  isWaiting: boolean;
  isHolding: boolean;
  deadlineText: string;
  waitingLabel: string;
  onStart: () => void;
  onStop: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  isWaiting, 
  isHolding, 
  deadlineText, 
  waitingLabel,
  onStart, 
  onStop 
}) => {

  // Функция-фильтр для нажатий
  const handlePress = (e: React.MouseEvent | React.TouchEvent, action: 'start' | 'stop') => {
    // Если нажали на кнопку внутри карточки — ничего не делаем, пусть работает кнопка
    if ((e.target as HTMLElement).closest('button')) return;

    if (action === 'start') {
      if (!isWaiting) onStart();
    } else {
      onStop();
    }
  };

  return (
    <div 
      className={`
        ${styles.taskCard} 
        ${isHolding ? 'shaking-intense' : ''} 
        ${isWaiting ? styles.taskWaiting : ''}
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
      <div className={styles.deadlineTag}>
        {isWaiting ? '⏳' : `⏱️ ${deadlineText}`}
      </div>

      {isHolding && !isWaiting && (
        <svg className="loading-ring" width="100%" height="100%" viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <circle cx="50" cy="50" r="48" style={{ fill: 'none', stroke: 'var(--accent-orange)', strokeWidth: 4, strokeDasharray: '302', strokeDashoffset: '302', animation: 'borderFill 5s linear forwards', strokeLinecap: 'round' }} />
        </svg>
      )}

      <span className={styles.taskIcon} style={{ filter: isWaiting ? 'grayscale(1)' : 'none' }}>
        {task.icon || '📝'}
      </span>
      
      <div className={isWaiting ? styles.waitingText : styles.taskLabel}>
        {task.label}
      </div>

      <div className={isWaiting ? styles.waitingText : styles.taskPoints}>
        {isWaiting ? waitingLabel : `+${task.points}`}
      </div>
    </div>
  );
};