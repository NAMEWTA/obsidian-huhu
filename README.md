English | [简体中文](README.ZH.md)

# HUHU · obsidian-huhu

[![Release](https://img.shields.io/github/v/release/NAMEWTA/obsidian-huhu?include_prereleases&label=release)](https://github.com/NAMEWTA/obsidian-huhu/releases)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.13.0%2B-7c3aed)](https://obsidian.md)
[![License](https://img.shields.io/badge/license-HUHU%20Source%20Available%201.0-lightgrey)](LICENSE)
[![Issues](https://img.shields.io/github/issues/NAMEWTA/obsidian-huhu)](https://github.com/NAMEWTA/obsidian-huhu/issues)

A personal workbench inside Obsidian: notes, composable dashboards, tasks, coding agents, a browser, archives, automations, notifications and Git versioning in one interface, with your content kept in your own vault.

![HUHU workbench: dashboard, tasks and automation board](docs/images/readme/gif/hero.gif)

> Every screenshot and animation in this README was recorded in a disposable demo vault with the English interface. The interface also ships in Simplified Chinese.

## Contents

- [Why HUHU](#why-huhu)
- [Features](#features)
- [Quick start](#quick-start)
- [Tour](#tour)
- [Platform support](#platform-support)
- [Commands](#commands)
- [Data, privacy and backup](#data-privacy-and-backup)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Issues, requests and commercial authorization](#issues-requests-and-commercial-authorization)
- [License](#license)
- [Acknowledgements and references](#acknowledgements-and-references)

## Why HUHU

- **One place instead of ten plugins.** Dashboard, tasks, navigator, highlights, terminals, browser, archives, automations, safe and Git history share one icon bar, one settings page and one look.
- **Your vault stays the source of truth.** User content lives in `huhu/` as ordinary files; configuration and runtime data live in `.huhu/`. Nothing requires a HUHU account or server.
- **Agents work next to your notes.** Run Claude Code, Codex, Gemini CLI, OpenCode, Pi or Grok in real terminals scoped to a vault folder, and hand them notes, selections and paths.
- **Every module is optional.** Turn modules on or off under **Settings → General → Feature modules**; a disabled module does not load, and its data is kept.

## Features

| Module | What you get | Guide |
|---|---|---|
| Dashboard | Multiple boards with a resizable widget grid: calendar, tasks, inbox, clock/weather, habits, expenses, reading, pomodoro and analytics | [dashboard](docs/dashboard.md) |
| Tasks | Independent task workspace, due and reminder times, overdue carry-over, repeats, note/archive relations | [tasks](docs/tasks.md) |
| Notes navigator | Folder and tag tree, note list with previews, filter, calendar with daily notes, templates, shortcuts and keyboard operations | [navigator](docs/navigator.md) |
| Highlights and comments | Four-color highlights that do not rewrite Markdown, searchable excerpt cards, notes, tags, comments and export | [comments](docs/comments.md) |
| AI Agent and terminals | Spaces bound to a folder, real terminals, split panes, six CLI agents, quick commands, skills and usage | [agent workbench](docs/agent-workbench.md) |
| Browser | Isolated personal/task spaces, observe and take-over views, identity import, scoped files, CLI/MCP for agents | [browser](docs/browser.md) |
| Bot | A desktop personal agent with persistent bots and group chats, approvals, memory and task trees | [workbench](docs/workbench.md) |
| Automation board | Manual and scheduled actions (reminder, to-do, agent, terminal script, Obsidian command, open note/webpage), prechecks and run history | [automation](docs/automation.md) |
| Notifications | Inbox for automation results and reminders, with in-app and system channels | [automation](docs/automation.md) |
| Archives | Custom archive types (contacts, companies, …), forms, relationships and portable Markdown | [archives](docs/contacts.md) |
| Versioning | Note history from Git, three diff layouts, checkpointed restore and undo, commit, pull and push | [sync](docs/sync.md) |
| Safe | Encrypted records behind an independent master password, auto-lock, backup and recovery | [safe](docs/safe.md) |
| Icons and appearance | File/folder/interface icons, interface themes, Markdown palettes, local fonts, English and Simplified Chinese | [appearance](docs/appearance.md), [icons](docs/icons.md) |

The maintained guides are in Chinese: [guide index](docs/README.md), [workbench](docs/workbench.md), [settings](docs/settings.md).

## Quick start

### Install

1. Download `main.js`, `manifest.json` and `styles.css` from [Releases](https://github.com/NAMEWTA/obsidian-huhu/releases).
2. Put the three files in `.obsidian/plugins/huhu/` inside your vault.
3. In Obsidian, open **Settings → Community plugins** and enable **HUHU**.

HUHU requires **Obsidian 1.13.0 or later**.

### First steps

1. When you enable HUHU for the first time it opens the workbench and shows a short introduction once. Later, click the **Open workbench** ribbon icon or run `HUHU: Open workbench` from the command palette.
2. Open **Settings** (gear at the bottom of the icon bar) → **General** to choose the interface language and turn modules on or off; **Appearance** picks the interface theme and note style.
3. On **Home**, use **Add widget** to build your first board, then **New task** in the Tasks widget or the Tasks page.
4. Select text in a note and pick a highlight color; open the side panel with `HUHU: Open comments panel` to see every highlight.
5. On the desktop, open **AI Agent → New Space**, choose a folder inside the vault and start **New terminal**. The first terminal downloads the native `huhu-pty` helper for your platform from the release of the same version and verifies its SHA-256.
6. Open the **Automation board** to create a reminder or a daily to-do; results arrive in **Notifications** (bell at the bottom of the icon bar).

![Command palette with HUHU commands](docs/images/readme/command-palette.png)

## Tour

### Dashboard

Boards are tabs at the top of Home. Add, drag and resize widgets on the grid; each board is saved as a Markdown file under `.huhu/dashboards/`.

![Adding, resizing and moving a widget on a second board](docs/images/readme/gif/dashboard-widgets.gif)

| Light | Dark |
|---|---|
| ![Dashboard in light mode](docs/images/readme/overview-light.png) | ![Dashboard in dark mode](docs/images/readme/overview-dark.png) |

### Tasks

Create tasks with a due date, then filter by Incomplete, Overdue or Completed. Overdue tasks show how many days they are overdue.

![Creating a task and switching task filters](docs/images/readme/gif/tasks.gif)

![Task workspace](docs/images/readme/tasks.png)

### Notes navigator

The navigator lives in Obsidian's left sidebar: folder and tag tree on top, note cards below, a filter box and a calendar. Clicking a day opens that day's tasks.

![Navigating folders, tags and the calendar](docs/images/readme/gif/navigator.gif)

![Notes navigator](docs/images/readme/navigator.png)

### Highlights and comments

Select text and pick Yellow, Pink, Blue or Green, or add a note. The panel lists highlights for the current note or the whole vault, with search, color and file filters, and resolved/unresolved state.

![Highlighting text and searching highlights across the vault](docs/images/readme/gif/highlights.gif)

![Highlights panel](docs/images/readme/highlights.png)

### AI Agent and terminals

A Space binds terminals and agents to a directory inside the vault (or an external directory you choose). Open several terminals and drag a tab to the edge to split. Agent CLIs are launched from the new-tab menu once they are installed; HUHU does not bundle them.

![Creating a Space, running commands and splitting terminals](docs/images/readme/gif/agent-terminal.gif)

![Two terminals side by side](docs/images/readme/agent-terminal.png)

### Browser

Each browser space has its own browser process, website data and downloads. Pages open paused in observe mode; click **Take over** to browse yourself, or hand a task space to an agent. The managed runtime is currently available on Linux x64 and is installed with **Install runtime bundle** from a complete, verified runtime directory.

![Browser space in observe mode](docs/images/readme/browser.png)

### Bot

Bot is a desktop personal agent, separate from the CLI agents. It starts a local Runner the first time you open its pages; register model credentials and quotas under **Settings → Bot**, then pick protocol, endpoint and model on the Bot page.

![Bot page](docs/images/readme/bot.png)

### Automation board and notifications

Automations run actions manually or on a schedule (once, hourly, daily, weekdays, weekly or custom). Opening a note, opening a webpage and running an Obsidian command are manual-only actions. Each automation chooses its own notification channels: in-app or system. Scheduled runs happen while Obsidian is open.

![Automation board](docs/images/readme/automation.png)

![Notifications inbox](docs/images/readme/notifications.png)

### Archives

Archive types define their own fields and forms. Create a record from **New archive**, fill the form and save; the list updates immediately.

![Creating a contact archive](docs/images/readme/gif/archives.gif)

![Contacts archive table](docs/images/readme/archives.png)

### Versioning

`HUHU: Open note history` lists the Git commits that touched the current note. Compare side by side, stacked or unified, restore single changes, or restore the whole version; a checkpoint of the current content is saved first.

![Comparing versions and opening the restore confirmation](docs/images/readme/gif/versioning.gif)

![Side-by-side comparison with the history panel](docs/images/readme/versioning.png)

### Safe

The safe keeps account records encrypted with an independent master password. By default it locks after 20 minutes without activity, and always locks when Obsidian closes or the plugin unloads.

![Unlocked safe with demo entries](docs/images/readme/safe.png)

### Appearance and language

Switch between English and Simplified Chinese instantly, pick an interface theme (Default, SuliWorld, Pearl, Claude Code, Eye care or Custom) and use Obsidian's light/dark mode.

![Switching language, interface theme and light/dark mode](docs/images/readme/gif/appearance-language.gif)

![Appearance settings](docs/images/readme/settings-appearance.png)

### Narrow windows

Pages adapt to narrow panes and small windows.

![Dashboard, tasks and safe in a narrow window](docs/images/readme/narrow.png)

## Platform support

| Module | Desktop | Mobile |
|---|---|---|
| Dashboard, tasks, notes navigator, highlights/comments, archives, icons | Yes | Yes |
| Notifications | Yes | Yes |
| Automation board | Yes | Yes; agent and terminal-script actions need the desktop |
| AI Agent and terminals | Yes | Terminals and the AI Agent page are desktop-only; in-vault skill discovery remains |
| Browser | Managed runtime on Linux x64 only; other platforms show it as unavailable | No |
| Bot | Yes | No |
| Safe | Yes | No |
| Git versioning | Yes, with system Git | No |

The terminal helper `huhu-pty` is published for Windows x64, macOS x64/arm64 and Linux x64/arm64. The Bot Runner binary targets the same five platforms. Details: [settings → platforms](docs/settings.md#安装与平台).

## Commands

All commands are prefixed with `HUHU:` in the command palette; bind any of them under **Settings → Hotkeys**.

| Command | ID |
|---|---|
| Open workbench | `huhu:open-workbench` |
| Open dashboard | `huhu:open-dashboard` |
| Open task workspace / New task | `huhu:open-task-domain` / `huhu:create-task` |
| Open notes navigator / Navigator: toggle calendar | `huhu:navigator-open` / `huhu:navigator-toggle-calendar` |
| Highlight selection / Open comments panel | `huhu:highlights-selection` / `huhu:comments-open-panel` |
| New terminal | `huhu:terminal-new` |
| New Claude Code / Codex / Gemini CLI / OpenCode / Pi / Grok session | `huhu:terminal-new-claude-code`, `-codex`, `-gemini`, `-opencode`, `-pi`, `-grok` |
| Send selection / current note / current file path to terminal | `huhu:terminal-send-selection`, `huhu:terminal-send-note`, `huhu:terminal-send-path` |
| Open web page | `huhu:open-browser` |
| Open archives | `huhu:open-contacts` |
| Open automation board / New automation | `huhu:open-automations` / `huhu:new-automation` |
| Open notifications | `huhu:open-notifications` |
| Open note history | `huhu:versioning-note-history` |
| Git: Commit and sync / Pull / Push | `huhu:sync-commit-and-sync`, `huhu:sync-pull`, `huhu:sync-push` |
| Open safe | `huhu:open-safe` |
| Cycle to next theme | `huhu:cycle-theme` |
| Copy relative reference / Copy absolute reference | `huhu:copy-relative-reference` / `huhu:copy-absolute-reference` |

The navigator, icons, tabs and Git modules add more commands; see each guide.

## Data, privacy and backup

- `huhu/` holds user content: journals, inbox, tasks, archives and records. Ordinary notes stay where they are.
- `.huhu/` holds configuration, boards, automations, comments, device state, browser/agent runtime data, helpers and the encrypted safe.
- Logical vault paths use `/`. Invalid paths are rejected rather than treated as an empty board or another note.
- System CLI logins stay where they are; managed agent accounts are isolated inside the vault. Navigator caches, system status hooks and explicit exports have separate boundaries.
- Hidden folders need a sync tool that includes them. Git excludes credentials, device runtime data and caches by default; check the actual rules. Back up both your content and the hidden data you need to restore.

See [data and recovery](docs/data.md) and [privacy / external access](docs/privacy.md). Workspace usage counts only attributable records in the current vault and its subfolders, not machine-wide totals.

## Troubleshooting

| Symptom | What to check |
|---|---|
| A page or icon is missing | The module may be off: **Settings → General → Feature modules**. A module that failed to start shows a warning dot on its icon; other modules keep working. |
| The first terminal does not start | The `huhu-pty` helper is downloaded from the release of the same plugin version and its SHA-256 is verified; it needs network access once. If the digest is missing or does not match, HUHU stops instead of running it. See [terminal helper](docs/agent-workbench.md#终端组件). |
| An agent is not offered in the new-tab menu | Install the CLI first. When Obsidian is started from a desktop icon, HUHU restores `PATH` from your login shell (not on Windows); for unusual locations set the program path under **Settings → Agents**. |
| "The managed browser runtime is unavailable" | The browser runtime is Linux x64 only and must be installed from a complete runtime directory with **Install runtime bundle**. See [browser](docs/browser.md#开始使用). |
| "System credential protection is unavailable" | Without OS credential storage, new browser spaces need your explicit choice of temporary storage, and identities cannot be saved. |
| Automations did not run | Scheduled runs happen only while Obsidian is open. System notifications need OS permission. |
| Git versioning says it needs configuration | It needs system Git, a repository and authentication. Enabling the module does not create a repository, save credentials or turn on automatic commit, pull or push schedules. See [sync](docs/sync.md). |
| The safe locked itself | It locks after the configured idle time (20 minutes by default) and whenever Obsidian closes; change it under **Settings → Safe**. |

## Development

TypeScript, React 19, Tailwind CSS 4, shadcn/Radix and esbuild; Rust for the native terminal helper and browser supervisor. The pnpm version is pinned in `package.json`.

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

Builds update the tracked root `main.js` and `styles.css`. Contributors start with [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md), [design system](docs/design-system.md) and [development / release](docs/development.md). The [CHANGELOG](CHANGELOG.md) starts with this project's first release.

## Issues, requests and commercial authorization

[Choose an Issue form](https://github.com/NAMEWTA/obsidian-huhu/issues/new/choose) for bugs/fixes, feature requests, improvements, installation/compatibility, documentation, questions or commercial authorization. Use minimal examples, version information and redacted evidence. Read [SECURITY](SECURITY.md) before reporting a security issue.

[Request commercial authorization](https://github.com/NAMEWTA/obsidian-huhu/issues/new?template=07-commercial.yml). Business-internal use, paid work, sales/integration and commercial services all require **NAMEWTA's express prior written permission**. Submitting, answering or closing an issue does not grant authorization.

## License

Original project code, documentation and assets use **HUHU Source Available License 1.0**; see [LICENSE](LICENSE) for the complete terms. Noncommercial use, modification and redistribution are allowed subject to those terms. Distribution of covered derivatives and network services require complete Corresponding Source under the same license. Commercial use requires separate written authorization. This is **source available, not an OSI-approved open source license**.

Third-party materials retain their own licenses and independently granted rights. This license does not revoke permissions already granted for earlier releases. Attributions, pinned sources and complete notices are in [NOTICE](NOTICE), [source references](docs/references.md), [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES.md) and the [icon resource notices](src/modules/icons/core/res/NOTICE.txt).

## Acknowledgements and references

We thank these projects. **Code, style and asset adaptations are declared below and in source, with their original licenses retained**; an acknowledgement does not claim that every component was implemented independently.

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
| [obsidian-plugin-skill](https://github.com/gapmiss/obsidian-plugin-skill) | MIT | Declared source for adapted development-skill guidance |

**Runtime dependencies and fonts.** HUHU builds on libraries such as [xterm.js](https://github.com/xtermjs/xterm.js), [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout), React, Radix, Zustand, Chart.js and Tailwind; icons from [Lucide](https://github.com/lucide-icons/lucide) and emoji/locale data from [Unicode CLDR](https://github.com/unicode-org/cldr-json); and OFL-1.1 fonts including Geist / Geist Mono, Outfit, Newsreader, Manrope, Instrument Serif and iA Writer Duo (font-collection credits such as Plus Jakarta Sans, Young Serif, Hanken Grotesk, Gloock, Albert Sans and DM Mono do not mean every named font is bundled). Exact versions, licenses and attributions are in [NOTICE](NOTICE), [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES.md) and the [icon resource notices](src/modules/icons/core/res/NOTICE.txt).

**Behavior-only references (no code, styles or configuration included):** [Notebook Navigator](https://github.com/johansan/notebook-navigator) (GPL-3.0), [Obsidian Copilot](https://github.com/logancyang/obsidian-copilot) (AGPL-3.0), [Marginalia](https://github.com/jpmoo/marginalia), [Hover Annotations](https://github.com/MaxMiksa/Obsidian-Hover-Annotations), [Margin Annotations](https://github.com/aoldiot/margin-annotations), [Side Note](https://github.com/mofukuru/side-note), [Commentator](https://github.com/Fevol/obsidian-criticmarkup), [Smart Composer](https://github.com/glowingjade/obsidian-smart-composer), [dbx](https://github.com/t8y2/dbx) (color palette) and [Windows Terminal](https://github.com/microsoft/terminal) protocol documentation (all MIT unless noted). Source records: [docs/references.md](docs/references.md).

CLI tools and their providers are independent external products and are not licensed as part of HUHU.
