// WIP snapshot store — polls A01 pkgDOI every hour and persists to a JSONL file.
// Each line: {"ts":"...","date":"YYYY-MM-DD","hour":H,"pkgWip":{"3SOT":249349,...}}
// Retention: 30 days rolling (pruned on every write).

import { readFileSync, appendFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { env } from '$env/dynamic/private';
import { fetchA01, normPkg } from './a01';
import type { Shift, WipHistoryResponse } from '$lib/types/plating';
import { DAY_SHIFT_START, DAY_SHIFT_END } from './platingConfig';

interface WipSnapshot {
  ts: string;
  date: string;      // local YYYY-MM-DD
  hour: number;      // local 0-23
  pkgWip: Record<string, number>;  // normKey → Plate WIP
  totalDoi?: number; // total Plate DOI = totalWip / totalDailyPlan
}

const KEEP_DAYS = 30;

function storePath(): string {
  return env.WIP_STORE_PATH ?? './data/wip-snapshots.jsonl';
}

function fmt(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function subtractOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return fmt(prev);
}

function readAll(): WipSnapshot[] {
  const p = storePath();
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as WipSnapshot);
}

function write(entries: WipSnapshot[]): void {
  const p = storePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, entries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
}

function pruneOld(all: WipSnapshot[]): WipSnapshot[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  const cutoffStr = fmt(cutoff);
  return all.filter((s) => s.date >= cutoffStr);
}

// ── Public: take one snapshot now ─────────────────────────────────────────

export async function takeWipSnapshot(): Promise<void> {
  try {
    const a01 = await fetchA01();
    const pkgWip: Record<string, number> = {};
    for (const [nk, val] of a01.byNorm) {
      if (val.wip > 0) pkgWip[nk] = val.wip;
    }
    const totalWip = Object.values(pkgWip).reduce((s, v) => s + v, 0);
    const totalDoi = a01.totalDailyPlan > 0 ? totalWip / a01.totalDailyPlan : 0;

    const now = new Date();
    // Add 30s before reading hour so a timer that fires at 12:59:58
    // (targeting 13:00:00) is correctly stored as hour=13, not hour=12.
    const snapped = new Date(now.getTime() + 30_000);
    const entry: WipSnapshot = {
      ts: now.toISOString(),
      date: fmt(snapped),
      hour: snapped.getHours(),
      pkgWip,
      totalDoi,
    };

    const p = storePath();
    mkdirSync(dirname(p), { recursive: true });
    appendFileSync(p, JSON.stringify(entry) + '\n', 'utf-8');

    // Prune old on every write (cheap — max ~720 lines)
    const all = readAll();
    const kept = pruneOld(all);
    if (kept.length < all.length) write(kept);
  } catch {
    // Don't crash the server on a failed snapshot — just skip this tick
  }
}

// ── Public: start hourly poller ────────────────────────────────────────────

export function startWipPoller(): void {
  // Snapshot immediately so there's always at least one data point
  void takeWipSnapshot();

  // Then schedule at the top of each hour
  const now = new Date();
  const msUntilNextHour =
    (60 - now.getMinutes()) * 60_000 - now.getSeconds() * 1000 - now.getMilliseconds();

  setTimeout(() => {
    void takeWipSnapshot();
    setInterval(() => void takeWipSnapshot(), 3_600_000);
  }, msUntilNextHour);
}

// ── Public: query history for a shift ─────────────────────────────────────

export async function getWipHistory(date: string, shift: Shift): Promise<WipHistoryResponse> {
  const shiftHours: number[] =
    shift === 'D'
      ? Array.from({ length: DAY_SHIFT_END - DAY_SHIFT_START }, (_, i) => DAY_SHIFT_START + i)
      : [
          ...Array.from({ length: 24 - DAY_SHIFT_END }, (_, i) => DAY_SHIFT_END + i),
          ...Array.from({ length: DAY_SHIFT_START }, (_, i) => i),
        ];

  const hours = shiftHours.map((h) => `${String(h).padStart(2, '0')}:00`);

  // Night shift: hours 19-23 belong to date-1, hours 0-6 belong to date
  const expectedDate = (hour: number): string => {
    if (shift === 'D') return date;
    return hour < DAY_SHIFT_START ? date : subtractOneDay(date);
  };

  const all = readAll();

  // Build lookup: "YYYY-MM-DD:H" → snapshot
  const byKey = new Map<string, WipSnapshot>();
  for (const s of all) {
    byKey.set(`${s.date}:${s.hour}`, s);
  }

  // Collect all pkg keys that appear in any relevant snapshot
  const pkgSet = new Set<string>();
  for (const h of shiftHours) {
    const snap = byKey.get(`${expectedDate(h)}:${h}`);
    if (snap) Object.keys(snap.pkgWip).forEach((k) => pkgSet.add(k));
  }

  const wip: Record<string, (number | null)[]> = {};
  for (const pkg of pkgSet) {
    wip[pkg] = shiftHours.map((h) => {
      const snap = byKey.get(`${expectedDate(h)}:${h}`);
      return snap?.pkgWip[pkg] ?? null;
    });
  }

  // Fetch current A01 plan for DOI computation — works for both old and new snapshots.
  // Plan is stable enough that using today's plan for historical snapshots is acceptable.
  let totalDailyPlan = 0;
  try {
    const a01 = await fetchA01();
    totalDailyPlan = a01.totalDailyPlan;
  } catch {
    // A01 unavailable — DOI will be null
  }

  const doi: (number | null)[] = shiftHours.map((h) => {
    const snap = byKey.get(`${expectedDate(h)}:${h}`);
    if (!snap) return null;
    const totalWip = Object.values(snap.pkgWip).reduce((s, v) => s + v, 0);
    return totalDailyPlan > 0 ? totalWip / totalDailyPlan : null;
  });

  return { hours, wip, doi };
}
