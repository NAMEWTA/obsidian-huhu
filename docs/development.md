# 开发与发布

项目和贡献入口见 [AGENTS](../AGENTS.md)，当前结构见[架构](architecture.md)。界面文案保留 en/zh；维护文档以中文为源，根 README 保持双语。

## 本地验证

使用 package.json 固定的 pnpm，先执行 `pnpm install --frozen-lockfile`。`pnpm build` 检查源码与测试类型，生成 Tailwind 并核对样式，构建 main.js；修改样式输入时先执行 `pnpm build:css`。

| 命令 | 作用 |
|---|---|
| `pnpm lint` / `pnpm lint:css` | 零警告代码检查与作者样式检查 |
| `pnpm test:all` | 完整 Vitest 及架构、国际化、文档、样式、安全等验证脚本 |
| `pnpm check:native` | 锁定依赖的 Rust helper 测试 |
| `pnpm check:bundle` | 启动闭包、模块及产物预算 |
| `pnpm notices` / `pnpm check:notices` | 生成并验证实际打包依赖的完整许可声明 |

构建产物 main.js、styles.css 和第三方通知随源码提交。格式样本只在有意改变数据约定时更新；不能为通过检查关闭规则或随意放大预算。具体测试选择见[测试参考](../.agents/skills/dev/references/testing.md)。真实宿主探针使用一次性库，证据保存在仓库之外；不能将旧任务证据写成当前版实测。

## 许可与来源

自有材料按 HUHU Source Available License 1.0，第三方各循原许可。改编时固定上游提交并保留文件头、版权及完整许可。来源记录见[参考映射](references.md)。通知生成不依赖临时联网；缺失全文或附加声明必须修复生成器输入，不能手改生成通知。终端只使用允许的实现、公开 API 和协议资料，不移植 GPL 终端代码。

## 版本与 Release

manifest、package、versions、CHANGELOG 和 native crate 使用当前版本。首次版本为 0.0.1，标签不带 v，正式发布不带预览后缀。

发布入口仅为 `.github/workflows/release.yml`。先推送 main 并通过检查，再推送版本标签；同一提交需通过 Linux Node 22/24、Windows Node 24 检查与五平台 helper 与 `huhu` CLI 构建（每个平台的 CLI 附 `.sha256` 与由所构建二进制生成的 `.compat.json`）。CI 核对提交产物、插件清单、版本、原生 stdio 和 SHA-256，生成来源证明，再发布插件、huhu-<版本>.zip、五平台 huhu-pty 与 huhu、兼容记录、许可和校验文件。

发布后从新仓库 Release 安装并验证下载；不得回退旧仓库的 helper。真实账号、移动设备或没有宿主可用的平台没有实测时，交付说明应保留该边界。

## Issue

通过[分类表单](https://github.com/NAMEWTA/obsidian-huhu/issues/new/choose)提交 BUG、需求、优化、兼容、文档和咨询；商业使用走专用授权表单，必须取得书面许可。标签定义保存在 .github/labels.json，表单位于 .github/ISSUE_TEMPLATE；新增分类时同步二者与 README。
