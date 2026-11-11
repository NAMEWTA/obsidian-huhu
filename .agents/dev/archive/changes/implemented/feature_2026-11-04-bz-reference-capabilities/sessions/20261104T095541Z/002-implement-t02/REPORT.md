# 任务回报

Session: 20261104T095541Z
Task: 002-implement-t02
Status: completed

## 聚焦交接

T-02 实现候选已留在原 current 工作区，未提交；completed 仅表示候选交回，不表示 Ticket done。shared 协议、host 窗口适配、app 生命周期装配，以及 safe 复制失败和 archives 保存失败两条真实消费者路径均已实现并自测。采用每窗口独立 ID 的现有 Toaster，通过 app 动态导入 React/UI，保持 host/shared 的架构边界和启动懒加载，不修改只读 sonner 组件。请 Lead 核验候选、补充来源登记、安排另一 reviewer 双轴独立审查，并执行共享构建与最终验收。

## 产物与验证

### 实际修改文件

新增：

- `src/shared/feedback/index.ts`：纯协议、操作身份、目标/来源作用域、去重窗口、终态与提交回执、敏感参数处理、动作及可释放运行时。
- `src/shared/feedback/policy.ts`：字数时长策略、默认 30 秒去重窗。
- `src/shared/feedback/feedback.test.ts`：8 项协议/策略测试。
- `src/host/obsidian/feedback.ts`：插件实例拥有的反馈运行时，窗口绑定与公共 `publishFeedback` / `reportOperationFailure` 入口；sonner 渲染端口、原生 Notice 回退、窗口与插件清理。
- `src/host/obsidian/feedback.dom.test.tsx`：4 项宿主 DOM 测试，使用真实 app 渲染函数与 sonner；仅替换 Obsidian Plugin/ItemView 基类和原生 Notice 系统边界。
- `src/modules/safe/services/feedback.dom.test.tsx`：真实 SafeService、WebCrypto、密文仓库与失败剪贴板端口；notifications 禁用后的反馈和秘密哨兵验证。
- `src/modules/archives/ui/generic/feedback.dom.test.tsx`：真实 RecordEditor、ArchivesApplication 与冲突文件端口；notifications 禁用后的保存失败反馈及草稿保留。

修改：

- `src/app/main.ts`：懒加载 `mountFeedbackRenderer`，每窗口独立 Toaster ID/Portal，装配现存窗口、window-open/window-close 和插件清理。
- `src/modules/safe/services/safe-service.ts`：仅在当前会话的剪贴板写入失败时报告固定错误键；原 SafeError、秘密清理和剪贴板行为保留。
- `src/modules/archives/ui/generic/RecordEditor.tsx`：仅在存活编辑器的保存失败分支报告固定错误键；保留原错误、字段定位与草稿。
- `src/modules/archives/i18n.ts`：增加 `archives.saveFailed` 的 en/zh 文案。

另新增本 REPORT。未修改 TASK、正式 Evidence、Ticket/Map/Goal 状态、构建产物或只读 sonner 文件；未执行任何 Git 写操作。其他执行者对 NOTICE、docs、navigator 等路径的 dirty 改动保持原样。工作区与基线沿用 README execution-context：dev / `29644dc5833bb209e6282f84fa71441a5a1b99d4`。

### 关键决定与接口语义

- 操作身份由 target/source/operationId 共同确定；进度更新和最终结果复用一个反馈实例。终态不被迟到进度覆盖；不同失败始终保留操作身份，不按同文案或 source 去重键合并。
- `success` 必须携带 `{ committed: true }` 回执，运行时也拒绝无回执的成功；提交时序由 owner 负责。partial/failed/cancelled/locked 均保留独立终态；调用者提供相应本地化结果文案。
- source 去重仅用于普通信息；进度和终态继续按操作处理。去重记录有时间窗和容量上限，关闭目标或卸载时清理。
- 参数用 `{ sensitive: true, value }` 标记后，在翻译和渲染前替换。整条敏感消息必须提供公开替代文案，否则不展示；其动作也不外传。反馈实现不投递持久通知、不记录错误原文；两个消费者只发送固定资源键。
- host 不导入 React/UI。app 首次反馈才动态加载现有 Toaster，并提供独立 toasterId 与所属 Document 的 Portal。加载期间只保留各操作最新状态；加载失败回退 Notice，后续操作同样可用。Notice 的原生容器迁入所属 Document，自动消失由窗口计时器统一管理。
- 关闭一个窗口只释放其反馈、Portal、监听与计时器；插件卸载释放全部目标，迟到加载结果不能重新创建 Portal。必要错误不依赖 notifications 模块。

### AC 对应事实

