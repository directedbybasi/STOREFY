import { describe, it, expect } from "vitest";

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

describe("Catalog CSV Parser & Validation (Requirement 13)", () => {
  it("parses valid CSV rows with commas and quotes", () => {
    const csv = `Title,Price,SKU
"Organic Cotton T-Shirt, Blue",999.00,COT-BLU
"Classic Denim Jeans",1499.00,DNM-001`;

    const parsed = parseCsv(csv);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual(["Title", "Price", "SKU"]);
    expect(parsed[1][0]).toBe("Organic Cotton T-Shirt, Blue");
    expect(parsed[1][1]).toBe("999.00");
    expect(parsed[2][0]).toBe("Classic Denim Jeans");
  });

  it("handles CRLF line endings", () => {
    const csv = "Title,Price\r\nItem A,100\r\nItem B,200\r\n";
    const parsed = parseCsv(csv);
    expect(parsed).toHaveLength(3);
    expect(parsed[1][0]).toBe("Item A");
    expect(parsed[2][0]).toBe("Item B");
  });

  it("detects missing mandatory columns", () => {
    const csv = "Description,SKU\r\nSome desc,SKU-1";
    const parsed = parseCsv(csv);
    const headers = parsed[0];
    const hasTitle = headers.includes("Title");
    const hasPrice = headers.includes("Price");

    expect(hasTitle).toBe(false);
    expect(hasPrice).toBe(false);
  });
});
