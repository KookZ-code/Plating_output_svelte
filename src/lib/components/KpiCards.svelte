<script lang="ts">
  import type { PlatingKpis } from '$lib/types/plating';
  import { fmtInt, fmtPct } from '$lib/utils/format';

  type Props = { kpis: PlatingKpis | null };
  const { kpis }: Props = $props();

  type Tone = 'green' | 'orange' | 'red' | 'blue' | 'purple';

  const achievementTone = $derived<Tone>(
    kpis == null
      ? 'orange'
      : kpis.achievementPct === null
        ? 'blue'
        : kpis.achievementPct >= 100
          ? 'green'
          : kpis.achievementPct >= 85
            ? 'orange'
            : 'red'
  );

  const shiftLabel = $derived(kpis?.shift === 'N' ? 'Night shift' : 'Day shift');
  const otherLabel = $derived(kpis?.shift === 'N' ? 'Day shift' : 'Night shift');
  const otherTotal = $derived(kpis?.otherShiftTotal ?? 0);
</script>

<section class="kpi-row">
  <article class="kpi-card" data-tone="green">
    <span class="accent"></span>
    <div class="label">Total Output (This Shift)</div>
    <div class="value" data-tone="green">
      {kpis ? fmtInt(kpis.totalShift) : '—'}
    </div>
    <div class="sub">plated units · {shiftLabel}</div>
  </article>

  <article class="kpi-card" data-tone={achievementTone}>
    <span class="accent"></span>
    <div class="label">Achievement vs Target</div>
    <div class="value" data-tone={achievementTone}>
      {kpis && kpis.achievementPct !== null ? fmtPct(kpis.achievementPct) : '—'}
    </div>
    <div class="sub">
      {kpis && kpis.targetShift > 0
        ? `target ${fmtInt(kpis.targetShift)} units / shift`
        : 'target not configured'}
    </div>
  </article>

  <article class="kpi-card" data-tone="blue">
    <span class="accent"></span>
    <div class="label">Active Machines</div>
    <div class="value" data-tone="blue">
      {kpis ? fmtInt(kpis.activeMachines) : '—'}
    </div>
    <div class="sub">reporting this shift</div>
  </article>

  <article class="kpi-card" data-tone="purple">
    <span class="accent"></span>
    <div class="label">{otherLabel} Output</div>
    <div class="value" data-tone="purple">
      {kpis ? fmtInt(otherTotal) : '—'}
    </div>
    <div class="sub">plated units</div>
  </article>

  <article class="kpi-card" data-tone="green">
    <span class="accent"></span>
    <div class="label">Total Output (Per Day)</div>
    <div class="value" data-tone="green">
      {kpis ? fmtInt(kpis.dailyTotal) : '—'}
    </div>
    <div class="sub">D + N shift combined</div>
  </article>
</section>

<style>
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 14px;
    padding: 16px 24px 0;
    max-width: var(--content-max);
    margin: 0 auto;
    width: 100%;
  }
  .kpi-card {
    position: relative;
    background: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    padding: 16px 18px;
    overflow: hidden;
  }
  .accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
  }
  .kpi-card[data-tone='blue']   .accent { background: var(--color-primary-hover); }
  .kpi-card[data-tone='green']  .accent { background: var(--color-accent-green); }
  .kpi-card[data-tone='orange'] .accent { background: var(--color-accent-orange); }
  .kpi-card[data-tone='purple'] .accent { background: #7c3aed; }
  .kpi-card[data-tone='red']    .accent { background: var(--color-brand-red); }

  .label {
    font-size: 11px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 700;
    margin-top: 4px;
  }
  .value {
    font-size: 30px;
    font-weight: 700;
    line-height: 1;
    margin: 6px 0 4px;
    color: var(--color-primary-hover);
    font-feature-settings: 'tnum';
  }
  .value[data-tone='green']  { color: var(--color-accent-green); }
  .value[data-tone='orange'] { color: var(--color-accent-orange); }
  .value[data-tone='red']    { color: var(--color-brand-red); }
  .value[data-tone='blue']   { color: var(--color-primary-hover); }
  .value[data-tone='purple'] { color: #7c3aed; }
  .sub { font-size: 12px; color: var(--color-text-muted); }

  @media (max-width: 1280px) { .kpi-row { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 1024px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px)  { .kpi-row { grid-template-columns: 1fr; } }
</style>
