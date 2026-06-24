<script lang="ts">
  // Stacked bar (per package, hourly cumulative) + dashed target line +
  // custom labels above each bar showing total + ±% vs target.
  // Click a bar to drill down by package.
  import { onMount } from 'svelte';
  import {
    Chart,
    BarController,
    LineController,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    type Chart as ChartType,
    type ChartConfiguration,
    type Plugin,
  } from 'chart.js';
  import type { PlatingHourlyResponse, WipHistoryResponse } from '$lib/types/plating';

  Chart.register(
    BarController,
    LineController,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend
  );

  const WIP_COLOR = '#7B5CB0';

  type Props = {
    hourly: PlatingHourlyResponse | null;
    title: string;
    cutoffIndex: number;
    onSelectHour: (hour: number) => void;
    wipHistory: WipHistoryResponse | null;
  };
  const { hourly, title, cutoffIndex, onSelectHour, wipHistory }: Props = $props();

  const PKG_COLORS = [
    '#157EAC', '#41B6E6', '#6CC24A', '#9CD584',
    '#F68D2E', '#F5B57F', '#7B5CB0', '#B395D0',
    '#1C355E', '#34A085', '#DA291C', '#838E93',
  ];
  const TARGET_COLOR = '#DA291C';
  const TEXT_COLOR = '#34333E';
  const POSITIVE_COLOR = '#6CC24A';
  const NEGATIVE_COLOR = '#DA291C';

  let canvasEl = $state<HTMLCanvasElement>();
  let chart: ChartType | null = null;

  // Stacked labels plugin — total + ±% above each bar
  const stackedLabelsPlugin: Plugin<'bar'> = {
    id: 'stackedLabels',
    afterDatasetsDraw(c: ChartType) {
      const ctx = c.ctx;
      const datasets = c.data.datasets;
      const targetIdx = datasets.findIndex((d) => d.label === 'Target');

      (c.data.labels ?? []).forEach((_label: unknown, i: number) => {
        let total = 0;
        // Only sum bar datasets — exclude Target line and WIP line
        datasets.forEach((ds, di: number) => {
          if (di === targetIdx) return;
          if ((ds as { type?: string }).type !== 'bar') return;
          const v = ds.data[i] as number | null | undefined;
          if (v != null && v > 0) total += v;
        });
        if (total === 0) return;

        const targetVal =
          targetIdx >= 0 ? ((datasets[targetIdx].data[i] as number | null) ?? 0) : 0;
        const diffPct = targetVal > 0 ? ((total - targetVal) / targetVal) * 100 : null;
        const isAhead = diffPct !== null && diffPct >= 0;

        let topY = Infinity;
        // Only use bar datasets for topY — line datasets use different Y-axis positions
        datasets.forEach((ds: unknown, di: number) => {
          if (di === targetIdx) return;
          if (((ds as { type?: string }).type) !== 'bar') return;
          const meta = c.getDatasetMeta(di);
          const point = meta.data[i];
          if (point) topY = Math.min(topY, (point as { y: number }).y);
        });
        if (!Number.isFinite(topY)) return;

        const x = (c.getDatasetMeta(0).data[i] as { x?: number } | undefined)?.x;
        if (x == null) return;

        const totalStr = total >= 1000 ? (total / 1000).toFixed(1) + 'K' : String(total);
        const sign = isAhead ? '+' : '';
        const pctStr = diffPct !== null ? `(${sign}${diffPct.toFixed(1)}%)` : '';
        const pctColor = isAhead ? POSITIVE_COLOR : NEGATIVE_COLOR;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = "bold 11px 'Open Sans', sans-serif";
        ctx.fillStyle = TEXT_COLOR;
        ctx.textBaseline = 'bottom';
        ctx.fillText(totalStr, x, topY - 14);
        if (pctStr) {
          ctx.font = "10px 'Open Sans', sans-serif";
          ctx.fillStyle = pctColor;
          ctx.fillText(pctStr, x, topY - 3);
        }
        ctx.restore();
      });
    },
  };

  // Reads doi from the WIP dataset's custom `doi` property so it stays current
  // after chart.data.datasets updates (no stale closure problem).
  const wipLabelsPlugin: Plugin<'bar'> = {
    id: 'wipLabels',
    afterDatasetsDraw(c: ChartType) {
      const wipIdx = c.data.datasets.findIndex((d) => d.label === 'Plate WIP');
      if (wipIdx === -1) return;
      const doiArr = (c.data.datasets[wipIdx] as { doi?: (number | null)[] }).doi;
      const meta = c.getDatasetMeta(wipIdx);
      const ctx = c.ctx;

      meta.data.forEach((point, i) => {
        const raw = c.data.datasets[wipIdx].data[i] as number | null;
        if (raw == null) return;
        const doiVal = doiArr?.[i] ?? null;
        const wipStr = raw >= 1000 ? (raw / 1000).toFixed(0) + 'K' : String(raw);
        const label = doiVal != null ? `${wipStr} (${doiVal.toFixed(1)})` : wipStr;
        const x = (point as { x: number }).x;
        const y = (point as { y: number }).y;

        ctx.save();
        ctx.font = "bold 10px 'Open Sans', sans-serif";
        ctx.fillStyle = WIP_COLOR;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, x, y - 5);
        ctx.restore();
      });
    },
  };

  function buildConfig(h: PlatingHourlyResponse, wip: WipHistoryResponse | null): ChartConfiguration {
    const labels = [...h.hours];
    const packages = Object.keys(h.packages).sort();
    const colorMap = new Map<string, string>();
    packages.forEach((p, i) => colorMap.set(p, PKG_COLORS[i % PKG_COLORS.length]));

    const masked = (arr: number[]) =>
      arr.map((v, i) => (cutoffIndex < 0 || i > cutoffIndex ? null : v));

    const datasets: ChartConfiguration['data']['datasets'] = packages.map((pkg) => ({
      type: 'bar',
      label: pkg,
      data: masked([...h.packages[pkg]]),
      backgroundColor: colorMap.get(pkg) ?? '#157EAC',
      stack: 'output',
      borderRadius: 2,
      borderSkipped: false,
    }));

    const hasTarget = h.target_cumulative.some((v) => v > 0);
    if (hasTarget) {
      datasets.push({
        type: 'line',
        label: 'Target',
        data: [...h.target_cumulative],
        borderColor: TARGET_COLOR,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 3,
        pointBackgroundColor: TARGET_COLOR,
        fill: false,
        order: -1,
        spanGaps: false,
      });
    }

    // WIP trend line — total Plate WIP at each hour from server-side snapshots
    // doi is stored as a custom property on the dataset so the module-level plugin
    // can read the latest value after each chart.data.datasets update.
    if (wip) {
      const totals: (number | null)[] = h.hours.map((_hr, i) => {
        let sum = 0;
        let hasAny = false;
        for (const vals of Object.values(wip.wip)) {
          const v = vals[i];
          if (v != null) { sum += v; hasAny = true; }
        }
        return hasAny ? sum : null;
      });
      if (totals.some((v) => v != null)) {
        datasets.push({
          type: 'line',
          label: 'Plate WIP',
          data: totals,
          borderColor: WIP_COLOR,
          backgroundColor: 'rgba(123,92,176,0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: WIP_COLOR,
          fill: false,
          yAxisID: 'y2',
          spanGaps: false,
          order: -2,
          // @ts-expect-error custom property read by wipLabelsPlugin
          doi: wip.doi,
        });
      }
    }

    const hasWip = wip != null && Object.values(wip.wip).some((a) => a.some((v) => v != null));

    return {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 36 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 11, family: "'Open Sans', sans-serif" },
              padding: 14,
              color: TEXT_COLOR,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(28,53,94,0.92)',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.8)',
            padding: 10,
            callbacks: {
              label: (item: { raw: unknown; dataset: { label?: string } }) => {
                if (item.raw == null) return null as unknown as string;
                return ` ${item.dataset.label}: ${Number(item.raw).toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: "'Open Sans', sans-serif" }, color: '#586674' },
            stacked: true,
          },
          y: {
            ticks: {
              font: { size: 11, family: "'Open Sans', sans-serif" },
              color: '#586674',
              callback: (v: number | string) => {
                const n = typeof v === 'number' ? v : Number(v);
                return n >= 1000 ? (n / 1000).toFixed(0) + 'K' : String(n);
              },
            },
            title: {
              display: true,
              text: 'Cumulative Units',
              font: { size: 11, family: "'Open Sans', sans-serif" },
              color: '#586674',
            },
            stacked: true,
          },
          y2: {
            display: hasWip,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              font: { size: 11, family: "'Open Sans', sans-serif" },
              color: WIP_COLOR,
              callback: (v: number | string) => {
                const n = typeof v === 'number' ? v : Number(v);
                return n >= 1000 ? (n / 1000).toFixed(0) + 'K' : String(n);
              },
            },
            title: {
              display: true,
              text: 'Plate WIP',
              font: { size: 11, family: "'Open Sans', sans-serif" },
              color: WIP_COLOR,
            },
          },
        },
        onClick: (_e: unknown, elements: { datasetIndex: number; index: number }[], c: ChartType) => {
          if (!elements.length || !hourly) return;
          const el = elements.find((x) => c.data.datasets[x.datasetIndex]?.label !== 'Target');
          if (!el) return;
          if (cutoffIndex >= 0 && el.index > cutoffIndex) return;
          const label = hourly.hours[el.index];
          if (!label) return;
          onSelectHour(parseInt(label.split(':')[0], 10));
        },
      },
      plugins: [stackedLabelsPlugin, wipLabelsPlugin],
    };
  }

  onMount(() => {
    return () => {
      chart?.destroy();
      chart = null;
    };
  });

  $effect(() => {
    if (!hourly || !canvasEl) return;
    if (!chart) {
      chart = new Chart(canvasEl, buildConfig(hourly, wipHistory));
    } else {
      const cfg = buildConfig(hourly, wipHistory);
      chart.data.labels = cfg.data.labels;
      chart.data.datasets = cfg.data.datasets;
      chart.update('none');
    }
  });
</script>

<section class="chart-card">
  <div class="chart-header">
    <span class="chart-title">{title}</span>
    <span class="chart-hint">Click a bar to drill down by package</span>
  </div>
  <div class="canvas-wrap">
    <canvas bind:this={canvasEl}></canvas>
  </div>
</section>

<style>
  .chart-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    padding: 16px 20px;
    margin: 16px auto 0;
    max-width: var(--content-max);
    width: calc(100% - 48px);
  }
  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .chart-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-primary);
  }
  .chart-hint {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .canvas-wrap {
    height: 340px;
  }
</style>
