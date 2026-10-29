# 工作台 CLI 与交付：来源与许可登记

本文逐文件登记终端工作台 CLI（`huhu`）、其交付资产、配套 Skill 与相关校验脚本的来源。结论：**借鉴公开机制，未复制、未改编任何第三方源码**；因此 [NOTICE](../../NOTICE) 没有新增改编条目。链接进 `huhu` 的 Rust crate 由 `THIRD-PARTY-NOTICES.md` 的“Linked into huhu-pty and huhu”一节生成并由 `pnpm run check:notices` 校验。

## 参考（仅机制，不含代码）

| 参考 | 固定版本 | 许可 | 借鉴的公开机制 | 未采用 |
|---|---|---|---|---|
| [Herdr](https://github.com/herdrdev/herdr) | `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01` | 根 LICENSE 为 Apache-2.0；其 vendor 目录另有许可，逐文件看，本项目均未引入 | 面向智能体的受控 CLI、显式目标、等待与读屏分离 | 任何文件、协议实现 |
| [Wave Terminal](https://github.com/wavetermdev/waveterm) | `97e560027f494d20fed347b2d6b72b6bcb3e50e0` | Apache-2.0 | 后端持有控制，前端只消费状态；`wsh` 作为独立 CLI 的分层 | 任何文件 |
| [tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode) | 公开文档 | 仅读文档 | 控制通道与回执分离的思路 | 源码 |
| [portable-pty](https://github.com/wezterm/wezterm) | 0.9（`Cargo.lock` 锁定） | MIT | 作为依赖链接进 helper，不拷贝源码 | 无 |

GPL/AGPL 终端项目的源码未被阅读、复制或改写。

## 逐文件登记

全部为 HUHU 原创（HUHU Source Available License 1.0），来源栏中“无”表示没有第三方代码。

| 文件 | 内容 | 第三方来源 |
|---|---|---|
| `native/pty-server/src/bin/huhu.rs`、`native/pty-server/src/control/**` | CLI 入口、语法、协议 | 无（依赖 crate 见生成的通知） |
| `src/host/desktop/native/binary.ts` | 摘要校验、回执、离线复用的共用管线（原有 helper 逻辑泛化） | 无 |
| `src/host/desktop/native/binary-cli.ts` | CLI 资产名、兼容记录解析与协议主版本检查 | 无 |
| `src/modules/agent/core/control/skill.ts`、`skill/huhu-control.{en,zh}.md` | 随插件打包的 HUHU 控制 Skill 资源 | 无；格式沿用 `SKILL.md` 的公开 frontmatter 约定 |
| `scripts/verify-release-artifacts.mjs`、`scripts/verify-pty-helper.mjs` | 十个原生资产、摘要、兼容记录、CLI 黑盒校验 | 无 |
| `.github/workflows/terminal-build.yml` | 同批构建 helper 与 CLI 并生成兼容记录 | 无；使用的 GitHub Actions 与原工作流相同 |
| `src/modules/agent/platform/desktop/control/cli-environment.ts`（+ 测试） | 终端 PATH/`HUHU_CLI` 注入与不阻塞启动的就绪等待 | 无 |
| `src/modules/agent/platform/desktop/skills/packaged.ts`、`ops.ts`、`host-ops.ts`（+ 测试） | 随插件打包 Skill 的 HUHU 自有来源目录；既有技能管理流程的 `packaged` 扩展点 | 无；技能复制流程仍是 [skills-manager 改编说明](skills-manager.md) 所列部分 |
| `src/host/desktop/native/runtime.ts`、`src/shared/native/host.ts`、`src/shared/native/lazy-host.ts`（+ 测试） | `NativeHostAccess.cli`、状态与本地化提示 | 无 |
| `src/modules/agent/services/controller.ts`、`services/terminal/sessions.ts`、`ui/settings/TerminalSettings.tsx`、`i18n.ts`、`src/shared/i18n/lazy/native.ts` | 终端环境接线、设置里的命令行工具检查行与文案 | 无 |
| `.github/workflows/release.yml`（仅冒烟步骤） | 发布前对打包的 Linux CLI 冒烟 | 无 |
| `test/release/release-artifacts.test.ts`、`test/release/control-skill.test.ts` | 资产与 Skill 示例测试 | 无 |

## 相似度检查

`node scripts/check-similarity.mjs --ours src,native/pty-server/src,scripts,test/release --theirs <Herdr 固定提交 2ecf19a 的检出目录>` 比较 1985 个本方文件与 461 个参考文件：原始相似份额不低于 0.15 或原始连续匹配超过 40 个词元的文件为 0；有 57 个文件的归一化份额不低于 0.05，均为词典、样式类结构性高分（小文件、字符串表），其中本票文件只有 `src/shared/i18n/lazy/native.ts`（归一化 0.333，原始 0）。该报告只证明本次工作树与该固定提交无复制；Wave、tmux 为仅读公开文档，无对应源码树可比。发版前仍按[许可规则](../../.agents/skills/dev/references/licensing.md)重新运行。
