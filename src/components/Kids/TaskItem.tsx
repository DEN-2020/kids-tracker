import React from 'react';
import styles from './Tasks.module.css';

// Описываем четкую структуру задачи
interface Task {
  id: string;
  label: string;
  points: number;
  icon?: string;
}

interface TaskItemProps {
  task: Task; // Больше никакого any
  isWaiting: boolean;
  isHolding: boolean;
  deadlineText: string;
  waitingLabel: string; // Передаем текст ожидания из родителя (t.waiting)
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
  return (
    <div 
      className={`
        ${styles.taskCard} 
        ${isHolding ? 'shaking-intense' : ''} 
        ${isWaiting ? styles.taskWaiting : ''}
      `}
      onMouseDown={onStart}
      onMouseUp={onStop}
      onMouseLeave={onStop}
      onTouchStart={onStart}
      onTouchEnd={onStop}
      style={{ transform: isHolding ? 'scale(0.95)' : 'scale(1)' }}
    >
      {/* Дедлайн */}
      <div className={styles.deadlineTag}>
        {isWaiting ? '⏳' : `⏱️ ${deadlineText}`}
      </div>

      {/* Кольцо загрузки */}
      {isHolding && !isWaiting && (
        <svg className="loading-ring" width="100%" height="100%" viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle 
            cx="50" cy="50" r="48" 
            style={{ 
              fill: 'none', 
              stroke: 'var(--accent-orange)', 
              strokeWidth: 4, 
              strokeDasharray: '302', 
              strokeDashoffset: '302', 
              animation: 'borderFill 5s linear forwards', 
              strokeLinecap: 'round' 
            }} 
          />
        </svg>
      )}

      {/* Иконка */}
      <span className={styles.taskIcon} style={{ filter: isWaiting ? 'grayscale(1)' : 'none' }}>
        {task.icon || '📝'}
      </span>
      
      {/* Название */}
      <div className={isWaiting ? styles.waitingText : styles.taskLabel}>
        {task.label}
      </div>

      {/* Баллы или статус */}
      <div className={isWaiting ? styles.waitingText : styles.taskPoints}>
        {isWaiting ? waitingLabel : `+${task.points}`}
      </div>
    </div>
  );
};