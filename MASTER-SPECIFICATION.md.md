# MASTER INSTRUCTION — FULL E-COMMERCE SaaS PLATFORM

You are the principal software architect and senior full-stack engineering agent for this project.

Build a complete, production-grade, multi-tenant e-commerce SaaS platform.

This is NOT an MVP.
This is NOT a prototype.
This is NOT a demo.
Do not intentionally simplify the platform to reduce implementation effort.

The objective is to build a fully functional platform comparable in breadth to a modern Shopify-style commerce platform, while using our own architecture, UI, code, branding, and implementation.

## 1. SOURCE OF TRUTH

This file is the master specification for the entire platform.

Before creating or modifying application code:

1. Read this entire specification.
2. Understand the architecture and dependencies.
3. Determine which phase/sub-phase is currently being implemented.
4. Implement only the requested phase/sub-phase, but design it so it integrates correctly with the complete architecture.
5. Never remove a previously implemented feature because it appears inconvenient.
6. Never replace a required feature with a fake UI.
7. Never create a button that has no real implementation unless it is explicitly marked as a future feature.
8. Never use mock functionality where real functionality is required.
9. Never hardcode values that should be configurable through the database or configuration system.
10. Never change the business model without explicit instruction.

The specification must evolve through controlled updates.

---

# 2. PRODUCT VISION

The platform allows merchants to create and operate online stores from one SaaS dashboard.

The platform supports three selling models:

1. Normal E-commerce
2. Platform Dropshipping
3. Meesho Reselling

All three operate through one SaaS platform, one merchant account system, one storefront architecture, one commerce engine, and one dashboard ecosystem.

---

# 3. BUSINESS MODEL

Plans:

STARTER
₹199/month

BUSINESS
₹599/month

Launch offer:

First month = ₹50

There is NO free plan.

There is NO platform transaction fee.

The platform is NOT:

- the merchant's inventory owner
- a shipping provider
- a warehouse
- a product seller taking product margin

Core platform revenue is subscription revenue.

Do not introduce transaction commissions, shipping commissions, or product margins unless explicitly specified later.

---

# 4. NORMAL E-COMMERCE

A merchant may sell products from their own inventory.

Flow:

Merchant
→ Creates Store
→ Adds Products
→ Publishes Store
→ Customer Visits Store
→ Customer Orders
→ Merchant Receives Order
→ Merchant Fulfills
→ Merchant Ships
→ Customer Receives Product

The merchant controls:

- products
- inventory
- pricing
- customers
- orders
- payment provider
- shipping method
- store design
- marketing
- analytics

---

# 5. PLATFORM DROPSHIPPING

The platform provides an internal supplier ecosystem.

Two main roles:

## Supplier

The supplier:

- owns inventory
- creates supplier products
- sets supplier price
- manages inventory
- receives orders
- packs orders
- ships orders
- provides tracking
- manages fulfillment
- handles applicable returns/RTO

## Reseller

The reseller:

- browses platform supplier products
- imports products
- modifies product information
- sets selling price
- publishes products
- sells to their customers

Example:

Supplier Price = ₹300
Reseller Selling Price = ₹599
Gross Difference = ₹299

The platform does not own the product inventory.

Order flow:

Customer
→ Reseller Store
→ Reseller Order
→ Platform Order Routing
→ Supplier
→ Supplier Fulfillment
→ Shipment
→ Customer

Supplier information must not be unnecessarily exposed to end customers.

Keep the following concepts separate:

product_source
fulfillment_type
supplier_id
supplier_product_id

Supported fulfillment types:

MERCHANT
PLATFORM_DROPSHIP
MEESHO_RESELLING

Supported product sources:

MERCHANT
PLATFORM_SUPPLIER
MEESHO

---

# 6. MEESHO RESELLING

Build a dedicated Meesho product source/import architecture.

The seller may enter:

- Meesho product URL
- Meesho product ID/code

The system should normalize available product information into the platform's internal product model.

Potential imported information:

- title
- description
- images
- gallery
- price
- ratings
- reviews
- category
- variants
- specifications
- availability
- source product ID

Importer flow:

Meesho Source
→ Product Retrieval
→ Product Normalization
→ Preview
→ Seller Editing
→ Profit Calculation
→ Import
→ Merchant Store

The implementation must isolate Meesho-specific logic behind a replaceable adapter/interface.

Do not spread Meesho-specific code throughout the commerce engine.

The system must support replacing the underlying source adapter later.

Meesho order workflow initially:

Customer orders reseller store
→ Seller receives order
→ Seller places corresponding order through the permitted Meesho workflow
→ Seller updates order/tracking

