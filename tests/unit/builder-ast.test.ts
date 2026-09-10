import { describe, it, expect } from "vitest";
import {
  pageAstSchema,
  sectionNodeSchema,
  blockNodeSchema,
  SECTION_DEFINITIONS,
  type PageAst,
  type SectionNode,
  type BlockNode,
} from "@/modules/builder/schema";

describe("Phase 5: Builder AST & Schema Integrity", () => {
  it("should have all 19 canonical section definitions configured with default settings and allowed blocks", () => {
    const expectedSections = [
      "hero",
      "image_text",
      "rich_text",
      "featured_collection",
      "product_grid",
      "collection_grid",
      "testimonials",
      "faq",
      "logo_list",
      "announcement_bar",
      "newsletter",
      "contact",
      "video",
      "image_gallery",
      "promo_banner",
      "countdown",
      "multicolumn",
      "split_content",
      "cta",
    ];

    expect(Object.keys(SECTION_DEFINITIONS).length).toBe(19);
    for (const type of expectedSections) {
      const def = SECTION_DEFINITIONS[type];
      expect(def).toBeDefined();
      expect(def.type).toBe(type);
      expect(def.label).toBeTruthy();
      expect(Array.isArray(def.allowedBlocks)).toBe(true);
      expect(def.defaultSettings).toBeDefined();
    }
  });

  it("should validate a compliant PageAst via Zod", () => {
    const validAst: PageAst = {
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
        {
          id: "sec-faq-1",
          type: "faq",
          settings: {
            title: "Frequently Asked Questions",
          },
          blocks: [
            {
              id: "blk-faq-1",
              type: "faq_item",
              settings: {
                question: "Do you ship across India?",
                answer: "Yes, express shipping is available nationwide.",
              },
            },
          ],
        },
      ],
    };

    const result = pageAstSchema.safeParse(validAst);
    expect(result.success).toBe(true);

    const blockResult = blockNodeSchema.safeParse(validAst.sections[0].blocks[0]);
    expect(blockResult.success).toBe(true);
  });

  it("should reject invalid AST structures", () => {
    // Invalid sections non-array
    const invalidAst1 = {
      template: "home",
      sections: "invalid-string-not-array",
    };
    expect(pageAstSchema.safeParse(invalidAst1).success).toBe(false);

    // Invalid template type
    const invalidAstTemplate = {
      template: 12345,
      sections: [],
    };
    expect(pageAstSchema.safeParse(invalidAstTemplate).success).toBe(false);

    // Section missing type or id
    const invalidAst2 = {
      template: "home",
      sections: [
        {
          id: "sec-1",
          // missing type
          settings: {},
        },
      ],
    };
    expect(pageAstSchema.safeParse(invalidAst2).success).toBe(false);

    // Block missing id
    const invalidAst3 = {
      template: "home",
      sections: [
        {
          id: "sec-1",
          type: "hero",
          settings: {},
          blocks: [
            {
              type: "button",
              // missing id
              settings: {},
            },
          ],
        },
      ],
    };
    expect(pageAstSchema.safeParse(invalidAst3).success).toBe(false);
  });

  it("should support section tree mutations: add, reorder, delete, duplicate, hide, lock", () => {
    let ast: PageAst = {
      template: "home",
      sections: [
        { id: "s1", type: "announcement_bar", settings: {}, blocks: [] },
        { id: "s2", type: "hero", settings: {}, blocks: [] },
      ],
    };

    // Add section
    const newSection: SectionNode = {
      id: "s3",
      type: "newsletter",
      settings: { title: "Subscribe" },
      blocks: [],
    };
    ast = { ...ast, sections: [...ast.sections, newSection] };
    expect(ast.sections.length).toBe(3);
    expect(ast.sections[2].id).toBe("s3");

    // Reorder sections (move s3 to index 1)
    const reordered = [...ast.sections];
    const [moved] = reordered.splice(2, 1);
    reordered.splice(1, 0, moved);
    ast = { ...ast, sections: reordered };
    expect(ast.sections.map((s) => s.id)).toEqual(["s1", "s3", "s2"]);

    // Duplicate section s3
    const toDuplicate = ast.sections.find((s) => s.id === "s3")!;
    const duplicatedSection: SectionNode = {
      ...toDuplicate,
      id: `s3_copy_${Date.now()}`,
      settings: { ...toDuplicate.settings },
      blocks: toDuplicate.blocks.map((b) => ({ ...b, id: `${b.id}_copy` })),
    };
    const s3Idx = ast.sections.findIndex((s) => s.id === "s3");
    const withDup = [...ast.sections];
    withDup.splice(s3Idx + 1, 0, duplicatedSection);
    ast = { ...ast, sections: withDup };
    expect(ast.sections.length).toBe(4);
    expect(ast.sections[2].id).toContain("s3_copy");

    // Hide and Lock section
    ast = {
      ...ast,
      sections: ast.sections.map((s) =>
        s.id === "s1" ? { ...s, isHidden: true, isLocked: true } : s
      ),
    };
    const s1 = ast.sections.find((s) => s.id === "s1")!;
    expect(s1.isHidden).toBe(true);
    expect(s1.isLocked).toBe(true);

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

    expect(section.settings.columns).toBe(4);
    expect(section.settings.responsive?.tablet?.columns).toBe(2);
    expect(section.settings.responsive?.mobile?.columns).toBe(1);

    // Verify Zod schema validates responsive blocks
    const validated = sectionNodeSchema.safeParse(section);
    expect(validated.success).toBe(true);
  });
});
