// GET /api/plating/machine-status?date=YYYY-MM-DD&shift=D|N
// Fetches Plate machine events + per-machine KPIs from EMH Dashboard API.
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEmhApiUrl, getEmhApiKey, epNum } from '$lib/server/emhConfig';
import type { MachineStatusResponse, PlatingMachineEvent } from '$lib/types/plating';
import type { Shift } from '$lib/types/plating';

interface EmhEvent {
  event_time: string;
  machine_id: string;
  area: string;
  job_type: string;
  symptom: string;
  repair_min: number;
  package_type: string;
}

interface EmhRecentEvent {
  ts: string;
  job_type: string;
  status: 'Open' | 'Closed';
  duration_min: number;
}

interface EmhMachineDetail {
  status: string;
  data: {
    info: { machine_id: string; area: string };
    kpis: { down_events: number; avg_mttr_min: number; pm_events: number; utilization_pct: number };
    recent_events: EmhRecentEvent[];
  };
}

export const GET: RequestHandler = async ({ url }) => {
  const date  = url.searchParams.get('date')  ?? todayStr();
  const shift: Shift = url.searchParams.get('shift') === 'N' ? 'N' : 'D';

  const base    = getEmhApiUrl();
  const headers = { 'X-API-Key': getEmhApiKey() };
  const timeout = 10_000;
  const qs = `date=${date}&shift=${shift}`;

  // ── Step 1: fetch all Plate events to discover machine IDs ───────────────
  let allEvents: EmhEvent[] = [];
  try {
    const res = await fetchJson<{ status: string; data: { events: EmhEvent[] } }>(
      `${base}/api/v1/downtime/events?area=PLATE&${qs}&limit=9999`,
      headers,
      timeout
    );
    allEvents = (res?.data?.events ?? [])
      .filter((e) => e.area?.toUpperCase() === 'PLATE')
      .filter((e) => inShift(e.event_time, date, shift));
  } catch {
    // events unavailable — return empty
    return json({ byEpNum: {} } satisfies MachineStatusResponse);
  }

  // ── Step 2: collect unique machine IDs from events ───────────────────────
  const machineIds = [...new Set(allEvents.map((e) => e.machine_id).filter(Boolean))];

  // ── Step 3: fetch machines/detail for each machine in parallel ───────────
  const details = await Promise.allSettled(
    machineIds.map((id) =>
      fetchJson<EmhMachineDetail>(
        `${base}/api/v1/machines/detail?id=${encodeURIComponent(id)}&${qs}`,
        headers,
        timeout
      )
    )
  );

  const detailByEp = new Map<number, EmhMachineDetail['data']>();
  for (let i = 0; i < machineIds.length; i++) {
    const r = details[i];
    if (r.status === 'fulfilled' && r.value?.data) {
      detailByEp.set(epNum(machineIds[i]), r.value.data);
    }
  }

  // ── Step 4: group events by machine ─────────────────────────────────────
  const eventsByEp = new Map<number, PlatingMachineEvent[]>();
  for (const ev of allEvents) {
    const n = epNum(ev.machine_id);
    if (!eventsByEp.has(n)) eventsByEp.set(n, []);
    eventsByEp.get(n)!.push({
      eventTime:   ev.event_time,
      jobType:     ev.job_type   ?? '',
      symptom:     ev.symptom    ?? '',
      repairMin:   ev.repair_min ?? 0,
      packageType: ev.package_type ?? '',
    });
  }

  // ── Step 5: merge into response ──────────────────────────────────────────
  const allNums = new Set([...detailByEp.keys(), ...eventsByEp.keys()]);
  const byEpNum: MachineStatusResponse['byEpNum'] = {};

  const SHIFT_MIN = 12 * 60; // Day and Night shifts are both 12 hours

  for (const n of allNums) {
    const d = detailByEp.get(n);
    const downEvents  = d?.kpis.down_events  ?? 0;
    const avgMttrMin  = d?.kpis.avg_mttr_min ?? 0;
    const totalDownMin = downEvents * avgMttrMin;
    const availabilityPct = d ? Math.max(0, Math.round((1 - totalDownMin / SHIFT_MIN) * 1000) / 10) : null;
    const hasOpenEvent = d?.recent_events.some((e) => e.status === 'Open') ?? false;
    byEpNum[n] = {
      downEvents,
      avgMttrMin,
      availabilityPct,
      status: hasOpenEvent ? 'DOWN' : 'RUN',
      events: eventsByEp.get(n) ?? [],
    };
  }

  return json({ byEpNum } satisfies MachineStatusResponse);
};

/** Returns true if the event timestamp falls within the given shift window.
 *  Day  D: 07:00–19:00 on `date`
 *  Night N: 19:00–23:59 on `date-1` OR 00:00–06:59 on `date`
 */
function inShift(isoTs: string, date: string, shift: Shift): boolean {
  if (!isoTs) return false;
  const d = new Date(isoTs);
  const evDate = [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('-');
  const evHour = d.getUTCHours();

  if (shift === 'D') {
    return evDate === date && evHour >= 7 && evHour < 19;
  } else {
    // Night: 19:00-23:59 on date-1 OR 00:00-06:59 on date
    const prevDate = subtractOneDay(date);
    return (evDate === prevDate && evHour >= 19) ||
           (evDate === date     && evHour < 7);
  }
}

function subtractOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return [
    prev.getUTCFullYear(),
    String(prev.getUTCMonth() + 1).padStart(2, '0'),
    String(prev.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

async function fetchJson<T>(url: string, headers: Record<string, string>, timeout: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

function todayStr(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
