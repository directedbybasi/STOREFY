import { describe, it, expect } from "vitest";
import {
  sanitizeColor,
  sanitizeDimension,
  sanitizeFontFamily,
  compileThemeCssVariables,
  DEFAULT_THEME_SETTINGS,
} from "@/modules/storefront/theme-engine";

describe("Storefront Theme Engine & CSS Security", () => {
  describe("sanitizeColor", () => {
    it("accepts valid hex colors", () => {
      expect(sanitizeColor("#ffffff", "#000")).toBe("#ffffff");
      expect(sanitizeColor("#0f172a", "#000")).toBe("#0f172a");
      expect(sanitizeColor("#abc", "#000")).toBe("#abc");
      expect(sanitizeColor("#aabbccdd", "#000")).toBe("#aabbccdd");
    });

    it("accepts valid rgb and rgba colors", () => {
      expect(sanitizeColor("rgb(15, 23, 42)", "#000")).toBe("rgb(15, 23, 42)");
      expect(sanitizeColor("rgba(15, 23, 42, 0.5)", "#000")).toBe("rgba(15, 23, 42, 0.5)");
    });

    it("accepts valid hsl and hsla colors", () => {
      expect(sanitizeColor("hsl(215, 25%, 27%)", "#000")).toBe("hsl(215, 25%, 27%)");
      expect(sanitizeColor("hsla(215, 25%, 27%, 0.9)", "#000")).toBe("hsla(215, 25%, 27%, 0.9)");
    });

    it("rejects malicious injection attempts and falls back to safe default", () => {
      // CSS breakout attempts
      expect(sanitizeColor("red; background: url('https://evil.com/xss')", "#000")).toBe("#000");
      expect(sanitizeColor("expression(alert(1))", "#000")).toBe("#000");
      expect(sanitizeColor("</style><script>alert('xss')</script>", "#000")).toBe("#000");
      expect(sanitizeColor("javascript:void(0)", "#000")).toBe("#000");
      expect(sanitizeColor("", "#000")).toBe("#000");
      expect(sanitizeColor(undefined, "#000")).toBe("#000");
    });
  });

  describe("sanitizeDimension", () => {
    it("accepts valid dimensions with standard units", () => {
      expect(sanitizeDimension("0.5rem", "0px")).toBe("0.5rem");
      expect(sanitizeDimension("12px", "0px")).toBe("12px");
      expect(sanitizeDimension("100%", "0px")).toBe("100%");
      expect(sanitizeDimension("1280px", "0px")).toBe("1280px");
    });

    it("rejects malformed dimensions and injection vectors", () => {
      expect(sanitizeDimension("10px; color: red", "0px")).toBe("0px");
      expect(sanitizeDimension("calc(100% - url(evil))", "0px")).toBe("0px");
      expect(sanitizeDimension("<script>", "0px")).toBe("0px");
      expect(sanitizeDimension("", "0px")).toBe("0px");
    });
  });

  describe("sanitizeFontFamily", () => {
    it("accepts valid font family declarations", () => {
      expect(sanitizeFontFamily("Inter, sans-serif", "sans-serif")).toBe("Inter, sans-serif");
      expect(sanitizeFontFamily("Roboto, Arial, sans-serif", "sans-serif")).toBe(
        "Roboto, Arial, sans-serif"
      );
    });

    it("strips malicious injection characters (semicolons, brackets, quotes)", () => {
      expect(sanitizeFontFamily("Inter; } body { display:none }", "sans-serif")).toBe("sans-serif");
      expect(sanitizeFontFamily("<script>alert(1)</script>", "sans-serif")).toBe("sans-serif");
    });
  });

  describe("compileThemeCssVariables", () => {
    it("returns default theme variables when no settings provided", () => {
      const vars = compileThemeCssVariables(undefined) as Record<string, string>;
      expect(vars["--store-primary"]).toBe(DEFAULT_THEME_SETTINGS.colors.primary);
      expect(vars["--store-secondary"]).toBe(DEFAULT_THEME_SETTINGS.colors.secondary);
      expect(vars["--store-bg"]).toBe(DEFAULT_THEME_SETTINGS.colors.background);
      expect(vars["--store-radius"]).toBe(DEFAULT_THEME_SETTINGS.layout.borderRadius);
    });

    it("applies sanitized merchant customization safely", () => {
      const custom = {
        colors: {
          primary: "#4f46e5",
          background: "#fafafa",
        },
        layout: {
          borderRadius: "1rem",
          containerMaxWidth: "1400px",
        },
      };

      const vars = compileThemeCssVariables(custom) as Record<string, string>;
      expect(vars["--store-primary"]).toBe("#4f46e5");
      expect(vars["--store-bg"]).toBe("#fafafa");
      expect(vars["--store-radius"]).toBe("1rem");
      expect(vars["--container-max-width"]).toBe("1400px");
      // Fallback for unspecified
      expect(vars["--store-accent"]).toBe(DEFAULT_THEME_SETTINGS.colors.accent);
    });

    it("neutralizes malicious attributes in theme object", () => {
      const malicious = {
        colors: {
          primary: "blue; background: red; /* injection */",
        },
        typography: {
          headingFont: "Comic Sans; } * { color: red !important; }",
        },
      };

      const vars = compileThemeCssVariables(malicious) as Record<string, string>;
      // Malicious value is rejected and falls back safely
      expect(vars["--store-primary"]).toBe(DEFAULT_THEME_SETTINGS.colors.primary);
      expect(vars["--font-heading"]).toBe(DEFAULT_THEME_SETTINGS.typography.headingFont);
    });
  });
});
