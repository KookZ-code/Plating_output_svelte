// Server-only: Plating-stage plan/WIP/DOI from the A01 API.
// POST http://mth-vm-asoprd/assyapi/api/A01/pkgDOI (empty body).
// Package-name matching uses the same normPkg logic as the WB dashboard
// so "8SOIC" (outputbymc) matches "8L SOIC" (A01).

import { env } from '$env/dynamic/private';

interface A01Row {
  Item: number;
  Package: string;
  Plan: number;
  Staging: number;    // Staging WIP (before Mold)
  Mold: number;       // Mold WIP
  MoldDOI: number;    // Mold DOI
  PMC: number;        // Post Mold Cure WIP
  Mark: number;       // Mark WIP
  MarkDOI: number;    // Mark DOI
  Reflow: number;     // Reflow WIP
  Plate: number;      // Plating-stage WIP
  PlateDOI: number;   // Plating-stage DOI
}

export interface A01Val {
  plan: number;      // per DAY — caller divides by 2 for per-shift
  staging: number;   // Staging WIP (r.Staging)
  moldWip: number;   // Mold WIP (r.Mold) — target for Mold process, upstream for Mark
  moldDoi: number;   // Mold DOI (r.MoldDOI)
  mold: number;      // PMC WIP (r.PMC) — "Post Mold" column for Plate process
  mark: number;      // Mark WIP (r.Mark)
  markDoi: number;   // Mark DOI (r.MarkDOI)
  reflow: number;    // Reflow WIP
  wip: number;       // Plate WIP (r.Plate)
  doi: number;       // Plate DOI (r.PlateDOI)
}

export interface A01Data {
  byNorm: Map<string, A01Val>;        // normalised pkg name → values
  totalDailyPlan: number;             // sum of Plan across all rows
  rows: Array<{ pkg: string; plan: number; name: string }>; // ordered (A01 seq), name = original A01 label
}

const TTL_MS = 60_000;
let cache: { at: number; data: A01Data } | null = null;

/** Normalise package name to a comparable key.
 *
 *  Steps (applied in order):
 *  1. Uppercase
 *  2. Strip MPC variant codes in parens: "(2LX)", "(UDX)"
 *  3. Normalise SOT-23 family → SOT
 *  4. Strip lead-count prefix: "8L" → "8", "32L" → "32"
 *  5. Strip size specs: "3X3", "4X4W", "6X6(P)", "7.5X7.5", "10X10(YXX)" etc.
 *  6. Strip known suffixes that vary but refer to same base: HD, PLASMA, COL
 *  7. Drop all non-alphanumeric (spaces, dashes, dots)
 *
 *  Examples:
 *   "32L VQFN 5X5(PFA)"    → "32VQFN"
 *   "36L SQFN 6X6(UDX)P"  → "36SQFN"
 *   "44L TQFP HD"          → "44TQFPHD"
 *   "20L SSOP UDLF"        → "20SSOPUDLF"     (intentionally distinct from "20SSOP")
 *   "20L VQFN 3x3(2LX)W"  → "20VQFN"
 *   "28L QFN-S 6X6(M2X)"  → "28QFNS"         (intentionally distinct from "28QFN")
 *   "8L SOIC  IDF"         → "8SOICIDF"       (intentionally distinct from "8SOIC")
 *   "3L SOT"               → "3SOT"
 *   "3SOT-23"              → "3SOT"
 */
export function normPkg(s: string): string {
  return (s || '')
    .toUpperCase()
    .replace(/\(.*?\)/g, '')                    // drop MPC variant "(2LX)"
    .replace(/SOT-?23/gi, 'SOT')                // SOT-23 → SOT
    .replace(/SOIJ/g, 'EIAJ')                  // lot "8SOIJ" = A01 "8L EIAJ"
    .replace(/\b(\d+)L\b/g, '$1')              // "8L" → "8"
    .replace(/\b\d+[Xx]\d+(?:\.\d+)?\w*\b/g, '') // strip size specs: "3X3", "4X4W", "7.5X7.5"
    // Note: HD, UDLF, IDF, UP are NOT stripped — A01 variants show as separate rows.
    // Lot records never include these suffixes so their output will be 0,
    // but WIP/DOI/Plan per variant is preserved from A01.
    .replace(/[^A-Z0-9]/g, '');                 // drop spaces/dashes/dots
}

function getUrl(): string {
  return env.A01_API_URL ?? 'http://mth-vm-asoprd/assyapi/api/A01/pkgDOI';
}

export async function fetchA01(): Promise<A01Data> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;

  let body: { data?: A01Row[] } | A01Row[];
  try {
    const res = await fetch(getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`A01 API ${res.status}`);
    body = (await res.json()) as { data?: A01Row[] } | A01Row[];
  } catch (err) {
    if (cache) return cache.data; // serve stale on error
    throw err;
  }

  const rawRows = Array.isArray(body) ? body : (body.data ?? []);

  const byNorm = new Map<string, A01Val>();
  let totalDailyPlan = 0;
  const orderedRows: Array<{ pkg: string; plan: number }> = [];

  for (const r of rawRows) {
    if (!r.Package || r.Package === 'TOTAL' || r.Package === 'ALL QFN') continue;
    const plan   = r.Plan   ?? 0;
    const staging = r.Staging  ?? 0;
    const moldWip = r.Mold     ?? 0;
    const moldDoi = r.MoldDOI  ?? 0;
    const mold    = r.PMC      ?? 0;  // Post Mold Cure WIP
    const mark    = r.Mark     ?? 0;
    const markDoi = r.MarkDOI  ?? 0;
    const reflow  = r.Reflow   ?? 0;
    // QFN/VQFN/SQFN packages have incorrect Plate WIP in A01 — exclude them
    const isQfn = /QFN|VQFN|SQFN/i.test(r.Package);
    const wip     = isQfn ? 0 : (r.Plate    ?? 0);
    const doi     = isQfn ? 0 : (r.PlateDOI ?? 0);
    totalDailyPlan += plan;
    orderedRows.push({ pkg: normPkg(r.Package), plan, name: r.Package.trim() });

    const nk = normPkg(r.Package);
    if (nk) {
      const cur = byNorm.get(nk);
      byNorm.set(nk, {
        plan:    (cur?.plan    ?? 0) + plan,
        staging: (cur?.staging ?? 0) + staging,
        moldWip: (cur?.moldWip ?? 0) + moldWip,
        moldDoi: cur ? cur.moldDoi : moldDoi,
        mold:    (cur?.mold    ?? 0) + mold,
        mark:    (cur?.mark    ?? 0) + mark,
        markDoi: cur ? cur.markDoi : markDoi,
        reflow:  (cur?.reflow  ?? 0) + reflow,
        wip:     (cur?.wip     ?? 0) + wip,
        doi:     cur ? cur.doi : doi,
      });
    }
  }

  const data: A01Data = { byNorm, totalDailyPlan, rows: orderedRows };
  cache = { at: Date.now(), data };
  return data;
}

/** Look up A01 values for a package name (outputbymc format). */
export function lookupA01(pkg: string, data: A01Data): A01Val | undefined {
  return data.byNorm.get(normPkg(pkg));
}

/** Invalidate cache (e.g. on date change). */
export function clearA01Cache(): void {
  cache = null;
}
