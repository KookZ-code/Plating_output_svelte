<script lang="ts">
  import type { Shift } from '$lib/types/plating';

  type Props = {
    date: string;
    shift: Shift;
    process: string;
    site: string;
    loading: boolean;
    lastUpdated: string;
    onDateChange: (v: string) => void;
    onShiftChange: (s: Shift) => void;
    onProcessChange: (v: string) => void;
    onSiteChange: (v: string) => void;
    onRefresh: () => void;
  };

  const {
    date,
    shift,
    process,
    site,
    loading,
    lastUpdated,
    onDateChange,
    onShiftChange,
    onProcessChange,
    onSiteChange,
    onRefresh,
  }: Props = $props();
</script>

<header class="header">
  <div class="header-left">
    <h1>EOL Output Monitor</h1>
    <div class="subtitle">Assembly : MTAI Plant</div>
  </div>

  <div class="header-right">
    <div class="filter-group">
      <span class="filter-label">Shift Date</span>
      <input
        type="date"
        class="filter-input"
        value={date}
        onchange={(e) => onDateChange((e.target as HTMLInputElement).value)}
      />
    </div>

    <div class="divider"></div>

    <div class="filter-group">
      <span class="filter-label">Shift</span>
      <div class="shift-toggle">
        <button
          type="button"
          class="shift-btn"
          class:active={shift === 'N'}
          onclick={() => onShiftChange('N')}>N</button
        >
        <button
          type="button"
          class="shift-btn"
          class:active={shift === 'D'}
          onclick={() => onShiftChange('D')}>D</button
        >
      </div>
    </div>

    <div class="divider"></div>

    <div class="filter-group">
      <span class="filter-label">Process</span>
      <div class="shift-toggle">
        {#each ['Plate', 'Mold', 'Mark'] as p}
          <button
            type="button"
            class="shift-btn"
            class:active={process === p}
            onclick={() => onProcessChange(p)}>{p}</button
          >
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <span class="filter-label">Site</span>
      <input
        type="text"
        class="filter-input narrow"
        value={site}
        onchange={(e) => onSiteChange((e.target as HTMLInputElement).value)}
      />
    </div>

    <div class="divider"></div>

    <button type="button" class="refresh-btn" disabled={loading} onclick={onRefresh}>
      ↻ Refresh
    </button>

    <div class="divider"></div>

    <div class="refresh-info">
      <span class="dot" class:loading></span>
      <span>{lastUpdated}</span>
    </div>
  </div>
</header>

<style>
  .header {
    background: #4a4f54;
    color: #fff;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }
  .header-left h1 {
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.3px;
    line-height: 22px;
  }
  .header-left .subtitle {
    font-size: 12px;
    color: var(--color-accent-blue);
    margin-top: 2px;
    letter-spacing: 0.04em;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .filter-label {
    font-size: 11px;
    color: var(--color-accent-blue);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 700;
  }
  .filter-input {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #fff;
    border-radius: var(--radius-sm);
    padding: 6px 12px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    color-scheme: dark;
    height: 32px;
  }
  .filter-input:hover {
    background: rgba(255, 255, 255, 0.18);
  }
  .filter-input.narrow {
    width: 88px;
  }
  .filter-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  .divider {
    width: 1px;
    height: 28px;
    background: rgba(255, 255, 255, 0.2);
  }
  .shift-toggle {
    display: flex;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.25);
  }
  .shift-btn {
    padding: 6px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    font-family: inherit;
    transition: background 0.15s, color 0.15s;
    height: 32px;
  }
  .shift-btn.active {
    background: var(--color-primary-hover);
    color: #fff;
  }
  .shift-btn:hover:not(.active) {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .refresh-btn {
    height: 32px;
    padding: 0 14px;
    background: var(--color-primary-hover);
    border: none;
    border-radius: var(--radius-sm);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.2px;
    transition: background 0.15s, opacity 0.15s;
  }
  .refresh-btn:hover:not(:disabled) {
    background: #1291c7;
  }
  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .refresh-info {
    font-size: 11px;
    color: var(--color-accent-blue);
    display: inline-flex;
    align-items: center;
  }
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: var(--color-accent-green);
    border-radius: 50%;
    margin-right: 6px;
    animation: pulse 2s infinite;
  }
  .dot.loading {
    background: var(--color-accent-orange);
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>
