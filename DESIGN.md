---
version: v0010
name: Bots & Bones Design System
description: "Warm off-white canvas, near-black ink, geometric Space Grotesk display type, technical IBM Plex Mono labels, coral accent wordmark, and a confident 12-column grid. Dark is the default product surface. Tokens are mirrored in web/content/tokens.ts, web/app/globals.css (:root), /style-guide, and src/gallery/studio-ui.css (HelloIAM Stories factory UI)."

colors:
  canvas: "#f4f2ec"
  canvas-warm: "#ebe8df"
  ink: "#191917"
  ink-muted: "#9d9a9f"
  ink-soft: "#bcb8b3"
  inverse-canvas: "#9d9a9f"
  inverse-ink: "#f4f2ec"
  surface-1: "#e2e5d7"
  surface-2: "#c8c2e8"
  surface-dark: "#9d9a9f"
  hairline: "rgba(25, 25, 23, 0.16)"
  hairline-strong: "rgba(25, 25, 23, 0.32)"
  ghost: "rgba(25, 25, 23, 0.04)"
  accent-coral: "#ff5c45"
  accent-coral-active: "#e04a35"
  accent-green: "#49f7a5"
  accent-cyan: "#00c9cf"
  accent-yellow: "#f4d941"
  accent-moss: "#4a5d3a"
  technical-gray: "#c8c4ba"
  surface-clay: "#b85432"
  surface-moss: "#4a5d3a"
  surface-warm: "#f8957b"
  night-navy: "#1a2742"

palette:
  - { label: "NB.A2 / CORAL FLARE", hex: "#ff5c45" }
  - { label: "NB.A7 / SUN YELLOW", hex: "#f4d941" }
  - { label: "NB.A4 / CYAN GHOST", hex: "#00c9cf" }
  - { label: "NB.A5 / LILAC HAZE", hex: "#c8c2e8" }
  - { label: "NB.A3 / COOL CONCRETE", hex: "#9d9a9f" }
  - { label: "NB.A8 / PEACH SOFT", hex: "#f8957b" }
  - { label: "NB.A6 / FOREST MOSS", hex: "#4a5d3a" }
  - { label: "NB.A9 / TERRACOTTA", hex: "#b85432" }
  - { label: "NB.A12 / BLACK MATTE", hex: "#191917" }
  - { label: "NB.A10 / CANVAS CREAM", hex: "#f4f2ec", theme: light }
  - { label: "NB.A11 / SAGE PALE", hex: "#e2e5d7", theme: light }
  - { label: "NB.A1 / NIGHT NAVY", hex: "#1a2742" }

typography:
  display-xxl:
    fontFamily: "Space Grotesk, Arial, sans-serif"
    fontSize: 118px
    fontWeight: 500
    lineHeight: 0.86
    letterSpacing: -5.2px
  display-xl:
    fontFamily: "Space Grotesk, Arial, sans-serif"
    fontSize: 84px
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: -3.8px
  display-lg:
    fontFamily: "Space Grotesk, Arial, sans-serif"
    fontSize: 56px
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -2.2px
  headline:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.8px
  subhead:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: -0.2px
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: -0.1px
  body-sm:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.05px
  caption:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.02em
    textTransform: uppercase
  micro:
    fontFamily: "IBM Plex Mono, Space Mono, monospace"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0.04em
  button:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.1px

rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 18px
  pill: 999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  title-subtitle: 20px
  lg: 24px
  title-subtitle-hero: 24px
  xl: 36px
  xxl: 48px
  header-content: 40px
  section: 160px
  layers-to-wwb: 160px
  hero: 144px

grid:
  columns: 12
  pageWidth: 1536px
  margin: 40px
  gutter: 20px
  maxContent: 1276px
  wideContent: 1456px
  marginFluid: "clamp(16px, 3vw, 40px)"
  gutterFluid: "clamp(12px, 1.6vw, 20px)"

layout:
  nav-height: 67px
  default-theme: dark
  theme-toggle: "style-guide only; production is dark default"

hero-scale:
  refViewport: { width: 1440, height: 900 }
  scaleRange: { min: 0.8, max: 1.18 }
  introMax: { min: 1063, max: 1280 }
  sequenceMax: { min: 1276, max: 1520 }

brand-logo:
  restColor: "{colors.accent-coral}"
  preloaderColor: "{colors.ink}"
  maskUrl: "/assets/logos/logo-nav.png"
  spinTurnMs: 1600
  preloaderSpinTurnMs: 800
  preloaderTurns: 3
  preloaderExitMs: 550

components:
  top-nav:
    backgroundColor: "{colors.canvas-warm}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: 67px

  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.inverse-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "11px 18px"
    accentTones: [coral, lilac, yellow, cyan, green, ink]

  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    border: "1px solid {colors.hairline-strong}"
    padding: "10px 17px"

  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: "0"

  layer-card:
    layout: "framed isometric plane, rotateY 36deg"
    iconHover: "coin-spin + card levitation"

  product-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    border: "1px solid {colors.hairline}"
    padding: "{spacing.lg}"

  product-card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.inverse-ink}"
    rounded: "{rounded.none}"
    border: "1px solid rgba(255,255,255,0.12)"
    padding: "{spacing.lg}"

  technical-label:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
    padding: "0"

  footer:
    backgroundColor: "{colors.inverse-canvas}"
    textColor: "{colors.inverse-ink}"
    typography: "{typography.caption}"
---
