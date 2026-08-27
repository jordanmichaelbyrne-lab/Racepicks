import type { RiderRoundPoint } from "@/app/pro/lib/riderHistory";
import { isSlumping } from "@/app/pro/lib/riderHistory";

// Small per-rider trend line + a "Slumping" badge when the rider's
// last 3 scored rounds have each been lower than the one before.
// This is the signal meant to prompt an actual transfer decision —
// scoped to the one rider a token would replace, unlike a team-level
// chart which averages individual dips away.
export default function RiderTrendSparkline({ history }: { history: RiderRoundPoint[] }) {
  if (history.length === 0) {
    return <span className="text-[10px] text-neutral-600">No rounds yet</span>;
  }

  const points = history.map((h) => h.points);
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const w = 70;
  const h = 24;
  const step = points.length > 1 ? w / (points.length - 1) : 0;

  const coords = points.map((v, i) => [i * step, h - ((v - min) / range) * h]);
  const pathD = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const slumping = isSlumping(history);
  const lineColor = slumping ? "#f87171" : "#4ade80";
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <div className="flex items-center gap-3">
      {slumping && (
        <span className="whitespace-nowrap rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-red-300">
          Slumping 3 rds
        </span>
      )}
      <div className="text-right">
        <p className="mb-0.5 text-[10px] text-neutral-600">Last {points.length} rds</p>
        <svg width={w} height={h} className="overflow-visible">
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="1.5" />
          <circle cx={lastX} cy={lastY} r="2" fill={lineColor} />
        </svg>
      </div>
    </div>
  );
}