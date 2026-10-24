# 许可

HUHU 自有材料使用 HUHU Source Available License 1.0（`LICENSE`），非商业使用允许，企业内部使用和其他商用须事先取得 NAMEWTA 书面授权；分发或网络服务须提供对应源码并沿用许可。第三方材料仍按自己的原许可证分发，不能扩大自有材料的商用限制。实际进入 `main.js`、`styles.css` 或辅助程序的第三方代码、字体和资源必须具备适用许可及完整声明。

固定上游版本、现行与历史路径、声明覆盖边界见 [13 参考映射与许可](../../../../docs/references.md)。依赖是否实际分发以锁定依赖、构建输入与生成通知为准。

## 署名放在哪里

| 文件 | 内容 | 维护方式 |
|---|---|---|
| `LICENSE` | HUHU 的源码可见许可证，只有英文 | 手写 |
| `NOTICE` | HUHU 改编的作品：apex-dashboard 与 obsidian-dashboard（MIT，看板设计）、Orca（MIT，含提交对应关系）、Margin Comments（MIT）、shadcn/ui（MIT）、Iconic（MIT-0）、obsidian-git（MIT，Git 同步）、skills-manager（MIT，技能管理）；只有英文 | 手写 |
| `src/modules/icons/core/res/NOTICE.txt` | Lucide（ISC）、源自 Feather 的图标（MIT）、Unicode 数据和其他图标资源 | 手写；随横幅发布 |
| `docs/third-party/orca-terminal-workbench.md`、`orca-LICENSE.txt` | 固定的 Orca 提交和改编内容；Orca 许可证原文 | 手写 |
| `THIRD-PARTY-NOTICES.md` | 打包进 `main.js` 的 npm 包、内嵌 `styles.css` 的 CSS/字体、链接进 `huhu-pty` 的 crate；生成完整许可原文；缺失必须失败 | `pnpm run notices`；CI 运行 `check:notices` |
| `src/ui/fonts/LICENSE.txt` | Geist / Geist Mono 的 SIL OFL 1.1 全文 | 随字体保留并纳入 notices |
| `main.js` 横幅 | `LICENSE`、`NOTICE`、图标资源声明、Orca 许可证、打包依赖的许可证 | `scripts/esbuild-options.mjs` |

`LICENSE` 和 `NOTICE` 是法律文本，没有 `.ZH` 对应文件。`NOTICE` 和其他进入横幅的文件是纯文本，因为它们被嵌入 `main.js` 顶部的注释里。

Release 附件包含 `LICENSE`、`NOTICE` 和 `THIRD-PARTY-NOTICES.md`。

`check:notices` 核对生成一致性，并拒绝没有全文、未知或限制性许可分支、缺少所需 Unicode 附加声明的内容。缺失发行包文件使用按版本和固定提交保存、带摘要的上游文本；来源核实仍需结合源码头与依赖图。修复应回到生成器及输入，不能手改生成通知。

## 添加依赖

1. 检查许可证。MIT、ISC、BSD、Apache-2.0、MIT-0、CC0、Unicode 和 Zlib 可以用；Geist / Geist Mono 字体按 SIL OFL 1.1 分发并保留全文。GPL、AGPL、LGPL（用于打包的代码）、SSPL 和「无许可证」不行；先询问。
2. 尽量从需要它的模块里用懒加载 `import()`；用 `pnpm run check:bundle` 检查。
3. 运行 `pnpm run notices`，保留重新生成的 `THIRD-PARTY-NOTICES.md` 并跑 `pnpm run check:notices`；用户授权提交时一起提交，不能手改生成文件。
4. Rust crate 使用 `--locked` 构建，并重新运行 `pnpm run notices`。

React/React DOM、Radix、clsx、tailwind-merge、cmdk、sonner、zustand、dnd-kit、react-virtual、react-resizable-panels 为 MIT；lucide-react 为 ISC；`class-variance-authority` 为 Apache-2.0，需包含许可全文。Tailwind 与 `tw-animate-css` 的 MIT CSS 和 Geist 字体虽不经过 esbuild，也必须由生成器的 `Embedded in styles.css` 节统计，并参与许可校验；保留 Tailwind 产物的许可注释。

## 改编外部代码

- MIT、ISC 或 BSD 项目的代码可以改编：写一段头部注释，注明来源和上游提交（格式见下方），在 `NOTICE` 里添加或更新条目，并在该上游的第三方说明文档（`docs/third-party/`，中文维护说明，许可证保留原文）里记录文件对应关系。
- 保留上游的许可证文本。`NOTICE` 和 `docs/third-party/orca-LICENSE.txt` 里的版权行照抄上游，不改写。
- Obsidian Copilot 是 AGPL-3.0，只借鉴公开思路，不复制代码、样式或配置；组件源码取自 MIT 的 Orca / shadcn/ui。GPL/AGPL 项目只能用于了解公开行为，编写 HUHU 时不要打开或改写其源码。

上游改编文件头必须含项目、固定提交、许可证、版权与原文件路径；CSS 同样保留注释。示例：

```ts
// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/ui/button.tsx
// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts (renderSection)
// Adapted from jonaas-dev/obsidian-margin-comments f727e38 (MIT), Copyright (c) 2026 jonaas-dev: src/anchor.ts
```

复制时保留布局和 Tailwind 类名，替换宿主、状态与 i18n 接口；apex 许可以 LICENSE 的 MIT 为准。保留 shadcn/ui 原始署名；已删除实现的声明需按实际分发内容核实后清理。

## 终端

终端（`src/modules/agent`、`native/pty-server`）是为 HUHU 编写的，不含 GPL 代码。它依据公开的行为和文档构建：

- 允许的参考：Orca（MIT）、xterm.js 及其插件文档、portable-pty 文档、公开的协议规范（xterm 控制序列、kitty 键盘协议、win32-input-mode、ConPTY、VS Code shell integration、OSC 7）。
- 不允许：GPL 许可的终端项目的源码，任何版本都不行。

## 相似度检查

`scripts/check-similarity.mjs` 比较我方源码树与参考源码树的词元 k-gram（类似 MOSS 的 winnowing），只输出路径和数字，因此可以对不允许阅读的代码运行：

```sh
node scripts/check-similarity.mjs --ours src,native/pty-server/src,scripts,test \
  --theirs <参考目录>[,…] --json <report.json>
```

这个工具只报告。对原始相似份额达到 0.15 或以上、或有超过 40 个词元的原始连续匹配的文件要调查，并人工复核归一化排名靠前的匹配（小文件、词典和 CSS 块在结构上得分偏高）。参考源码树放在仓库之外。在较大的终端改动之后和发版之前运行它。
