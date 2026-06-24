/** Extract EP machine number: "EP # 01" → 1, "MTAI_EP003" → 3 */
export function epNum(id: string): number {
  const m = id.match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}
