import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { db } from '../db';
import { collection, query, onSnapshot, orderBy, Timestamp, where } from 'firebase/firestore';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';

// 1. ВОТ ЗДЕСЬ: Ленивая загрузка. 
// Мы убрали прямой импорт recharts и загружаем твой новый файл по требованию.
const PointsChart = lazy(() => import('./Charts/PointsChart').then(m => ({ default: m.PointsChart })));

import type { TranslationContent } from '../translations';
import styles from './Stats.module.css';
import { getLocalDayKey, toDateValue } from '../utils/dayKey';

interface HistoryItem {
  userId: string;
  points: number;
  date: Timestamp | Date | string;
  label: string;
  type?: 'earn' | 'spend';
  familyId?: string;
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
  familyId: string;
  lang: 'fi' | 'ru' | 'en';
}

export const Stats = ({ t, childId, familyId, lang }: StatsProps) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [recentLogs, setRecentLogs] = useState<HistoryLogItem[]>([]);
  const [loadedScopeKey, setLoadedScopeKey] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const chartLocale = lang === 'fi' ? 'fi-FI' : lang === 'ru' ? 'ru-RU' : 'en-US';
  const scopeKey = childId && familyId ? `${familyId}:${childId}` : '';
  const isScopeReady = !!scopeKey && loadedScopeKey === scopeKey;
  const visibleData = isScopeReady ? data : [];
  const visibleRecentLogs = isScopeReady ? recentLogs : [];
  const loading = !!scopeKey && !isScopeReady;

  const getSignedHistoryPoints = (item: Pick<HistoryItem, 'points' | 'type'>) => {
    const rawPoints = Number(item.points) || 0;

    if (item.type === 'spend') {
      return -Math.abs(rawPoints);
    }

    if (item.type === 'earn') {
      return Math.abs(rawPoints);
    }

    return rawPoints;
  };

  const formatSignedPoints = (item: Pick<HistoryItem, 'points' | 'type'>) => {
    const signedPoints = getSignedHistoryPoints(item);
    if (signedPoints > 0) return `+${signedPoints}`;
    return signedPoints.toString();
  };

  useEffect(() => {
    if (!scopeKey) return;

    const formatChartLabel = (dayKey: string) => {
      const [year, month, day] = dayKey.split('-').map(Number);
      return new Intl.DateTimeFormat(chartLocale, {
        day: 'numeric',
        month: 'short',
      }).format(new Date(year, month - 1, day));
    };

    const unsubscribe = onSnapshot(
      query(
        collection(db, "history"),
        where("familyId", "==", familyId),
        where("userId", "==", childId),
        orderBy("date", "asc"),
      ),
      (snap: QuerySnapshot<DocumentData>) => {
        const allItems = snap.docs
          .map((doc) => {
            const docData = doc.data() as HistoryItem;
            return { id: doc.id, ...docData };
          })
          .sort((left, right) => {
            const leftTime = toDateValue(left.date)?.getTime() ?? 0;
            const rightTime = toDateValue(right.date)?.getTime() ?? 0;
            return leftTime - rightTime;
          });

        setRecentLogs([...allItems].reverse().slice(0, 30));

        const grouped = allItems.reduce((acc: Record<string, number>, curr: HistoryLogItem) => {
          const itemDate = toDateValue(curr.date);
          if (!itemDate) return acc;

          const dateKey = getLocalDayKey(itemDate);
          acc[dateKey] = (acc[dateKey] || 0) + getSignedHistoryPoints(curr);
          return acc;
        }, {});

        setData(
          Object.entries(grouped)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([date, points]): ChartData => ({
              name: formatChartLabel(date),
              points,
            })),
        );
        setLoadedScopeKey(scopeKey);
      },
      (err: Error) => {
        console.error("Stats query error:", err);
        setData([]);
        setRecentLogs([]);
        setLoadedScopeKey(scopeKey);
      },
    );

    return () => unsubscribe();
  }, [chartLocale, childId, familyId, scopeKey]);

  const totalPoints = visibleData.reduce((acc, curr) => acc + curr.points, 0);
  const avgPerDay = visibleData.length ? (totalPoints / visibleData.length).toFixed(1) : "0";
  const lastWeekPoints = visibleData.slice(-7).reduce((acc, curr) => acc + curr.points, 0);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📊 {t.statsTitle}</h3>
      
      {/* 2. ВОТ ЗДЕСЬ: Обертка Suspense */}
      <div className={styles.chartContainer} ref={containerRef}>
        {visibleData.length > 0 ? (
          <Suspense fallback={<div className={styles.emptyState}>...</div>}>
            <PointsChart data={visibleData} />
          </Suspense>
        ) : (
          <div className={styles.emptyState}>
            {loading ? "..." : t.stats?.noData || "No data"}
          </div>
        )}
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <small style={{ color: 'var(--text-secondary)', display: 'block' }}>{t.stats?.average}</small>
          <div className={styles.statValue}>{avgPerDay}</div>
        </div>
        <div className={styles.statCard}>
          <small style={{ color: 'var(--text-secondary)', display: 'block' }}>{t.stats?.weekly}</small>
          <div
            className={styles.statValue}
            style={{ color: lastWeekPoints < 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}
          >
            {lastWeekPoints}
          </div>
        </div>
      </div>

      <div className={styles.logSection}>
        <h4 className={styles.logTitle}>{t.stats?.recentTitle}</h4>
        <div className={styles.logList}>
          {visibleRecentLogs.map((log) => (
            <div key={log.id} className={styles.logItem}>
              <span className={styles.logLabel}>{log.label}</span>
              <span style={{ 
                fontWeight: 'bold', 
                color: getSignedHistoryPoints(log) < 0 ? 'var(--accent-orange)' : 'var(--accent-green)' 
              }}>
                {formatSignedPoints(log)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
