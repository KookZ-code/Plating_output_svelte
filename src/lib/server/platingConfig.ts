import { env } from '$env/dynamic/private';

// Primary source: preformanceV2 — correct totals + plan in one call (same data on both servers)
const DEFAULT_PERF_API = 'http://mth-vm-asoprd/assyapi/api/A01/preformanceV2';

export function getPerfApiUrl(): string {
  return env.PLATING_PERF_API_URL ?? DEFAULT_PERF_API;
}

const DEFAULT_MC_API = 'http://mth-vm-asoprd.mchp-main.com/asoapi/api/areport/OutputByMachine';

export function getPlatingApiUrl(): string {
  return env.PLATING_API_URL ?? DEFAULT_MC_API;
}

export function getLotApiUrl(): string {
  return (
    env.PLATING_LOT_API_URL ??
    'http://mth-vm-asoprd.mchp-main.com/asoapi/api/areport/outputbymc'
  );
}

/** Machine list API — returns all machines for the given process */
export function getMachineListUrlForProcess(process: string): string {
  const base = env.PLATING_MC_LIST_BASE_URL
    ?? 'http://mth-sv-assykam/assyapi/api/a6s/listMConProcess';
  return `${base}?Process=${encodeURIComponent(process)}`;
}

/** @deprecated use getMachineListUrlForProcess */
export function getMachineListUrl(): string {
  return env.PLATING_MC_LIST_URL ?? getMachineListUrlForProcess('Plate');
}

export function getApiTimeout(): number {
  return Number(env.API_TIMEOUT ?? 10000);
}

/** Default Process filter — must be "Plate" for MTH Plating data */
export function getDefaultProcess(): string {
  return env.PLATING_PROCESS ?? 'Plate';
}

/** Default Site filter — must be "MTAI" for MTH data */
export function getDefaultSite(): string {
  return env.PLATING_SITE ?? 'MTAI';
}

/** Shift target units/shift — 0 means no target line shown */
export function getShiftTarget(): number {
  return Number(env.PLATING_TARGET_PER_SHIFT ?? 0);
}

/** Day shift window: 07:00–19:00 local time */
export const DAY_SHIFT_START = 7;
export const DAY_SHIFT_END = 19;
