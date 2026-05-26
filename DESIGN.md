---
version: "1.0"
source: "https://www.microchip.com (CSS extracted May 2026)"
name: Microchip Industrial Light
description: Design tokens extracted directly from microchip.com production CSS. Deep navy primary, teal-blue hover states, sky-blue / orange / green accents, Open Sans typography. Flat, engineering-grade aesthetic.
colors:
  # Core brand โ€” verified from .clientlib-site.min.css
  primary: "#1C355E"        # Deep navy โ€” nav, buttons, table headers, footer bg, banners
  primary-hover: "#157EAC"  # Teal-blue โ€” all hover / active states (buttons, links, rows)
  accent-blue: "#41B6E6"    # Sky blue โ€” featured-card-2, tab active, category chips, link hover
  accent-orange: "#F68D2E"  # Warm orange โ€” featured-card-1, tab active stripe, chart bar
  accent-green: "#6CC24A"   # Lime green โ€” featured-card-3, category icons
  brand-red: "#DA291C"      # Microchip red โ€” logo, error icons, alert states, banner active stripe
  # Text
  text-primary: "#000000"   # Body copy
  text-body: "rgba(0,0,0,0.8)"  # Standard body / td / li
  text-heading: "#34333E"   # h1 color
  text-dark: "#2C2C2B"      # Nav links, table cells
  text-muted: "#838E93"     # Dates, subtitles, disabled
  text-disabled: "#B6B7B9"  # Inactive chips, borders, separators
  text-link: "#1C355E"      # Default link color (body a)
  text-link-hover: "#41B6E6"  # Link hover
  text-cross-ref: "#157EAC"   # Cross-reference / utility links
  text-small: "#586674"     # Small / micro-copy
  # Surfaces
  surface: "#FFFFFF"        # Cards, inputs, header bg, modal bg
  surface-alt: "#F8F8F7"    # Hover row bg, card bg variant
  surface-gray: "#F1F2F2"   # Page section alt bg, breadcrumb bg, mobile back nav
  surface-input: "#F9F9F9"  # Search input bg
  # Borders
  border: "#E3E3E3"         # Nav item dividers (mobile)
  border-strong: "#B6B7B9"  # HR, card borders, separators
  border-input: "#C4C4C4"   # Input/search box border
  # Semantic
  error: "#DA291C"          # Same as brand-red โ€” used for errors
  success-bg: "#E8F8E8"     # Form success message bg
  success-border: "#6BB86E" # Form success border
typography:
  fontFamily: '"Open Sans", sans-serif'
  # Verified sizes from .h1-mixin / .h2-mixin / .h3-mixin / body rules
  h1:
    fontSize: "35px"
    fontWeight: 700
    lineHeight: "40px"
    color: "#34333E"
  h2:
    fontSize: "23px"
    fontWeight: 600
    lineHeight: "27px"
  h3:
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "20px"
  h4:
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
    color: "rgba(0,0,0,0.8)"
  body-sm:
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0.25px"
  nav-link:
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "19px"
    letterSpacing: "0.01em"
    color: "#2C2C2B"
  label:
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  micro-copy:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "17px"
    color: "#586674"
rounded:
  none: "0px"
  sm: "4px"    # Standard for buttons, cards, inputs, chips โ€” used site-wide
  md: "5px"    # Modal dialogs, vendor cards
  lg: "8px"    # Splash screen
  full: "9999px"  # Reserved; not used in core components
spacing:
  header-desktop: "80px"   # Header height
  header-mobile: "50px"
  header-padding: "0 85px"  # Desktop nav horizontal padding
  content-max: "1440px"    # Max width for content containers
  section-v: "75px"        # Alt section vertical padding
  card: "16px"             # Card inner padding
  banner: "45px 6%"        # Hero banner content padding
  gutter: "24px"