Do not make unauthorized access-control bypasses or anti-bot circumvention part of the architecture.

---

# 7. PROFIT CALCULATOR

Support:

Selling Price
− Product Cost
− Payment Fee
− Advertising Cost
− Discount
− Other Costs
=

Estimated Profit

The calculator must be configurable and reusable.

Do not hardcode a single fee structure.

---

# 8. WEBSITE BUILDER

The platform must contain a powerful visual storefront builder.

Architecture:

Theme
→ Template
→ Page
→ Section
→ Container
→ Block
→ Element
→ Dynamic Data Binding

Do not implement the builder as a collection of hardcoded pages.

The builder must be schema-driven.

The merchant must be able to visually construct and customize storefronts.

Required operations:

- drag
- drop
- reorder
- move
- resize
- duplicate
- copy
- paste
- delete
- nest
- multi-select
- lock
- hide
- rename
- undo
- redo
- history
- preview
- publish
- rollback

Builder layout:

Top toolbar
Left panel
Canvas
Right settings panel

Left panel should support:

- Elements
- Sections
- Templates
- Pages
- Layers
- Media
- Products
- Collections
- Dynamic Data

Right panel should support:

- content
- layout
- typography
- colors
- background
- border
- radius
- shadow
- spacing
- responsive controls
- animation
- visibility
- advanced settings

---

# 9. BUILDER ELEMENTS

Basic:

- Heading
- Text
- Rich Text
- Button
- Link
- Icon
- Divider
- Spacer

Media:

- Image
- Image Gallery
- Video
- Video Background
- Image Comparison
- Slider
- Carousel

Layout:

- Container
- Row
- Column
- Grid
- Stack
- Flex

Commerce:

- Product
- Product Grid
- Product Carousel
- Collection
- Collection Grid
- Price
- Compare-at Price
- Rating
- Reviews
- Product Options
- Variant Selector
- Quantity Selector
- Add to Cart
- Buy Now
- Wishlist
- Cart
- Search
- Filters
- Sort
- Pagination

Marketing:

- Announcement Bar
- Countdown
- Coupon
- Sale Banner
- Promo Banner
- Newsletter
- Testimonials
- Trust Badges
- Feature Cards
- Logo Carousel

Social:

- Instagram
- Facebook
- YouTube
- Social Icons

Business:

- Contact
- Phone
- Email
- Address
- Opening Hours
- Map
- Contact Form
- WhatsApp

---

# 10. BUILDER SECTIONS

Hero:

- image hero
- video hero
- split hero
- full-screen hero
- product hero
- CTA hero

Products:

- featured products
- best sellers
- new arrivals
- trending
- sale
- recommended
- recently viewed

Categories:

- category grid
- category carousel
- shop by category

Marketing:

- sale banner
- flash sale
- countdown
- coupon
- promotion

Brand:

- about
- brand story
- mission
- why choose us

Trust:

- reviews
- testimonials
- trust badges
- secure payment
- delivery promise

Content:

- FAQ
- blog
- rich text
- image/text
- video/text

Contact:

- contact form
- WhatsApp
- phone
- email
- map

Footer:

- multi-column
- newsletter
- social
- contact

---

# 11. DYNAMIC DATA BINDING

Builder elements must support dynamic database values.

Examples:

Product.title
Product.description
Product.images
Product.price
Product.compareAtPrice
Product.rating
Product.reviews
Product.variants
Product.inventory
Product.sku

Collection.title
Collection.description
Collection.products

Store.name
Store.logo
Store.favicon
Store.contact
Store.address

Dynamic bindings must be implemented through a safe schema rather than arbitrary database queries from the browser.

---

# 12. RESPONSIVE DESIGN

Support:

Desktop
Tablet
Mobile

Applicable properties should support responsive values:

- width
- height
- margin
- padding
- font size
- alignment
- display
- position
- visibility

Allow device-specific hiding/showing.

---

# 13. THEME SYSTEM

Global theme settings:

Colors:

- primary
- secondary
- accent
- background
- surface
- text
- muted
- border
- success
- warning
- error

Typography:

- heading font
- body font
- button font
- heading sizes
- body sizes
- weights
- line heights
- letter spacing

Global components:

- buttons
- cards
- inputs
- product cards
- forms
- navigation
- footer

Global styling:

- spacing
- radius
- shadows
- borders

Changing global theme values should propagate consistently across applicable storefront components.

---

# 14. TEMPLATE SYSTEM

Templates must be data-independent.

Required template categories include:

- Fashion
- Beauty
- Electronics
- Home
- Food
- Agriculture
- Jewelry
- General
- One Product
- Multi Product
- Dropshipping

