<!-- src/routes/+page.svelte — Landing/Showcase page (Microchip Industrial Light) -->
<script lang="ts">
  type TechCard = {
    layer: string;
    name: string;
    version: string;
    accent: 'orange' | 'blue' | 'green' | 'red';
  };

  type Feature = {
    title: string;
    body: string;
  };

  const techStack: TechCard[] = [
    { layer: 'Frontend', name: 'SvelteKit + Svelte 5', version: 'SK 2.x / Svelte 5.x', accent: 'orange' },
    { layer: 'Backend', name: 'Rust + Axum', version: 'Axum 0.8.x', accent: 'blue' },
    { layer: 'Database', name: 'SQLite / PostgreSQL', version: 'SQLx 0.8.x', accent: 'green' },
    { layer: 'Deployment', name: 'IIS on Windows Server', version: 'IIS 10+', accent: 'red' },
  ];

  const features: Feature[] = [
    {
      title: 'Type-Safe API Contract',
      body: 'Consistent response shape across every endpoint. Rust structs map directly to TypeScript interfaces — no drift between server and client.',
    },
    {
      title: 'IIS-Ready Deploy',
      body: 'Frontend ships via sveltekit-adapter-iis with auto-generated web.config. Rust binary runs as a Windows Service behind ARR reverse proxy.',
    },
    {
      title: 'SvelteKit 5 Runes',
      body: 'Modern reactivity with $state, $derived, and $effect. No legacy stores. Strict TypeScript with zero any throughout the codebase.',
    },
  ];
</script>

<svelte:head>
  <title>SvelteKit 5 + Rust Axum — Demo</title>
</svelte:head>

