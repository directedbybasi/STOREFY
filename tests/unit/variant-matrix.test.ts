import { describe, it, expect } from "vitest";

interface OptionDimension {
  name: string;
  values: string[];
}

function generateCartesianMatrix(
  options: OptionDimension[],
  basePriceRupees: number,
  baseSku?: string
) {
  const validOptions = options.filter(
    (opt) => opt.name.trim() && opt.values.filter((v) => v.trim()).length > 0
  );

  if (validOptions.length === 0) {
    return [];
  }

  const opt1 = validOptions[0]?.values.map((v) => v.trim()).filter(Boolean) || [];
  const opt2 = validOptions[1]?.values.map((v) => v.trim()).filter(Boolean) || [undefined];
  const opt3 = validOptions[2]?.values.map((v) => v.trim()).filter(Boolean) || [undefined];

  const variants: Array<{
    title: string;
    option1?: string;
    option2?: string;
    option3?: string;
    sku?: string;
    priceRupees: number;
    isActive: boolean;
  }> = [];

  const seen = new Set<string>();

  for (const v1 of opt1) {
    for (const v2 of opt2) {
      for (const v3 of opt3) {
        const parts = [v1, v2, v3].filter(Boolean) as string[];
        const title = parts.join(" / ");
        const key = parts.map((p) => p.toLowerCase()).join("|");

        if (seen.has(key)) continue;
        seen.add(key);

        let sku: string | undefined = undefined;
        if (baseSku) {
          const suffix = parts.map((p) => p.toUpperCase().slice(0, 3)).join("-");
          sku = `${baseSku}-${suffix}`;
        }

        variants.push({
          title,
          option1: v1,
          option2: v2,
          option3: v3,
          sku,
          priceRupees: basePriceRupees,
          isActive: true,
        });
      }
    }
  }

  return variants;
}

describe("Variant Matrix Generation (Requirement 4)", () => {
  it("generates correct 2x3 variant combinations (6 total)", () => {
    const dimensions: OptionDimension[] = [
      { name: "Color", values: ["Black", "White"] },
      { name: "Size", values: ["S", "M", "L"] },
    ];

    const matrix = generateCartesianMatrix(dimensions, 999, "TSH");
    expect(matrix).toHaveLength(6);
    expect(matrix.map((m) => m.title)).toEqual([
      "Black / S",
      "Black / M",
      "Black / L",
      "White / S",
      "White / M",
      "White / L",
    ]);
    expect(matrix[0].sku).toBe("TSH-BLA-S");
  });

  it("handles single dimension options (e.g. Size only)", () => {
    const dimensions: OptionDimension[] = [{ name: "Size", values: ["S", "M", "XL"] }];
    const matrix = generateCartesianMatrix(dimensions, 499);
    expect(matrix).toHaveLength(3);
    expect(matrix[0].title).toBe("S");
  });

  it("prevents duplicate combinations", () => {
    const dimensions: OptionDimension[] = [
      { name: "Color", values: ["Black", "Black", "white"] },
    ];
    const matrix = generateCartesianMatrix(dimensions, 499);
    expect(matrix).toHaveLength(2);
  });
});
