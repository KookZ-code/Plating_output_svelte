<script lang="ts">
  import type { PlatingMachineDrillRow, PlatingMachineEvent } from '$lib/types/plating';
  import { fmtInt, fmtSignedPct } from '$lib/utils/format';

  type SortCol = 'machineId' | 'output' | 'vsPct';

  type Props = {
    rows: PlatingMachineDrillRow[] | null;
    pkg: string | null;
    hour: number | null;
    selectedMachine: string | null;
    onSelect: (machineId: string) => void;
  };
  const { rows, pkg, hour, selectedMachine, onSelect }: Props = $props();

  let sortCol = $state<SortCol>('output');
  let sortAsc = $state(false);

  function toggleSort(col: SortCol) {
    if (sortCol === col) sortAsc = !sortAsc;
    else { sortCol = col; sortAsc = col === 'machineId'; }
  }
  function si(col: SortCol) { return sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : ''; }

  const label = $derived(pkg ? `▼ ${pkg} — by Machine` : `▼ ${hour}:00 hr — by Machine`);

  const sorted = $derived.by(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => {
      let diff: number;
      if (sortCol === 'machineId') diff = a.machineId.localeCompare(b.machineId);
      else diff = (a[sortCol] as number) - (b[sortCol] as number);
      return sortAsc ? diff : -diff;
    });
  });

  function badgeClass(pct: number) {
    if (pct >= 0)   return 'green';
    if (pct >= -20) return 'orange';
    return 'red';
  }

  // Format event chip: "SBO 07:11-07:17 · Validate Material (6m)"
  function fmtChip(ev: PlatingMachineEvent): string {
    const abbr = jobAbbr(ev.jobType);
    const t = ev.eventTime ? ev.eventTime.slice(11, 16) : '';
    const endMin = ev.repairMin > 0 ? addMinutes(ev.eventTime, ev.repairMin) : '';
    const timeRange = endMin ? `${t}-${endMin}` : t;
    const sym = ev.symptom.length > 26 ? ev.symptom.slice(0, 26) + '…' : ev.symptom;
    const dur = ev.repairMin > 0 ? ` (${ev.repairMin}m)` : '';
    return `${abbr} ${timeRange} · ${sym}${dur}`;
  }

  function chipClass(jt: string): string {
    if (/down|machine down|breakdown/i.test(jt)) return 'chip-down';
    if (/pm\b|preventive/i.test(jt))             return 'chip-pm';
    if (/setup by operator/i.test(jt))           return 'chip-sbo';
    if (/setup/i.test(jt))                       return 'chip-setup';
    return 'chip-default';
  }

  function jobAbbr(jt: string): string {
    if (/setup by operator/i.test(jt)) return 'SBO';
    if (/setup/i.test(jt))             return 'SETUP';
    if (/pm\b|preventive/i.test(jt))   return 'PM';
    if (/down|breakdown/i.test(jt))    return 'DOWN';
    return jt.slice(0, 5).toUpperCase();
  }

  function addMinutes(isoTs: string, mins: number): string {
    try {
      const d = new Date(isoTs);
      const total = d.getUTCHours() * 60 + d.getUTCMinutes() + mins;
      const h = Math.floor(total / 60) % 24;
      const m = total % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } catch { return ''; }
  }
</script>