Support:

- template duplication
- template editing
- template preview
- draft versions
- published versions
- rollback
- theme version history

Changing a template must never delete:

- products
- orders
- customers
- inventory

---

# 15. STOREFRONT

Every store requires:

- homepage
- product pages
- collection/category pages
- cart
- checkout
- search
- custom pages
- about
- contact
- FAQ
- policies
- 404
- navigation
- footer

Storefront must be responsive.

Support:

- store subdomains
- custom domains
- primary domain
- SSL
- domain verification
- redirects

---

# 16. PRODUCTS

Product fields:

- title
- description
- short description
- product type
- vendor
- brand
- category
- collections
- tags
- price
- compare-at price
- cost
- tax category
- SKU
- barcode
- inventory tracking
- inventory quantity
- low stock threshold
- continue selling when out of stock
- physical/digital
- weight
- dimensions
- shipping category
- images
- video
- alt text
- variants
- SEO title
- SEO description
- slug
- canonical
- social image
- metafields
- custom attributes
- related products
- upsells
- cross-sells

Actions:

- create
- edit
- delete
- publish
- unpublish
- duplicate
- import
- export
- bulk update

---

# 17. VARIANTS

Variants must support multiple options.

Examples:

Color
Size
Material

Each variant can have:

- SKU
- barcode
- price
- compare-at price
- inventory
- image
- weight

---

# 18. CATEGORIES

Support:

- unlimited hierarchy
- subcategories
- parent category
- image
- description
- SEO
- URL/slug
- featured
- ordering

A product may have a primary category and belong to multiple collections.

---

# 19. INVENTORY

Inventory concepts:

- on hand
- reserved
- available
- incoming

Build:

- stock adjustments
- inventory movements
- history
- low-stock alerts
- out-of-stock handling
- backorders

Design the data model so multiple inventory locations can be added later.

---

# 20. CUSTOMERS

Customer profiles:

- name
- email
- phone
- addresses
- orders
- total spending
- last order
- history

Optional segmentation:

- new
- returning
- high value
- inactive

---

# 21. CART

Support:

- add item
- remove item
- update quantity
- variant selection
- subtotal
- discounts
- tax
- shipping
- final total

Cart must validate product availability and pricing server-side.

---

# 22. CHECKOUT

Checkout flow:

Contact
→ Address
→ Shipping
→ Payment
→ Review
→ Order
→ Thank You

Support:

- guest checkout
- customer accounts
- email
- phone
- shipping address
- billing address
- coupon
- discounts
- taxes
- COD
- online payment
- terms acceptance
- confirmation

Checkout must be an independent commerce subsystem and must not depend entirely on theme-builder components.

---

# 23. ORDERS

Statuses:

- pending
- confirmed
- processing
- packed
- shipped
- delivered
- cancelled
- return requested
- returned
- refunded
- RTO

Order data:

- order ID
- customer
- items
- variants
- quantity
- price
- discounts
- taxes
- payment
- shipping address
- fulfillment type
- tracking
- notes
- internal notes
- timeline

---

# 24. RETURNS AND REFUNDS

Support:

- return request
- approve
- reject
- return status
- cancellation
- refund
- partial refund
- return reason
- RTO

All monetary operations must be auditable.

---

# 25. INVOICES

Generate invoices containing applicable:

- seller information
- customer information
- order information
- products
- prices
- discounts
- taxes

Support:

- view
- print
- PDF

---

# 26. PAYMENTS

The platform does NOT charge transaction fees.

Merchants connect their own payment provider.

Use a provider abstraction.

Possible provider adapters:

- Razorpay
- Cashfree
- PayU
- other compatible providers

Do not tightly couple business logic to one payment provider.

Support:

- provider connection
- secure credential handling
- payment creation
- verification
- webhook handling
- payment status
- failed payment handling
- refunds

Never trust frontend payment success without server-side verification.

Payment secrets must remain server-side.

---

# 27. SHIPPING

Shipping is an independent subsystem.

The platform is NOT itself a shipping provider.

Merchants may use supported shipping integrations.

Architecture:

Shipping Provider Interface
→ Provider Adapters

Support where providers allow:

- shipping methods
- shipping zones
- rates
- shipment creation
- tracking
- shipment status
- labels

Do not add shipping commissions.

---

# 28. MARKETING

Support:

- coupons
- percentage discounts
- fixed discounts
- minimum order conditions
- product restrictions
- category restrictions
- expiration
- usage limits
- customer restrictions
- automatic discounts
- free shipping promotions
- Buy X Get Y
- flash sales
- promotional banners
- countdowns
- newsletters

