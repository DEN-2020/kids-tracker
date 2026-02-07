import { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, Timestamp, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TranslationContent } from '../translations';
import styles from './Stats.module.css'; // Импорт стилей

interface HistoryItem {
  userId: string;
  points: number;
  date: Timestamp;
  label: string;
  type: 'earn' | 'spend';
}

interface HistoryLogItem extends HistoryItem {
  id: string;
}

interface ChartData {
  name: string;
  points: number;
}

interface StatsProps {
  t: TranslationContent;
  childId: string;
  lang: string; // Передаем язык явно для локализации дат
}

export const Stats = ({ t, childId, lang }: StatsProps) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [recentLogs, setRecentLogs] = useState<HistoryLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
   

    const q = query(
      collection(db, "history"), 
      where("userId", "==", childId),
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const allItems = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as HistoryItem) 
      }));

      setRecentLogs([...allItems].reverse().slice(0, 30));

      const grouped = allItems.reduce((acc: Record<string, number>, curr: HistoryItem) => {
        if (!curr.date) return acc;
        
        // Локализация даты на основе пропса lang
        const dateKey = curr.date.toDate().toLocaleDateString(lang === 'fi' ? 'fi-FI' : 'ru-RU', { 
        day: 'numeric', 
        month: 'short' 
        });
        
        const val = curr.type === 'earn' ? curr.points : -curr.points;
        acc[dateKey] = (acc[dateKey] || 0) + val;
        return acc;
      }, {});

      setData(Object.keys(grouped).map(date => ({ name: date, points: grouped[date] })));
      setLoading(false);
    }, (err) => {
      console.error("Stats error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [childId, lang]);

  const totalPoints = data.reduce((acc, curr) => acc + curr.points, 0);
  const avgPerDay = data.length ? (totalPoints / data.length).toFixed(1) : "0";
  const lastWeekPoints = data.slice(-7).reduce((acc, curr) => acc + curr.points, 0);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📊 {t.statsTitle}</h3>
      
      <div className={styles.chartContainer} ref={containerRef}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }}
                itemStyle={{ color: 'var(--accent-blue)' }}
              />
              <Line 
                type="monotone" 
                dataKey="points" 
                stroke="var(--accent-blue)" 
                strokeWidth={4} 
                dot={{ r: 4, fill: 'var(--accent-blue)', stroke: 'var(--card-bg)', strokeWidth: 2 }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={styles.emptyState}>
           {loading ? "..." : t.stats.noData}
          </div>
        )}
      </div>

      <div className={styles.statsGrid}>
<div className={styles.statCard}>
  <small style={{ color: 'var(--text-secondary)', display: 'block' }}>
    {t.stats.average}
  </small>
  <div className={styles.statValue}>{avgPerDay}</div>
</div>

<div className={styles.statCard}>
  <small style={{ color: 'var(--text-secondary)', display: 'block' }}>
    {t.stats.weekly}
  </small>
  <div className={styles.statValue} style={{ color: 'var(--accent-green)' }}>
    {lastWeekPoints}
  </div>
</div>
      </div>

<div className={styles.logSection}>
  <h4 className={styles.logTitle}>
  {t.stats.recentTitle}
</h4>
  <div className={styles.logList}>
    {recentLogs.map(log => (
      <div key={log.id} className={styles.logItem}>
        {/* Если в базе label — это ключ перевода, можно обернуть в t.tasks[log.label] || log.label */}
        <span className={styles.logLabel}>{log.label}</span>
        <span style={{ fontWeight: 'bold', color: log.type === 'earn' ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
          {log.type === 'earn' ? `+${log.points}` : `-${log.points}`}
        </span>
      </div>
    ))}
  </div>
</div>


    </div>
  );
};