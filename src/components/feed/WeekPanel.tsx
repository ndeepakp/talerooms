export type WeekStats = {
  name: string | null;
  storiesRead: number;
  quizzesTaken: number;
  quizScore: number; // 0–100, average correct
  answers: number;
};

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface-soft py-2">
      <p className="text-lg font-bold text-ink">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

// "Your week" — a reader's last-7-days activity, shown in the feed's right rail.
export function WeekPanel({ stats }: { stats: WeekStats }) {
  const active = stats.storiesRead + stats.quizzesTaken + stats.answers > 0;
  const first = (stats.name ?? "You").trim().split(/\s+/)[0] || "You";

  return (
    <div className="rounded-2xl border border-ui bg-surface-raised p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Your week</p>
        <span className="text-xs text-subtle">last 7 days</span>
      </div>

      {active ? (
        <p className="mt-1 text-sm text-muted">
          {first}, you read <strong>{stats.storiesRead}</strong>{" "}
          {stats.storiesRead === 1 ? "story" : "stories"}
          {stats.quizzesTaken > 0 && (
            <>
              {" "}
              and scored <strong>{stats.quizScore}%</strong> on quizzes
            </>
          )}{" "}
          this week. 🎉
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">
          Open a story to start your week. 📖
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat value={stats.storiesRead} label="read" />
        <Stat value={stats.quizzesTaken} label="quizzes" />
        <Stat value={stats.answers} label="answers" />
      </div>

      {stats.quizzesTaken > 0 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-soft">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${stats.quizScore}%` }}
          />
        </div>
      )}
    </div>
  );
}
