import { readingActivity } from '@/lib/discovery';
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
  const first = (stats.name ?? 'You').trim().split(/\s+/)[0] || 'You';
  const circumference = 2 * Math.PI * 42;
  return <aside className="rounded-3xl border border-ui bg-surface-raised p-6" aria-label="Your reading week">
    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted">Your reading rhythm</p>
    <h2 className="mt-3 font-serif text-3xl text-ink">A little every day.</h2>
    <p className="mt-3 text-sm leading-relaxed text-muted">{activeDays ? `${first}, you've made space for stories on ${activeDays} ${activeDays === 1 ? 'day' : 'days'} this week.` : 'Open a story and make a little space for yourself.'}</p>
    <div className="relative mx-auto my-6 h-28 w-28">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`Read on ${activeDays} of the last 7 UTC calendar days`}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-soft)" strokeWidth="5"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - activeDays / 7)}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-serif text-4xl text-ink">{activeDays}<span className="text-lg text-muted">/7</span></span><span className="text-[10px] text-muted">reading days</span></div>
    </div>
    <div className="flex justify-between gap-1" aria-label="Daily reading activity">{week.map(d => <div key={d.day} className="text-center" title={`${d.day}: ${d.active ? 'read a story' : 'no reading recorded'}`}><span className={`mx-auto block h-5 w-5 rounded-full ${d.active ? 'bg-accent' : 'bg-surface-soft'}`} aria-label={`${d.day}: ${d.active ? 'read' : 'no activity'}`}/><span className="mt-2 block text-[9px] text-muted">{new Date(d.day + 'T12:00:00Z').toLocaleDateString('en', {weekday:'narrow', timeZone:'UTC'})}</span></div>)}</div>
    <p className="mt-4 text-center text-sm font-semibold text-ink">{streak ? `${streak} day reading streak` : 'Your next streak starts with a story'}</p>
    <p className="mt-1 text-center text-[10px] text-subtle">Calendar days in UTC</p>
    <div className="mt-6 grid grid-cols-3 gap-2 border-t border-ui pt-5 text-center">{[[stats.storiesRead,'opened'],[stats.quizzesTaken,'quizzes'],[stats.answers,'answers']].map(([value,label]) => <div key={label}><p className="text-xl font-semibold text-ink">{value}</p><p className="text-[10px] text-muted">{label}</p></div>)}</div>
    <p className="mt-2 text-[10px] text-subtle">Activity over the last 7 days; opened stories count once.</p>
    {stats.quizzesTaken > 0 && <p className="mt-4 text-xs text-muted">Quiz accuracy <strong className="text-ink">{stats.quizScore}%</strong></p>}
  </aside>;
}
