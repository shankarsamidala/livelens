/**
 * Brand palette constants — single source of truth for raw color values.
 * Use CSS variables (defined in index.css) wherever possible in components;
 * these constants exist for computed-style contexts (JS-driven animations,
 * canvas drawing, test assertions) where CSS vars cannot be read.
 */

// ── Brand primitives ─────────────────────────────────────────────────────────

export const BRAND = {
    /** Claude charcoal — primary dark surface */
    dark:      '#141413',
    /** Off-white — primary text on dark */
    offWhite:  '#faf9f5',
    /** Claude orange */
    orange:    '#d97757',
    /** Darker orange — hover / active state */
    orangeDark:'#c4623e',
    /** Accent blue */
    blue:      '#6a9bcc',
    /** Accent green */
    green:     '#788c5d',
} as const;

// ── Dark overlay base values ─────────────────────────────────────────────────

export const OVERLAY_DARK = {
    panelBase:   '13, 15, 20',   // rgb components for rgba() usage
    textBase:    '255, 255, 255',
} as const;

// ── Light overlay base values ────────────────────────────────────────────────

export const OVERLAY_LIGHT = {
    panelBase:   '214, 228, 247',
    borderBase:  '37, 99, 235',
} as const;

// ── Mode card palette ────────────────────────────────────────────────────────
// Used by analysisModes.ts for the launcher card backgrounds/borders.

export const MODE_COLORS = {
    general:      { color: 'rgba(106,155,204,0.13)',  border: 'rgba(106,155,204,0.18)' },
    dsa:          { color: 'rgba(167,139,250,0.13)',  border: 'rgba(167,139,250,0.18)' },
    systemDesign: { color: 'rgba(45,212,191,0.12)',   border: 'rgba(45,212,191,0.17)' },
    debug:        { color: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.17)' },
    behavioral:   { color: 'rgba(251,191,36,0.12)',   border: 'rgba(251,191,36,0.17)' },
    sales:        { color: 'rgba(74,222,128,0.10)',   border: 'rgba(74,222,128,0.15)' },
    dataScience:  { color: 'rgba(251,146,60,0.12)',   border: 'rgba(251,146,60,0.17)' },
    devops:       { color: 'rgba(148,163,184,0.10)',  border: 'rgba(148,163,184,0.14)' },
} as const;
