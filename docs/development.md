# 开发与发布

项目和贡献入口见 [AGENTS](../AGENTS.md)，当前结构见[架构](architecture.md)。界面文案保留 en/zh；维护文档以中文为源，根 README 保持双语。

## 本地验证

使用 package.json 固定的 pnpm，先执行 `pnpm install --frozen-lockfile`。`pnpm build` 检查源码和测试类型，再生成 Tailwind、核对样式并构建 main.js；修改样式输入时先执行 `pnpm build:css`。

| 命令 | 作用 |
|---|---|
| `pnpm lint` / `pnpm lint:css` | 零警告代码检查与作者样式检查 |
| `pnpm test:all` | 完整 Vitest 及架构、国际化、文档、样式、安全等验证脚本 |
| `pnpm check:native` | 锁定依赖的 Rust 终端 helper 测试 |
| `pnpm check:bundle` | 启动闭包、模块及产物预算 |
| `pnpm notices` / `pnpm check:notices` | 生成并验证实际打包依赖的完整许可声明 |

构建产物 `main.js`、`styles.css` 以及第三方通知随源码提交；原生二进制由 CI 构建，不提交进仓库。格式样本只在有意改变数据约定时更新；不能为通过检查关闭规则或随意放大预算。按[行为验证](../.agents/skills/dev-verify/SKILL.md)选择能证明改动的检查。真实宿主探针使用一次性库，证据保存在仓库之外；不能将旧任务证据写成当前版实测。

## CI 分工

日常验证只保留一次 Ubuntu / Node 24 全量检查，避免同一份源码被多个模块工作流重复构建。

| 工作流 | 触发 | 责任 |
|---|---|---|
| `lint.yml`（CI） | `main` 推送、PR、手动或发布调用 | 构建与产物一致性、代码/样式检查、Rust 测试、完整 `test:all`、依赖许可 |
| `terminal-build.yml` | 原生代码相关 PR、手动或发布调用 | 五个平台分别测试、构建、验证并打包 helper 与 CLI |
| `release.yml` | 版本标签推送或手动运行 | 同一提交的 CI 和五平台构建成功后，校验版本、打包、生成校验和并发布 |

高亮测试包含于完整 Vitest；`test:task` 是本地定向入口，`test:all` 不再重复执行该子集。性能和 Windows Hook 测量保留现有脚本，按相关改动手动运行，不作为每次提交的重复工作流：

```sh
# 在已安装 Chromium 的目标机器上采样；输出保留环境和每轮数据。
node --test scripts/perf/sample.test.mjs
node scripts/perf/sample.mjs --fixture small --seed 20261031 --runs 5 --out temp/perf/small
node scripts/perf/sample.mjs --fixture large --seed 20261031 --runs 20 --out temp/perf/large
```

```powershell
# 在 Windows 上验证 32 个 scope × 3 个有序事件，保存所有轮次。
$env:HUHU_HOOK_ROUNDS = '20'
$env:HUHU_HOOK_EXPECT_PLATFORM = 'win32'
$env:HUHU_TEST_HOOK_EVIDENCE = 'temp/hook/windows-run'
node scripts/fixtures/dev-overhaul-hook/run-measurement.mjs
```

跨平台 helper 构建验证与 Obsidian 宿主交互验证分别记录。日常 Linux 检查不表示 Windows/macOS 的 UI、输入法或真实宿主流程已经通过。

## 许可与来源

自有材料按 HUHU Source Available License 1.0，第三方各循原许可。改编时固定上游提交并保留文件头、版权及完整许可。来源记录见[参考映射](references.md)。通知生成不依赖临时联网；缺失全文或附加声明必须修复生成器输入，不能手改生成通知。终端只使用允许的实现、公开 API 和协议资料，不移植 GPL 终端代码。

## 版本与 Release

manifest、package、versions、CHANGELOG 和 native crate 使用当前版本。首次版本为 0.0.1，标签不带 v，正式发布不带预览后缀。

发布入口仅为 `.github/workflows/release.yml`。先推送 main 并通过检查，再推送版本标签；手动重新发布时也选择该标签，版本校验拒绝不匹配的 ref。发布使用同一提交的 CI 与五平台终端 helper / `huhu` CLI（每个平台的 CLI 附 `.sha256` 与由所构建二进制生成的 `.compat.json`）。CI 核对提交产物、原生校验和与兼容记录。

发布后从新仓库 Release 安装并验证下载；不得回退旧仓库的 helper。真实账号、移动设备或没有宿主可用的平台没有实测时，交付说明应保留该边界。

## Issue

通过[分类表单](https://github.com/NAMEWTA/obsidian-huhu/issues/new/choose)提交 BUG、需求、优化、兼容、文档和咨询；商业使用走专用授权表单，必须取得书面许可。标签定义保存在 .github/labels.json，表单位于 .github/ISSUE_TEMPLATE；新增分类时同步二者与 README。
