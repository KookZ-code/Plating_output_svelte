export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

export function fmtCompact(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(Math.round(n));
}

export function fmtPct(n: number, digits = 1): string {
  return n.toFixed(digits) + '%';
}

export function fmtSignedPct(n: number, digits = 1): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}