{#if rows == null}
  <div class="placeholder">
    <div class="icon">↑</div>
    <span>Click a bar above to see machine breakdown</span>
  </div>
{:else}
  <div class="active">
    <div class="label">{label}</div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th><button class="th-sort" onclick={() => toggleSort('machineId')}>Machine{si('machineId')}</button></th>
            <th class="r">Target</th>
            <th class="r"><button class="th-sort" onclick={() => toggleSort('output')}>Output{si('output')}</button></th>
            <th class="r"><button class="th-sort" onclick={() => toggleSort('vsPct')}>vs Target{si('vsPct')}</button></th>
            <th class="r">Status</th>
            <th>Events in Shift</th>
          </tr>
        </thead>
        <tbody>
          {#each sorted as r (r.machineId)}
            <tr class:selected={r.machineId === selectedMachine} onclick={() => onSelect(r.machineId)}>
              <td><strong>{r.machineId}</strong></td>
              <td class="r muted">{r.target > 0 ? fmtInt(r.target) : '—'}</td>
              <td class="r">{fmtInt(r.output)}</td>
              <td class="r">
                <span class="badge {badgeClass(r.vsPct)}">{fmtSignedPct(r.vsPct, 1)}</span>
              </td>
              <td class="r">
                <span class="status-badge {r.status === 'RUN' ? 'run' : r.status === 'DOWN' ? 'down' : 'idle'}">{r.status}</span>
              </td>
              <td class="events-cell">
                {#each r.events as ev}
                  <span class="chip {chipClass(ev.jobType)}">{fmtChip(ev)}</span>
                {/each}
                {#if r.events.length === 0}
                  <span class="muted no-events">—</span>
                {/if}
              </td>
            </tr>
          {/each}

          {#if rows.length === 0}
            <tr><td colspan="5" class="empty">No machines reporting</td></tr>
          {/if}
        </tbody>

        {#if rows.length > 1}
          {@const totOut = sorted.reduce((s, r) => s + r.output, 0)}
          {@const totTgt = sorted.reduce((s, r) => s + r.target, 0)}
          {@const totPct = totTgt > 0 ? ((totOut - totTgt) / totTgt) * 100 : 0}
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td class="r muted">{totTgt > 0 ? fmtInt(totTgt) : '—'}</td>
              <td class="r">{fmtInt(totOut)}</td>
              <td class="r"><span class="badge {badgeClass(totPct)}">{fmtSignedPct(totPct, 1)}</span></td>
              <td></td><td></td>
            </tr>
          </tfoot>
        {/if}
      </table>
    </div>
  </div>
{/if}

<style>
  .placeholder, .active {
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    min-height: 220px;
    padding: 16px 20px;
  }
  .placeholder {
    border: 2px dashed var(--color-border);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: var(--color-text-disabled); font-size: 13px; gap: 8px;
  }
  .icon { font-size: 30px; }
  .active { border: 1px solid var(--color-primary); }

  .label {
    font-size: 12px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--color-primary); margin-bottom: 10px;
  }

  .table-scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    background: var(--color-surface-gray);
    color: var(--color-text-muted); text-transform: uppercase;
    font-size: 10px; letter-spacing: 0.04em; font-weight: 700;
    padding: 8px 8px; text-align: left;
    border-bottom: 1px solid var(--color-border); white-space: nowrap;
  }
  .th-sort {
    background: none; border: none; padding: 0; font: inherit;
    color: inherit; letter-spacing: inherit; text-transform: inherit;
    cursor: pointer; user-select: none; white-space: nowrap;
  }
  .th-sort:hover { color: var(--color-primary); }
  td { padding: 6px 8px; border-bottom: 1px solid var(--color-surface-gray); vertical-align: middle; }
  tbody tr { cursor: pointer; }
  tbody tr:hover  { background: var(--color-surface-alt); }
  tbody tr.selected { background: #e8f8f5; }
  .r { text-align: right; font-feature-settings: 'tnum'; }
  .muted { color: var(--color-text-muted); }
  .empty { text-align: center; color: var(--color-text-disabled); padding: 24px; }

  tfoot tr { background: #eef2f9; }
  tfoot td { padding: 7px 8px; font-size: 12px; font-weight: 700; color: var(--color-primary); border-top: 2px solid var(--color-primary); }

  .badge { display: inline-block; padding: 2px 7px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 700; }
  .badge.green  { background: #e8f5ee; color: var(--color-accent-green); }
  .badge.orange { background: #fef4e8; color: var(--color-accent-orange); }
  .badge.red    { background: #fdecea; color: var(--color-brand-red); }

  .status-badge {
    display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm);
    font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  }
  .status-badge.run  { background: var(--color-accent-green); color: #fff; }
  .status-badge.down { background: var(--color-brand-red);   color: #fff; }
  .status-badge.idle { background: var(--color-surface-gray); color: var(--color-text-muted); }

  .down-stat { font-weight: 600; color: var(--color-text-body); font-feature-settings: 'tnum'; font-size: 11px; }
  .avail { font-weight: 600; color: var(--color-accent-green); font-feature-settings: 'tnum'; }
  .avail.avail-low { color: var(--color-accent-orange); }

  .events-cell { max-width: 360px; }
  .chip {
    display: inline-block;
    border-radius: 3px;
    padding: 2px 7px;
    font-size: 10px;
    font-weight: 600;
    margin: 2px 3px 2px 0;
    white-space: nowrap;
    color: #fff;
  }
  .chip-sbo     { background: #157EAC; }
  .chip-setup   { background: #41B6E6; }
  .chip-down    { background: var(--color-brand-red); }
  .chip-pm      { background: var(--color-accent-orange); }
  .chip-default { background: #586674; }
  .no-events { font-size: 12px; }
</style>
