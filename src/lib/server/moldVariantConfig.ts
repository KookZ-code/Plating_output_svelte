// Mold machine → package variant mapping
// When a lot PACKAGE name is ambiguous (e.g. "8SOIC" covers both "8L SOIC" and "8L SOIC IDF"),
// we cross-reference with Mold machine lot records to identify the exact variant.
//
// Only "special" machines need to be listed here — the unmatched remainder defaults to base normKey.
//
// Format: lotPkgNormKey → { moldMcNumber: a01NormKey }
// Note: Mold machine IDs are MTAI_MO028 (or MTAI_MO028_L / MTAI_MO028_R etc.)

export interface MoldVariantRule {
  /** normPkg(lot PACKAGE) that has ambiguous variants */
  lotNk: string;
  /** Mold MC numbers whose lots → variantNk */
  mcNumbers: number[];
  /** A01 normKey for lots from the above Mold machines */
  variantNk: string;
}

// Special Mold machines that produce variant packages.
// Lots from these machines get variantNk; all other lots get the base normKey.
export const MOLD_VARIANT_RULES: MoldVariantRule[] = [
  // 8L SOIC IDF — only Mold#28
  { lotNk: '8SOIC',  mcNumbers: [28], variantNk: '8SOICIDF' },
  // 44L TQFP HD and 64L TQFP HD — Mold#26, 30, 32
  { lotNk: '44TQFP', mcNumbers: [26, 30, 32], variantNk: '44TQFPHD' },
  { lotNk: '64TQFP', mcNumbers: [26, 30, 32], variantNk: '64TQFPHD' },
  // 20L SSOP UDLF — only Mold#27
  { lotNk: '20SSOP', mcNumbers: [27], variantNk: '20SSOPUDLF' },
];

/** Days back to look in Mold lot records (Mold→Plate transit ~5–14 days) */
export const MOLD_LOOKBACK_DAYS = 21;

/** Extract MC number from a Mold machine ID e.g. "MTAI_MO028_L" → 28 */
export function moldMcNumber(machineId: string): number | null {
  const m = machineId.match(/MO(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** Return all Mold machine ID patterns needed for the variant rules */
export function specialMoldMcNumbers(): Set<number> {
  const s = new Set<number>();
  for (const rule of MOLD_VARIANT_RULES) {
    for (const mc of rule.mcNumbers) s.add(mc);
  }
  return s;
}
