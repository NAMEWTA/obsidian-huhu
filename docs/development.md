# 开发与发布

项目和贡献入口见 [AGENTS](../AGENTS.md)，当前结构见[架构](architecture.md)。界面文案保留 en/zh；维护文档以中文为源，根 README 保持双语。

## 本地验证

使用 package.json 固定的 pnpm，先执行 `pnpm install --frozen-lockfile`。`pnpm build` 检查源码、测试和浏览器 Worker 类型，生成浏览器 Worker、CLI 与固定主进程桥，再生成 Tailwind、核对样式并构建 main.js；修改样式输入时先执行 `pnpm build:css`。

| 命令 | 作用 |
|---|---|
| `pnpm lint` / `pnpm lint:css` | 零警告代码检查与作者样式检查 |
| `pnpm test:all` | 完整 Vitest 及架构、国际化、文档、样式、安全等验证脚本 |
| `pnpm check:native` | 锁定依赖的 Rust 终端 helper 测试 |
| `pnpm build:browser` | 构建独立浏览器 Worker、固定主进程桥、CLI/MCP 客户端及摘要 |
| `pnpm check:browser-native` | `native/browser-runtime` 的 Rust 测试，不代替真实 Chromium 验证 |
| `pnpm accept:browser-native -- <helper> <chromium> <新证据目录>` | 使用指定本地产物执行真实 Chromium 原生探针，保留浏览器沙箱；参数和环境见[浏览器运行时](browser-runtime.md) |
| `pnpm check:huhu-bot` | 锁定依赖的 Go Bot Runner 测试与工程检查 |
| `pnpm build:huhu-bot` | 构建本机 Bot Runner |
| `pnpm check:bundle` | 启动闭包、模块及产物预算 |
| `pnpm notices` / `pnpm check:notices` | 生成并验证实际打包依赖的完整许可声明 |

构建产物 `main.js`、`styles.css`、`browser-worker.cjs`、`browser-cli.cjs`、各自的摘要和浏览器生成桥接文件，以及第三方通知随源码提交；原生二进制由 CI 构建，不提交进仓库。格式样本只在有意改变数据约定时更新；不能为通过检查关闭规则或随意放大预算。具体测试选择见[测试参考](../.agents/skills/dev/references/testing.md)。真实宿主探针使用一次性库，证据保存在仓库之外；不能将旧任务证据写成当前版实测。

Linux 的 Go 凭证合同测试还需要 `dbus-daemon` 与支持 `sqlite3` 的 `python3`，Node/pnpm/esbuild 使用项目锁定依赖。测试使用禁止服务自动激活的显式私有 D-Bus 配置；缺少辅助工具会失败，不跳过。CI 在执行合同前检查这些前提。

## 许可与来源

自有材料按 HUHU Source Available License 1.0，第三方各循原许可。改编时固定上游提交并保留文件头、版权及完整许可。来源记录见[参考映射](references.md)。通知生成不依赖临时联网；缺失全文或附加声明必须修复生成器输入，不能手改生成通知。终端只使用允许的实现、公开 API 和协议资料，不移植 GPL 终端代码。

## 版本与 Release

manifest、package、versions、CHANGELOG 和 native crate 使用当前版本。首次版本为 0.0.1，标签不带 v，正式发布不带预览后缀。

发布入口仅为 `.github/workflows/release.yml`。先推送 main 并通过检查，再推送版本标签；同一提交需通过 Linux Node 22/24、Windows Node 24 检查、五平台终端 helper、Linux 浏览器运行时与 Bot Runner 构建。CI 核对提交产物、浏览器运行包和 Bot 目标。

发布后从新仓库 Release 安装并验证下载；不得回退旧仓库的 helper。真实账号、移动设备或没有宿主可用的平台没有实测时，交付说明应保留该边界。

## Issue

通过[分类表单](https://github.com/NAMEWTA/obsidian-huhu/issues/new/choose)提交 BUG、需求、优化、兼容、文档和咨询；商业使用走专用授权表单，必须取得书面许可。标签定义保存在 .github/labels.json，表单位于 .github/ISSUE_TEMPLATE；新增分类时同步二者与 README。

Bot 的实际页面验收入口为 `scripts/obsidian-acceptance/huhu-bot.mjs`：使用一次性 Vault/HOME，配置当前本机 Runner，检查按需启动、各分区页面、主机错误、关闭与代表性宽度截图。`--check` 仅证明入口配置存在，不能替代真实宿主运行；三协议的本地 HTTP 合同测试也不能代替真实 Provider/model 及其他 OS 的验收。
