# 110 集成清理实现回执（dispatch0 / return0）

本次只修改获批三源；未写 index、状态、Evidence、产物或范围外测试。三源冻结，等待 high 独立审查。主配置 TS7030 已解除，生产类型与 scoped lint 通过；测试类型仍待原 owner 处理范围外诊断。workspace 为 README Execution Context 的 current 工作区，真实 dirty 基线保存在 /tmp/huhu-integration-types-repair/dirty-baseline.txt。

## 修改与影响

- TaskEditor：autosave Effect 唯一无 cleanup 路径增加 `return undefined`；deps、450ms、saveRef 和 cleanup 保持。读取 TaskPage/runtime 调用方与 task-domain 原 DOM；Calendar/TaskContent 均未修改。
- vault-source：requestIdleCallback 读取处显式 `?.bind(win)`，yield 调用 bound 函数；仍以同一 win 为 owner，timeout 60、fallback 4ms、later/cancel 均保持。读取 navigator runtime 与 preview-store 接口；没有平台重构。
- HealthPage：准确删除六个 `[--nd-hit-size:44px]` 类，其他所有字节不变；保留实际 `min-h-11`、焦点、独立控件与动作。读取 Button/AlertDialog 组合及 base hit 规则；没有布局或设计调整。

## 验证

- `node /tmp/huhu-integration-types-repair/check-equivalence.mjs`：退出 0。TaskEditor 使用 loader tsx、target es2021、minify true、format esm 编译 before/after，输出逐字节相同（与生产 target/minify 一致；此为单文件 transform，不冒充完整 bundle）。Navigator 的 before/after scheduler 在临时 VM 对 idle owner/60ms、fallback owner/4ms、now、later/cancel 均通过。Health 校验准确只有六属性删除。
- `pnpm exec tsc -noEmit -skipLibCheck`：退出 0。
- `pnpm exec eslint src/modules/task/ui/TaskEditor.tsx src/modules/navigator/platform/vault-source.ts src/modules/health/ui/HealthPage.tsx --max-warnings 0`：退出 0。
- `pnpm exec vitest run --project dom src/modules/task/ui/task-domain.dom.test.tsx src/modules/health/ui/HealthPage.real.dom.test.tsx`：退出 0，2 文件、34 测试通过。
- `pnpm exec tsc -skipLibCheck -p tsconfig.test.json`：观察到退出 126，6 条范围外诊断：safe-contribution.test.ts:105/106 缺 target/lastTargets；HomeGreetingSummary DOM fixture 的 AgentSessionsPort 缺 attachMaterial；expense/records.dom.test.tsx:200 ByRoleOptions 不支持 exact；foundation.dom.test.tsx:130 icon-xs 不在 Button 类型；git-hunk-newlines.test.ts:6 仍导入已删除 diff-model。没有改动这些文件。

原始日志、编译结果、基线和本次增量 patch：/tmp/huhu-integration-types-repair/ 。未重跑原 66 项日历套件：TaskEditor 编译输出完全相同且日历/TaskContent 冻结。未生成完整 main.js/styles.css、未运行真实宿主/像素验收；本任务无新增行为/视觉设计，产物与全仓门由 Root 统一处理。

## 三源冻结

所有模式均保持 0664。下列为真实工作区 before → after SHA-256；完整 JSON 与修复增量在本地 before.json、after.json、repair-only.patch。

- `src/modules/task/ui/TaskEditor.tsx`
  - before `184429a69ae496464a3b2701cc5ddb5310caaa7aaa45dd315e9fc7bdb575801f`
  - after `dee0215dcbb048668706e2f4b7f0bb0b9cbf8c106484eabe0fd9f6f468208d16`
- `src/modules/navigator/platform/vault-source.ts`
  - before `f26ee54439bc380b1aa67b5b1af25e523fbc1ef78381708e9ef45e23ff166458`
  - after `4f7d31e63061a29e6187a82b0c7b211e31a2482dfb23981dc2b657eb6dbca4f5`
- `src/modules/health/ui/HealthPage.tsx`
  - before `12827950fcf5371fc9486a6d9dc642cb1a951f15e7db5aa6c6b7321be44f3adf`
  - after `2575d28dd2691dc1ef4bbd6e9c3e8b82753591f89f492d60b021cf5145c08a52`

## 下一步

Root 接收 return0，安排 high 对固定三源增量与本地证据审查，再统一集成验证/产物与正式状态。执行者自此停止写入。
