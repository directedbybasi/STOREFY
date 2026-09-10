import { z } from "zod";

export interface ResponsiveStyles {
  desktop?: Record<string, unknown>;
  tablet?: Record<string, unknown>;
  mobile?: Record<string, unknown>;
}

export interface BlockNode {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  styles?: ResponsiveStyles;
  isHidden?: boolean;
  isLocked?: boolean;
}

export interface SectionNode {
  id: string;
  type: string;
  name?: string;
  settings: Record<string, unknown>;
  blocks: BlockNode[];
  styles?: ResponsiveStyles;
  isHidden?: boolean;
  isLocked?: boolean;
  sortOrder?: number;
}

export interface PageAst {
  template: string;
  sections: SectionNode[];
}

// Zod Schemas
export const blockNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  settings: z.record(z.unknown()).default({}),
  styles: z
    .object({
      desktop: z.record(z.unknown()).optional(),
      tablet: z.record(z.unknown()).optional(),
      mobile: z.record(z.unknown()).optional(),
    })
    .optional(),
  isHidden: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

export const sectionNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().optional(),
  settings: z.record(z.unknown()).default({}),
  blocks: z.array(blockNodeSchema).default([]),
  styles: z
    .object({
      desktop: z.record(z.unknown()).optional(),
      tablet: z.record(z.unknown()).optional(),
      mobile: z.record(z.unknown()).optional(),
    })
    .optional(),
  isHidden: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const pageAstSchema = z.object({
  template: z.string().min(1),
  sections: z.array(sectionNodeSchema).default([]),
});

