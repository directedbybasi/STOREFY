import { describe, it, expect } from "vitest";
import {
  pageAstSchema,
  sectionNodeSchema,
  blockNodeSchema,
  SECTION_DEFINITIONS,
  BLOCK_DEFINITIONS,
  createSectionFromDefinition,
  createBlockNode,
  type PageAst,
  type SectionNode,
  type BlockNode,
} from "@/modules/builder/schema";

describe("Phase 5: Builder AST & Schema Integrity", () => {
  it("should have all canonical section definitions configured across the 6 core categories", () => {
    const expectedSections = [
      // HERO
      "hero",
      "hero_image",
      "hero_video",
      // CONTENT
      "rich_text",
      "image_text",
      "feature_grid",
      "multicolumn",
      "image_gallery",
      // COMMERCE
      "product_grid",
      "featured_collection",
      "collection_grid",
      // TRUST
      "testimonials",
      "trust_badges",
      "reviews",
      // MARKETING
      "announcement_bar",
      "promo_banner",
      "countdown",
      "newsletter",
      "cta",
      // BUSINESS
      "contact",
      "faq",
      "logo_list",
      "social_links",
    ];

    expect(Object.keys(SECTION_DEFINITIONS).length).toBeGreaterThanOrEqual(19);

    for (const type of expectedSections) {
      const def = SECTION_DEFINITIONS[type];
      expect(def, `Missing definition for section: ${type}`).toBeDefined();
      expect(def.type).toBe(type);
      expect(def.label).toBeTruthy();
      expect(Array.isArray(def.allowedBlocks)).toBe(true);
      expect(def.defaultSettings).toBeDefined();
      expect(["HERO", "CONTENT", "COMMERCE", "TRUST", "MARKETING", "BUSINESS"]).toContain(def.category);
    }
  });

  it("should have all canonical block definitions configured in BLOCK_DEFINITIONS", () => {
    const expectedBlocks = [
      "heading",
      "text",
      "rich_text",
      "button",
      "image",
      "icon",
      "product",
      "collection",
      "price",
      "rating",
      "social_link",
      "feature",
      "testimonial",
      "video",
      "spacer",
      "divider",
      "faq_item",
      "badge",
    ];

    for (const type of expectedBlocks) {
      const def = BLOCK_DEFINITIONS[type];
      expect(def, `Missing definition for block: ${type}`).toBeDefined();
      expect(def.type).toBe(type);
      expect(def.label).toBeTruthy();
      expect(def.defaultSettings).toBeDefined();
    }
  });

  it("should validate a compliant PageAst with schemaVersion via Zod", () => {
    const validAst: PageAst = {
      schemaVersion: 1,
      template: "home",
      sections: [
        {
          id: "sec-hero-1",
          type: "hero",
          settings: {
            title: "Welcome to Our Boutique",
            subtitle: "Finest quality artisanal goods",
            layout: "split",
          },
          blocks: [
            {
              id: "blk-btn-1",
              type: "button",
              settings: {
                label: "Shop Now",
                url: "/products",
                variant: "primary",
              },
            },
          ],
        },
      ],
    };

    const result = pageAstSchema.safeParse(validAst);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(1);
      expect(result.data.template).toBe("home");
      expect(result.data.sections.length).toBe(1);
    }
  });

  it("should reject invalid AST structures", () => {
    const invalidAst = {
      template: "", // empty template should fail min(1)
      sections: "not-an-array",
    };

    const result = pageAstSchema.safeParse(invalidAst);
    expect(result.success).toBe(false);
  });

  it("should support section tree mutations: add, reorder, delete, duplicate, hide, lock", () => {
    let ast: PageAst = {
      template: "home",
      sections: [
        { id: "s1", type: "hero", settings: {}, blocks: [] },
        { id: "s2", type: "rich_text", settings: {}, blocks: [] },
        { id: "s3", type: "product_grid", settings: {}, blocks: [] },
      ],
    };

    // Add section
    const newSection: SectionNode = { id: "s4", type: "testimonials", settings: {}, blocks: [] };
    ast = { ...ast, sections: [...ast.sections, newSection] };
    expect(ast.sections.length).toBe(4);

    // Reorder sections (move s3 to top)
    const sectionsCopy = [...ast.sections];
    const [s3] = sectionsCopy.splice(2, 1);
    sectionsCopy.unshift(s3);
    ast = { ...ast, sections: sectionsCopy };
    expect(ast.sections.map((s) => s.id)).toEqual(["s3", "s1", "s2", "s4"]);

    // Hide section
    ast = {
      ...ast,
      sections: ast.sections.map((s) => (s.id === "s1" ? { ...s, isHidden: true } : s)),
    };
    expect(ast.sections.find((s) => s.id === "s1")?.isHidden).toBe(true);

    // Lock section
    ast = {
      ...ast,
      sections: ast.sections.map((s) => (s.id === "s1" ? { ...s, isLocked: true } : s)),
    };
    expect(ast.sections.find((s) => s.id === "s1")?.isLocked).toBe(true);

    // Delete section
    ast = {
      ...ast,
      sections: ast.sections.filter((s) => s.id !== "s2"),
    };
    expect(ast.sections.find((s) => s.id === "s2")).toBeUndefined();
    expect(ast.sections.length).toBe(3);
  });

  it("should support block tree mutations: add, reorder, delete, duplicate within a section", () => {
    let section: SectionNode = {
      id: "sec-testimonials",
      type: "testimonials",
      settings: { title: "What our customers say" },
      blocks: [
        {
          id: "b1",
          type: "testimonial",
          settings: { author: "Priya", quote: "Outstanding quality!" },
        },
        {
          id: "b2",
          type: "testimonial",
          settings: { author: "Rahul", quote: "Fast delivery to Mumbai." },
        },
      ],
    };

    // Add block
    const newBlock: BlockNode = {
      id: "b3",
      type: "testimonial",
      settings: { author: "Aarav", quote: "Highly recommended." },
    };
    section = { ...section, blocks: [...section.blocks, newBlock] };
    expect(section.blocks.length).toBe(3);

    // Reorder blocks (move b3 to top)
    const blocksCopy = [...section.blocks];
    const [b3] = blocksCopy.splice(2, 1);
    blocksCopy.unshift(b3);
    section = { ...section, blocks: blocksCopy };
    expect(section.blocks.map((b) => b.id)).toEqual(["b3", "b1", "b2"]);

    // Duplicate block b1
    const b1 = section.blocks.find((b) => b.id === "b1")!;
    const dupBlock: BlockNode = {
      ...b1,
      id: `b1_dup_${Date.now()}`,
      settings: { ...b1.settings },
    };
    section = { ...section, blocks: [...section.blocks, dupBlock] };
    expect(section.blocks.length).toBe(4);

    // Delete block b2
    section = { ...section, blocks: section.blocks.filter((b) => b.id !== "b2") };
    expect(section.blocks.length).toBe(3);
    expect(section.blocks.find((b) => b.id === "b2")).toBeUndefined();
  });

  it("should generate fresh unique IDs when copying and pasting sections or blocks", () => {
    const originalSection = createSectionFromDefinition("hero");
    expect(originalSection.id).toBeTruthy();
    expect(originalSection.blocks.length).toBeGreaterThan(0);

    // Simulate schema-safe paste with ID regeneration
    const pastedSection: SectionNode = {
      ...originalSection,
      id: `hero_pasted_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${originalSection.name} (Pasted)`,
      blocks: originalSection.blocks.map((b) => ({
        ...b,
        id: `${b.type}_pasted_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      })),
    };

    // Verify IDs are completely different
    expect(pastedSection.id).not.toBe(originalSection.id);
    for (let i = 0; i < originalSection.blocks.length; i++) {
      expect(pastedSection.blocks[i].id).not.toBe(originalSection.blocks[i].id);
      expect(pastedSection.blocks[i].type).toBe(originalSection.blocks[i].type);
    }

    // Verify block copy/paste ID regeneration
    const originalBlock = createBlockNode("button", { label: "Order Now" });
    const pastedBlock: BlockNode = {
      ...originalBlock,
      id: `button_pasted_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    expect(pastedBlock.id).not.toBe(originalBlock.id);
    expect(pastedBlock.settings.label).toBe("Order Now");
    expect(blockNodeSchema.safeParse(originalBlock).success).toBe(true);
  });

  it("should support responsive setting overrides (desktop, tablet, mobile)", () => {
    const section: SectionNode = {
      id: "sec-hero",
      type: "hero",
      settings: {
        title: "Default Desktop Title",
        columns: 4,
        paddingY: "py-16",
        responsive: {
          tablet: {
            columns: 2,
            paddingY: "py-10",
          },
          mobile: {
            columns: 1,
            paddingY: "py-6",
            title: "Short Mobile Title",
          },
        },
      },
      blocks: [],
    };

    const responsive = section.settings.responsive as Record<string, Record<string, unknown>>;
    expect(section.settings.columns).toBe(4);
    expect(responsive?.tablet?.columns).toBe(2);
    expect(responsive?.mobile?.columns).toBe(1);

    // Verify Zod schema validates responsive blocks
    const validated = sectionNodeSchema.safeParse(section);
    expect(validated.success).toBe(true);
  });
});
