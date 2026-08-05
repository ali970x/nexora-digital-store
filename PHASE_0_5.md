# Phase 0.5 — Visual Foundation

## Assumptions

- The working brand name is **Nexora** until legal and domain clearance is complete.
- Phase 0.5 uses realistic demonstration content only; product, testimonial, wallet, and payment values are not connected to production data.
- Third-party trademarks are represented typographically in this phase so the repository does not ship unlicensed brand artwork.
- The storefront remains dark-first, while the theme control supports dark, light, and system preferences without a first-render flash.
- USD remains the demonstration base currency; the LBP selector uses a display-only illustrative rate until the exchange-rate service is implemented.
- Account and admin shells are documented as interactive shell previews in the design system; their feature routes arrive in the relevant roadmap phases.

## Visual directions considered

### 1. Obsidian Aurora — selected

- **Mood:** cinematic, precise, premium, and fast.
- **Palette:** deep graphite and charcoal surfaces with restrained electric violet and cyan light.
- **Typography:** Geist for Latin and IBM Plex Sans Arabic for Arabic.
- **Accent:** electric violet to luminous cyan.
- **References:** Linear, Raycast, Revolut, and Vercel.
- **Why it won:** it gives varied digital products a coherent premium frame, performs equally well in RTL and LTR, and makes wallet, live-status, and delivery moments feel distinctive without reducing clarity.

### 2. Pearl Circuit

- **Mood:** bright, financial, calm, and highly trustworthy.
- **Palette:** porcelain, soft slate, indigo, and teal.
- **Typography:** Geist with IBM Plex Sans Arabic.
- **Accent:** indigo to cool teal.
- **References:** Stripe, Wise, Arc, and Apple.
- **Trade-off:** excellent for financial confidence, but less memorable for gaming and entertainment categories.

### 3. Midnight Souk

- **Mood:** editorial, regional, warm, and exclusive.
- **Palette:** ink, espresso, muted gold, and emerald.
- **Typography:** a display-forward Latin face paired with IBM Plex Sans Arabic.
- **Accent:** antique gold to deep emerald.
- **References:** Aesop, Nothing, Apple Card, and Stripe editorial pages.
- **Trade-off:** culturally expressive, but harder to scale across dense admin tooling and high-volume reseller workflows.

## Implemented quality contract

- Components consume the CSS token layer; a CI gate rejects raw hexadecimal colors in `src/`.
- Motion uses one shared configuration and globally respects reduced-motion preferences.
- English and Arabic routes are statically generated with correct `lang`, `dir`, and locale-specific fonts.
- The SVG brand system, PNG favicon/app icon set, manifest, and localized dynamic OG template are source-controlled.
- The homepage and living design system expose the complete visual system for both themes and directions.