---

# 29. REVIEWS

Support:

- rating
- text review
- moderation
- approval status
- product review display

---

# 30. SEO

Support:

- SEO title
- meta description
- URL/slug
- canonical
- sitemap
- robots.txt
- Open Graph
- product structured data
- breadcrumb structured data
- organization structured data
- image alt text

---

# 31. ANALYTICS

Track:

- revenue
- sales
- orders
- customers
- visitors
- product views
- add to carts
- checkout
- purchases
- conversion rate
- average order value
- best sellers
- returns
- refunds
- cancellations
- COD vs online
- traffic source
- location-based sales
- profit

Funnel:

Visitor
→ Product View
→ Add to Cart
→ Checkout
→ Purchase

Use an event-based analytics architecture.

---

# 32. WHATSAPP

Only click-to-chat functionality is required.

## Order button

Merchant enters their WhatsApp number.

Product page can display:

Order on WhatsApp

Clicking opens WhatsApp with a prefilled message.

The customer manually sends the message.

Do NOT:

- automatically send WhatsApp messages
- create WhatsApp orders automatically
- use WhatsApp Business API for this feature

## Support

Merchant can also enable:

Chat on WhatsApp

Again, the customer manually initiates the conversation.

---

# 33. AI PRODUCT TOOLS

Exactly seven AI tools:

1. AI Product Title
2. AI Product Description
3. AI SEO Description
4. AI Product Features
5. AI Product Specifications
6. AI Product Tags
7. AI Category Suggestion

Architecture:

Merchant
→ AI Tool
→ Backend AI Service
→ AI Provider
→ Generated Output
→ Merchant Review
→ Save

Never automatically publish AI-generated information.

AI specifications must not invent unsupported facts.

Track:

- generation history
- usage
- errors
- retries
- provider
- token/cost metadata where available
- plan limits

API keys remain server-side.

---

# 34. SUBSCRIPTIONS

Plans:

STARTER = ₹199/month
BUSINESS = ₹599/month

Launch month:

₹50

Build:

- plan records
- feature entitlements
- plan limits
- merchant subscriptions
- subscription events
- renewal
- upgrade
- downgrade
- cancellation
- failed payment
- billing history

Do not hardcode plan limits into unrelated modules.

---

# 35. STAFF AND PERMISSIONS

Roles:

- owner
- admin
- manager
- product manager
- order manager
- marketing manager
- support

Build module-level permissions.

A staff member must only access resources permitted by their role.

---

# 36. ADMIN PANEL

Platform administrators require:

Users
Stores
Products
Suppliers
Orders
Subscriptions
Payments
AI usage
Platform analytics
Audit logs

Admin actions include applicable:

- view
- search
- filter
- inspect
- activate
- suspend
- manage

Use strict authorization.

---

# 37. MULTI-TENANCY

This is a multi-tenant SaaS.

All merchant-owned records must have appropriate tenant ownership identifiers.

At minimum design around:

organization_id
store_id

Tenant isolation is mandatory.

Merchant A must never access Merchant B data.

Tenant isolation applies to:

- products
- inventory
- customers
- orders
- payments
- settings
- media
- analytics
- staff
- subscriptions
- builder data
- integrations

Use database-level authorization where appropriate.

---

# 38. MEDIA LIBRARY

Support:

- upload
- drag/drop
- multi-upload
- folders
- search
- filter
- sort
- rename
- delete
- replace
- metadata
- alt text

Store media binaries in object storage.

Do not store image binary data directly inside PostgreSQL tables.

---

# 39. DATABASE CORE MODELS

At minimum design for:

users
organizations
stores
store_domains
store_settings
store_themes
theme_versions
templates
pages
page_sections
page_elements
navigation
media_assets

products
product_variants
product_images
product_collections
product_metafields
categories
collections
inventory
inventory_movements

customers
customer_addresses
customer_segments

carts
cart_items

orders
order_items
order_status_history
payments
payment_transactions
refunds
returns
shipments
shipment_tracking
invoices

suppliers
supplier_products
supplier_inventory
supplier_orders
dropshipping_orders

meesho_imports
meesho_products
meesho_orders

coupons
discounts
reviews

subscriptions
subscription_plans
plan_features
plan_feature_limits
subscription_events

ai_generations

notifications
audit_logs

staff
roles
permissions

analytics_events

payment_accounts
shipping_accounts

webhooks
integration_connections

Additional tables may be created whenever required by a feature.

Do not force all functionality into one oversized table.

---

# 40. ARCHITECTURE

