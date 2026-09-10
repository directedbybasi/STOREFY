import { describe, it, expect } from "vitest";

interface SimpleCategory {
  id: string;
  name: string;
  parentId: string | null;
}

function detectCycle(
  nodes: SimpleCategory[],
  categoryId: string,
  proposedParentId: string
): boolean {
  if (categoryId === proposedParentId) return true;

  let currentId: string | null = proposedParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === categoryId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const parent = nodes.find((n) => n.id === currentId);
    currentId = parent?.parentId || null;
  }

  return false;
}

function buildCategoryTree(nodes: SimpleCategory[]) {
  type TreeNode = SimpleCategory & { children: TreeNode[] };
  const map = new Map<string, TreeNode>();

  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }

  const roots: TreeNode[] = [];
  for (const n of nodes) {
    const item = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots;
}

describe("Hierarchical Categories (Requirement 10)", () => {
  const categories: SimpleCategory[] = [
    { id: "c1", name: "Fashion", parentId: null },
    { id: "c2", name: "Men", parentId: "c1" },
    { id: "c3", name: "Shirts", parentId: "c2" },
    { id: "c4", name: "Formal Shirts", parentId: "c3" },
    { id: "c5", name: "Home & Kitchen", parentId: null },
  ];

  it("builds correct recursive tree with nested children", () => {
    const tree = buildCategoryTree(categories);
    expect(tree).toHaveLength(2); // Fashion and Home & Kitchen
    expect(tree[0].name).toBe("Fashion");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe("Men");
    expect(tree[0].children[0].children[0].name).toBe("Shirts");
    expect(tree[0].children[0].children[0].children[0].name).toBe("Formal Shirts");
  });

  it("prevents setting self as parent", () => {
    expect(detectCycle(categories, "c1", "c1")).toBe(true);
  });

  it("detects and rejects circular loops (e.g. Setting Men's parent as Shirts)", () => {
    // If c2 (Men) sets parent as c3 (Shirts), it creates a cycle because c3's parent is already c2
    expect(detectCycle(categories, "c2", "c3")).toBe(true);
    // If c1 (Fashion) sets parent as c4 (Formal Shirts), cycle
    expect(detectCycle(categories, "c1", "c4")).toBe(true);
  });

  it("allows valid non-circular parent change", () => {
    // Setting c3 (Shirts) parent directly to c1 (Fashion) is valid
    expect(detectCycle(categories, "c3", "c1")).toBe(false);
    // Moving c4 under c5 (Home & Kitchen) is valid
    expect(detectCycle(categories, "c4", "c5")).toBe(false);
  });
});
