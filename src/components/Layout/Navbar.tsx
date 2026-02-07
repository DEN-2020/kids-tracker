import type { TranslationContent } from '../../translations';

interface NavbarProps {
  // Теперь у нас 5 вариантов вкладок, включая магазин
  activeTab: 'tasks' | 'stats' | 'admin' | 'awards' | 'shop'; 
  setActiveTab: (tab: 'tasks' | 'stats' | 'admin' | 'awards' | 'shop') => void;
  t: TranslationContent;
  userRole: 'child' | 'parent';
}

export const Navbar = ({ activeTab, setActiveTab, t, userRole }: NavbarProps) => {
  // Вспомогательная функция для стилей, чтобы не дублировать код
  const getButtonStyle = (tabName: string, activeColor: string = '#4CAF50') => ({
    background: 'none',
    border: 'none',
    fontSize: '12px',
    fontWeight: activeTab === tabName ? 'bold' : 'normal' as const,
    color: activeTab === tabName ? activeColor : '#888',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px'
  });

  return (
    <nav style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '10px 0',
      borderTop: '1px solid var(--border-color)',
      backgroundColor: 'var(--card-bg)'
    }}>
      {/* Твои текущие Задания */}
      <button onClick={() => setActiveTab('tasks')} style={getButtonStyle('tasks')}>
        <span style={{ fontSize: '20px' }}>✅</span>
        {t.tasksTitle}
      </button>

      {/* Твоя текущая Статистика */}
      <button onClick={() => setActiveTab('stats')} style={getButtonStyle('stats')}>
        <span style={{ fontSize: '20px' }}>📈</span>
        {t.statsTitle}
      </button>

      {/* МАГАЗИН (новая вкладка) */}
      <button onClick={() => setActiveTab('shop')} style={getButtonStyle('shop')}>
        <span style={{ fontSize: '20px' }}>🛒</span>
        {t.shopTab}
      </button>

      {/* ДОСТИЖЕНИЯ / УРОВНИ */}
      <button onClick={() => setActiveTab('awards')} style={getButtonStyle('awards', '#FF9800')}>
        <span style={{ fontSize: '20px' }}>🏆</span>
        {t.achievementsTab}
      </button>

      {/* АДМИНКА (только для родителей) */}
      {userRole === 'parent' && (
        <button onClick={() => setActiveTab('admin')} style={getButtonStyle('admin')}>
          <span style={{ fontSize: '20px' }}>⚙️</span>
          {t.taskSettings}
        </button>
      )}
    </nav>
  );
};