Preferred technology foundation:

Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
PostgreSQL
Supabase
Supabase Auth
Supabase Storage
Drizzle ORM
Cloudflare
Vercel
GitHub

Use modular domain architecture.

Suggested domain packages/modules:

commerce
builder
payments
shipping
dropshipping
meesho
ai
analytics
auth
billing
catalog
customers
orders
inventory

---

# 41. ENVIRONMENTS

The platform must support:

DEVELOPMENT
STAGING
PRODUCTION

Never mix production secrets and data into development.

Use environment variables for all credentials.

Never commit secrets to Git.

---

# 42. SECURITY

Mandatory security requirements:

- authentication
- authorization
- tenant isolation
- database policies
- input validation
- secure file uploads
- rate limiting
- secure secret handling
- webhook verification
- audit logging
- permission checks
- server-side pricing validation
- server-side checkout validation
- server-side inventory validation

Never trust the browser for:

- price
- inventory
- permissions
- payment status
- order status
- subscription state

---

# 43. TESTING

Implement:

Unit Tests
Integration Tests
End-to-End Tests

Critical workflows must be tested.

Examples:

Signup
→ Store creation
→ Product creation
→ Publish
→ Customer browsing
→ Add to cart
→ Checkout
→ Payment
→ Order
→ Fulfillment

Also test:

- refunds
- returns
- subscriptions
- staff permissions
- tenant isolation
- dropshipping
- Meesho workflow
- builder save/publish
- domains
- coupons
- inventory

---

# 44. PERFORMANCE

Design for scale.

Use appropriate:

- database indexes
- pagination
- caching
- lazy loading
- image optimization
- CDN
- server-side rendering where useful
- code splitting
- background jobs
- queue processing where required

Do not load entire product/order datasets into the browser unnecessarily.

---

# 45. OBSERVABILITY

Build infrastructure for:

- application logs
- error tracking
- performance monitoring
- API monitoring
- database monitoring
- background job monitoring
- alerts
- audit logs

---

# 46. DEVELOPMENT PHASES

The platform will be developed in this exact major-phase order:

PHASE 0
Specification and Architecture

PHASE 1
Infrastructure and Project Foundation

PHASE 2
Authentication and Multi-Tenancy

PHASE 3
Merchant Dashboard

PHASE 4
Storefront Engine

PHASE 5
Visual Store Builder and Theme System

PHASE 6
Products and Catalog

PHASE 7
Inventory and Customers

PHASE 8
Cart and Checkout

PHASE 9
Orders, Fulfillment, Returns and Invoices

PHASE 10
Payments and Shipping Integrations

PHASE 11
Marketing, Reviews, SEO and Store Growth

PHASE 12
Platform Dropshipping

PHASE 13
Meesho Reselling

PHASE 14
AI Product Tools

PHASE 15
Subscriptions, Admin, Security, Performance and Testing

PHASE 16
Production Launch

Do not skip a phase.

---

# 47. PHASE EXECUTION RULE

Every phase follows:

SPECIFICATION
→ DATABASE
→ BACKEND
→ BUSINESS LOGIC
→ FRONTEND
→ INTEGRATION
→ TESTING
→ BUG FIXING
→ SECURITY REVIEW
→ PERFORMANCE REVIEW
→ DOCUMENTATION
→ GIT COMMIT

Do not move to the next phase while critical functionality in the current phase remains knowingly broken.

---

# 48. CODE QUALITY

Use:

- TypeScript strict mode
- reusable components
- reusable services
- domain modules
- schema validation
- centralized error handling
- centralized configuration
- database migrations
- typed APIs
- consistent naming
- documentation for non-obvious logic

Avoid:

- duplicated business logic
- giant unmaintainable components
- arbitrary global state
- insecure client-only authorization
- hidden magic values
- temporary mock implementations left as production logic

---

# 49. UI/UX QUALITY

The interface should feel:

- premium
- clean
- professional
- modern
- simple
- highly usable
- responsive
- consistent

The merchant dashboard should prioritize clarity and efficiency.

The storefront builder should prioritize visual understanding and simplicity without sacrificing advanced functionality.

Do not copy proprietary UI code or branding from Shopify.

Build an original interface inspired by modern SaaS usability patterns.

---

# 50. COMPLETION STANDARD

The project is considered fully working only when:

- required features are implemented
- database is implemented
- APIs are implemented
- business logic is implemented
- frontend is implemented
- permissions are implemented
- validation is implemented
- error handling is implemented
- integrations are functional
- critical workflows are tested
- responsive behavior works
- production configuration exists
- security checks pass
- no critical placeholder functionality remains

The objective is a complete platform, not a visual mockup.

END OF MASTER INSTRUCTION.