export interface SectionDefinition {
  type: string;
  label: string;
  category: "Basic" | "Media" | "Layout" | "Commerce" | "Marketing" | "Social" | "Business" | "Utility";
  description: string;
  defaultSettings: Record<string, unknown>;
  allowedBlocks: string[];
  defaultBlocks: Array<{ type: string; settings: Record<string, unknown> }>;
}

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  hero: {
    type: "hero",
    label: "Hero Banner",
    category: "Media",
    description: "Full-width hero section with prominent title, subtitle, and primary call-to-action.",
    defaultSettings: {
      paddingTop: "64px",
      paddingBottom: "64px",
      alignment: "center",
      backgroundColor: "",
      overlayOpacity: 20,
    },
    allowedBlocks: ["heading", "text", "button", "image"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Welcome to {{ store.name }}", level: "h1" } },
      { type: "text", settings: { text: "Discover our latest curated collection designed for quality and style." } },
      { type: "button", settings: { label: "Explore Products", url: "/products", variant: "primary" } },
    ],
  },
  image_text: {
    type: "image_text",
    label: "Image with Text",
    category: "Media",
    description: "Two-column split showcasing high-impact lifestyle imagery alongside branded copy.",
    defaultSettings: {
      imagePosition: "left",
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "text", "button", "image"],
    defaultBlocks: [
      { type: "image", settings: { url: "", alt: "Featured Lifestyle" } },
      { type: "heading", settings: { text: "Crafted With Precision", level: "h2" } },
      { type: "text", settings: { text: "Every piece in our catalog reflects meticulous attention to design and durability." } },
      { type: "button", settings: { label: "Read Our Story", url: "/pages/about", variant: "outline" } },
    ],
  },
  rich_text: {
    type: "rich_text",
    label: "Rich Text",
    category: "Basic",
    description: "Editorial statement, founder message, or brand manifesto.",
    defaultSettings: {
      alignment: "center",
      maxWidth: "800px",
      paddingTop: "40px",
      paddingBottom: "40px",
    },
    allowedBlocks: ["heading", "text", "button", "divider"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Our Brand Promise", level: "h2" } },
      { type: "text", settings: { text: "We believe in direct merchant relationships, genuine products, and trusted transactions." } },
    ],
  },
  featured_collection: {
    type: "featured_collection",
    label: "Featured Collection",
    category: "Commerce",
    description: "Highlight a curated group of trending products with direct catalog links.",
    defaultSettings: {
      collectionTitle: "Trending Items",
      columns: 4,
      limit: 4,
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "text", "button"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Featured Collection", level: "h2" } },
      { type: "text", settings: { text: "Handpicked selections popular among our verified customers." } },
    ],
  },
  product_grid: {
    type: "product_grid",
    label: "Product Grid",
    category: "Commerce",
    description: "Responsive multi-column grid displaying merchant merchandise.",
    defaultSettings: {
      columns: 4,
      showPrice: true,
      showBadge: true,
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "product", "button"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Latest Merchandise", level: "h2" } },
    ],
  },
  collection_grid: {
    type: "collection_grid",
    label: "Collection Grid",
    category: "Commerce",
    description: "Visual category tiles linking to specific product groupings.",
    defaultSettings: {
      columns: 3,
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "collection"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Shop by Category", level: "h2" } },
    ],
  },
  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    category: "Marketing",
    description: "Customer feedback quotes with 5-star ratings and verified buyer badges.",
    defaultSettings: {
      columns: 3,
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "testimonial"],
    defaultBlocks: [
      { type: "heading", settings: { text: "What Our Customers Say", level: "h2" } },
      { type: "testimonial", settings: { quote: "Superb product quality and delivered in just 2 days. Highly recommended!", author: "Aarav Sharma", rating: 5, verified: true } },
      { type: "testimonial", settings: { quote: "Very smooth Cash on Delivery checkout experience. Will buy again.", author: "Priya Nair", rating: 5, verified: true } },
      { type: "testimonial", settings: { quote: "Direct WhatsApp support assisted me with sizing before ordering. Excellent service!", author: "Rohan Patel", rating: 5, verified: true } },
    ],
  },
  faq: {
    type: "faq",
    label: "FAQ Accordion",
    category: "Business",
    description: "Frequently asked questions with expandable accordion items.",
    defaultSettings: {
      paddingTop: "40px",
      paddingBottom: "40px",
    },
    allowedBlocks: ["heading", "faq_item"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Frequently Asked Questions", level: "h2" } },
      { type: "faq_item", settings: { question: "What are the shipping timelines?", answer: "Orders are dispatched within 24-48 hours and arrive in 3-5 business days across India." } },
      { type: "faq_item", settings: { question: "Is Cash on Delivery available?", answer: "Yes, COD is available for eligible pin codes up to the store's configured maximum order limit." } },
      { type: "faq_item", settings: { question: "How can I track my order?", answer: "You will receive an SMS and email notification with direct courier tracking upon shipment." } },
    ],
  },
  logo_list: {
    type: "logo_list",
    label: "Logo List",
    category: "Marketing",
    description: "Row of partner logos, brand certifications, or press mentions.",
    defaultSettings: {
      paddingTop: "32px",
      paddingBottom: "32px",
      opacity: 80,
    },
    allowedBlocks: ["heading", "image"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Featured In & Verified By", level: "h4" } },
    ],
  },
  announcement_bar: {
    type: "announcement_bar",
    label: "Announcement Bar",
    category: "Utility",
    description: "Header banner highlighting sitewide sales, coupons, or free shipping.",
    defaultSettings: {
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      text: "Free shipping across India on all prepaid orders!",
      linkUrl: "/products",
    },
    allowedBlocks: ["text", "link"],
    defaultBlocks: [],
  },
  newsletter: {
    type: "newsletter",
    label: "Email Newsletter",
    category: "Marketing",
    description: "Lead capture section for customer discounts and launch updates.",
    defaultSettings: {
      paddingTop: "48px",
      paddingBottom: "48px",
      backgroundColor: "#f8fafc",
    },
    allowedBlocks: ["heading", "text", "button"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Stay Updated", level: "h2" } },
      { type: "text", settings: { text: "Subscribe to receive exclusive merchant discounts and seasonal drops." } },
      { type: "button", settings: { label: "Subscribe", url: "#", variant: "primary" } },
    ],
  },
  contact: {
    type: "contact",
    label: "Contact & WhatsApp",
    category: "Business",
    description: "Direct customer service module with WhatsApp connect and inquiry form.",
    defaultSettings: {
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "text", "button", "social_link"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Need Assistance?", level: "h2" } },
      { type: "text", settings: { text: "Reach out to our customer care team via WhatsApp or our contact page." } },
      { type: "button", settings: { label: "Open Contact Page", url: "/pages/contact", variant: "outline" } },
    ],
  },
  video: {
    type: "video",
    label: "Video Feature",
    category: "Media",
    description: "Embedded product demonstration or brand storytelling video.",
    defaultSettings: {
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "text"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Behind the Craft", level: "h3" } },
    ],
  },
  image_gallery: {
    type: "image_gallery",
    label: "Image Gallery",
    category: "Media",
    description: "Multi-image visual grid showcasing lookbooks or catalog styles.",
    defaultSettings: {
      columns: 3,
      paddingTop: "40px",
      paddingBottom: "40px",
    },
    allowedBlocks: ["heading", "image"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Lookbook Gallery", level: "h2" } },
    ],
  },
  promo_banner: {
    type: "promo_banner",
    label: "Promo Banner",
    category: "Marketing",
    description: "High-contrast promotional callout with coupon code.",
    defaultSettings: {
      couponCode: "WELCOME10",
      discountText: "Flat 10% Off On Your First Purchase",
      paddingTop: "32px",
      paddingBottom: "32px",
    },
    allowedBlocks: ["heading", "text", "button"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Limited Time Offer", level: "h3" } },
      { type: "text", settings: { text: "Use code WELCOME10 at checkout for instant savings." } },
    ],
  },
  countdown: {
    type: "countdown",
    label: "Flash Sale Countdown",
    category: "Marketing",
    description: "Urgency-driving countdown timer for flash sales and seasonal events.",
    defaultSettings: {
      targetHours: 24,
      paddingTop: "40px",
      paddingBottom: "40px",
    },
    allowedBlocks: ["heading", "text", "button"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Flash Sale Ending Soon", level: "h2" } },
      { type: "text", settings: { text: "Grab these exclusive discounts before the countdown concludes." } },
      { type: "button", settings: { label: "Shop Sale Now", url: "/products", variant: "primary" } },
    ],
  },
  multicolumn: {
    type: "multicolumn",
    label: "Multicolumn Features",
    category: "Layout",
    description: "3-4 column benefit cards highlighting delivery, payments, quality, and service.",
    defaultSettings: {
      columns: 4,
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "feature"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Why Choose {{ store.name }}", level: "h2" } },
      { type: "feature", settings: { title: "Fast Delivery", description: "Pan-India express order fulfillment", icon: "truck" } },
      { type: "feature", settings: { title: "Cash on Delivery", description: "Pay securely at your doorstep", icon: "banknote" } },
      { type: "feature", settings: { title: "100% Authentic", description: "Verified merchandise guarantee", icon: "shield" } },
      { type: "feature", settings: { title: "Customer Support", description: "Direct merchant care via WhatsApp", icon: "message" } },
    ],
  },
  split_content: {
    type: "split_content",
    label: "Split Content",
    category: "Layout",
    description: "Dual conversion tiles for featured collections or promotions.",
    defaultSettings: {
      paddingTop: "40px",
      paddingBottom: "40px",
    },
    allowedBlocks: ["heading", "text", "button"],
    defaultBlocks: [
      { type: "heading", settings: { text: "New Arrivals", level: "h3" } },
      { type: "text", settings: { text: "Explore the latest season's release." } },
      { type: "button", settings: { label: "Shop Arrivals", url: "/products", variant: "primary" } },
    ],
  },
  cta: {
    type: "cta",
    label: "Call to Action",
    category: "Marketing",
    description: "Full-width conversion section driving shoppers to merchandise catalog.",
    defaultSettings: {
      paddingTop: "56px",
      paddingBottom: "56px",
      backgroundColor: "#0f172a",
    },
    allowedBlocks: ["heading", "text", "button"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Ready to Upgrade Your Style?", level: "h2" } },
      { type: "text", settings: { text: "Browse our complete catalog with fast delivery and Cash on Delivery options." } },
      { type: "button", settings: { label: "Browse Catalog", url: "/products", variant: "primary" } },
    ],
  },
};

/**
 * Creates a unique fresh section node from a registered section definition.
 */
export function createSectionFromDefinition(type: string): SectionNode {
  const def = SECTION_DEFINITIONS[type] || SECTION_DEFINITIONS.hero;
  const sectionId = `${type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  const blocks: BlockNode[] = def.defaultBlocks.map((b, idx) => ({
    id: `${b.type}_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
    type: b.type,
    settings: { ...b.settings },
    isHidden: false,
    isLocked: false,
  }));

  return {
    id: sectionId,
    type: def.type,
    name: def.label,
    settings: { ...def.defaultSettings },
    blocks,
    isHidden: false,
    isLocked: false,
  };
}

/**
 * Creates a unique fresh block node.
 */
export function createBlockNode(type: string, initialSettings: Record<string, unknown> = {}): BlockNode {
  return {
    id: `${type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    settings: { ...initialSettings },
    isHidden: false,
    isLocked: false,
  };
}
