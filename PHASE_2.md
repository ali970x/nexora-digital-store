# Phase 2 — Catalog platform

**Status:** Complete on 2026-08-10

## Delivered

- Unlimited-depth categories use an adjacency list plus a trigger-maintained closure table. Names, descriptions, SEO content, icons, images, sort order, publishing state, and soft deletion are persisted.
- Product types are rows in `product_types`, not a PostgreSQL enum or UI switch. Capabilities and form schemas are data, so adding a type requires inserts/configuration rather than an application release.
- Products, variants, protected supplier costs, localized galleries, relations, SMM pricing rules, service configuration, quote requests, and recently viewed history are covered by migrations `0004`–`0006`.
- Dynamic product and service requirements are validated twice: the JSON definition is validated when read, then a Zod object schema is generated from it for field-level validation. Regex, required, minimum, maximum, step, URL, email, notes, and upload-name constraints are supported.
- Search uses locale-aware PostgreSQL full-text search with `pg_trgm` typo tolerance, category-descendant filtering, region/type/price facets, deterministic sorting, and offset pagination.
- Storefront routes include the searchable catalog, real nested category pages, localized product detail/configuration, SMM quantity pricing and drip feed, service milestones and quote submission, related products, and recently viewed products.
- SEO includes localized metadata, canonical and hreflang alternates, Product/Offer/Breadcrumb JSON-LD, nested category and product sitemap entries, and generated product OG images.
- The idempotent catalog seed provides 60 bilingual products and 120 variants across game top-ups, subscriptions, gift cards, SMM, and digital services.

## Security and data integrity

- Every Phase 2 table has RLS. Anonymous users can only read published catalog rows; authorized catalog staff can see and mutate drafts. Supplier costs are isolated from storefront reads.
- Draft products are excluded both by RLS and the search function. Service quotes are visible only to their owner or authorized staff.
- Catalog mutations are recorded by the existing audit subsystem. All monetary values are integer minor units with an accompanying currency code.
- Media uses a dedicated Supabase Storage bucket with public-read and permission-gated write policies. Sensitive customer requirement uploads remain private and are finalized with the order workflow in Phase 3.

## Verification

- Unit tests cover schema definitions, regex fields, SMM steps, localized/data-driven fields, and optional values.
- Playwright covers English and Arabic search-to-product journeys, structured data, RTL, and 320 px horizontal-overflow protection.
- Production build, strict TypeScript, ESLint, Prettier, raw-color gate, and Vitest are required before release.

## Phase boundary

The configurator produces validated product input and service quote requests. Cart snapshots, promotion calculations, taxes, and checkout persistence intentionally begin in Phase 3.
