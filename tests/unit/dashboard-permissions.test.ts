import { describe, it, expect } from "vitest";
import { ROLE_PERMISSION_MATRIX } from "@/database/seeds/rbac-seed";
import { hasPermission } from "@/core/tenant/rbac";

interface NavItem {
  title: string;
  href: string;
  permission?: string;
}

const SIDEBAR_ITEMS: NavItem[] = [
  { title: "Overview", href: "/dashboard" },
  { title: "Products", href: "/dashboard/products", permission: "catalog:read" },
  { title: "Orders", href: "/dashboard/orders", permission: "orders:read" },
  { title: "Customers", href: "/dashboard/customers", permission: "customers:read" },
  { title: "Analytics", href: "/dashboard/analytics", permission: "analytics:view" },
  { title: "Marketing", href: "/dashboard/marketing", permission: "marketing:read" },
  { title: "Store Settings", href: "/dashboard/settings", permission: "settings:read" },
  { title: "Custom Domains", href: "/dashboard/settings/domains", permission: "domains:manage" },
  { title: "Staff & RBAC", href: "/dashboard/settings/staff", permission: "staff:read" },
];

function filterNavItems(
  items: NavItem[],
  roleName: string,
  isPlatformAdmin = false
): NavItem[] {
  const rolePerms = ROLE_PERMISSION_MATRIX[roleName] || [];
  const isOwner = roleName === "OWNER";

  return items.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(rolePerms, item.permission, isOwner, isPlatformAdmin);
  });
}

describe("Dashboard Permission-Aware Navigation & Presentation", () => {
  it("OWNER sees all 9 navigation items", () => {
    const visible = filterNavItems(SIDEBAR_ITEMS, "OWNER");
    expect(visible.length).toBe(9);
  });

  it("ADMIN sees all items", () => {
    const visible = filterNavItems(SIDEBAR_ITEMS, "ADMIN");
    expect(visible.length).toBe(9);
  });

  it("SUPPORT only sees Overview, Products (read), Orders (read), and Customers (read)", () => {
    const visible = filterNavItems(SIDEBAR_ITEMS, "SUPPORT");
    const titles = visible.map((i) => i.title);

    expect(titles).toContain("Overview");
    expect(titles).toContain("Products");
    expect(titles).toContain("Orders");
    expect(titles).toContain("Customers");

    // Must NOT see Settings, Domains, Staff, Marketing, Analytics
    expect(titles).not.toContain("Store Settings");
    expect(titles).not.toContain("Custom Domains");
    expect(titles).not.toContain("Staff & RBAC");
    expect(titles).not.toContain("Marketing");
    expect(titles).not.toContain("Analytics");
    expect(visible.length).toBe(4);
  });

  it("PRODUCT_MANAGER cannot see Orders or Store Settings", () => {
    const visible = filterNavItems(SIDEBAR_ITEMS, "PRODUCT_MANAGER");
    const titles = visible.map((i) => i.title);

    expect(titles).toContain("Overview");
    expect(titles).toContain("Products");

    expect(titles).not.toContain("Orders");
    expect(titles).not.toContain("Store Settings");
    expect(titles).not.toContain("Custom Domains");
    expect(titles).not.toContain("Staff & RBAC");
  });

  it("ORDER_MANAGER cannot see Products or Marketing", () => {
    const visible = filterNavItems(SIDEBAR_ITEMS, "ORDER_MANAGER");
    const titles = visible.map((i) => i.title);

    expect(titles).toContain("Overview");
    expect(titles).toContain("Orders");
    expect(titles).toContain("Customers");

    expect(titles).not.toContain("Products");
    expect(titles).not.toContain("Marketing");
    expect(titles).not.toContain("Store Settings");
  });

  it("Platform SuperAdmin sees all navigation items regardless of role", () => {
    const visible = filterNavItems(SIDEBAR_ITEMS, "SUPPORT", true);
    expect(visible.length).toBe(9);
  });
});
