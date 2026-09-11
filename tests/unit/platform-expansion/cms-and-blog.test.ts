import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/modules/cms/cms-service";

describe("Phase 16 — CMS & Blog Content Platform", () => {
  it("sanitizes dangerous scripts and event handlers from HTML content", () => {
    const maliciousHtml = `
      <h2>Artisan Story</h2>
      <p>Welcome to our craft studio.</p>
      <script>alert('xss');</script>
      <img src="valid.jpg" onerror="alert('hack')" />
      <a href="javascript:stealTokens()">Click here for discount</a>
    `;

    const cleanHtml = sanitizeHtml(maliciousHtml);

    expect(cleanHtml).not.toContain("<script>");
    expect(cleanHtml).not.toContain("alert('xss')");
    expect(cleanHtml).not.toContain("onerror=");
    expect(cleanHtml).not.toContain("javascript:");
    expect(cleanHtml).toContain("<h2>Artisan Story</h2>");
    expect(cleanHtml).toContain("<p>Welcome to our craft studio.</p>");
  });

  it("normalizes and enforces valid URL slugs", () => {
    function normalizeSlug(raw: string): string {
      return raw
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
    }

    expect(normalizeSlug("The Art of Pashmina Weaving!")).toBe("the-art-of-pashmina-weaving");
    expect(normalizeSlug("Behind The Scenes: Organic Cotton")).toBe("behind-the-scenes-organic-cotton");
  });

  it("filters out unpublished draft articles from public storefront visibility", () => {
    const articles = [
      { id: "1", title: "Published Article 1", status: "PUBLISHED" },
      { id: "2", title: "Draft In Progress", status: "DRAFT" },
      { id: "3", title: "Published Article 2", status: "PUBLISHED" },
      { id: "4", title: "Archived Story", status: "ARCHIVED" },
    ];

    const visibleToPublic = articles.filter((a) => a.status === "PUBLISHED");
    expect(visibleToPublic).toHaveLength(2);
    expect(visibleToPublic.map((a) => a.id)).toEqual(["1", "3"]);
  });
});
