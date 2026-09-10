import type { CSSProperties } from "react";

export interface StoreThemeSettings {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    foreground?: string;
    mutedForeground?: string;
    border?: string;
  };
  typography?: {
    headingFont?: string;
    bodyFont?: string;
  };
  layout?: {
    borderRadius?: string;
    shadow?: string;
    containerMaxWidth?: string;
  };
  announcement?: {
    enabled?: boolean;
    text?: string;
    link?: string;
  };
  footer?: {
    aboutText?: string;
    copyrightText?: string;
  };
}

export interface DefaultThemeSettings {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    foreground: string;
    mutedForeground: string;
    border: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  layout: {
    borderRadius: string;
    shadow: string;
    containerMaxWidth: string;
  };
  announcement: {
    enabled: boolean;
    text: string;
    link: string;
  };
  footer: {
    aboutText: string;
    copyrightText: string;
  };
}

export const DEFAULT_THEME_SETTINGS: DefaultThemeSettings = {
  colors: {
    primary: "#0f172a",
    secondary: "#475569",
    accent: "#2563eb",
    background: "#ffffff",
    surface: "#f8fafc",
    foreground: "#0f172a",
    mutedForeground: "#64748b",
    border: "#e2e8f0",
  },
  typography: {
    headingFont: "Inter, sans-serif",
    bodyFont: "Inter, sans-serif",
  },
  layout: {
    borderRadius: "0.5rem",
    shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    containerMaxWidth: "1280px",
  },
  announcement: {
    enabled: false,
    text: "",
    link: "",
  },
  footer: {
    aboutText: "",
    copyrightText: "",
  },
};

/**
 * Validates a color value (Hex, RGB, RGBA, HSL, HSLA).
 * Rejects any malicious characters that could break out of CSS declarations.
 */
export function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color || typeof color !== "string") return fallback;
  const trimmed = color.trim();

  // Hex color (#rgb, #rgba, #rrggbb, #rrggbbaa)
  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  if (hexRegex.test(trimmed)) return trimmed;

  // RGB/RGBA format: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbRegex = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i;
  if (rgbRegex.test(trimmed)) return trimmed;

  // HSL/HSLA format: hsl(h, s%, l%) or hsla(h, s%, l%, a)
  const hslRegex = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i;
  if (hslRegex.test(trimmed)) return trimmed;

  return fallback;
}

/**
 * Sanitizes CSS dimension or radius value.
 * Disallows semicolons, curly braces, quotes, or dangerous tokens (expression, url, etc.).
 */
export function sanitizeDimension(val: string | undefined, fallback: string): string {
  if (!val || typeof val !== "string") return fallback;
  const trimmed = val.trim();

  // Must match numeric values with valid CSS units: px, rem, em, %, vh, vw
  const dimensionRegex = /^[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw|ch)$/;
  if (dimensionRegex.test(trimmed)) return trimmed;

  return fallback;
}

/**
 * Sanitizes font-family string.
 * Strips semicolons, brackets, backslashes, and quotes.
 */
export function sanitizeFontFamily(font: string | undefined, fallback: string): string {
  if (!font || typeof font !== "string") return fallback;
  const cleaned = font.replace(/[;{}<>"'\\]/g, "").trim();
  if (!cleaned || cleaned.length > 100) return fallback;

  // Allow standard alphanumeric names, spaces, and commas
  if (/^[a-zA-Z0-9\s,\-_]+$/.test(cleaned)) {
    return cleaned;
  }
  return fallback;
}

/**
 * Compiles a raw theme settings object into a safe React CSSProperties object.
 * Zero dangerouslySetInnerHTML is used; custom properties are passed directly
 * via React style attributes.
 */
export function compileThemeCssVariables(rawSettings?: unknown): CSSProperties {
  const settings = (typeof rawSettings === "object" && rawSettings !== null
    ? rawSettings
    : {}) as StoreThemeSettings;

  const colors = settings.colors || {};
  const typography = settings.typography || {};
  const layout = settings.layout || {};

  const primary = sanitizeColor(colors.primary, DEFAULT_THEME_SETTINGS.colors.primary);
  const secondary = sanitizeColor(colors.secondary, DEFAULT_THEME_SETTINGS.colors.secondary);
  const accent = sanitizeColor(colors.accent, DEFAULT_THEME_SETTINGS.colors.accent);
  const background = sanitizeColor(colors.background, DEFAULT_THEME_SETTINGS.colors.background);
  const surface = sanitizeColor(colors.surface, DEFAULT_THEME_SETTINGS.colors.surface);
  const foreground = sanitizeColor(colors.foreground, DEFAULT_THEME_SETTINGS.colors.foreground);
  const mutedForeground = sanitizeColor(
    colors.mutedForeground,
    DEFAULT_THEME_SETTINGS.colors.mutedForeground
  );
  const border = sanitizeColor(colors.border, DEFAULT_THEME_SETTINGS.colors.border);

  const headingFont = sanitizeFontFamily(
    typography.headingFont,
    DEFAULT_THEME_SETTINGS.typography.headingFont
  );
  const bodyFont = sanitizeFontFamily(
    typography.bodyFont,
    DEFAULT_THEME_SETTINGS.typography.bodyFont
  );

  const borderRadius = sanitizeDimension(
    layout.borderRadius,
    DEFAULT_THEME_SETTINGS.layout.borderRadius
  );
  const containerMaxWidth = sanitizeDimension(
    layout.containerMaxWidth,
    DEFAULT_THEME_SETTINGS.layout.containerMaxWidth
  );

  return {
    "--store-primary": primary,
    "--store-secondary": secondary,
    "--store-accent": accent,
    "--store-bg": background,
    "--store-surface": surface,
    "--store-text": foreground,
    "--store-text-muted": mutedForeground,
    "--store-border": border,
    "--store-radius": borderRadius,
    "--container-max-width": containerMaxWidth,
    "--font-heading": headingFont,
    "--font-body": bodyFont,
  } as CSSProperties;
}