| AC | 实际验证 |
|---|---|
| AC-101 | shared 测试发送 100 次进度，始终一个活动实例并被终态替换；真实 sonner DOM 测试同样验证 100 次更新、单实例与 success 替换；同文案不同失败不被合并。 |
| AC-102 | deferred owner 回执到达前没有 success；提交后才出现 success；迟到进度不改终态；四种非成功终态独立、failed/partial 对应错误/警告级别。 |
| AC-103 | 两个消费者测试均使用真实 ModuleRegistry 确认 notifications 为 off；safe 实际剪贴板写失败、archives 实际三方合并冲突后仍有反馈。safe 模块结束或档案编辑器卸载后，必要错误仍保留在 host 表面。 |
| AC-104 | 双 iframe Document 使用真实 app mountFeedbackRenderer 与 sonner，内容不串窗；关闭一个窗口保留另一个；卸载后 Portal 消失。shared 清理测试同时确认目标计时器/全部计时器释放，晚到 publish 被忽略；延迟 UI 加载测试确认关闭后不重建 Portal。 |
| AC-105 | shared 参数/整条消息/动作标签哨兵脱敏测试；真实 safe 剪贴板异常中的 SECRET 文本和密码不进入反馈；archives 失败反馈不含草稿原文。 |

### 最终通过的命令

以下退出码均来自实际终端工具结果；构建等 Lead 专属命令未执行。