components:
  button-solid:
    backgroundColor: "#1C355E"
    textColor: "#FFFFFF"
    borderRadius: "4px"
    padding: "15px"
    fontWeight: 600
    fontSize: "16px"
    hoverBg: "#157EAC"
    hoverBorder: "#157EAC"
  button-outline:
    backgroundColor: "transparent"
    textColor: "#1C355E"
    border: "1px solid #1C355E"
    borderRadius: "4px"
    fontWeight: 600
    hoverColor: "#157EAC"
    hoverBorder: "#157EAC"
  button-outline-dark:
    # Used on dark/navy backgrounds
    backgroundColor: "transparent"
    textColor: "#FFFFFF"
    border: "1px solid #FFFFFF"
    borderRadius: "4px"
    hoverColor: "#157EAC"
    hoverBorder: "#157EAC"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "#157EAC"
    border: "none"
    hoverDecoration: "underline"
    hoverColor: "#1C355E"
  card:
    backgroundColor: "#F8F8F7"
    border: "1px solid"
    borderRadius: "4px"
    padding: "16px"
  input:
    backgroundColor: "#FFFFFF"
    border: "1px solid #C4C4C4"
    borderRadius: "4px"
    height: "44px"
    padding: "10px 12px"
    focusBorder: "#396CC0"
    fontSize: "14px"
  chip:
    backgroundColor: "#F0F0EE"
    textColor: "#575755"
    borderRadius: "4px"
    padding: "4px 8px"
    fontSize: "12px"
    fontWeight: 600
    activeBg: "#157EAC"
    activeColor: "#FFFFFF"
  banner:
    backgroundColor: "#1C355E"
    textColor: "#FFFFFF"
    borderRadius: "0px"
    padding: "45px 6%"
    gradient: "linear-gradient(270deg, rgba(28,53,94,0) 0, rgba(28,53,94,0.5) 50%, #1C355E 100%)"
  table-header:
    backgroundColor: "#1C355E"
    textColor: "#FFFFFF"
    hoverBg: "#D1DDE6"
    hoverColor: "#1C355E"
  table-row-hover:
    backgroundColor: "#157EAC"
    textColor: "#FFFFFF"
  footer:
    backgroundColor: "#1C355E"
    textColor: "#FFFFFF"
---

# Microchip Industrial Light

> All values in this file are extracted directly from `microchip.com` production CSS (`clientlib-site.min.css`, verified May 2026). Do not adjust without re-checking the source.

## Overview
Microchip's visual language is technical, dependable, and businesslike. The system is built for engineers and technical buyers who need fast access to products, tools, and documentation. Typography is compact and highly legible. Color usage is restrained — the deep navy `#1C355E` carries almost all structural weight, with `#157EAC` (teal-blue) reserved exclusively for interactive hover and active states.

## Colors

### Primary Palette
- **`#1C355E` (Deep Navy — primary):** Used for navigation, table headers, button fills, footer backgrounds, banners, and all high-emphasis UI chrome. The single most-used color in the system.
- **`#157EAC` (Teal-blue — hover/active):** Every hover state across buttons, links, table rows, and search results resolves to this color. Do not use it as a static fill.
- **`#41B6E6` (Sky Blue — accent):** Featured card type 2, tab active underline, category icons, link hover on dark backgrounds, carousel arrows. Provides a modern, technical feel.
- **`#F68D2E` (Orange — accent):** Featured card type 1, tab active stripe, product family highlights. Draws attention without competing with the primary navy.
- **`#6CC24A` (Green — accent):** Featured card type 3, category markers, share buttons. Signals discovery and positive action.
- **`#DA291C` (Microchip Red — brand/error):** The Microchip logo icon color. Used for lock icons on gated content, new-product badges, alert spinners, and scroll-to-top buttons. Never use as a primary CTA color.

### Text
- `#34333E` — h1 headings
- `rgba(0,0,0,0.8)` — standard body, `<td>`, `<li>`
- `#2C2C2B` — nav links, dense table text
- `#838E93` — muted dates, captions
- `#B6B7B9` — disabled text, separator lines
- `#157EAC` — utility links (cross-reference search, document links)
- `#1C355E` — default `<a>` color in body copy
- `#41B6E6` — `<a>:hover` color

### Surfaces & Backgrounds
- `#FFFFFF` — dominant: header, cards, inputs, modals
- `#F8F8F7` — hover row background, alternate card fill
- `#F1F2F2` — section alt background, breadcrumb bar, mobile nav
- `#F9F9F9` — striped table row (odd)

### Borders
- `#E3E3E3` — mobile nav dividers
- `#B6B7B9` — HR rules, card borders, data separators
- `#C4C4C4` — input / search field borders

## Typography
Font: **Open Sans** (loaded via `@font-face` from Microchip CDN — Regular, Italic, Bold 700).

| Role | Size | Weight | Line-height |
|---|---|---|---|
| h1 | 35px | 700 | 40px |
| h2 | 23px | 600 | 27px |
| h3 | 17px | 600 | 20px |
| h4-h6 | 17px | 600 | 24px |
| Body / p | 15px | 400 | 24px |
| Body small | 14px | 400 | 20px, letter-spacing 0.25px |
| Nav link | 14px | **700** | 19px, letter-spacing 0.01em |
| Label / button | 16px | 600 | 24px |
| Micro / chip | 12px | 600 | 17px |

