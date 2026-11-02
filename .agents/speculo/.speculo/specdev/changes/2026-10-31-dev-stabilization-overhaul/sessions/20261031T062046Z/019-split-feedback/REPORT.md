# 任务回报

Session: 20261031T062046Z
Task: 019-split-feedback
Status: completed

## 聚焦交接

T-18 实施候选完成并停写，completed 仅表示交回 Lead，不表示 Ticket 正式验收。保留单标签不能拆出空组的规则，将原静默失败改为统一业务结果及非 Browser 入口的双语原因提示；不新建、复制、停止或重启终端来绕过保护。命令在异步准备前捕获窗口、Space、标签与组，在打开工作台前后均重验，目标改变即拒绝。最终定向回归 11 文件、114 测试通过，测试类型、生产源码 ESLint、i18n、architecture 和 172 个 Browser 冻结文件核验均 exit0；下一步由 Lead 审查并执行指定 E2E/共享构建。

## 产物与验证

### 修改与入口

- `core/workspace/ops.ts`：抽出既有分屏 guard 的 `workspaceMoveReason`，提供 `WorkspaceMoveTarget/Result/Reason`；拒绝保留原状态，原分屏/移动算法不改。`ops.test.ts` 覆盖缺失 tab/group、重复组、固定标签、页标签、四组上限、最后标签移动到另一组及空组消除。
- `services/workspace-service.ts`：共享 `move` 返回成功目标或拒绝原因，不增加通知；非 Browser 展示入口 opt-in `moveFromUI`，拒绝经既有 report 通道，成功聚焦原 terminal pane。真实服务测试覆盖四方向及身份/launch/end/remove 不变。
- `services/controller.ts`：命令面板右/下分屏走捕获/复核流程；既有 Browser 命令分支保留。`resumeAt` 仅非 Browser 分屏读取结果。`controller-control.test.ts` 使用真实 Controller/WorkspaceService 与外部 shell/native 端口，验证等待准备期间换标签、打开期间换窗口、单标签拒绝、双页成功且不 spawn。
- `ui/AgentWorkspacePage.tsx`：快捷键非 Browser 分屏使用同一服务；旧 Browser 分支不变。DOM 测试验证真实 keyboard-scope → 页面 command → 服务 → 状态，沿用该文件既有 WorkspaceLayout 展示 stub，不以此宣称完整实际页面端到端。
- `ui/tabs/WorkspaceTab.tsx`：右/下菜单非 Browser 可执行并显示拒绝原因；Browser 原四组禁用和 move 分支保留。新增 `WorkspaceTab.dom.test.tsx` 使用真实 ContextMenu、DndContext 与 WorkspaceService，验证单页提示、双页成功。
- `ui/workspace/WorkspaceLayout.tsx`：实际拖拽非 Browser 入口读取同一结果，捕获 Document/Space/源组并拒绝漂移；Browser 原移动调用保留。DOM 测试使用真实 PointerSensor、DropZones、布局和服务，仅给布局测量边界提供矩形；单/双页拖向右边缘均覆盖。原文件既有页内容/Browser 展示 stub 保留，没有运行 Browser 专项。
- `ui/sidebar/AgentSidebar.tsx`、`ui/jump/JumpPalette.tsx`：其非 Browser 右/下分屏改读统一结果；Jump 拒绝时保留调色板，重新打开标签后按当前真实标签类型判断 Browser 分支。Jump DOM 由旧 workspace 方法 mock 改为真实服务/状态，历史恢复 orchestrator 的原端口 mock 保留。
- `i18n.ts`：en/zh 各七个拒绝原因。无 CSS、T23 共享 UI、main.js、styles.css、预算配置或依赖变更。

上述路径除特别标明外均相对 `src/modules/agent/`。只修改 Ticket18 授权写集和本 REPORT；没有 Git 提交/推送。

### 红绿及命令证据

环境 Node v26.11.1、pnpm 11.1.3、Vitest v5.0.3。日志及退出码保存在 `/tmp/huhu-t18-<名称>.log/.exit`，由 Lead 归入正式证据；本任务目录不另建日志。非零记录原值 126，未改写为 0。

