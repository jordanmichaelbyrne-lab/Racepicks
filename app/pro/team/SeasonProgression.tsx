import type { TeamRoundProgress } from "@/app/pro/lib/leagueRankHistory";

// Cumulative season-total line, with league rank at each round
// annotated below the line. Deliberately NOT per-round bars — a
// team's cumulative total only ever climbs or flattens, so this
// chart answers "am I building a lead / holding position", while
// per-rider slump detection (RiderTrendSparkline) is what should
// prompt a transfer decision, not this chart.
export default function SeasonProgression({ rounds }: { rounds: TeamRoundProgress[] }) {
  if (rounds.length === 0) {
    return (
      <p className="mt-4 text-sm text-neutral-500">
        No rounds scored yet — check back after the first event.
      </p>
    );
  }

  const maxCum = Math.max(...rounds.map((r) => r.cumulativePoints), 1);
  const padL = 8;
  const padR = 8;
  const w = 100 - padL - padR;

  const xFor = (i: number) => padL + (rounds.length === 1 ? 0 : (i / (rounds.length - 1)) * w);
  const yFor = (v: number) => 100 - (v / maxCum) * 80 - 5;

  const pathD = rounds
    .map((r, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(r.cumulativePoints)}`)
    .join(" ");

  return (
    <div className="mt-5">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full overflow-visible">
        <path d={pathD} fill="none" stroke="#f97316" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {rounds.map((r, i) => (
          <circle
            key={r.eventId}
            cx={xFor(i)}
            cy={yFor(r.cumulativePoints)}
            r="1.2"
            fill="#f97316"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="mt-1 flex justify-between gap-1 overflow-x-auto">
        {rounds.map((r) => (
          <div key={r.eventId} className="flex flex-shrink-0 flex-col items-center gap-1" style={{ width: `${100 / rounds.length}%`, minWidth: 56 }}>
            <span className="text-xs font-black text-orange-500">{r.cumulativePoints}</span>
            <span className="text-[10px] font-bold text-neutral-600">
              #{r.rank}/{r.leagueSize}
            </span>
            <span className="w-14 truncate text-center text-[10px] text-neutral-500">{r.venue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}