import { env } from '$env/dynamic/private';

export const getEmhApiUrl = () =>
  (env.EMH_API_URL ?? 'http://10.50.2.188:8002').replace(/\/$/, '');

export const getEmhApiKey = () => env.EMH_API_KEY ?? 'mch_dev_12345';

/** Extract EP machine number from either format:
 *  "EP # 01" → 1  |  "MTAI_EP001" → 1  |  "MTAI_EP003" → 3 */
export function epNum(id: string): number {
  const m = id.match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}
