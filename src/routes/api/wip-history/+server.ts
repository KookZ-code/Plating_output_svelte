// GET /api/wip-history?date=YYYY-MM-DD&shift=D|N
// Returns per-hour WIP snapshots for the requested shift, collected by the server-side poller.
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWipHistory } from '$lib/server/wipStore';
import type { Shift } from '$lib/types/plating';

export const GET: RequestHandler = async ({ url }) => {
  const date    = url.searchParams.get('date')    ?? todayStr();
  const shift: Shift = url.searchParams.get('shift') === 'N' ? 'N' : 'D';
  const process = url.searchParams.get('process') ?? 'Plate';
  return json(await getWipHistory(date, shift, process));
};

function todayStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}
