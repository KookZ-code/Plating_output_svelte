<script lang="ts">
  // Drill-1: package breakdown for the selected hour.
  // Progress bars colored by pace (green ≥ on target, orange ≥ 70%, else red).
  import type { PlatingPackageRow } from '$lib/types/plating';
  import { fmtInt, fmtSignedPct } from '$lib/utils/format';

  type SortCol = 'package' | 'output' | 'target' | 'pct' | 'planPerShift' | 'mold' | 'mark' | 'reflow' | 'wip' | 'doi';

  type Props = {
    rows: PlatingPackageRow[] | null;
    hour: number | null;
    selectedPkg: string | null;
    onSelect: (pkg: string) => void;
  };
  const { rows, hour, selectedPkg, onSelect }: Props = $props();

  let sortCol = $state<SortCol>('output');
  let sortAsc = $state(false);

  function toggleSort(col: SortCol) {
    if (sortCol === col) sortAsc = !sortAsc;
    else { sortCol = col; sortAsc = col === 'package'; }
  }

  function si(col: SortCol): string {
    return sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : '';
  }

  const sorted = $derived.by(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => {
      let diff: number;
      if (sortCol === 'package') diff = a.package.localeCompare(b.package);
      else if (sortCol === 'mold')   diff = (a.mold   ?? -1) - (b.mold   ?? -1);
      else if (sortCol === 'mark')   diff = (a.mark   ?? -1) - (b.mark   ?? -1);
      else if (sortCol === 'reflow') diff = (a.reflow ?? -1) - (b.reflow ?? -1);
      else if (sortCol === 'wip')    diff = (a.wip    ?? -1) - (b.wip    ?? -1);
      else if (sortCol === 'doi')    diff = (a.doi    ?? -1) - (b.doi    ?? -1);
      else diff = (a[sortCol] as number) - (b[sortCol] as number);
      return sortAsc ? diff : -diff;
    });
  });

  const maxOutput = $derived(rows && rows.length > 0 ? Math.max(...rows.map((r) => r.output), 1) : 1);

  function paceColor(r: PlatingPackageRow): string {
    if (r.target === 0) return 'var(--color-brand-red)';
    if (r.output >= r.target) return 'var(--color-accent-green)';
    if (r.output >= r.target * 0.7) return 'var(--color-accent-orange)';
    return 'var(--color-brand-red)';
  }
</script>

