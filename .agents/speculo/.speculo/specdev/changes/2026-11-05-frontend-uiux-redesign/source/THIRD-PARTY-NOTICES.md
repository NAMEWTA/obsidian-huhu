# Third-party components in the standalone prototype

## Air Datepicker 3.6.0 — MIT

Calendar, month/year navigation, date keyboard navigation and local time selection reuse [Air Datepicker](https://github.com/t1m0n/air-datepicker), copyright Timofey Marochkin.

The distribution, Chinese locale and English locale are pinned to commit `f2510b92d9cff5ae53d0f0ba3d8443be2eeba544`. Source paths and byte-preserving Git blob hashes are recorded in `src/vendor/air-datepicker/SOURCE.md`. The full MIT notice is in `src/vendor/air-datepicker/LICENSE` and is also included in both generated standalone HTML files. The build embeds all required library code and styles; opening the delivered HTML does not fetch a CDN or an npm package.

HUHU's field adapter and token mapping live separately in `src/date-picker.js` and `src/date-picker.css`. They preserve original field names and events, validate local date strings and coordinate the popup with drawers and dialogs.

The production refactor plan uses the existing React/Radix stack and recommends `@daypicker/react` 10.x. That package is not installed or bundled in this plain HTML prototype. The prototype library and production recommendation are intentionally documented as different implementation choices.

## Lucide icons — ISC

The existing icon set reuses [Lucide](https://github.com/lucide-icons/lucide). The complete notice is retained in `LUCIDE-LICENSE` and in the HTML. Individual icons are rendered as local inline SVG; no icon CDN is required.

## Oil UI — design reference

[Oil UI](https://github.com/oil-oil/oil-ui) is a design reference for the workbench, rather than an installed runtime dependency. Its spacing, information hierarchy and component examples inform the documented design decisions; the production refactor plan records the exact reuse boundaries.
