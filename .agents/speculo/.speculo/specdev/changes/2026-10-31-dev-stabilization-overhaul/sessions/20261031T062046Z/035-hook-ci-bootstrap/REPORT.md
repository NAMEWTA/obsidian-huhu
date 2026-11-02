# 任务回报

Session: 20261031T062046Z
Task: 035-hook-ci-bootstrap
Status: completed

## 聚焦交接

首次 Windows CI 四文件候选准备完成并停写，没有 Git 或远程写入。实际发现通用 lint 监听所有分支、会启动冻结 Browser 生成段，先报告 Lead 后获得追加精确授权：只在 OS 临时目录准备 remote-only lint overlay，当前仓库 lint.yml 保持原字节。Windows 尚未执行，AC311 未验收；本报告不是 CI 成功证据。

## 产物与验证

### 远端只读预检

实际执行 gh api 读取仓库信息、默认分支九份 workflow 内容、各 job 触发及固定 base 对照，命令均 exit 0。默认分支 main，不存在 hook-windows。另查询专用 ref `repos/NAMEWTA/obsidian-huhu/git/ref/heads/codex/dev-overhaul-hook-validation` 得 404/exit 1，表示本轮观察时 ref 不存在，不是已创建。创建前仍需重查，不覆盖同名分支。

实际浏览 [GitHub workflow_dispatch 官方条件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)：默认分支存在 workflow 是手动触发条件，不能把单纯推临时分支后 dispatch 作为首次启动保证。因此 hook-windows 新增且仅新增 `push.branches: [codex/dev-overhaul-hook-validation]`，保留 manual；push 的 HUHU_HOOK_ROUNDS 表达式为 `${{ github.event_name == 'push' && 20 || inputs.rounds }}`，固定 20，手动仍由冻结 driver 验证 1–100。未添加 main/dev/PR 触发。

| 现有远端 workflow | 该专用分支 push 的结果 |
|---|---|
| lint.yml | 原来 branches=**，必触发 build 的 Ubuntu Node22、Ubuntu Node24、Windows Node24 三项，含 Go/Bot、pnpm build 的 Browser 生成、bundle、lint、test:all、notices。仅靠 Hook 20min 权限不能限制它 |
| browser-phase2-apply/checks/workspace | 仅 feat/browser-phase2-issue-1，不匹配 |
| browser-runtime-build | push main/dev，不匹配 |
| highlights-workspace | push NAMEWTA/6、dev，不匹配 |
| huhu-bot / terminal-build | push dev，不匹配 |
| release | tag push，不匹配；不创建 tag、PR、不发 manual/reusable 调用 |

远端和 base 的上述触发配置一致。没有 workflow_run 后续链。未采用“触发后尽快取消”竞态，也未用会同时跳过 Hook 的 skip-ci 字样。

### 精确 overlay 与四文件

固定 base 为 `86c500556db1d64865c4cc7f1aff1dd83de071fa`。Lead 在 035 TASK 追加授权后，从该 base 的 lint.yml 生成 `/tmp/huhu-hook-ci-bootstrap/lint.yml`，只在现有 build job 增加：

```yaml
if: github.event_name != 'push' || github.ref != 'refs/heads/codex/dev-overhaul-hook-validation'
```

实际核对只有 build 一个 job；移除该新增行后与 base 逐字节相等，解析对象其余字段完全相等。专用 push 条件 false，其他分支 push、PR、manual、workflow_call 均 true。[GitHub job if 文档](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idif) 明确在 matrix 展开前求值，因此此 push 的三个矩阵项均跳过，lint workflow 可出现 skipped 状态但不执行其构建/Browser job。这是静态合同核验，不是假称已经观察远端 skipped。

待最终批准的隔离临时提交恰好四文件：

| 远程提交路径 | 本地来源 | SHA256 |
|---|---|---|
| .github/workflows/hook-windows.yml | 同路径候选 | 99df2dc7eb81f44e6d37874df53085976258bcc3e620f02be1cb7a6af94a35b0 |
| src/modules/agent/platform/desktop/hooks/hook-spool.test.ts | 冻结测试 | 5f20073bdb211b3013028dd1bd154a3592a6975182168cd1ef65ef8f85d68950 |
| scripts/fixtures/dev-overhaul-hook/run-measurement.mjs | 冻结 runner | 61bc9288aadd76693013cdc021da9792c7bad9cc49960125addc7de31d4cccb4 |
| .github/workflows/lint.yml | /tmp/huhu-hook-ci-bootstrap/lint.yml，仅 remote-only overlay | ec7a670314f17ed05f8716f3ce811a584dc5286b956fadb4ae824a209f7bbe89 |

当前仓库 lint.yml 的 git diff 为空。除 hook workflow、中文 README、两项当前摘要及本 REPORT 外未写仓库文件。artifacts-sha256.json 仅更新 workflow/README 对应摘要，不改历史测量或其 hash；024 冻结 test/runner 摘要仍一致。

### 实际静态检查

- YAML 解析：仅 push/workflow_dispatch、专用分支精确值、contents:read、Windows、20min、14days 等断言通过，exit 0。
- push/manual 轮数表达式逐项检查：push→20；manual 1/20/100 原样传递，0/101 仍传入冻结 driver 拒绝，不悄悄转换为合法默认；exit 0。
- overlay 精确字节、对象结构、全部 job 和分支/事件真值表检查通过，exit 0。
- `git diff --check -- .github/workflows/hook-windows.yml docs/e2e/dev-overhaul/hook/README.md docs/e2e/dev-overhaul/hook/artifacts-sha256.json` exit 0；`git diff -- .github/workflows/lint.yml` exit 0 且空。
- 未使用远端 evaluator 实跑表达式，未重跑 20 轮、类型、生产构建或测量；仅 workflow/docs 改变，原输入冻结。

## 问题与下一步

Lead 可据以下确切方案取得最后用户授权：从固定 base 创建独立临时提交，仅包含表中四文件（不携带当前其他工作区改动），创建 `refs/heads/codex/dev-overhaul-hook-validation` 并单次 push，自动启动 Hook Windows 20 轮；不发 PR/tag/release、不更新 main/dev、不合入 lint overlay。创建前再次核对 ref 不存在和全部 workflow 触发范围；有漂移就停止重新审查，不强推。

实际资源为 1 个 windows-latest job，Node24/项目 pnpm frozen install，最多 20 分钟，20 轮各 96 个真实 publisher，轮间串行；单轮外部60秒、日志8MiB上限、每 publisher测量行16KiB；失败不重试，上传 `hook-windows-<run_id>-<attempt>` artifact，保留14天。下载并检查每轮目标到达/96事件/顺序/唯一性/回收及环境；driver exit 1 的独立顺序观察不能混为原 Vitest 失败。随后临时分支清理需纳入同一次具体授权范围，不默认擅自删除。

当前只完成可审查准备，尚无 branch/commit/push/dispatch/CI，未消耗远程 runner。若依赖安装或环境失败，应如实保留“目标未到达”；不能承诺 CI 必通过，也不能用 Linux 1920 事件替代 Windows 验收。候选停写交 Lead。