| 名称 | 实际命令/范围 | 结果 |
|---|---|---|
| d-red | `node .agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/diagnostics/T-18/split-silent.mjs 1` | 126；真实观察 sameState=true、reports=0、outcome=null，行为断言失败 |
| service-red | `pnpm exec vitest run src/modules/agent/services/workspace-service.test.ts -t 'last-tab split returns'` | 126；实际返回 undefined，要求 last-tab 原因的断言失败 |
| core-service-green | `pnpm exec vitest run src/modules/agent/core/workspace/ops.test.ts src/modules/agent/services/workspace-service.test.ts -t 'workspace operations\|last-tab split returns'` | 0；12 通过、19 跳过 |
| existing-regression | core/workspace、service、Page/Layout/Sidebar/Jump 定向 | 126；85 通过、2 个旧 Jump 方法 mock 断言失败；已改真实服务测试 |
| jump | 单独 Jump DOM | 126；4 通过、1 个测试把当前中文反馈硬断言为英文，后改用实际 t() 字典值 |
| expanded | ops/service/controller-control/Jump | 0；55 通过 |
| menu | `pnpm exec vitest run src/modules/agent/ui/tabs/WorkspaceTab.dom.test.tsx` | 0；2 通过 |
| key-drag | Page/Layout DOM | 126；21 通过、2 个新键盘 fixture 缺 Space 展示依赖导致挂载失败；不计行为红灯，已补外部展示数据 |
| keyboard | `pnpm exec vitest run src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx -t 'real workspace shortcut'` | 0；2 通过、14 跳过 |
| final-regression | 下列完整定向命令 | 0；11 文件、114 通过，4.94 秒 |
| types | `pnpm exec tsc --noEmit -p tsconfig.test.json` | 126；依赖声明检查噪声及新测试 openPage 可空类型；已修测试非空约束 |
| types-final | `pnpm exec tsc --noEmit --skipLibCheck -p tsconfig.test.json` | 0；仓库惯用依赖声明跳过选项，未改配置 |
| eslint | 生产与测试文件显式列表，`--max-warnings 0` | 126；7 个测试文件按现有配置被忽略的警告，无源码错误 |
| eslint-final | 本票 9 个生产 TS/TSX 文件，`pnpm exec eslint … --max-warnings 0` | 0；不把忽略的测试声称为 lint 已覆盖 |
| i18n | `pnpm run test:i18n` | 0；35 字典、6397 keys |
| architecture | `pnpm run test:architecture` | 0；1482 模块，无边界/循环违规 |
| frozen | Python SHA256 对比 `docs/e2e/dev-overhaul/baseline/browser-frozen-sha256.json` | 0；172 文件 changed=[] |

最终定向命令：

```sh
pnpm exec vitest run src/modules/agent/core/workspace src/modules/agent/services/workspace-service.test.ts src/modules/agent/services/controller-control.test.ts src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx src/modules/agent/ui/tabs/WorkspaceTab.dom.test.tsx src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx src/modules/agent/ui/jump/JumpPalette.dom.test.tsx
```

最后测试类型修正仅在 ops.test.ts 给已确定非空的 openPage 结果加 `!`，不改变运行时输入或此前 114 项结果。共享构建由 Lead 独占，本 worker 没有构建生成物。所有新增实现复用仓库已有 workspace guard、report/t()、dnd-kit 和 ContextMenu，没有新增上游代码、第三方依赖或许可文本。

### 未完成或未验证

- Lead 正式源码审查、指定 E2E 和最终共享生成物/预算验收尚待进行。
- 未连接真实 Obsidian；真实宿主窗口焦点、插件命令分发及 PTY 生命周期最终体验需用户/Lead 按执行边界验收。本票不宣称历史全部焦点故障已解决。
- DOM 拖拽实际覆盖右边缘，模型/真实服务覆盖右、下、左、上；不声称实际 DOM 四边全部跑过。键盘展示 stub 的边界见上。
- Browser 专项与冻结分支行为不新增测试/修复；共享 move 的新返回值由其忽略，原通知及控件分支保留。

## 问题与下一步

无实施阻塞。候选源码/测试已停写；请 Lead 接手正式审查、必要 E2E 与生成物同步，正式记录和任务状态由 Lead 更新。