<main>
  <!-- Hero -->
  <section class="hero">
    <div class="hero-inner">
      <h1>SvelteKit 5 + Rust Axum</h1>
      <p class="tagline">
        Production-ready full-stack template — Svelte 5 Runes on the front,
        a typed Axum API on the back, deployed to IIS on Windows Server.
      </p>
      <div class="cta-row">
        <a href="#tech-stack" class="btn btn-outline-dark">Get Started</a>
        <a href="#features" class="btn btn-ghost-dark">Learn More</a>
      </div>
    </div>
  </section>

  <!-- Tech Stack -->
  <section id="tech-stack" class="section section-white">
    <div class="section-inner">
      <h2>Tech Stack</h2>
      <p class="section-lead">Each layer chosen for type-safety, performance, and Windows-native deployment.</p>
      <div class="tech-grid">
        {#each techStack as tech (tech.layer)}
          <article class="card tech-card" data-accent={tech.accent}>
            <span class="card-accent"></span>
            <span class="card-eyebrow">{tech.layer}</span>
            <h3>{tech.name}</h3>
            <p class="card-meta">{tech.version}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="section section-alt">
    <div class="section-inner">
      <h2>Features</h2>
      <p class="section-lead">Conventions enforced by CLAUDE.md — no SELECT *, no unwrap, no hardcoded secrets.</p>
      <div class="feature-grid">
        {#each features as feature (feature.title)}
          <article class="card feature-card">
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>
</main>

<style>
  /* Design tokens — sourced from DESIGN.md (Microchip Industrial Light) */
  main {
    --color-primary: #1c355e;
    --color-primary-hover: #157eac;
    --color-accent-blue: #41b6e6;
    --color-accent-orange: #f68d2e;
    --color-accent-green: #6cc24a;
    --color-brand-red: #da291c;
    --color-text-heading: #34333e;
    --color-text-body: rgba(0, 0, 0, 0.8);
    --color-text-muted: #838e93;
    --color-text-disabled: #b6b7b9;
    --color-surface: #ffffff;
    --color-surface-alt: #f8f8f7;
    --color-surface-gray: #f1f2f2;
    --color-border-strong: #b6b7b9;

    --radius-sm: 4px;
    --content-max: 1440px;
    --section-v: 75px;
    --card-pad: 16px;

    --font: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    font-family: var(--font);
    color: var(--color-text-body);
    font-size: 15px;
    line-height: 24px;
    margin: 0;
    display: block;
  }

  h1,
  h2,
  h3 {
    margin: 0;
    color: var(--color-text-heading);
  }

  h1 {
    font-size: 35px;
    font-weight: 700;
    line-height: 40px;
  }
  h2 {
    font-size: 23px;
    font-weight: 600;
    line-height: 27px;
  }
  h3 {
    font-size: 17px;
    font-weight: 600;
    line-height: 24px;
  }

  /* ── Hero ─────────────────────────────────────────────── */
  .hero {
    background-color: var(--color-primary);
    background-image: linear-gradient(
      270deg,
      rgba(28, 53, 94, 0) 0,
      rgba(28, 53, 94, 0.5) 50%,
      var(--color-primary) 100%
    );
    color: #ffffff;
    padding: 45px 6%;
  }

  .hero-inner {
    max-width: var(--content-max);
    margin: 0 auto;
    padding: 60px 0;
  }

  .hero h1 {
    color: #ffffff;
    font-size: 36px;
    font-weight: 600;
    line-height: 44px;
    margin-bottom: 16px;
    max-width: 760px;
  }

  .tagline {
    color: var(--color-text-disabled);
    font-size: 15px;
    line-height: 24px;
    max-width: 640px;
    margin: 0 0 32px 0;
  }

  .cta-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  /* ── Sections ─────────────────────────────────────────── */
  .section {
    padding: var(--section-v) 6%;
  }
  .section-white {
    background-color: var(--color-surface);
  }
  .section-alt {
    background-color: var(--color-surface-gray);
  }
  .section-inner {
    max-width: var(--content-max);
    margin: 0 auto;
  }
  .section h2 {
    margin-bottom: 8px;
  }
  .section-lead {
    color: var(--color-text-muted);
    margin: 0 0 32px 0;
    max-width: 640px;
  }

  /* ── Cards ────────────────────────────────────────────── */
  .card {
    background-color: var(--color-surface-alt);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    padding: var(--card-pad);
  }

  .tech-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .tech-card {
    position: relative;
    padding-top: 24px;
    overflow: hidden;
  }

  .card-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--accent-color);
  }

  .tech-card[data-accent='orange'] {
    --accent-color: var(--color-accent-orange);
  }
  .tech-card[data-accent='blue'] {
    --accent-color: var(--color-accent-blue);
  }
  .tech-card[data-accent='green'] {
    --accent-color: var(--color-accent-green);
  }
  .tech-card[data-accent='red'] {
    --accent-color: var(--color-brand-red);
  }

  .card-eyebrow {
    display: block;
    font-size: 12px;
    font-weight: 600;
    line-height: 17px;
    color: #586674;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
  }

  .tech-card h3 {
    margin-bottom: 4px;
  }

  .card-meta {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 20px;
    letter-spacing: 0.25px;
  }

  .feature-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .feature-card h3 {
    margin-bottom: 8px;
  }

  .feature-card p {
    margin: 0;
    color: var(--color-text-body);
  }

  /* ── Buttons ──────────────────────────────────────────── */
  .btn {
    display: inline-block;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 16px;
    line-height: 24px;
    padding: 10px 24px;
    text-decoration: none;
    cursor: pointer;
    transition:
      color 0.15s ease,
      border-color 0.15s ease,
      background-color 0.15s ease;
  }

  .btn-outline-dark {
    background-color: transparent;
    color: #ffffff;
    border: 1px solid #ffffff;
  }
  .btn-outline-dark:hover {
    color: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
  }

  .btn-ghost-dark {
    background-color: transparent;
    color: #ffffff;
    border: 1px solid transparent;
  }
  .btn-ghost-dark:hover {
    color: var(--color-accent-blue);
    text-decoration: underline;
  }

  /* ── Responsive ───────────────────────────────────────── */
  @media (max-width: 768px) {
    .hero-inner {
      padding: 24px 0;
    }
    .hero h1 {
      font-size: 28px;
      line-height: 36px;
    }
    .section {
      padding: 48px 6%;
    }
  }
</style>
