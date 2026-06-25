// GET /api/plating/hourly?date=YYYY-MM-DD&shift=D|N&process=&site=
// Fetches per-lot records for all machines and aggregates into hourly cumulative buckets.
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getLotApiUrl,
  getMachineListUrlForProcess,
  getApiTimeout,
  getDefaultProcess,
  DAY_SHIFT_START,
  DAY_SHIFT_END,
} from '$lib/server/platingConfig';
import { fetchA01, lookupA01, normPkg } from '$lib/server/a01';
import type {
  PlatingLotApiResponse,
  PlatingLotRecord,
  PlatingHourlyResponse,
  Shift,
} from '$lib/types/plating';

export const GET: RequestHandler = async ({ url }) => {
  const date = url.searchParams.get('date') ?? todayStr();
  const shift: Shift = url.searchParams.get('shift') === 'N' ? 'N' : 'D';
  const process = url.searchParams.get('process') ?? '';
  const site = url.searchParams.get('site') ?? '';

  const timeout = getApiTimeout();

  // ── Step 1: get machines for the selected process ────────────────────
  const activeProcess = process || getDefaultProcess();
  const machineFilter: Record<string, RegExp> = {
    Plate: /MTAI_EP\d+/i,
    Mold:  /MTAI_MO\d+/i,
    Mark:  /MTAI_LM\d+/i,
  };
  const filter = machineFilter[activeProcess] ?? null;

  let machineIds: string[] = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(getMachineListUrlForProcess(activeProcess), { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const all = (await res.json()) as string[];
      machineIds = filter ? all.filter((id) => filter.test(id)) : all;
    }
  } catch {
    return json(emptyHourly(shift));
  }

  if (machineIds.length === 0) {
    return json(emptyHourly(shift));
  }

  // ── Step 2: fetch per-lot records for all machines in parallel ─────────
  const lotApiBase = getLotApiUrl();
  const settled = await Promise.allSettled(
    machineIds.map(async (machine): Promise<PlatingLotRecord[]> => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      try {
        // Always use wide range (date-1 to date+1) so real-time intraday records are captured.
        // The shift-hour bucket logic filters to only the correct shift hours.
        const lotDateF = subtractOneDay(date);
        const lotDateT = addOneDay(date);
        const res = await fetch(
          `${lotApiBase}?machine=${encodeURIComponent(machine)}&dateF=${lotDateF}&dateT=${lotDateT}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) return [];
        const d = (await res.json()) as PlatingLotApiResponse;
        return d.data ?? [];
      } finally {
        clearTimeout(t);
      }
    })
  );

  const allRecords: PlatingLotRecord[] = settled
    .filter((r): r is PromiseFulfilledResult<PlatingLotRecord[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  // ── Step 3: build shift hour buckets ───────────────────────────────────
  const hours = buildHourLabels(shift);
  const shiftHours = getShiftHours(shift);

  const buckets: Record<string, number[]> = {};
  // machineId → pkg → total shift output (for drill-down)
  const machineOutput: Record<string, Record<string, number>> = {};
  // machineId → hourly delta buckets (for per-hour drill-down)
  const machineBuckets: Record<string, number[]> = {};

  // For each shift hour, the valid calendar date:
  // Day shift: all hours are on `date`
  // Night shift: hours 19-23 are on `subtractOneDay(date)`, hours 0-6 are on `date`
  const nightBreak = shift === 'N' ? DAY_SHIFT_START : -1; // hour < nightBreak means next-day for N

  for (const rec of allRecords) {
    if (!rec.TXNTIMESTAMP_SOURCE || !rec.PACKAGE) continue;
    const hour = parseHour(rec.TXNTIMESTAMP_SOURCE);
    if (hour === null) continue;
    const idx = shiftHours.indexOf(hour);
    if (idx === -1) continue;

    // Validate the record's date matches the expected calendar date for this shift hour
    const recDate = parseDate(rec.TXNTIMESTAMP_SOURCE);
    if (!recDate) continue;
    const expectedDate = (shift === 'D')
      ? date                                      // Day: all hours on selected date
      : (hour < nightBreak ? date : subtractOneDay(date)); // Night: 0-6 on date, 19-23 on date-1
    if (recDate !== expectedDate) continue;

    const pkg = rec.PACKAGE;
    const qty = rec.QTY ?? 0;

    // hourly buckets
    if (!buckets[pkg]) buckets[pkg] = Array(hours.length).fill(0) as number[];
    buckets[pkg][idx] += qty;

    // machine-level totals
    const machine = rec.EQUIP ?? '';
    if (machine) {
      if (!machineOutput[machine]) machineOutput[machine] = {};
      machineOutput[machine][pkg] = (machineOutput[machine][pkg] ?? 0) + qty;

      if (!machineBuckets[machine]) machineBuckets[machine] = Array(hours.length).fill(0) as number[];
      machineBuckets[machine][idx] += qty;
    }
  }

  // Convert deltas → cumulative
  const packages: Record<string, number[]> = {};
  for (const [pkg, deltas] of Object.entries(buckets)) {
    let running = 0;
    packages[pkg] = deltas.map((d) => { running += d; return running; });
  }

  // Convert machine deltas → cumulative
  const machineHourly: Record<string, number[]> = {};
  for (const [machine, deltas] of Object.entries(machineBuckets)) {
    let running = 0;
    machineHourly[machine] = deltas.map((d) => { running += d; return running; });
  }

  // ── Step 4: A01 — target line + per-package plan / WIP / DOI ─────────
  let targetPerShift = 0;
  const pkgPlans:   Record<string, number> = {};
  const pkgStaging: Record<string, number> = {};
  const pkgMoldWip: Record<string, number> = {};
  const pkgMoldDoi: Record<string, number> = {};
  const pkgMold:    Record<string, number> = {};
  const pkgMark:    Record<string, number> = {};
  const pkgMarkDoi: Record<string, number> = {};
  const pkgReflow:  Record<string, number> = {};
  const pkgWip:     Record<string, number> = {};
  const pkgDoi:     Record<string, number> = {};
  const pkgOrder:  string[] = [];                // all A01 normKeys in sequence
  const pkgNames:  Record<string, string> = {};  // normKey → A01 display name
  const normToOut: Record<string, string> = {};  // normKey → outputbymc pkg key

  // Build reverse map: normPkg(outputbymcName) → outputbymcName
  const outByNorm = new Map<string, string>();
  for (const pkg of Object.keys(packages)) {
    outByNorm.set(normPkg(pkg), pkg);
  }

  try {
    const a01 = await fetchA01();
    targetPerShift = Math.round(a01.totalDailyPlan / 2);

    // Iterate ALL A01 packages in sequence order, include those with plan > 0
    for (const { pkg: nk, plan } of a01.rows) {
      if (plan <= 0) continue; // skip zero-plan packages
      if (pkgOrder.includes(nk)) continue; // dedup (multiple A01 rows same normKey)
      pkgOrder.push(nk);

      const val = a01.byNorm.get(nk);
      if (val) {
        pkgPlans[nk]   = Math.round(val.plan / 2);
        if (val.staging > 0) pkgStaging[nk] = val.staging;
        if (val.moldWip > 0) pkgMoldWip[nk] = val.moldWip;
        if (val.moldDoi > 0) pkgMoldDoi[nk] = val.moldDoi;
        if (val.mold    > 0) pkgMold[nk]    = val.mold;
        if (val.mark    > 0) pkgMark[nk]    = val.mark;
        if (val.markDoi > 0) pkgMarkDoi[nk] = val.markDoi;
        if (val.reflow  > 0) pkgReflow[nk]  = val.reflow;
        if (val.wip     > 0) pkgWip[nk]     = val.wip;
        if (val.doi     > 0) pkgDoi[nk]     = val.doi;
      }
      // Map normKey to outputbymc package name for output lookup
      const outPkg = outByNorm.get(nk);
      if (outPkg) normToOut[nk] = outPkg;
    }

    // Also populate pkgNames using A01 row names (first occurrence wins)
    // We rebuild pkgNames from rawRows via a01.rows pkg field (normKey as-is)
    // For display: use the outputbymc name if matched, otherwise use normKey
    for (const nk of pkgOrder) {
      pkgNames[nk] = normToOut[nk] ?? nk;
    }

    // Also add packages that have output but no A01 entry (edge case)
    for (const pkg of Object.keys(packages)) {
      const nk = normPkg(pkg);
      if (!pkgOrder.includes(nk)) {
        pkgOrder.push(nk);
        pkgNames[nk] = pkg;
        normToOut[nk] = pkg;
      }
    }
  } catch {
    // A01 unavailable — fall back to outputbymc packages only
    for (const pkg of Object.keys(packages)) {
      const nk = normPkg(pkg);
      pkgOrder.push(nk);
      pkgNames[nk] = pkg;
      normToOut[nk] = pkg;
    }
  }

  const target_cumulative =
    targetPerShift > 0
      ? hours.map((_, i) => Math.round((targetPerShift / hours.length) * (i + 1)))
      : hours.map(() => 0);

  return json({ hours, packages, target_cumulative, machineOutput, machineHourly, pkgPlans, pkgStaging, pkgMoldWip, pkgMoldDoi, pkgMold, pkgMark, pkgMarkDoi, pkgReflow, pkgWip, pkgDoi, pkgOrder, pkgNames, normToOut } satisfies PlatingHourlyResponse);
};

// ── Helpers ────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function buildHourLabels(shift: Shift): string[] {
  const hours: string[] = [];
  if (shift === 'D') {
    for (let h = DAY_SHIFT_START; h < DAY_SHIFT_END; h++) {
      hours.push(`${String(h).padStart(2, '0')}:00`);
    }
  } else {
    for (let h = DAY_SHIFT_END; h < 24; h++) {
      hours.push(`${String(h).padStart(2, '0')}:00`);
    }
    for (let h = 0; h < DAY_SHIFT_START; h++) {
      hours.push(`${String(h).padStart(2, '0')}:00`);
    }
  }
  return hours;
}

function getShiftHours(shift: Shift): number[] {
  if (shift === 'D') {
    return Array.from({ length: DAY_SHIFT_END - DAY_SHIFT_START }, (_, i) => DAY_SHIFT_START + i);
  }
  const hours: number[] = [];
  for (let h = DAY_SHIFT_END; h < 24; h++) hours.push(h);
  for (let h = 0; h < DAY_SHIFT_START; h++) hours.push(h);
  return hours;
}

/** Returns "YYYY-MM-DD" from ASO timestamp "20260623 091234000" or ISO */
function parseDate(ts: string): string | null {
  // ASO: "20260623 091234000" → "2026-06-23"
  const aso = ts.match(/^(\d{4})(\d{2})(\d{2})\s/);
  if (aso) return `${aso[1]}-${aso[2]}-${aso[3]}`;
  // ISO: "2026-06-23T09:12:34"
  const iso = ts.match(/^(\d{4}-\d{2}-\d{2})[T ]/);
  return iso ? iso[1] : null;
}

function parseHour(ts: string): number | null {
  // ISO:       "2026-06-19T21:07:05"   → match "T21:"
  // ASO format: "20260619 210705000"   → YYYYMMDD space HHMMSS...
  const isoMatch = ts.match(/[T ](\d{2}):/);
  if (isoMatch) return parseInt(isoMatch[1], 10);

  // "20260619 210705000" — space at index 8, hour at index 9–10
  const spaceIdx = ts.indexOf(' ');
  if (spaceIdx >= 0 && ts.length > spaceIdx + 2) {
    const hh = parseInt(ts.slice(spaceIdx + 1, spaceIdx + 3), 10);
    if (!isNaN(hh)) return hh;
  }
  return null;
}

function subtractOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return [
    prev.getFullYear(),
    String(prev.getMonth() + 1).padStart(2, '0'),
    String(prev.getDate()).padStart(2, '0'),
  ].join('-');
}

function addOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('-');
}

function emptyHourly(shift: Shift): PlatingHourlyResponse {
  const hours = buildHourLabels(shift);
  return { hours, packages: {}, target_cumulative: hours.map(() => 0), machineOutput: {}, machineHourly: {}, pkgPlans: {}, pkgStaging: {}, pkgMoldWip: {}, pkgMoldDoi: {}, pkgMold: {}, pkgMark: {}, pkgMarkDoi: {}, pkgReflow: {}, pkgWip: {}, pkgDoi: {}, pkgOrder: [], pkgNames: {}, normToOut: {} };
}
