# Air Datepicker 3.6.0

This directory vendors the official, unmodified Air Datepicker distribution needed by the standalone HUHU HTML prototype. All five upstream file contents are preserved byte for byte. The Chinese and English locale files keep their original CommonJS format; `build.mjs` supplies a small local `exports` scope when embedding them in the HTML.

- Repository: https://github.com/t1m0n/air-datepicker
- Fixed commit: `f2510b92d9cff5ae53d0f0ba3d8443be2eeba544`
- Package version: `3.6.0`, verified in upstream `dist/package.json` at the fixed commit.
- License: MIT, copyright Timofey Marochkin. Full license is preserved in `LICENSE` and embedded in the generated HTML.
- Documentation: https://air-datepicker.com/docs
- Retrieved: 2026-11-05 through the GitHub connector.

| Local file | Upstream path | Upstream Git blob SHA-1 |
| --- | --- | --- |
| `air-datepicker.js` | `dist/air-datepicker.js` | `e059549c90fb52bc4b63d2e5374b0ec08997cdd4` |
| `air-datepicker.css` | `dist/air-datepicker.css` | `0798cd6c9bf41bc762ab7a4b64464db19aecee24` |
| `zh.js` | `dist/locale/zh.js` | `4a2b48ba4f8f736169c8e01ad97c8b4b9037d560` |
| `en.js` | `dist/locale/en.js` | `7788883c2f10f4bdb1edf5ca2541ac52decbbfb0` |
| `LICENSE` | `LICENSE.md` | `b0eb7025d9dff0fe96a72ec905708f9725488c70` |

The adapter in `src/date-picker.js` manages HUHU's field events, local-date validation, range constraints, focus, modal ownership and theme mapping. Air Datepicker owns calendar generation, month/year navigation, keyboard calendar navigation and time selection. The adapter does not implement another calendar algorithm.

This is the implementation of the offline prototype only. The production refactor plan targets the existing React stack with `@daypicker/react` 10.x and the existing Radix Popover, with one production date component family. Air Datepicker is not a proposed second production date library or a legacy compatibility layer.
