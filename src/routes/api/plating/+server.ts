// POST /api/plating
// - preformanceV2  → plan/shift target
// - OutputByMachine (EP only) → Night/Day totals + machine count (same source as chart)
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getPerfApiUrl,
  getPlatingApiUrl,
  getApiTimeout,
  getDefaultProcess,
  getDefaultSite,
} from '$lib/server/platingConfig';
import type { PlatingDailySummary, PlatingApiResponse, Shift } from '$lib/types/plating';

interface PerfRow {
  PKG: string;
  PLANP_SHIFT: number;
  DAY_USAGE: number;
  DAY_OUT: number;
  NIGHT_USAGE: number;
  NIGHT_OUT: number;
}

export const POST: RequestHandler = async ({ request }) => {
  let body: { DateStart?: string; shift?: string; Process?: string; Site?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    error(400, 'Invalid JSON body');
  }

  if (!body.DateStart) error(400, 'DateStart is required');

  const shift: Shift = body.shift === 'N' ? 'N' : 'D';
  const process = body.Process || getDefaultProcess();
  const site    = body.Site    || getDefaultSite();

  const dateStart = shift === 'N' ? subtractOneDay(body.DateStart!) : body.DateStart!;
  const dateEnd   = shift === 'N' ? body.DateStart!                  : addOneDay(body.DateStart!);

  const timeout = getApiTimeout();

  // Fetch OutputByMachine (EP totals) + preformanceV2 (plan/target) in parallel
  const [mcResult, perfResult] = await Promise.allSettled([
    (async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      try {
        const res = await fetch(getPlatingApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ DateStart: dateStart, DateEnd: dateEnd, Process: process, Site: site }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`OutputByMachine ${res.status}`);
        return (await res.json()) as PlatingApiResponse;
      } finally { clearTimeout(t); }
    })(),
    (async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      try {
        const res = await fetch(getPerfApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `DateStart=${dateStart}&DateEnd=${dateEnd}&Process=${encodeURIComponent(process)}`,
          signal: ctrl.signal,
        });
        if (!res.ok) return null;
        return (await res.json()) as { data?: PerfRow[] };
      } finally { clearTimeout(t); }
    })(),
  ]);

  if (mcResult.status === 'rejected') {
    error(502, `OutputByMachine error: ${mcResult.reason instanceof Error ? mcResult.reason.message : String(mcResult.reason)}`);
  }

  const mcData   = mcResult.value;
  const perfData = perfResult.status === 'fulfilled' ? perfResult.value : null;

  const rows = mcData.data ?? [];
  // Totals come from OutputByMachine (EP machines — same source as hourly chart)
  const totalDay   = rows.reduce((s, r) => s + (r.QTY_Day   ?? 0), 0);
  const totalNight = rows.reduce((s, r) => s + (r.QTY_Night ?? 0), 0);
  const totalShift = shift === 'D' ? totalDay : totalNight;
  const machineCount = new Set(rows.map((r) => r.MachineID)).size;

  // Plan/target from preformanceV2 (includes all machines in A01)
  const perfTot  = perfData?.data?.find((r) => r.PKG === 'TOTAL');
  const targetShift = perfTot?.PLANP_SHIFT ?? 0;
  const achievementPct = targetShift > 0 ? (totalShift / targetShift) * 100 : null;

  const payload: PlatingDailySummary = {
    rows,
    recordsTotal: mcData.recordsTotal,
    shift,
    date: body.DateStart!,
    totalDay,
    totalNight,
    totalAll: totalDay + totalNight,
    machineCount,
    targetShift,
    achievementPct,
  };

  return json(payload);
};

function subtractOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const p = new Date(y, m - 1, d - 1);
  return [p.getFullYear(), String(p.getMonth() + 1).padStart(2, '0'), String(p.getDate()).padStart(2, '0')].join('-');
}

function addOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const n = new Date(y, m - 1, d + 1);
  return [n.getFullYear(), String(n.getMonth() + 1).padStart(2, '0'), String(n.getDate()).padStart(2, '0')].join('-');
}
