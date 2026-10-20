# Day/night appearance preview — October 20, 2026

Store: `indexesstore.myshopify.com`.

Source/published theme: `161796423765` — Indexes — Stitch Transfer Preview — 2026-10-18.
Working theme: `161876181077` — Indexes — Day Night Preview — 2026-10-20, **UNPUBLISHED**.

Preview: https://indexesstore.myshopify.com/?preview_theme_id=161876181077

## Change

Add a 44px sun/moon toggle beside the shared header search field. The first visit
follows the device appearance; a manual choice is stored in
`indexes_color_scheme_v1`. The small initialization snippet runs in the head
before the styles to apply the preference before paint. The independent async script, loaded after the header markup,
keeps button state accessible with `aria-pressed`, supports system changes until
a manual choice is made, and synchronizes tabs. If storage is unavailable, the
current-page toggle still works. It is hidden when JavaScript is unavailable.

The additive CSS layer changes backgrounds, text, borders and neutral controls.
The original red primary controls remain; red text uses a lighter shade on dark
surfaces for readability. Product images, banner artwork and logos are not
filtered or replaced. Original raster navigation icons retain white backing.
Hosted Shopify customer-account and checkout pages are outside this theme.

Changed files:

- `layout/theme.liquid` — initialization and asset loading.
- `snippets/indexes-global-shell.liquid` — render button beside search.
- `snippets/indexes-color-scheme-init.liquid` — first-paint preference.
- `snippets/indexes-color-scheme-toggle.liquid` — accessible SVG control.
- `assets/indexes-color-scheme.js` — interaction/persistence.
- `assets/indexes-color-scheme.css` — scoped appearance layer.

## Verification

| Area | Result | Evidence / scope |
| --- | --- | --- |
| Store and draft identity | PASS | Authenticated store query and hosted `Shopify.theme.id` matched the draft above. |
| Draft writes/readback | PASS | Shopify accepted six files with no user errors; readback checksums matched the upload. |
| Published source | PASS | It remained MAIN; both original modified-file checksums were unchanged. |
| Manual appearance | PASS | Hosted browser switched dark/light and retained both choices after reload. |
| Shopping surfaces | PASS | Hosted home, product and cart opened on the correct draft; product navigation retained the preference. |
| Responsive layout | PASS | Product page at 360, 390, 430, 768 and 1440px had no horizontal document overflow. |
| System/storage behavior | PASS | Fresh hosted dark-device context selected dark automatically. An isolated browser fixture using the actual snippets and script verified device changes, saved-choice priority, reload, cross-tab sync and blocked storage. |
| Account sheet appearance | PASS | Opened the real Shopify sign-in sheet on desktop (1440px) and mobile (390px), in both modes. Dialog/heading and email-control colors match the selected palette; main text contrast exceeds 4.5:1. No sign-in submitted. |
| Final hosted cart/keyboard | PASS | Correct draft, dark empty-cart surface, Enter-key toggle, no page errors and no horizontal overflow at 360, 390, 430, 768 and 1440px. |
| Source syntax | PASS / limited | JavaScript syntax and PostCSS parse passed; both new Liquid snippets parsed. LiquidJS cannot parse Shopify's existing `style` tag in the full layout, so it is not treated as a full Shopify theme check. |
| Full production release/performance audit | NOT RUN | No publication, full theme-check, new order, checkout, account-flow or Core Web Vitals audit. |

The appearance script loads independently of other deferred theme scripts. This
avoids delaying the control when an earlier deferred dependency loads slowly.
Final hosted readback matched all six local file checksums.

No shared product, pricing, inventory, policy, account or app settings were
changed. No WhatsApp messages or orders were created. No Cloudflare changes
belong to this implementation.

## Review and rollback

This is an unpublished preview for review, not a production release. Review the
actual appearance before publication. The published theme is the backup; its
original two files also match the repository parent commit. Revert this branch's
appearance files or keep using the unchanged published theme to roll back.

## Account-sheet regression correction

The original account styling fixed its background to white while its text used
`--ix-text`. Dark mode therefore produced light text on white. The appearance
layer now explicitly sets Shopify's documented account-sheet background, text,
card and control variables together on `shopify-account.ix-shopify-account`.
Unneeded global native-theme color overrides were removed. This patch changes
only the appearance CSS; it does not alter sign-in providers or authentication.

Reference: https://shopify.dev/docs/api/storefront-web-components/components/shopify-account