{#if rows == null || hour == null}
  <div class="placeholder">
    <div class="icon">↑</div>
    <span>Click a bar above to see package breakdown</span>
  </div>
{:else}
  <div class="active">
    <div class="label">▼ {hour}:00 hr — by Package</div>

    <div class="ph-row">
      <button class="ph-sort" onclick={() => toggleSort('package')}>Package{si('package')}</button>
      <div class="ph-bar"></div>
      <button class="ph-sort ph-r" onclick={() => toggleSort('mold')}>Post Mold{si('mold')}</button>
      <button class="ph-sort ph-r" onclick={() => toggleSort('mark')}>Mark{si('mark')}</button>
      <button class="ph-sort ph-r" onclick={() => toggleSort('reflow')}>Reflow{si('reflow')}</button>
      <button class="ph-sort ph-r" onclick={() => toggleSort('wip')}>Plate WIP{si('wip')}</button>
      <button class="ph-sort ph-r" onclick={() => toggleSort('doi')}>DOI{si('doi')}</button>
      <button class="ph-sort ph-r" onclick={() => toggleSort('planPerShift')}>Plan/Shift{si('planPerShift')}</button>
      <button class="ph-sort ph-r" onclick={() => toggleSort('output')}>Output{si('output')}</button>
      <button class="ph-sort ph-r" onclick={() => toggleSort('pct')}>vs Pace{si('pct')}</button>
    </div>

    <div class="list">
      {#each sorted as r (r.package)}
        <button
          type="button"
          class="row"
          class:selected={r.package === selectedPkg}
          onclick={() => onSelect(r.package)}
        >
          <div class="pkg">{r.package}</div>
          <div class="bar-wrap">
            <div
              class="bar-fill"
              style:width="{Math.min(r.target > 0 ? (r.output / r.target) * 100 : 0, 110)}%"
              style:background={paceColor(r)}
            ></div>
            <div class="bar-target-line"></div>
          </div>
          <div class="num">{r.mold   != null ? fmtInt(r.mold)   : '—'}</div>
          <div class="num">{r.mark   != null ? fmtInt(r.mark)   : '—'}</div>
          <div class="num">{r.reflow != null ? fmtInt(r.reflow) : '—'}</div>
          <div class="num">{r.wip    != null ? fmtInt(r.wip)    : '—'}</div>
          <div class="num" class:doi-low={r.doi != null && r.doi < 1}>{r.doi != null ? r.doi.toFixed(1) : '—'}</div>
          <div class="num">{r.planPerShift > 0 ? fmtInt(r.planPerShift) : '—'}</div>
          <div class="num strong">{fmtInt(r.output)}</div>
          <div class="pct" style:color={paceColor(r)}>
            {r.target > 0 ? fmtSignedPct(r.pct, 1) : '—'}
          </div>
        </button>
      {/each}

      {#if rows.length === 0}
        <div class="empty">No production in this slot</div>
      {/if}

      {#if sorted.length > 0}
        {@const totMold   = sorted.reduce((s, r) => s + (r.mold   ?? 0), 0)}
        {@const totMark   = sorted.reduce((s, r) => s + (r.mark   ?? 0), 0)}
        {@const totReflow = sorted.reduce((s, r) => s + (r.reflow ?? 0), 0)}
        {@const totWip    = sorted.reduce((s, r) => s + (r.wip    ?? 0), 0)}
        {@const totPlan   = sorted.reduce((s, r) => s + r.planPerShift, 0)}
        {@const totOutput = sorted.reduce((s, r) => s + r.output, 0)}
        {@const totTarget = sorted.reduce((s, r) => s + r.target, 0)}
        {@const totPct    = totTarget > 0 ? ((totOutput - totTarget) / totTarget) * 100 : 0}
        {@const totDoi    = totPlan > 0 ? totWip / (totPlan * 2) : null}
        <div class="total-row">
          <div class="tot-label">Total</div>
          <div></div>
          <div class="tot-num">{totMold   > 0 ? fmtInt(totMold)   : '—'}</div>
          <div class="tot-num">{totMark   > 0 ? fmtInt(totMark)   : '—'}</div>
          <div class="tot-num">{totReflow > 0 ? fmtInt(totReflow) : '—'}</div>
          <div class="tot-num">{totWip    > 0 ? fmtInt(totWip)    : '—'}</div>
          <div class="tot-num" class:doi-low={totDoi != null && totDoi < 1}>{totDoi != null ? totDoi.toFixed(1) : '—'}</div>
          <div class="tot-num">{totPlan   > 0 ? fmtInt(totPlan)   : '—'}</div>
          <div class="tot-num">{fmtInt(totOutput)}</div>
          <div class="tot-pct" style:color={totPct >= 0 ? 'var(--color-accent-green)' : 'var(--color-brand-red)'}>
            {totTarget > 0 ? fmtSignedPct(totPct, 1) : '—'}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .placeholder,
  .active {
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    min-height: 220px;
    padding: 16px 20px;
  }
  .placeholder {
    border: 2px dashed var(--color-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--color-text-disabled);
    font-size: 13px;
    gap: 8px;
  }
  .icon { font-size: 30px; }
  .active { border: 1px solid var(--color-primary-hover); }

  .label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-primary-hover);
    margin-bottom: 10px;
  }

  .num.doi-low { color: var(--color-brand-red) !important; font-weight: 700; }

  .total-row {
    display: grid;
    grid-template-columns: 72px 1fr 72px 72px 62px 72px 44px 72px 72px 56px;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    padding: 6px 4px;
    margin-top: 4px;
    border-top: 2px solid var(--color-primary);
    background: #eef2f9;
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  }
  .tot-label { font-weight: 700; color: var(--color-primary); font-size: 12px; }
  .tot-num { text-align: right; font-weight: 700; color: var(--color-primary); font-feature-settings: 'tnum'; }
  .tot-pct { text-align: right; font-weight: 700; font-feature-settings: 'tnum'; }

  .ph-row,
  .row {
    display: grid;
    grid-template-columns: 72px 1fr 72px 72px 62px 72px 44px 72px 72px 56px;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }
  .ph-row {
    color: var(--color-text-muted);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0 4px 4px;
    border-bottom: 1px solid var(--color-border);
    font-size: 10px;
  }
  .ph-sort {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .ph-sort:hover { color: var(--color-primary); }
  .ph-r { text-align: right; }

  .list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
  }
  .row {
    background: transparent;
    border: none;
    padding: 5px 4px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
  }
  .row:hover { background: var(--color-surface-alt); }
  .row.selected { background: #e8f0fa; }

  .pkg { color: var(--color-text-dark); font-weight: 600; }

  .bar-wrap {
    position: relative;
    background: var(--color-surface-gray);
    border-radius: var(--radius-sm);
    height: 14px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: var(--radius-sm);
    transition: width 0.3s ease;
  }
  .bar-target-line {
    position: absolute;
    top: 0; bottom: 0;
    left: calc(100% / 110 * 100);
    width: 2px;
    background: var(--color-border-strong);
    opacity: 0.6;
  }

  .num {
    text-align: right;
    color: var(--color-text-muted);
    font-feature-settings: 'tnum';
  }
  .num.strong { color: var(--color-text-body); font-weight: 700; }
  .pct { text-align: right; font-weight: 600; font-feature-settings: 'tnum'; }
  .empty {
    text-align: center;
    color: var(--color-text-disabled);
    padding: 24px;
    font-size: 13px;
  }
</style>
