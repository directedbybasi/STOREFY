import type { PageAst } from "./schema";
import { createSectionFromDefinition } from "./schema";

export interface StarterPreset {
  key: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  defaultThemeSettings: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    typography: {
      headingFont: string;
      bodyFont: string;
    };
    layout: {
      borderRadius: string;
    };
  };
  homeAst: PageAst;
}

function buildHomeAstWithSections(types: string[]): PageAst {
  return {
    template: "home",
    sections: types.map((t) => createSectionFromDefinition(t)),
  };
}

export const STARTER_PRESETS: Record<string, StarterPreset> = {
  general: {
    key: "general",
    name: "Modern Minimal",
    category: "General Retail",
    description: "Versatile, clean storefront suitable for apparel, accessories, and curated consumer goods.",
    defaultThemeSettings: {
      colors: {
        primary: "#0f172a",
        secondary: "#475569",
        accent: "#2563eb",
        background: "#ffffff",
      },
      typography: {
        headingFont: "Inter, sans-serif",
        bodyFont: "Inter, sans-serif",
      },
      layout: {
        borderRadius: "0.5rem",
      },
    },
    homeAst: buildHomeAstWithSections([
      "announcement_bar",
      "hero",
      "multicolumn",
      "featured_collection",
      "image_text",
      "testimonials",
      "newsletter",
    ]),
  },
  fashion: {
    key: "fashion",
    name: "Couture & Apparel",
    category: "Fashion & Lifestyle",
    description: "High-fashion editorial layout featuring large lookbook galleries and split lifestyle banners.",
    badge: "Popular",
    defaultThemeSettings: {
      colors: {
        primary: "#18181b",
        secondary: "#71717a",
        accent: "#d97706",
        background: "#fafafa",
      },
      typography: {
        headingFont: "Playfair Display, serif",
        bodyFont: "Inter, sans-serif",
      },
      layout: {
        borderRadius: "0.25rem",
      },
    },
    homeAst: buildHomeAstWithSections([
      "hero",
      "promo_banner",
      "collection_grid",
      "featured_collection",
      "image_gallery",
      "testimonials",
      "newsletter",
    ]),
  },
  beauty: {
    key: "beauty",
    name: "Aura Skincare & Beauty",
    category: "Cosmetics & Wellness",
    description: "Soft pastel aesthetics, rich trust badges, and ingredient storytelling blocks.",
    defaultThemeSettings: {
      colors: {
        primary: "#831843",
        secondary: "#9d174d",
        accent: "#f43f5e",
        background: "#fff1f2",
      },
      typography: {
        headingFont: "Plus Jakarta Sans, sans-serif",
        bodyFont: "Inter, sans-serif",
      },
      layout: {
        borderRadius: "1rem",
      },
    },
    homeAst: buildHomeAstWithSections([
      "announcement_bar",
      "hero",
      "multicolumn",
      "image_text",
      "product_grid",
      "testimonials",
      "faq",
    ]),
  },
  electronics: {
    key: "electronics",
    name: "Apex Gadgets & Tech",
    category: "Electronics",
    description: "High-contrast technical layout optimized for spec comparisons and flash sales.",
    defaultThemeSettings: {
      colors: {
        primary: "#0284c7",
        secondary: "#334155",
        accent: "#0ea5e9",
        background: "#ffffff",
      },
      typography: {
        headingFont: "Roboto, sans-serif",
        bodyFont: "Roboto, sans-serif",
      },
      layout: {
        borderRadius: "0.375rem",
      },
    },
    homeAst: buildHomeAstWithSections([
      "announcement_bar",
      "hero",
      "countdown",
      "product_grid",
      "multicolumn",
      "video",
      "faq",
    ]),
  },
  dropshipping: {
    key: "dropshipping",
    name: "Velocity Dropship",
    category: "Dropshipping",
    description: "Conversion-optimized layout with sticky countdowns, reviews, and trust guarantees.",
    badge: "High Conversion",
    defaultThemeSettings: {
      colors: {
        primary: "#16a34a",
        secondary: "#15803d",
        accent: "#22c55e",
        background: "#ffffff",
      },
      typography: {
        headingFont: "Inter, sans-serif",
        bodyFont: "Inter, sans-serif",
      },
      layout: {
        borderRadius: "0.5rem",
      },
    },
    homeAst: buildHomeAstWithSections([
      "announcement_bar",
      "hero",
      "promo_banner",
      "featured_collection",
      "multicolumn",
      "testimonials",
      "cta",
    ]),
  },
};
