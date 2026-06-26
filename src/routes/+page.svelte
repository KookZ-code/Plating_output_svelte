<!--
  Plating Output Monitor — main dashboard page.
  Mirrors Wire Bond dashboard: header / KPIs / hourly chart / drill-down panels.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import type {
    Shift,
    PlatingDailySummary,
    PlatingHourlyResponse,
    PlatingPackageRow,
    PlatingMachineDrillRow,
    PlatingKpis,
    WipHistoryResponse,
    MachineStatusResponse,
  } from '$lib/types/plating';
  import { epNum } from '$lib/utils/epNum';

  import DashboardHeader from '$lib/components/DashboardHeader.svelte';
  import KpiCards from '$lib/components/KpiCards.svelte';
  import MainChart from '$lib/components/MainChart.svelte';
  import PackagePanel from '$lib/components/PackagePanel.svelte';
  import MachineTable from '$lib/components/MachineTable.svelte';

  const REFRESH_MS = 5 * 60 * 1000;

  // ── Filter state ───────────────────────────────────────────────────────────
  // Night shift date convention: "Jun 22 N" = Jun 21 19:00 → Jun 22 07:00
  //   (API stores Night shift under the MORNING date, i.e., date = when shift ENDS)
  // Auto-select the most recently completed shift:
  //   07:00-19:00 (Day shift running)  → last completed = Night shift of today  → date=today, shift=N
  //   19:00-07:00 (Night shift running) → last completed = Day shift of today    → date=today, shift=D
  function defaultDateShift(): { date: string; shift: Shift } {
    const h = new Date().getHours();
    const isDayShift = h >= 7 && h < 19;
    return isDayShift
      ? { date: todayStr(), shift: 'N' }  // today's Night = last night (DateStart=yesterday internally)
      : { date: todayStr(), shift: 'D' }; // today's Day   = today's day shift
  }
  const { date: _initDate, shift: _initShift } = defaultDateShift();
  let date = $state(_initDate);
  let shift = $state<Shift>(_initShift);
  let process = $state('Plate');
  let site = $state('MTAI');

  // ── Data state ─────────────────────────────────────────────────────────────
  let summary = $state<PlatingDailySummary | null>(null);
  let hourly = $state<PlatingHourlyResponse | null>(null);
  let wipHistory = $state<WipHistoryResponse | null>(null);
  let machineStatus = $state<MachineStatusResponse | null>(null);
  let loading = $state(false);
  let lastUpdated = $state('Loading…');
  let noDataMsg = $state<string | null>(null);  // shown when API returns 0 records

  // ── Drill-down state ───────────────────────────────────────────────────────
  let selectedHour = $state<number | null>(null);
  let selectedPkg = $state<string | null>(null);
  let selectedMachine = $state<string | null>(null);
  let packageRows = $state<PlatingPackageRow[] | null>(null);
  let machineRows = $state<PlatingMachineDrillRow[] | null>(null);

  // ── Derived KPIs ───────────────────────────────────────────────────────────
  // totalShift = sum of all package cumulative values at the cutoff hour
  // This exactly matches what the chart shows as the total at the last visible bar.
  const realtimeTotal = $derived(() => {
    if (!hourly) return 0;
    const ci = cutoffIndex();
    if (ci < 0) return 0;
    return Object.values(hourly.packages).reduce(
      (sum, arr) => sum + (arr[ci] ?? 0),
      0
    );
  });

  const kpis = $derived<PlatingKpis | null>(
    summary === null
      ? null
      : {
          totalShift: realtimeTotal(),
          achievementPct: summary.targetShift > 0
            ? (realtimeTotal() / summary.targetShift) * 100
            : null,
          targetShift: summary.targetShift,
          activeMachines: summary.machineCount,
          otherShiftTotal: shift === 'D' ? summary.totalNight : summary.totalDay,
          dailyTotal: realtimeTotal() + (shift === 'D' ? summary.totalNight : summary.totalDay),
          shift,
        }
  );

  // Cutoff index: last hour that has started in the current shift.
  // For a past date the shift is fully complete → show all hours.
  // For today, compute based on current time and shift type.
  const cutoffIndex = $derived(() => {
    if (!hourly) return -1;
    const ALL = hourly.hours.length - 1;

    const now = new Date();
    const todayDate = fmt(now);
    // Past date → entire shift is done
    if (date < todayDate) return ALL;

    const nowH = now.getHours();

    if (shift === 'D') {
      // Day shift 07:00-19:00: straight forward
      const idx = hourly.hours.findIndex((h) => parseInt(h.split(':')[0], 10) > nowH);
      return idx === -1 ? ALL : idx - 1;
    } else {
      // Night shift 19:00-07:00 spanning midnight
      if (nowH >= 7 && nowH < 19) return ALL;   // day time → night shift ended
      if (nowH >= 19) {
        // Evening: shift in progress, find next pre-midnight hour > nowH
        // Cannot use simple findIndex(h > nowH) because "00:00" parses as 0 which is < 23,
        // causing idx=-1 → ALL (shows midnight bars that haven't happened yet).
        const idx = hourly.hours.findIndex((h) => {
          const hi = parseInt(h.split(':')[0], 10);
          return hi > nowH && hi >= 19;  // only pre-midnight hours
        });
        if (idx === -1) {
          // nowH=23 or similar: find index of the last pre-midnight hour (23:00)
          let last = 0;
          for (let i = 0; i < hourly.hours.length; i++) {
            if (parseInt(hourly.hours[i].split(':')[0], 10) >= 19) last = i;
          }
          return last;
        }
        return idx - 1;
      }
      // After midnight (0–6): shift still running
      // Night hours after midnight start at index 5 ([19,20,21,22,23,0,1,2,3,4,5,6])
      const midnightStart = hourly.hours.findIndex((h) => h === '00:00');
      if (midnightStart === -1) return ALL;
      const idx = hourly.hours.findIndex((h, i) => {
        if (i < midnightStart) return false;
        return parseInt(h.split(':')[0], 10) > nowH;
      });
      return idx === -1 ? ALL : idx - 1;
    }
  });

  const chartTitle = $derived(
    shift === 'D'
      ? 'Cumulative Output vs Target — Day shift 07:00–19:00'
      : 'Cumulative Output vs Target — Night shift 19:00–07:00'
  );

  // ── Fetch all data ─────────────────────────────────────────────────────────
  async function fetchAll() {
    loading = true;
    noDataMsg = null;
    try {
      const [sRes, hRes, wRes, msRes] = await Promise.all([
        fetch(`${base}/api/plating`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ DateStart: date, DateEnd: date, Process: process, Site: site, shift }),
        }),
        fetch(`${base}/api/plating/hourly?date=${date}&shift=${shift}&process=${encodeURIComponent(process)}&site=${encodeURIComponent(site)}`),
        fetch(`${base}/api/wip-history?date=${date}&shift=${shift}&process=${encodeURIComponent(process)}`),
        fetch(`${base}/api/plating/machine-status?date=${date}&shift=${shift}&process=${encodeURIComponent(process)}`),
      ]);

      if (!sRes.ok) throw new Error(`summary HTTP ${sRes.status}`);
      if (!hRes.ok) throw new Error(`hourly HTTP ${hRes.status}`);

      const s = (await sRes.json()) as PlatingDailySummary;
      const h = (await hRes.json()) as PlatingHourlyResponse;
      wipHistory = wRes.ok ? (await wRes.json()) as WipHistoryResponse : null;
      machineStatus = msRes.ok ? (await msRes.json()) as MachineStatusResponse : null;

      // Auto-fallback: if selected date has no data, try the previous day automatically
      if (s.recordsTotal === 0) {
        const prevDate = subtractOneDay(date);
        const [s2Res] = await Promise.all([
          fetch(`${base}/api/plating`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ DateStart: prevDate, DateEnd: prevDate, Process: process, Site: site, shift }),
          }),
        ]);
        if (s2Res.ok) {
          const s2 = (await s2Res.json()) as PlatingDailySummary;
          if (s2.recordsTotal > 0) {
            const h2Res = await fetch(`${base}/api/plating/hourly?date=${prevDate}&shift=${shift}&process=${encodeURIComponent(process)}&site=${encodeURIComponent(site)}`);
            const h2 = h2Res.ok ? (await h2Res.json()) as PlatingHourlyResponse : h;
            summary = s2;
            hourly = h2;
            // Keep `date` at user-selected date so cutoff stays correct for today's timeline
            noDataMsg = `ข้อมูล ${date} ยังไม่พร้อม (commit หลัง shift จบ 19:00) — แสดงข้อมูล ${prevDate}`;
            lastUpdated = `Updated ${new Date().toLocaleTimeString()} · Auto-refresh 5 min`;
            return;
          }
        }
        // No fallback data either
        noDataMsg = `ไม่มีข้อมูลสำหรับ ${date} — ข้อมูลจะแสดงหลัง shift จบ`;
        summary = s;
        hourly = h;
      } else {
        summary = s;
        hourly = h;
      }

      lastUpdated = `Updated ${new Date().toLocaleTimeString()} · Auto-refresh 5 min`;
    } catch (e) {
      lastUpdated = 'Error — retrying in 5 min';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  // ── Hour drill-down — build package rows from hourly snapshot ─────────────
  function selectHour(hour: number) {
    selectedHour = hour;
    selectedPkg = null;
    selectedMachine = null;
    if (!hourly) { packageRows = []; machineRows = []; return; }

    const idx = hourly.hours.findIndex((h) => parseInt(h.split(':')[0], 10) === hour);
    if (idx === -1) { packageRows = []; return; }

    const totalHours = hourly.hours.length;
    // Pro-rate plan to hours elapsed: plan × (idx+1) / totalHours
    const elapsed = idx + 1;

    // Use pkgOrder (A01 full list) — output is looked up via normToOut mapping
    packageRows = (hourly!.pkgOrder.length > 0 ? hourly!.pkgOrder : Object.keys(hourly!.packages).map(p => {
      const nk = p; // fallback: use outputbymc key directly
      return nk;
    })).map((nk) => {
      const displayName = hourly!.pkgNames[nk] ?? nk;
      // Use plan-proportional output if available (handles HD/UDLF variants)
      const output = hourly!.pkgOutput[nk]?.[idx]
        ?? (hourly!.normToOut[nk] ? (hourly!.packages[hourly!.normToOut[nk]]?.[idx] ?? 0) : 0);
      const planPerShift = hourly!.pkgPlans[nk] ?? 0;
      const target = planPerShift > 0 ? Math.round(planPerShift * elapsed / totalHours) : 0;
      const pct = target > 0 ? ((output - target) / target) * 100 : 0;
      // Map WIP fields based on selected process
      let mold: number | null, mark: number | null, reflow: number | null,
          wip: number | null, doi: number | null;
      if (process === 'Mold') {
        mold   = hourly!.pkgStaging[nk]  ?? null;  // Staging WIP (before Mold)
        mark   = null;
        reflow = null;
        wip    = hourly!.pkgMoldWip[nk]  ?? null;  // Mold WIP (target)
        doi    = hourly!.pkgMoldDoi[nk]  ?? null;
      } else if (process === 'Mark') {
        mold   = hourly!.pkgMoldWip[nk]  ?? null;  // Mold WIP (before Mark)
        reflow = hourly!.pkgMold[nk]     ?? null;  // Post Mold (PMC) WIP
        mark   = hourly!.pkgMark[nk]     ?? null;  // Mark WIP (target)
        wip    = null;
        doi    = hourly!.pkgMarkDoi[nk]  ?? null;
      } else {
        // Plate (default)
        mold   = hourly!.pkgMold[nk]   ?? null;
        mark   = hourly!.pkgMark[nk]   ?? null;
        reflow = hourly!.pkgReflow[nk] ?? null;
        wip    = hourly!.pkgWip[nk]    ?? null;
        doi    = hourly!.pkgDoi[nk]    ?? null;
      }
      return { package: displayName, output, target, pct, planPerShift, mold, mark, reflow, wip, doi };
    });

    // Build machine rows using cumulative output at the selected hour index
    const entries = Object.entries(hourly.machineHourly)
      .map(([machineId, cumArr]) => ({ machineId, output: cumArr[idx] ?? 0 }))
      .filter((r) => r.output > 0)
      .sort((a, b) => b.output - a.output);

    // Target: full shift target split per machine — matches KPI card
    const numMachines = entries.length || 1;
    const targetPerMachine = summary && summary.targetShift > 0
      ? Math.round(summary.targetShift / numMachines)
      : 0;

    machineRows = entries.map((r) => {
      const stat = machineStatus?.byEpNum[epNum(r.machineId)];
      const hasOutput = r.output > 0;
      return {
        machineId:  r.machineId,
        output:     r.output,
        target:     targetPerMachine,
        vsPct:      targetPerMachine > 0 ? ((r.output - targetPerMachine) / targetPerMachine) * 100 : 0,
        lastScan:   null,
        status:          stat?.status ?? (hasOutput ? 'RUN' : 'IDLE'),
        downEvents:      stat?.downEvents      ?? 0,
        avgMttrMin:      stat?.avgMttrMin      ?? 0,
        availabilityPct: stat?.availabilityPct ?? null,
        events:          stat?.events ?? [],
      };
    });
  }

  // ── Package drill-down — use machineOutput from hourly (avoids package name mismatch) ──
  function selectPkg(pkg: string) {
    selectedPkg = pkg;
    selectedMachine = null;
    if (!hourly) { machineRows = []; return; }

    // Find A01 normKey and lot output key for this package
    const nk = Object.entries(hourly.pkgNames).find(([, name]) => name === pkg)?.[0] ?? pkg;
    const outKey = hourly.normToOut[nk] ?? pkg;

    // Compute variant ratio: pkgOutput[nk] / packages[outKey] at last available hour
    // This distributes shared lot machine output proportionally (e.g. HD vs non-HD)
    const lastIdx = hourly.hours.length - 1;
    const variantTotal = hourly.pkgOutput[nk]?.[lastIdx] ?? null;
    const lotTotal = hourly.packages[outKey]?.[lastIdx] ?? 0;
    const variantRatio = (variantTotal !== null && lotTotal > 0) ? variantTotal / lotTotal : 1;

    // Build rows from machineOutput scaled by variant ratio
    const entries = Object.entries(hourly.machineOutput)
      .map(([machineId, pkgs]) => ({
        machineId,
        output: Math.round((pkgs[outKey] ?? 0) * variantRatio),
      }))
      .filter((r) => r.output > 0)
      .sort((a, b) => b.output - a.output);

    if (entries.length === 0) { machineRows = []; return; }

    const numMachinesPkg = entries.length || 1;
    // Use pkg's per-shift plan divided by machines; fall back to average output
    const pkgPlan = hourly.pkgPlans[
      Object.entries(hourly.pkgNames).find(([, name]) => name === pkg)?.[0] ?? ''
    ] ?? 0;
    const target = pkgPlan > 0
      ? Math.round(pkgPlan / numMachinesPkg)
      : Math.round(entries.reduce((s, r) => s + r.output, 0) / numMachinesPkg);

    machineRows = entries.map((r) => {
      const stat = machineStatus?.byEpNum[epNum(r.machineId)];
      const vsPct = target > 0 ? ((r.output - target) / target) * 100 : 0;
      return { machineId: r.machineId, output: r.output, target, vsPct, lastScan: null,
               status: stat?.status ?? (r.output > 0 ? 'RUN' : 'IDLE'),
               downEvents: stat?.downEvents ?? 0, avgMttrMin: stat?.avgMttrMin ?? 0,
               availabilityPct: stat?.availabilityPct ?? null,
               events: stat?.events ?? [] };
    });
  }

  function selectMachine(machineId: string) {
    selectedMachine = machineId;
  }

  function onFiltersChanged() {
    selectedHour = null;
    selectedPkg = null;
    selectedMachine = null;
    packageRows = null;
    machineRows = null;
    fetchAll();
  }

  onMount(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(id);
  });

  function subtractOneDay(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    return fmt(prev);
  }

  function todayStr(): string {
    const d = new Date();
    return fmt(d);
  }

  function yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return fmt(d);
  }

  function fmt(d: Date): string {
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  }
</script>

