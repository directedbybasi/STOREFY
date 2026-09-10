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
  schemaVersion?: number;
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
  schemaVersion: z.number().default(1).optional(),
  template: z.string().min(1),
  sections: z.array(sectionNodeSchema).default([]),
});

// Block Definitions & Metadata
export interface BlockDefinition {
  type: string;
  label: string;
  category: "Content" | "Media" | "Commerce" | "Marketing" | "Layout";
  description: string;
  defaultSettings: Record<string, unknown>;
}

export const BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  heading: {
    type: "heading",
    label: "Heading",
    category: "Content",
    description: "Configurable level (H1-H4) heading text with font styling.",
    defaultSettings: { text: "Heading Title", level: "h2", alignment: "left" },
  },
  text: {
    type: "text",
    label: "Text Paragraph",
    category: "Content",
    description: "Standard body copy supporting inline typography and dynamic tokens.",
    defaultSettings: { text: "Add descriptive paragraph copy here." },
  },
  rich_text: {
    type: "rich_text",
    label: "Rich Text",
    category: "Content",
    description: "Formatted narrative with bold, italic, and multi-paragraph layout.",
    defaultSettings: { content: "Rich narrative content highlighting key store benefits." },
  },
  button: {
    type: "button",
    label: "Button",
    category: "Content",
    description: "Call-to-action button linking to catalog, collection, or custom URL.",
    defaultSettings: { label: "Click Here", url: "/products", variant: "primary" },
  },
  image: {
    type: "image",
    label: "Image",
    category: "Media",
    description: "Image component with responsive sizing and alt text.",
    defaultSettings: { url: "/placeholder-store.png", alt: "Featured Visual" },
  },
  icon: {
    type: "icon",
    label: "Icon",
    category: "Media",
    description: "Scalable vector icon highlighting trust, shipping, or features.",
    defaultSettings: { name: "sparkles", size: "24px", color: "currentColor" },
  },
  product: {
    type: "product",
    label: "Product Card",
    category: "Commerce",
    description: "Single product showcase card with price, image, and CTA.",
    defaultSettings: { productId: "", showBadge: true, showPrice: true },
  },
  collection: {
    type: "collection",
    label: "Collection Card",
    category: "Commerce",
    description: "Category discovery card with collection title and count.",
    defaultSettings: { collectionId: "", title: "Featured Category", linkUrl: "/collections" },
  },
  price: {
    type: "price",
    label: "Price Display",
    category: "Commerce",
    description: "Currency-formatted price with compare-at discount badge.",
    defaultSettings: { price: 1499, compareAtPrice: 1999, currency: "INR" },
  },
  rating: {
    type: "rating",
    label: "Star Rating",
    category: "Commerce",
    description: "5-star rating visual with review count badge.",
    defaultSettings: { rating: 5, reviewCount: 42 },
  },
  social_link: {
    type: "social_link",
    label: "Social Link",
    category: "Marketing",
    description: "Direct link chip to merchant social profile or WhatsApp.",
    defaultSettings: { platform: "instagram", url: "https://instagram.com" },
  },
  feature: {
    type: "feature",
    label: "Feature Item",
    category: "Content",
    description: "Value proposition card with icon, title, and descriptive copy.",
    defaultSettings: { title: "Fast Shipping", description: "Express delivery across India", icon: "truck" },
  },
  testimonial: {
    type: "testimonial",
    label: "Testimonial Card",
    category: "Marketing",
    description: "Customer quote with star rating and verified buyer badge.",
    defaultSettings: {
      quote: "Outstanding product quality and customer service!",
      author: "Verified Customer",
      rating: 5,
      verified: true,
    },
  },
  video: {
    type: "video",
    label: "Video Player",
    category: "Media",
    description: "Embedded video player supporting MP4 and streaming URLs.",
    defaultSettings: { videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", autoplay: false },
  },
  spacer: {
    type: "spacer",
    label: "Spacer",
    category: "Layout",
    description: "Vertical spacing block to adjust rhythm between components.",
    defaultSettings: { height: "32px" },
  },
  divider: {
    type: "divider",
    label: "Divider",
    category: "Layout",
    description: "Horizontal visual rule separating content groups.",
    defaultSettings: { color: "#e2e8f0", thickness: "1px" },
  },
  faq_item: {
    type: "faq_item",
    label: "FAQ Accordion Item",
    category: "Content",
    description: "Expandable question and answer accordion tile.",
    defaultSettings: { question: "Frequently Asked Question", answer: "Detailed answer text." },
  },
  badge: {
    type: "badge",
    label: "Trust Badge",
    category: "Marketing",
    description: "Compact trust certification pill (e.g. 100% Authentic, COD Available).",
    defaultSettings: { label: "100% Authentic", icon: "check" },
  },
};