| 命令 | 退出码 | 结果 |
|---|---:|---|
| `pnpm exec vitest run src/shared/feedback` | 0 | 最终 8 tests 通过。 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx` | 0 | 初期 3 tests 通过；新增回退用例后由下面最终组合覆盖 4 tests。 |
| `pnpm exec vitest run --project dom src/modules/safe/services/feedback.dom.test.tsx` | 0 | 1 test 通过。 |
| `pnpm exec vitest run --project dom src/modules/archives/ui/generic/feedback.dom.test.tsx` | 0 | 1 test 通过。 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx src/modules/safe/services/feedback.dom.test.tsx src/modules/archives/ui/generic/feedback.dom.test.tsx` | 0 | 最终 3 files / 6 tests 通过。 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx src/modules/safe/ui src/modules/archives/ui/generic src/modules/safe/services/feedback.dom.test.tsx` | 0 | 8 files / 43 tests 通过。 |
| `pnpm exec vitest run src/shared/feedback src/modules/safe src/modules/archives/services src/modules/archives/core test/golden/archives-v2.test.ts test/archive-relation.test.ts` | 0 | 20 files / 207 tests 通过，包含所选真实服务、密码学与格式回归；不是全仓测试。 |
| `pnpm exec tsc --noEmit --skipLibCheck -p tsconfig.json` | 0 | 最终生产类型检查通过。 |
| `pnpm exec tsc --noEmit --skipLibCheck -p tsconfig.test.json` | 0 | 最终测试类型检查通过。 |
| `pnpm test:architecture` | 0 | 最终 1286 modules，无分区、宿主依赖、桌面边界、桶文件或循环违规。 |
| `pnpm test:i18n` | 0 | 32 dictionaries / 5293 keys，en/zh 占位符与资源引用通过。 |
| `pnpm run lint` | 0 | 最终全仓 ESLint 零警告。 |
| `pnpm test:safety-regressions` | 0 | 现有安全回归入口通过；输出包含 Node DEP0205 提示，没有测试失败。 |
| `git diff --check -- src/app/main.ts src/modules/archives/i18n.ts src/modules/archives/ui/generic/RecordEditor.tsx src/modules/safe/services/safe-service.ts` | 0 | 修改的已跟踪文件无空白差错。 |

### 红灯、修正与未通过的额外检查

- `pnpm exec vitest run src/shared/feedback` 在开发切片中实际产生退出码 126：先观察 100 次更新仍为 0 实例，再分别观察隐私参数未替换、终态被进度覆盖/级别不符、去重与清理缺失等行为断言失败。对应实现完成后依次变绿，最终为上表 8 tests / 0；没有删除或弱化旧测试。
- 受控反向验证：临时移除 app Toaster 的窗口 ID，执行 `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx -t 'real sonner'`，退出码 126，因目标 Document 没有应有反馈而失败；恢复该行后完整宿主测试通过。
- 受控反向验证：临时移除 safe/archives 两处消费者调用，执行 `pnpm exec vitest run --project dom src/modules/safe/services/feedback.dom.test.tsx src/modules/archives/ui/generic/feedback.dom.test.tsx`，退出码 126，两例均因实际错误反馈为 0 条而失败；恢复后两源码 SHA-256 与变异前逐字一致，最终组合为 0。
- 首次 `pnpm run lint` 退出码 126，发现新协议动作与窗口清理回调的 unbound-method；通过显式 `this: void` 修正，最终同命令为 0。
- 开发中的 `pnpm exec tsc --noEmit --skipLibCheck -p tsconfig.test.json` 曾两次退出码 126，分别发现跨窗口 Event 构造器类型写法、故意非法输入测试缺少 unknown 中转；均已修正，最终同命令为 0。
- 额外尝试 `pnpm exec tsc --noEmit -p tsconfig.json` 退出码 126：暴露 dnd-kit 的 JSX 声明、linkedom DOM 声明、Obsidian HistoryHandler 声明冲突，并发现本次 toast 参数的 type 写法不符。后者已改为 sonner 的对应方法；第三方声明未改。仓库 `package.json` 的 build 本来就对生产和测试使用 `-skipLibCheck`，所以采用相同配置完成上表生产/测试类型检查；裸声明全检没有重跑或宣称通过。

### 项目 Skill Execution Records

实际应用 `.agents/skills/dev/SKILL.md`，不是仅阅读：

1. 规则 2（分区与 api.ts 边界）：shared 只引用 shared；host 只引用 shared/host；两个消费者引用共享 host 适配，不跨入他模块内部；架构门禁通过。
2. 规则 3（懒加载）：React、React DOM、sonner 和 Portal Context 均由 app 内函数动态导入，静态启动闭包只增加 host/shared；未静态导入模块 UI。包体最终检查留给 Lead。
3. 规则 4（生命周期）：app 注册窗口事件与插件 disposer；host 明确关闭单窗口及全部窗口；测试验证 Portal/计时器清理与迟到回调隔离。
4. 规则 6（数据归属）：不增加持久数据或改变路径；safe 密码学/密文与档案写入协议保留；所选安全服务和档案格式回归通过。
5. 规则 7（t 与双语）：host 使用现有 t 翻译协议资源键，safe 复用所属词典；archives 新增 en/zh 成对键；test:i18n 通过。
6. 规则 8（宿主与桌面边界）：shared 无 Obsidian/React/DOM/Node 依赖，宿主 DOM/计时器在 host，UI 在 app 懒加载适配；不增加 Node/Electron 或终端代码。
7. 规则 9（零警告）：修正真实 lint 发现的 unbound-method 后全仓 lint 为 0，没有关闭规则。
8. 规则 11 与完成前选择表：只触及本票授权路径、不安装依赖、不运行禁用构建或生成命令、不提交；按影响执行协议、DOM、safe/archives、类型、架构、i18n、安全回归。共享构建仍归 Lead。
9. 相关参考实际应用：architecture 的导入矩阵；obsidian-api 的所属窗口定时器与资源释放；settings-and-i18n 的所属词典；testing 的就近测试与真实服务；licensing 的固定 SHA/版权/来源。也读取并参照 ui：复用现有 Toaster、保持所属 Document/Portal、动作使用原生按钮，不变更页面布局、CSS 或视觉基线。

### bz 复用与 Lead 待登记项

实际只读获取固定提交 `src/core/notice.ts`，命令：`gh api 'repos/yeshimei/bz/contents/src/core/notice.ts?ref=d76a0870329403247917a00c43019e203a2560a4' --jq .content | base64 --decode`，退出码 0；也读取本地由 T-01 提供的 bz MIT 许可原文。

- 原始来源：https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/notice.ts
- `src/shared/feedback/policy.ts`：改编字数时长公式（基础 3/5 秒、超过 20 字每字 60ms、上限 15 秒）与 30 秒默认去重窗。
- `src/shared/feedback/index.ts`：借鉴同键合并、进度原位转结果的行为，重写为实例/窗口/来源/操作作用域与注入端口；增加提交回执、终态保护、隐私处理和生命周期。
- 两文件头均保留仓库、完整 SHA、原路径、MIT、`Copyright (c) 2026 叫我包仔`、修改说明及原始 URL。不采用上游全局 document、固定 ID 容器、全局 live/recent、动态 z-index 或原始异常拼接。
- 请 Lead 将上述两条实际采用范围登记到 `docs/third-party/bz.md`，其不在本任务写集，执行者没有修改。

### 未执行 / 未验证

- `pnpm run build`、`pnpm run build:css`、`pnpm notices`：未执行，owner Lead，TASK 明确禁止执行者改写共享产物。
- `pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。
- 双轴独立审查、正式 Evidence、Ticket 状态和最终验收：未执行，owner Lead / 另一 reviewer。实现者未冒充独立审查。
- 真实 Obsidian、原生 Notice 呈现、真实桌面剪贴板和弹出窗口：待用户/Lead 宿主验收；DOM 与端口测试不冒充真机结果。
- 裸 TypeScript 第三方声明全检仍未通过，见上文；项目构建同款 skipLibCheck 类型检查已通过。
- 没有运行全仓 `pnpm test`；执行的是上表定向回归。

## 问题与下一步

无待澄清的实现阻塞，也未越出写集。Lead 下一步应登记 bz 两项采用记录、冻结候选并派双轴独立 reviewer，随后串行构建/检查产物与包体；必要宿主表现保持待验收。其它并行执行者的文件不属于本候选，本 REPORT 不判断其状态。
