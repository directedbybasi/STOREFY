/**
 * STOREFY Ultra-Premium Commerce OS Design System Tokens
 * 
 * Provides programmatic access to standardized design tokens, status semantics,
 * tabular number formatting, spacing rules, and layout constraints.
 */

export const DESIGN_TOKENS = {
  // Spacing system based on 8-point grid
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
    "3xl": "64px",
  },
  // Radius tokens
  radius: {
    control: "rounded-md", // 6px - buttons, badges, inputs
    card: "rounded-lg",    // 8px - cards, dialogs
    overlay: "rounded-xl", // 12px - modals, sheets
  },
  // Standard content widths matching OS guidelines (Section 9)
  widths: {
    form: "max-w-3xl",      // 768px (forms 720-960px)
    detail: "max-w-6xl",    // 1152px (balanced detail pages)
    table: "max-w-7xl",     // 1280px (data tables 1000-1440px)
    analytics: "w-full",    // Full width analytics
  },
  // Micro-interaction durations
  motion: {
    instant: "duration-120",
    fast: "duration-150",
    standard: "duration-180",
    emphasis: "duration-200",
  },
} as const;

/**
 * Formats a monetary integer value into an authoritative tabular INR display.
 * Example: 12450000 -> "₹1,24,500"
 */
export function formatTabularINR(paise: number, includeFraction = false): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: includeFraction ? 2 : 0,
    maximumFractionDigits: includeFraction ? 2 : 0,
  }).format(rupees);
}

/**
 * Formats numbers with tabular numeral spacing.
 * Example: 1284 -> "1,284"
 */
export function formatTabularNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

/**
 * Formats percentage changes with explicit + / - signs.
 * Example: 12.4 -> "+12.4%"
 */
export function formatPercentageDelta(delta: number): string {
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(1)}%`;
}

/**
 * Semantic status colors and badge classes.
 */
export type SemanticStatus = "SUCCESS" | "WARNING" | "ERROR" | "INFO" | "NEUTRAL";

export const STATUS_STYLES: Record<
  SemanticStatus,
  {
    badge: string;
    dot: string;
    text: string;
  }
> = {
  SUCCESS: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  WARNING: {
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
  },
  ERROR: {
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
  },
  INFO: {
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
  },
  NEUTRAL: {
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
    text: "text-muted-foreground",
  },
};