<svelte:head>
  <title>EOL Output Monitor</title>
</svelte:head>

<DashboardHeader
  {date}
  {shift}
  {process}
  {site}
  {loading}
  {lastUpdated}
  onDateChange={(v) => { date = v; onFiltersChanged(); }}
  onShiftChange={(s) => { shift = s; onFiltersChanged(); }}
  onProcessChange={(v) => { process = v; onFiltersChanged(); }}
  onSiteChange={(v) => { site = v; }}
  onRefresh={onFiltersChanged}
/>

<KpiCards {kpis} />


<MainChart
  {hourly}
  title={chartTitle}
  cutoffIndex={cutoffIndex()}
  onSelectHour={selectHour}
  {wipHistory}
  {process}
/>

<section class="drill-row">
  <PackagePanel
    rows={packageRows}
    hour={selectedHour}
    {selectedPkg}
    {process}
    onSelect={selectPkg}
  />
  <MachineTable
    rows={machineRows}
    pkg={selectedPkg}
    hour={selectedHour}
    {selectedMachine}
    onSelect={selectMachine}
  />
</section>

<div class="page-end"></div>

<style>
  .drill-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    padding: 16px 24px 0;
    max-width: var(--content-max);
    margin: 0 auto;
    width: 100%;
  }
  .page-end { height: 32px; }

  @media (max-width: 1024px) {
    .drill-row { grid-template-columns: 1fr; }
  }
</style>