All nav links are `text-transform: uppercase` on desktop. Navigation items use `font-weight: 700` — bolder than the rest of the system to aid scanning.

## Layout & Spacing
- Max content width: **1440px** (centered with `margin: 0 auto`)
- Desktop header height: **80px**, padding `0 85px`
- Mobile header height: **50px**
- Alt section (gray bg) padding: **75px** top/bottom
- Card internal padding: **16px**
- Hero banner content padding: `45px 6%`
- Input / button height: **44px** (consistent touch target)

The system is desktop-first. Content regions are wide (up to 1440px) with generous horizontal margins. Section backgrounds alternate between white and `#F1F2F2` to create visual separation without borders.

## Elevation & Depth
The system is almost entirely flat. Cards use `border: 1px solid` and `border-radius: 4px` without shadows. Where depth is used it is minimal: `box-shadow: 0 2px 4px 0 rgba(0,0,0,0.29)` on data cards and product info panels. No gradients on surfaces except the hero banner overlay (linear-gradient from transparent to `#1C355E`).

## Shapes
All interactive controls use `border-radius: 4px` — buttons, inputs, cards, chips, pagination buttons. Nothing is pill-shaped in the main component library. Larger elements like hero banners and the footer are fully square-cornered. Modal dialogs use `border-radius: 5px`.

## Components

### Buttons
Three visual variants, all sharing `border-radius: 4px` and `font-weight: 600`:
- **Solid** (`#1C355E` fill, `#FFF` text) — primary CTA. Hover: `#157EAC` fill + border.
- **Outline** (transparent fill, `#1C355E` border + text) — secondary. Hover: `#157EAC` border + text.
- **Outline-dark** (used on navy backgrounds — white border + white text). Hover: `#157EAC` border + text.
- **Ghost** (`#157EAC` text, no border) — tertiary/utility. Hover: underline + `#1C355E`.

Standard button padding: `15px`. Compact: `10px 16px`. Large CTA: `15px 40px`.

### Cards
Background `#F8F8F7`, `border: 1px solid`, `border-radius: 4px`, padding `16px`. Featured cards use a colored top-bar accent in orange/blue/green. Card hover: subtle box-shadow + slight lift.

### Inputs & Search
Height `44px`, `border: 1px solid #C4C4C4`, `border-radius: 4px`, font-size `14px`. Focus: `border-color: #396CC0`. Search submit button: `#1C355E` fill to `#157EAC` hover. Search dropdown suggestion hover: `#157EAC` bg + white text.

### Chips / Filters
`background: #F0F0EE`, `color: #575755`, `border-radius: 4px`, `padding: 4px 8px`, `font-size: 12px`, `font-weight: 600`. Active: `background: #157EAC`, `color: #FFF`.

### Tables
Header: `background: #1C355E`, `color: #FFF`. Header hover: `background: #D1DDE6`, `color: #1C355E`. Row hover: `background: #157EAC`, all text turns `#FFF`. Striped odd rows: `#F9F9F9`. Pagination current page: `border: 1px solid #1C355E`, `color: #1C355E`, `font-weight: 700`.

### Banner
Full-bleed or section-width, `background: #1C355E`, hero uses a gradient overlay from transparent to navy. Title: white, `font-size: 36px`, `font-weight: 600`. Subtitle: `#B6B7B9`.

### Navigation
Desktop: white background, max-width 1440px, `height: 80px`. Active nav link: `border-bottom: 2px solid #1C355E`. Mega-menu panel: `background: #F8F8F7`. Footer: `background: #1C355E`, all text white.

## Do's and Don'ts
- Do use `#1C355E` as the primary structural color — navigation, headers, buttons, table headers.
- Do use `#157EAC` only for hover/active states — never as a static fill.
- Do keep all border-radii at `4px` for interactive components.
- Do use `#F1F2F2` and `#F8F8F7` for surface alternation — not heavy shadows.
- Do keep button text `font-weight: 600`; nav links `font-weight: 700`.
- Don't use `#DA291C` for primary CTAs — it is a brand/error/alert color only.
- Don't add pill-shape (`border-radius: 9999px`) to any core component.
- Don't use heavy gradients, glossy effects, or dramatic box-shadows.
- Don't deviate from Open Sans — it is loaded directly from Microchip's CDN.