export type SectionCategory =
  | "HERO"
  | "CONTENT"
  | "COMMERCE"
  | "TRUST"
  | "MARKETING"
  | "BUSINESS";

export interface SectionDefinition {
  type: string;
  label: string;
  category: SectionCategory;
  description: string;
  defaultSettings: Record<string, unknown>;
  allowedBlocks: string[];
  defaultBlocks: Array<{ type: string; settings: Record<string, unknown> }>;
}

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  // HERO CATEGORY
  hero: {
    type: "hero",
    label: "Hero Banner",
    category: "HERO",
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
  hero_image: {
    type: "hero_image",
    label: "Hero with Image",
    category: "HERO",
    description: "High-impact split hero highlighting a hero visual alongside branded headlines.",
    defaultSettings: {
      paddingTop: "64px",
      paddingBottom: "64px",
      imagePosition: "right",
      backgroundColor: "",
    },
    allowedBlocks: ["heading", "text", "button", "image"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Crafted for Elegance", level: "h1" } },
      { type: "text", settings: { text: "Handpicked selections created with sustainable materials." } },
      { type: "button", settings: { label: "Shop Collection", url: "/products", variant: "primary" } },
      { type: "image", settings: { url: "/placeholder-store.png", alt: "Hero Visual" } },
    ],
  },
  hero_video: {
    type: "hero_video",
    label: "Hero with Video",
    category: "HERO",
    description: "Immersive hero section featuring background or interactive video.",
    defaultSettings: {
      paddingTop: "72px",
      paddingBottom: "72px",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      backgroundColor: "#0f172a",
    },
    allowedBlocks: ["heading", "text", "button", "video"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Experience the Craft", level: "h1" } },
      { type: "text", settings: { text: "Watch how our products are designed and delivered to your doorstep." } },
      { type: "button", settings: { label: "Discover More", url: "/products", variant: "primary" } },
    ],
  },

  // CONTENT CATEGORY
  rich_text: {
    type: "rich_text",
    label: "Rich Text",
    category: "CONTENT",
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
  image_text: {
    type: "image_text",
    label: "Image + Text",
    category: "CONTENT",
    description: "Two-column split showcasing high-impact lifestyle imagery alongside branded copy.",
    defaultSettings: {
      imagePosition: "left",
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "text", "button", "image"],
    defaultBlocks: [
      { type: "image", settings: { url: "/placeholder-store.png", alt: "Featured Lifestyle" } },
      { type: "heading", settings: { text: "Crafted With Precision", level: "h2" } },
      { type: "text", settings: { text: "Every piece in our catalog reflects meticulous attention to design and durability." } },
      { type: "button", settings: { label: "Read Our Story", url: "/pages/about", variant: "outline" } },
    ],
  },
  feature_grid: {
    type: "feature_grid",
    label: "Feature Grid",
    category: "CONTENT",
    description: "Multi-column feature cards highlighting merchant delivery, quality, and service guarantees.",
    defaultSettings: {
      columns: 4,
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "feature"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Why Shop With Us", level: "h2" } },
      { type: "feature", settings: { title: "Express Delivery", description: "Quick pan-India order delivery", icon: "truck" } },
      { type: "feature", settings: { title: "Cash on Delivery", description: "Pay securely at your doorstep", icon: "banknote" } },
      { type: "feature", settings: { title: "100% Authentic", description: "Original brand-verified merchandise", icon: "shield" } },
      { type: "feature", settings: { title: "WhatsApp Support", description: "Instant customer support on chat", icon: "message" } },
    ],
  },
  multicolumn: {
    type: "multicolumn",
    label: "Multicolumn Features",
    category: "CONTENT",
    description: "Multi-column feature cards highlighting merchant delivery, quality, and service guarantees.",
    defaultSettings: {
      columns: 4,
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "feature"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Why Shop With Us", level: "h2" } },
      { type: "feature", settings: { title: "Express Delivery", description: "Quick pan-India order delivery", icon: "truck" } },
      { type: "feature", settings: { title: "Cash on Delivery", description: "Pay securely at your doorstep", icon: "banknote" } },
      { type: "feature", settings: { title: "100% Authentic", description: "Original brand-verified merchandise", icon: "shield" } },
      { type: "feature", settings: { title: "WhatsApp Support", description: "Instant customer support on chat", icon: "message" } },
    ],
  },
  image_gallery: {
    type: "image_gallery",
    label: "Image Gallery",
    category: "CONTENT",
    description: "Multi-image curated product or brand showcase gallery.",
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

  // COMMERCE CATEGORY
  product_grid: {
    type: "product_grid",
    label: "Product Grid",
    category: "COMMERCE",
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
  featured_collection: {
    type: "featured_collection",
    label: "Featured Collection",
    category: "COMMERCE",
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
  collection_grid: {
    type: "collection_grid",
    label: "Collection Grid",
    category: "COMMERCE",
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

  // TRUST CATEGORY
  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    category: "TRUST",
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
  trust_badges: {
    type: "trust_badges",
    label: "Trust Badges",
    category: "TRUST",
    description: "Ribbon of security, payment, and authentic guarantee badges.",
    defaultSettings: {
      paddingTop: "24px",
      paddingBottom: "24px",
      backgroundColor: "#f8fafc",
    },
    allowedBlocks: ["badge", "heading"],
    defaultBlocks: [
      { type: "badge", settings: { label: "100% Genuine Products" } },
      { type: "badge", settings: { label: "Safe & Encrypted Payments" } },
      { type: "badge", settings: { label: "Easy 7-Day Returns" } },
      { type: "badge", settings: { label: "Pan-India Free Shipping" } },
    ],
  },
  reviews: {
    type: "reviews",
    label: "Customer Reviews",
    category: "TRUST",
    description: "Aggregate score summary with highlighted customer reviews.",
    defaultSettings: {
      averageRating: "4.9",
      totalReviews: "1,250+",
      paddingTop: "48px",
      paddingBottom: "48px",
    },
    allowedBlocks: ["heading", "rating", "testimonial"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Verified Store Ratings", level: "h2" } },
      { type: "rating", settings: { rating: 5, reviewCount: 1250 } },
    ],
  },

  // MARKETING CATEGORY
  announcement_bar: {
    type: "announcement_bar",
    label: "Announcement Bar",
    category: "MARKETING",
    description: "Header notification strip highlighting sales, discounts, or alerts.",
    defaultSettings: {
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      text: "Free shipping across India on all prepaid orders!",
      linkUrl: "/products",
    },
    allowedBlocks: ["text", "button"],
    defaultBlocks: [],
  },
  promo_banner: {
    type: "promo_banner",
    label: "Promo Banner",
    category: "MARKETING",
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
    label: "Countdown Timer",
    category: "MARKETING",
    description: "Urgency countdown timer for flash sales and limited drops.",
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
  newsletter: {
    type: "newsletter",
    label: "Newsletter",
    category: "MARKETING",
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
  cta: {
    type: "cta",
    label: "Call to Action",
    category: "MARKETING",
    description: "Full-width conversion banner driving shoppers into the catalog.",
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

  // BUSINESS CATEGORY
  contact: {
    type: "contact",
    label: "Contact",
    category: "BUSINESS",
    description: "Customer service module with contact info, WhatsApp connect, and hours.",
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
  faq: {
    type: "faq",
    label: "FAQ",
    category: "BUSINESS",
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
    category: "BUSINESS",
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
  social_links: {
    type: "social_links",
    label: "Social Links",
    category: "BUSINESS",
    description: "Interactive social media chips and brand channel links.",
    defaultSettings: {
      paddingTop: "32px",
      paddingBottom: "32px",
      alignment: "center",
    },
    allowedBlocks: ["heading", "social_link"],
    defaultBlocks: [
      { type: "heading", settings: { text: "Follow Our Journey", level: "h3" } },
      { type: "social_link", settings: { platform: "instagram", url: "https://instagram.com" } },
      { type: "social_link", settings: { platform: "whatsapp", url: "https://wa.me" } },
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
  const def = BLOCK_DEFINITIONS[type];
  const mergedSettings = {
    ...(def?.defaultSettings || {}),
    ...initialSettings,
  };

  return {
    id: `${type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    settings: mergedSettings,
    isHidden: false,
    isLocked: false,
  };
}
