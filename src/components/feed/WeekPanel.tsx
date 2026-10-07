import { readingActivity } from '@/lib/discovery';
import styles from './Discovery.module.css';
export type WeekStats = {
  name: string | null;
  storiesRead: number;
  quizzesTaken: number;
  quizScore: number;
  answers: number;
  readingDays: string[];
};
export function WeekPanel({ stats }: { stats: WeekStats }) {
  const { week, streak, activeDays } = readingActivity(stats.readingDays);
  return <aside className={styles.week} aria-label="Your reading week">
    <h2>Your week</h2>
    <div className={styles.weekBody}>
      <div className={styles.ring}>
        <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-soft)" strokeWidth="5"/><circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 44} strokeDashoffset={2 * Math.PI * 44 * (1 - activeDays / 7)} /></svg>
        <div aria-label={`Read on ${activeDays} of the last 7 UTC calendar days`}><strong>{activeDays}<small>/7</small></strong><span>reading days</span></div>
      </div>
      <div className={styles.days} aria-label="Daily reading activity, UTC">{week.map(d => <div key={d.day} title={`${d.day} UTC: ${d.active ? 'read a story' : 'no reading recorded'}`}><span className={d.active ? styles.activeDay : styles.day} aria-label={`${d.day}: ${d.active ? 'read' : 'no activity'}`}/><small>{new Date(d.day + 'T12:00:00Z').toLocaleDateString('en', {weekday:'narrow', timeZone:'UTC'})}</small></div>)}</div>
    </div>
    <div className={styles.weekStats} aria-label="Activity over the last seven days">
      <div title="Consecutive UTC reading days"><strong>{streak}</strong><small>day streak</small></div>
      {[[stats.storiesRead,'stories opened'],[stats.quizzesTaken,'quizzes'],[stats.answers,'answers']].map(([value,label]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}
    </div>
    {stats.quizzesTaken > 0 && <p className={styles.accuracy}>Quiz accuracy {stats.quizScore}%</p>}
  </aside>;
}
