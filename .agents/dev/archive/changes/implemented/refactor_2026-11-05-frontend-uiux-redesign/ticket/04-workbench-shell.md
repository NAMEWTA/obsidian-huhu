---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["home", "automations", "tasks"], "acceptance": ["UX-AUTO-1"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-04"
title: "工作台外壳、二级栏与右详情布局"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "high"
blocked_by: ["T-02"]
contract_ids: ["AC-031", "AC-032", "AC-033", "AC-114"]
owner: "native:/root/cleanup_final"
expected_changes: ["<Path>src/shell/</Path>"]
writable_paths: ["<Path>src/app/device-choice-content.tsx</Path>", "<Path>src/app/device-choice.dom.test.tsx</Path>", "<Path>src/app/workbench/status-segments.test.ts</Path>", "<Path>src/app/workbench/status-policy.test.ts</Path>", "<Path>src/shell/**</Path>", "<Path>src/app/content/**</Path>", "<Path>src/app/intro-content.tsx</Path>", "<Path>src/app/intro-modal.ts</Path>", "<Path>src/app/intro-modal.dom.test.tsx</Path>", "<Path>src/app/device-choice.ts</Path>", "<Path>src/app/device-choice.test.ts</Path>", "<Path>src/app/workbench/status-segments.ts</Path>", "<Path>src/app/workbench/status-policy.ts</Path>", "<Path>src/app/workbench/surfaces/**</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-04/**</Path>", "<Path>src/app/workbench/focus-state.ts</Path>"]
read_only_paths: ["<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/app/contracts/workbench-host.ts</Path>", "<Path>src/app/contracts/workbench-state.ts</Path>", "<Path>src/app/contracts/workbench-state.test.ts</Path>", "<Path>src/app/workbench/compose-workbench.test.ts</Path>", "<Path>src/shared/i18n/workbench.ts</Path>", "<Path>src/shared/i18n/main.ts</Path>", "<Path>src/shared/i18n/huhu.ts</Path>", "<Path>scripts/obsidian-acceptance/p3-shell.mjs</Path>", "<Path>scripts/obsidian-acceptance/status-bar.mjs</Path>", "<Path>src/app/workbench/compose-workbench.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/app/manifests.ts</Path>", "<Path>src/app/contracts/workbench.ts</Path>", "<Path>src/app/workbench/workbench-leaf.ts</Path>", "<Path>src/app/commands.ts</Path>", "<Path>src/app/ribbon.ts</Path>", "<Path>src/ui/react/use-leaf-metrics.ts</Path>", "<Path>src/ui/react/use-leaf-metrics.dom.test.tsx</Path>", "<Path>src/ui/react/modal-layer.tsx</Path>", "<Path>src/app/main.ts</Path>", "<Path>src/app/main-events.dom.test.tsx</Path>", "<Path>src/ui/components/dropdown-menu.tsx</Path>", "<Path>src/ui/components/popover.tsx</Path>", "<Path>src/ui/components/tooltip.tsx</Path>", "<Path>src/ui/components/context-menu.tsx</Path>", "<Path>src/ui/components/hover-card.tsx</Path>", "<Path>src/ui/components/select.tsx</Path>", "<Path>src/ui/react/floating-owner.dom.test.tsx</Path>", "<Path>src/ui/components/huhu/DetailPane.tsx</Path>", "<Path>src/app/recovery-start.ts</Path>"]
shared_path_owners: ["<Path>src/app/contracts/workbench-host.ts</Path> => Lead", "<Path>src/app/contracts/workbench-state.ts</Path> => Lead", "<Path>src/app/contracts/workbench-state.test.ts</Path> => Lead", "<Path>src/app/workbench/compose-workbench.test.ts</Path> => Lead", "<Path>src/shared/i18n/workbench.ts</Path> => Lead", "<Path>src/shared/i18n/main.ts</Path> => Lead", "<Path>src/shared/i18n/huhu.ts</Path> => Lead", "<Path>scripts/obsidian-acceptance/p3-shell.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/status-bar.mjs</Path> => Lead", "<Path>src/app/workbench/compose-workbench.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/app/manifests.ts</Path> => Lead", "<Path>src/app/contracts/workbench.ts</Path> => Lead", "<Path>src/app/workbench/workbench-leaf.ts</Path> => Lead", "<Path>src/app/commands.ts</Path> => Lead", "<Path>src/app/ribbon.ts</Path> => Lead", "<Path>src/ui/react/use-leaf-metrics.ts</Path> => Lead", "<Path>src/ui/react/use-leaf-metrics.dom.test.tsx</Path> => Lead", "<Path>src/ui/react/modal-layer.tsx</Path> => Lead", "<Path>src/app/main.ts</Path> => Lead", "<Path>src/app/main-events.dom.test.tsx</Path> => Lead", "<Path>src/ui/components/dropdown-menu.tsx</Path> => Lead", "<Path>src/ui/components/popover.tsx</Path> => Lead", "<Path>src/ui/components/tooltip.tsx</Path> => Lead", "<Path>src/ui/components/context-menu.tsx</Path> => Lead", "<Path>src/ui/components/hover-card.tsx</Path> => Lead", "<Path>src/ui/components/select.tsx</Path> => Lead", "<Path>src/ui/react/floating-owner.dom.test.tsx</Path> => Lead", "<Path>src/ui/components/huhu/DetailPane.tsx</Path> => Lead", "<Path>src/app/recovery-start.ts</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ae158ca873e740b9f90a5247e53a92b994306d1b9d0efb628f7d18ff59bf7ebb", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-04: 工作台外壳、二级栏与右详情布局

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/spec.md</Path>`
- **设计合同：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-04.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

按 DESIGN §4 重做图标轨、二级栏（272，220–480 拖动/复位/方向键）、页头、DetailPane 宽度规则（按叶子宽度与主区余宽决定内联或 Sheet）、F6 与 Esc 顺序、无二级导航不留空栏。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：ShellRoot、layout、rail、panel、page/PageFrame、status-bar 贡献；窄宽左 Sheet；UI 状态使用唯一新 schema（DEC-002），旧字段不读。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：各模块页面内容（T-05 起）。

## 验收标准

- [x] `AC-031`：满足 Spec 验收合同 AC-031 的可观察结果。
- [x] `AC-032`：满足 Spec 验收合同 AC-032 的可观察结果。
- [x] `AC-033`：满足 Spec 验收合同 AC-033 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 宽度与重排 | 单元/DOM | `pnpm exec vitest run --project dom src/shell` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-04.md</Path>` |
| 生命周期 | 门禁 | `pnpm test:workbench-lifecycle` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-04.md</Path>` |

- **E2E disposition：** required：1440/1100/820/390 四档（T-14 汇总）。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 home, automations, tasks，验收 UX-AUTO-1。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

主题与组件是全部页面的共享合同；合同变化须回到本票修订，消费者票不得自行扩展。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

补齐 ContentPanel、新笔记、首次欢迎、设备选择、状态栏/Ribbon/路由能力过滤。未提供二级栏的页面在窄屏仍可打开模块导航。module manifests 或贡献装配需要改变时经 Lead 的 shared 接缝；host editor-panel/settings 分别归 T-10/T-12，不越权。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-04/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-04 --matrix redesign --out /tmp/huhu-frontend-redesign/T-04`。任何尚未实现的 CLI 参数不记为已通过。

- [x] `AC-114`：满足 Spec 中新增合同及本票的表面责任。

### 023 预检后的范围与接口补全（Map revision 11）

Lead与worker回读真实workbench/content/onboarding/device/status链后，补齐上述共享契约、词典、精确探针与可按需采用的相邻测试路径。新增权限不是要求创建无用途文件；状态纯parser可在已有workbench.ts或新workbench-state.ts唯一实现，禁止在启动app静态导入shell/React来识别持久状态。

SidePanel.tsx在本票由T-04 worker随shell/**单写，Lead不并发编辑；T-06阶段的该文件共享调整仍归Lead，必须保留T-04生产者合同，缺新合同则回原票修订。这是阶段所有权澄清，不保留旧folderClick行为。

PanelContext.ownerWindow由shell按当前view.contentEl.win提供，Lead的compose内容侧栏在文件打开/新笔记后打开时传入该Window，并将primary.run的真实Promise交SidePanel，保留busy/重复提交与失败回执。workbench-host.ts和compose相关共享改动由Lead串行实施，worker只交候选精确修改。

DetailPane生产者T-02已安排独立必需leafWidth:number；T-04从实际叶子DOM量测并传入，main仍由组件实际parent量测。独立页面React根不能假定继承ShellRoot context。现有NativeSurfaceContext已包含leaf/container元素；实现时优先沿真实元素/页面装配传递，避免模块各造一套叶宽持久状态。验证leaf620/main568为360覆盖、leaf580才全宽，960边界与main1000阈值分别测试。

宿主探针同步采用新schema的路由字段，不能为旧探针双写旧target/focus等持久字段。新增设备React内容/DOM测试仅为本票已有设备选择表面迁移，不增加欢迎配置流程、模块数据或默认共享设备策略。

### 实际实现后的叶子与区域焦点接缝（Map revision 13）

独立页面React根通过一个Lead所有的use-leaf-metrics公共hook读取实际data-huhu-leaf元素及宽度，宿主叶子回退到实际workspace-leaf-content；无持久宽度状态或跨React根假设。模块将同一element传给日期族collisionBoundary、width传给DetailPane；受控Dialog的Portal保持显式逻辑边界，不以display:contents PortalRoot作为矩形边界。

导航Sheet的区域F6需要独立于最终modal回焦的动作：Lead在既有modal-layer增加focusAvailableInRegion公开薄入口，复用已有严格可见性筛选与focusRegion，不增加Tab trap或并行过滤引擎。Shell在Sheet自有capture处理F6并preventDefault后再进入原默认处理，目标始终在当前Sheet区域内。其他已验收T-02回焦行为保持，新增源由本票独立复审与真实fixture覆盖。

### 实际组合缺陷与启动清理接缝（Map revision 14）

T-04 的真实独立导航根移入 NavSheet 后，不继承 React modal context。共享非模态入口需沿现存 Document modal stack 按物理锚点确认所属模态，不能将无关背景弹层抬到全局顶层。043 只交私有候选，045 独立审查后由 Lead 单写上述六种入口、modal-layer 与精确回归；保留 Radix 焦点与关闭机制，实际双 Document 命中/Esc 仍是本票验收门。

设备选择的必需 AbortSignal 与 IntroModal.cancel 由本票 UI helper 实现，main.ts 必须绑定插件卸载并在异步加载后重新检查存活，避免卸载后迟开的界面或记录首次介绍已读。相邻 main-events 测试由 Lead 验证真实调用边界。上述权限只补齐既有生命周期与弹层合同，不改变 DAG、设计摘要、领域数据或状态 schema。

### 窄分屏详情实测修正（Map revision 15）

T-04 在真实 1440px 窗口内构造 580px 叶子，发现 DetailPane 的 w-full 仍取 Portal 视口宽。按 DESIGN §4 的所属叶子宽度合同，Lead 修订共享生产者，使窄 Sheet 宽为传入 leafWidth 并受所在 Document 视口上限约束，保留现有 Radix 文档模态、360/440 覆盖模式及编辑器身份。实际分屏宽度由 T-04 同一生产夹具验收，不用 DOM 桩尺寸冒充浏览器证明。

### 启动拒绝路径的界面取消边界（Map revision 16）

047 独立真实调用反例发现，卸载后 recovery-start 仍先发原生 Notice 再拒绝；settings factory 的迟到拒绝也穿透启动。Lead 补齐 main 的统一取消错误出口，并让 recovery-start 在产生 Notice 的边界检查必需启动 AbortSignal。活动 owner 的恢复失败仍正常提示并传播原始错误；已开始的领域恢复事务继续按原协议完成，不新增领域取消、数据或恢复格式。相邻真实 main/recovery-start 配对回归沿 main-events 验证。
