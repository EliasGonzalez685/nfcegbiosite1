"use client";

import { useState } from "react";
import type { StatsSummary } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export function KpiCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", accent ? "border-brand bg-brand text-white" : "border-line bg-white")}>
      <p className={cn("text-sm", accent ? "text-white/75" : "text-ink-3")}>{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</p>
      {sub && <p className={cn("mt-0.5 text-xs", accent ? "text-white/70" : "text-ink-3")}>{sub}</p>}
    </div>
  );
}

const SERIES = [
  { key: "scans", label: "Escaneos", color: "var(--color-brand)" },
  { key: "views", label: "Visitas", color: "#9db8a8" },
  { key: "clicks", label: "Clics", color: "var(--color-clay)" },
] as const;

export function DailyChart({ daily }: { daily: StatsSummary["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [series, setSeries] = useState<(typeof SERIES)[number]["key"]>("scans");
  const s = SERIES.find((x) => x.key === series)!;
  const max = Math.max(1, ...daily.map((d) => d[series]));
  const h = 160;
  const shown = hover !== null ? daily[hover] : null;
  const total = daily.reduce((a, d) => a + d[series], 0);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-3">{shown ? new Date(shown.date + "T12:00:00").toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" }) : `Últimos ${daily.length} días`}</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {formatNumber(shown ? shown[series] : total)} <span className="text-base font-medium text-ink-3">{s.label.toLowerCase()}</span>
          </p>
        </div>
        <div className="flex rounded-xl bg-paper-2 p-1">
          {SERIES.map((x) => (
            <button key={x.key} onClick={() => setSeries(x.key)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", series === x.key ? "bg-white shadow-sm" : "text-ink-3")}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex h-[160px] items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
        {daily.map((d, i) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
            <div
              className="w-full rounded-t-[4px] transition-all"
              style={{
                height: `${Math.max(2, (d[series] / max) * h)}px`,
                background: s.color,
                opacity: hover === null || hover === i ? 1 : 0.35,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-3">
        <span>{new Date(daily[0]?.date + "T12:00:00").toLocaleDateString("es-PY", { day: "numeric", month: "short" })}</span>
        <span>Hoy</span>
      </div>
    </div>
  );
}

export function RankList({ title, rows, empty }: { title: string; rows: { label: string; value: number; mono?: boolean }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-3">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={cn("truncate", r.mono && "font-mono")}>{r.label}</span>
                <span className="font-semibold tabular-nums">{formatNumber(r.value)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
