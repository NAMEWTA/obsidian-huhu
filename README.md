English | [简体中文](README.ZH.md)

# HUHU · obsidian-huhu

A personal workbench inside Obsidian: notes, composable dashboards, coding agents, a browser, archives, automations and Git sync in one interface, with content in your own vault.

This repository starts at **0.0.1**. Its current code and documentation define the product. The interface supports English and Simplified Chinese.

## Install and start

1. Download `main.js`, `manifest.json` and `styles.css` from [Releases](https://github.com/NAMEWTA/obsidian-huhu/releases), or extract the plugin ZIP.
2. Place the three files in `.obsidian/plugins/huhu/` in your vault, then enable **HUHU** under Obsidian's community plugin settings.
3. Click the HUHU ribbon icon or run `HUHU: Open workbench`; choose language, modules and appearance in workbench settings.

Requires **Obsidian 1.13.0 or later**. Terminals, CLI agents, the browser, Git sync and the safe need the desktop app. Installation availability does not imply that every feature works on mobile.

On first terminal use, HUHU downloads `huhu-pty` from the same version's release in this repository, verifies SHA-256, and stores it in the current vault's device directory. Helpers cover Windows x64, macOS x64/arm64 and Linux x64/arm64. They do not belong in the plugin installation directory.

## Features

| Feature | Current capabilities |
|---|---|
| [Tasks](docs/tasks.md) | Independent task workspace, note/archive relations, separate due/reminder times, overdue carry and versioned agent tools |
| [Dashboard and records](docs/dashboard.md) | Resizable widget grids, calendar, tasks, inbox, clock/weather, habits, expenses, reading, pomodoro and analytics |
| [Notes navigator](docs/navigator.md) | Folder/tag browsing, search, previews, calendar, templates and keyboard operations |
| [Agents and terminals](docs/agent-workbench.md) | CLI sessions, tab groups, resume, quick commands, skills and current-workspace usage |
| [Independent Agent Browser](docs/browser.md) | Isolated personal/task spaces, observer and takeover views, verified identity import, scoped files and CLI/MCP; managed runtime currently Linux x64 |
| [Archives](docs/contacts.md) | Custom archive types, forms, independent relationships, portable Markdown and recoverable migrations |
| [Automations and notifications](docs/automation.md) | Manual/scheduled actions, prechecks, device ownership, run history and notifications |
| [Highlights](docs/comments.md) | Four-color non-intrusive Markdown highlights, searchable excerpt cards, notes, tags, comments and export |
| [Icons and appearance](docs/appearance.md) | File/interface icons, themes, Markdown palettes and local fonts |
| [Versioning](docs/sync.md) | Compact Git workspace, note history, three diff layouts, checkpointed restore/undo, commit, pull and push |
| [Encrypted safe](docs/safe.md) | Independent master password, encrypted records, locking, backup and authenticated recovery |

Modules have independent switches. Git remotes, authentication and automatic schedules need separate configuration; CLI logins, weather and other external services have their own requirements. Maintained guides are in Chinese: [guide index](docs/README.md), [workbench](docs/workbench.md) and [settings](docs/settings.md).

## Data, boundaries and backup

- `huhu/` holds user content: journals, inbox, tasks, archives and records. Ordinary notes keep their existing locations.
- `.huhu/` holds configuration, boards, automations, comments, device state, browser/agent runtime data, helpers and the encrypted safe.
- Logical vault paths use `/`. Invalid paths are rejected rather than treated as an empty board or another note. This release uses a new identity and does not import former-brand data.
- System CLI logins keep their existing locations; managed accounts are isolated in the vault. Navigator caches, system status hooks and explicit exports have separate boundaries.
- Hidden folders need a sync tool that includes them. Git excludes credentials, device runtime data and caches by default; inspect its actual rules. Back up both your content and the hidden data you need to restore.

See [data and recovery](docs/data.md) and [privacy / external access](docs/privacy.md). Workspace usage includes only attributable records in the current vault and its subdirectories, rather than machine-wide totals.

## Development

TypeScript, React 19, Tailwind CSS 4, shadcn/Radix and esbuild; Rust for the native terminal helper. The pnpm version is pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm lint:css
pnpm test:all
pnpm check:native
pnpm check:notices
pnpm check:bundle
```

Builds update the tracked root `main.js` and `styles.css`. Contributors start with [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md), [design system](docs/design-system.md) and [development / release](docs/development.md). [CHANGELOG](CHANGELOG.md) starts with this project's first release.

## Issues, requests and commercial authorization

[Choose an Issue form](https://github.com/NAMEWTA/obsidian-huhu/issues/new/choose) for bugs/fixes, feature requests, improvements, installation/compatibility, documentation, questions or commercial authorization. Use minimal examples, version information and redacted evidence. Read [SECURITY](SECURITY.md) before reporting a security issue.

[Request commercial authorization](https://github.com/NAMEWTA/obsidian-huhu/issues/new?template=07-commercial.yml). Business-internal use, paid work, sales/integration and commercial services all require **NAMEWTA's express prior written permission**. Submitting, answering or closing an issue does not grant authorization.

## License

Original project code, documentation and assets use **HUHU Source Available License 1.0**; see [LICENSE](LICENSE) for the complete terms. Noncommercial use, modification and redistribution are allowed subject to those terms. Distribution of covered derivatives and network services require complete Corresponding Source under the same license. Commercial use requires separate written authorization. This is **source available, not an OSI-approved open source license**.

Third-party materials retain their own licenses and independently granted rights. This license does not revoke permissions already granted for earlier releases. Attributions, pinned sources and complete notices are in [NOTICE](NOTICE), [source references](docs/references.md), [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES.md) and the [icon resource notices](src/modules/icons/core/res/NOTICE.txt).

## Acknowledgements and references

We acknowledge these projects for their features, interactions and layouts. **Behavior/layout-only references do not include the corresponding implementation. Actual code, style and asset adaptations are identified honestly below and in source, with original licenses retained.** An acknowledgement does not replace attribution or claim that every component was independently implemented.

| Project | Upstream license | Use |
|---|---|---|
| [Orca](https://github.com/stablyai/orca) | MIT | Workbench, agents, browser, automations and components; declared adaptations |
| [apex-dashboard](https://github.com/PandoraReads/apex-dashboard) | MIT | Dashboard layouts, interactions, formats and algorithms; declared adaptations |
| [obsidian-dashboard](https://github.com/Leolewis2011/obsidian-dashboard) | MIT | Dashboard design origin; original repository unavailable, notice retained |
| [Margin Comments](https://github.com/jonaas-dev/obsidian-margin-comments) | MIT | Comment models, anchors and interactions; declared adaptations |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | MIT | Shared component recipes, partly adapted through Orca |
| [Iconic](https://github.com/gfxholo/iconic) | MIT-0 | Ported icon rules and managers |
| [obsidian-git](https://github.com/Vinzent03/obsidian-git) | MIT | Git behavior and declared conflict-parser / commit-mode adaptations |
| [skills-manager](https://github.com/xingkongliang/skills-manager) | MIT | Adapted skill discovery, hashing, per-tool copying and card interactions |
| [cc-switch](https://github.com/farion1231/cc-switch) | MIT | Adapted CLI package information, installation discovery and version comparison |
| [SuliWorld](https://github.com/sulistef/obsidian-suliworld) | MIT | Adapted interface and editor themes; fonts separately under OFL |
| [GitHub Theme](https://github.com/krios2146/obsidian-theme-github) | MIT | Adapted editor typography and Markdown styling |
| [dbx](https://github.com/t8y2/dbx) | MIT | Color-palette reference, without claiming full theme compatibility |
| [Notebook Navigator](https://github.com/johansan/notebook-navigator) | GPL-3.0 | Public behavior reference only; no source, comments or styles included |
| [Marginalia](https://github.com/jpmoo/marginalia) | MIT | Hover-delegation concept reference only |
| [Hover Annotations](https://github.com/MaxMiksa/Obsidian-Hover-Annotations) | MIT | Hover-interaction reference only |
| [Margin Annotations](https://github.com/aoldiot/margin-annotations) | MIT | Sidebar-card interaction reference only |
| [Side Note](https://github.com/mofukuru/side-note) | MIT | Side-note interaction reference only |
| [Commentator](https://github.com/Fevol/obsidian-criticmarkup) | MIT | Annotation behavior reference only |
| [Smart Composer](https://github.com/glowingjade/obsidian-smart-composer) | MIT | Reference for React / Radix integration ideas only |
| [Obsidian Copilot](https://github.com/logancyang/obsidian-copilot) | AGPL-3.0 | Public feature ideas only; no code, styles or configuration included |
| [obsidian-plugin-skill](https://github.com/gapmiss/obsidian-plugin-skill) | MIT | Declared source for adapted development-skill guidance |
| [xterm.js](https://github.com/xtermjs/xterm.js) | MIT | Terminal rendering engine, addons and public APIs |
| [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout) | MIT | Dashboard-grid dependency |
| [Lucide](https://github.com/lucide-icons/lucide) | ISC / MIT | Interface and file icons; resource notices retained |
| [Unicode / CLDR](https://github.com/unicode-org/cldr-json) | Unicode-3.0 | Emoji and locale data; notices in icon resources and dependency notices |
| [Geist / Geist Mono](https://github.com/vercel/geist-font) | OFL-1.1 | Embedded interface fonts |
| [Outfit](https://github.com/Outfitio/Outfit-Fonts) | OFL-1.1 | Font source; complete attribution retained in font license |
| [Newsreader](https://github.com/productiontype/Newsreader) | OFL-1.1 | Font source; complete attribution retained in font license |
| [Manrope](https://github.com/googlefonts/manrope) | OFL-1.1 | Font source; complete attribution retained in font license |
| [Instrument Serif](https://github.com/Instrument/instrument-serif) | OFL-1.1 | Font source; complete attribution retained in font license |
| [iA Writer Duo](https://github.com/iaolo/iA-Fonts) | OFL-1.1 | Embedded original fonts; original IBM Plex attribution retained |
| [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) | OFL-1.1 | Source named in upstream font-collection notice; not all fonts are bundled |
| [Young Serif](https://github.com/noirblancrouge/YoungSerif) | OFL-1.1 | Source named in upstream font-collection notice |
| [Hanken Grotesk](https://github.com/marcologous/hanken-grotesk) | OFL-1.1 | Source named in upstream font-collection notice |
| [Gloock](https://github.com/duartp/gloock) | OFL-1.1 | Source named in upstream font-collection notice |
| [Albert Sans](https://github.com/usted/Albert-Sans) | OFL-1.1 | Source named in upstream font-collection notice |
| [DM Mono](https://github.com/googlefonts/dm-mono) | OFL-1.1 | Source named in upstream font-collection notice |
| [Windows Terminal](https://github.com/microsoft/terminal) | MIT | Public terminal-protocol documentation reference only; no terminal source port |

Generated notices list the actual bundled npm, Rust, CSS and font dependencies. Font-collection credits do not mean every named font is bundled. Exact versions and notices for React, Radix, Zustand, Chart.js, Tailwind and other runtime/build dependencies are defined by the lockfiles and [third-party notices](THIRD-PARTY-NOTICES.md). CLI tools and their providers are independent external products and are not licensed as part of HUHU.
