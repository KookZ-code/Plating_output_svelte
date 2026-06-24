// Plating domain types — strict, no `any`

export type Shift = 'D' | 'N';

// ── External ASO API shapes ────────────────────────────────────────────────

/** Row returned by POST /api/areport/OutputByMachine */
export interface PlatingMachineRow {
  MachineID: string;
  PKGCODE: string;
  QTY_Night: number;
  QTY_Day: number;
  QTYStrip_Night: number;
  QTYStrip_Day: number;
}

/** Row returned by GET /api/areport/outputbymc — per-lot scan record */
export interface PlatingLotRecord {
  EQUIP: string;
  TXNTIMESTAMP_SOURCE: string; // e.g. "2026-06-19T07:34:21"
  USERID: string;
  LOTID: string;
  MPCODE: string;
  WAFERLOTID: string;
  PACKAGE: string;
  QTY: number;
}

/** Raw envelope from POST /api/areport/OutputByMachine */
export interface PlatingApiResponse {
  recordsTotal: number;
  recordsFiltered: number;
  data: PlatingMachineRow[] | null;
}

/** Raw envelope from GET /api/areport/outputbymc */
export interface PlatingLotApiResponse {
  recordsTotal: number;
  recordsFiltered: number;
  data: PlatingLotRecord[];
}

/** POST body sent to /api/areport/OutputByMachine */
export interface PlatingRequestBody {
  DateStart: string;
  DateEnd: string;
  Process: string;
  Site: string;
}

// ── Proxy route response shapes (browser-facing) ──────────────────────────

/** Response from SvelteKit POST /api/plating */
export interface PlatingDailySummary {
  rows: PlatingMachineRow[];
  recordsTotal: number;
  shift: Shift;
  date: string;
  totalDay: number;
  totalNight: number;
  totalAll: number;
  machineCount: number;
  targetShift: number;         // A01 daily plan ÷ 2 (0 if A01 unavailable)
  achievementPct: number | null; // totalShift / targetShift × 100
}

/** Response from SvelteKit GET /api/plating/hourly */
export interface PlatingHourlyResponse {
  hours: string[];
  packages: Record<string, number[]>;
  target_cumulative: number[];
  machineOutput: Record<string, Record<string, number>>;  // machineId → pkg → total shift output
  machineHourly: Record<string, number[]>;                // machineId → cumulative output per hour (same index as hours[])
  pkgPlans:  Record<string, number>;  // normKey → per-shift plan
  pkgMold:   Record<string, number>;  // normKey → Post Mold WIP
  pkgMark:   Record<string, number>;  // normKey → Mark WIP
  pkgReflow: Record<string, number>;  // normKey → Reflow WIP
  pkgWip:    Record<string, number>;  // normKey → Plating WIP
  pkgDoi:    Record<string, number>;  // normKey → Plating DOI
  pkgOrder:  string[];                // A01 ordered normKeys (all with plan>0)
  pkgNames:  Record<string, string>;  // normKey → display name from A01
  normToOut: Record<string, string>;  // normKey → outputbymc pkg key (for output lookup)
}

// ── UI / page state shapes ────────────────────────────────────────────────

export interface PlatingKpis {
  totalShift: number;
  achievementPct: number | null;
  targetShift: number;
  activeMachines: number;
  otherShiftTotal: number;
  dailyTotal: number;
  shift: Shift;
}

/** Drill-down: package row for the selected hour */
export interface PlatingPackageRow {
  package: string;
  output: number;
  target: number;
  pct: number;
  planPerShift: number;
  mold:   number | null;  // Post Mold WIP
  mark:   number | null;  // Mark WIP
  reflow: number | null;  // Reflow WIP
  wip:    number | null;  // Plating WIP
  doi:    number | null;  // Plating DOI
}

/** Response from GET /api/wip-history — per-hour WIP snapshots for a shift */
export interface WipHistoryResponse {
  hours: string[];                            // e.g. ["07:00","08:00",...] — same order as PlatingHourlyResponse.hours
  wip: Record<string, (number | null)[]>;     // normKey → WIP at each hour (null = no snapshot yet)
  doi: (number | null)[];                     // total Plate DOI at each hour (null = no snapshot)
}

export interface PlatingMachineEvent {
  eventTime:   string;
  jobType:     string;
  symptom:     string;
  repairMin:   number;
  packageType: string;
}

export interface MachineStatusResponse {
  byEpNum: Record<number, {
    downEvents:      number;
    avgMttrMin:      number;
    availabilityPct: number | null;
    status:          'RUN' | 'DOWN';
    events:          PlatingMachineEvent[];
  }>;
}

/** Drill-down: machine row for the selected hour / package */
export interface PlatingMachineDrillRow {
  machineId:       string;
  output:          number;
  target:          number;
  vsPct:           number;
  lastScan:        string | null;
  status:          'RUN' | 'DOWN' | 'IDLE';
  downEvents:      number;
  avgMttrMin:      number;
  availabilityPct: number | null;  // 100 − (downEvents × avgMttrMin / shiftMin × 100)
  events:          PlatingMachineEvent[];
}
