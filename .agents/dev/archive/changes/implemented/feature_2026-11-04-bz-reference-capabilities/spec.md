---
schema_version: 3
artifact: spec
change: 2026-11-04-bz-reference-capabilities
status: ready
ready_for_tickets: true
sources:
  - SOURCE:<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/source.md</Path>
  - TRIAGE:<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/triage.md</Path>
  - DECISIONS:<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ADR.md</Path>
  - CONTEXT:<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/CONTEXT.md</Path>
  - USER-DECISION:round 1 维护者默认决定与本次指令（LOG-001 至 LOG-009）
  - USER-DECISION:round 2 粒度、范围、基建、原型、体检、顺序、通知、翻页、收藏（LOG-010 至 LOG-020）
  - USER-DECISION:共识确认（LOG-021）
---

# Spec: 借鉴 bz 的公共基建、密码本、归物本、书页日记、人物阅读层与数据体检（#17）

## 问题与目标

**谁受影响：** 在 Obsidian 中使用 HUHU 保险箱、档案、周期日记的用户；以及后续为 HUHU 增加功能和通知渠道的维护者。

**当前问题（dev `81e43c4` 核对，见 triage；2026-11-04 复核至 `29644dc`，其间 src 只改原生 helper 握手，结论不变）：** 即时反馈散落为 25 处 `toast` 与 106 处 `new Notice`，无统一去重/进度/终态语义；17 个文件各自监听 Vault，无领域事件原语；通知请求的目标与渠道是自动化专用的封闭类型（`<Path>src/modules/notifications/api.ts</Path>`、`<Path>src/shared/automation/types.ts</Path>`）；密码本只有列表＋弹窗编辑，缺少快速取密和详情工作区；档案没有物品类型；周期日记只能逐篇打开；没有数据体检能力。

**目标：** 以 bz 最新实现（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 ，MIT）为复刻蓝本（ADR-003），在虎虎现有分层、技术栈与数据契约内交付：统一基建（反馈、领域事件、文件变化、通知）、密码本体验、归物本、书页日记、人物阅读层、只读体检与有限修复。

**成功标准：** 下列 AC 均有自动化测试或独立浏览器 UI runner 的实际证据；宿主内真机表现由用户自行验收，未完成时保持“待用户验收”而不写成通过。每处复用 bz 的内容在来源登记中有固定 SHA、路径、采用方式与偏离原因。

## 解决方案与外部行为

### 共同约束

- 分层沿用 `app / shell / ui / theme / host / shared / modules`；模块经对方 `api.ts` 互访，`manifest → module → core/platform/services/ui` 装配；React 19＋Tailwind 4＋shadcn/Radix；面向用户文案用 `t()` 并同时给 `en`/`zh`。
- 数据边界：用户内容在 `huhu/`（档案默认 `huhu/archives`），设置与运行数据在 `.huhu/`；不使用插件目录存业务数据（bz `storage-path.ts` 的做法明确不采用）。
- 复用：bz 交互与布局按其单源实现 `src/{password-vault,belongings,diary,people,checkup}/` 的 `ui.ts`/`render.ts`/`styles.css` 复刻（bz 已在 ADR-0276、提交 4f0d767 删除 `prototypes/`，LOG-022）；纯逻辑（分卷、统计、去重、事件订阅核心）可复制改编并在文件头署名；safe 密码学、存储与恢复协议不替换（ADR-003）。
- UI 视觉合同由本 change 的 DESIGN（P 原型 UI-001 单包九页，以 bz 原型为唯一候选，用户已预先批准，LOG-013）承担；本 Spec 只锁定交互与状态行为。DESIGN 未产出前 UI 实现不可开始。

### 1. 统一基建（ADR-004、ADR-005）

- **操作反馈：** shared 定义纯协议（操作 ID、去重键与作用域、级别、来源域、目标窗口、可本地化文案、确定/不确定进度、动作、终态 success/partial/failed/cancelled/locked、隐私级别）与策略；host 适配 sonner（工作台内）与 Notice（工作台外）；app 注入并管理生命周期。同一操作更新同一实例；未知总量显示不确定进度；成功提示只在真实提交后出现；敏感原文不进入反馈。notifications 禁用时反馈仍可用。
- **领域事件：** shared 提供实例作用域的类型化事件端口；事件 key/payload 由所属域在 `api.ts` 声明；订阅返回幂等 disposer 并可绑定 `AbortSignal`/模块生命周期；同步异常与异步拒绝隔离；payload 只含 ID、版本/哈希、operationId、原因；事件只作失效提示，消费者回 owner 查询。
- **文件变化适配：** host/obsidian 统一 create/modify/delete/rename/目录移动/metadata 就绪/批次失效；rename 带 oldPath/newPath 并同时失效新旧范围；高频 modify 按路径合并但不抹掉 rename/delete；私有 `.huhu/` 写入由 repository 提交后主动失效；卸载后监听与定时器全部清理，旧 generation 结果不回写。首个接入 owner 为 archives 索引。
- **通知基础设施：** `NotificationRequest` 改为可辨别的来源/目标（自动化运行为其中一种），opener 按类型贡献；渠道由 notifications `api.ts` 定义为可注册的贡献点，`in-app`、`system` 作为首批实现迁入；自动化改用新协议发送。inbox 位置 `.huhu/notifications/<device-id>/inbox.json`、幂等 ID、已读与投递状态语义保持。外部渠道（微信、短信、邮件、飞书等）不在本 change 实现。

### 2. 密码本（safe）

- **快速取密：** 命令打开选择器；未解锁先要求解锁；按平台/条目名/账号搜索（不检索密码），键盘上下/Enter/Esc，IME 组合中不提交；Enter 显式复制所选账号密码，沿用 30 秒条件清理；结果列表不显示明文；无结果时显示空态与“生成新密码”动作，用户触发才生成（12 位、四类字符、安全随机），不自动保存或覆盖。锁定、禁用、窗口关闭时关闭选择器并清空查询；晚到的解密/复制回调不再展示秘密。
- **三段式工作区：** 宽容器为“范围/标签（含收藏标签）→ 条目与账号 → 详情与关系”；窄容器为列表→详情，不嵌第二套 shell。详情完整显示可选手机号/邮箱/账号备注，长备注自动增长或受控滚动，操作栏始终可达；显示当前账号关联与反向引用，跳转保持稳定 ID，失效关系显示诊断。收藏用现有标签表达（LOG-019），不改加密条目 schema。

### 3. 归物本（archives，ADR-001）

- **数据：** 新增物品类型预设（名称、分类、图片、规格/备注、购入日期、购入金额＋币种、状态、出离日期、售价、凭证、可选所有者/关联人物/企业），生命周期事件为带稳定 rowId 的 `table` 字段，与物品同一档案实体。四态：使用中/闲置/已转卖/已丢弃；离场首次可预填今天但可改；离场态互换保留日期；返库追加新事件，不抹去历史。当前状态是可验证投影，只能经专门 transition 命令（基于 `ARCHIVES_COMMANDS.save` 的预期哈希）改变。
- **统计：** 一份纯计算模块供卡片、KPI、报告共用：金额为十进制字符串＋币种，不同币种分栏、不求总额；未知售价与 0 区分；未知/月精度日期不计入精确持有天数；单件日均净成本 = (购入额 − 已实现回收) / 有效持有日，零天与负值单独标注；月度趋势按当时有效事件重放。不自动生成记账记录。
- **界面：** 复刻 bz 归物本：顶部 KPI → 状态条 → 搜索/年份/排序 → 卡片 → 详情流转；状态迁移可撤销（绑定操作 ID 与预期哈希，对象已被修改则提示冲突）；年度报告显示购入/离场、月度购入金额、分类分布、回收金额、持有时间。

### 4. 书页日记（navigator，ADR-002）

- **数据接入：** `NAVIGATOR_PERIODIC` 扩展只读批量列表（按日期范围返回已存在日记的路径/日期/摘要，不建文件）；分卷与月份跨度纯函数改编 bz `volume.ts`，按“天/月”分卷，卷容量是性能参数。
- **阅读：** 新增 navigator 拥有的工作台页面（不新增 Obsidian ViewType）：宽容器双页书本，翻页按钮、方向键、书口月份索引、日历跳日；窄容器单页纵向浏览，无强制 3D 翻页。翻页引擎内嵌 page-flip（StPageFlip，MIT，参考 bz ADR-0230），按需加载，不进启动闭包；reduced-motion 或引擎不可用时用无动画切换。只挂当前卷/页与有限预取，隐藏/关闭后无动画循环。
- **搜索与写作：** 搜索区分“建立索引中/仅已加载范围/全部范围”，未扫描完不宣布无结果。“写一笔”在书内编辑面板中进行：日期、正文、保存状态、放弃确认；空白日期首次真实写入才经模板准备创建（`prepare` 取消或不可用时如实提示，不落空白文件）；已有笔记追加内容经现有文档修改契约，处理未保存编辑器与外部修改冲突，不整篇覆盖。“打开原文”打开同一周期笔记。

### 5. 人物阅读层（archives）

- 人物类型档案提供“概览 / 资料 / 关系 / 纪事”视图（复刻 bz `src/people` 的阅读布局，去除素材/画像部分）；窄容器用分段导航。资料沿用现有动态表单与 schemaRevision；关系复用独立关系记录；纪事为人物预设新增的带 rowId 的 `table` 字段（日期、标题、内容、关联实体），经 `ARCHIVES_COMMANDS` 写入。企业与自定义类型不套用人物布局。

### 6. 数据体检（health，ADR-006）

- 新增 health 模块，登记 ModuleId、manifest、路由、设置与 i18n。health 定义 provider 贡献点：检查 ID、范围、权限条件、只读 scan、诊断结果、可选 repair plan；health 只编排、预算、展示，不 import 他域内部实现。
- 扫描：用户手动触发；只为所需 provider 申请 lease；分片、限并发、`AbortSignal`、真实进度；单 provider 失败不拖垮其他；结果状态区分通过/警告/错误/跳过/不可用/锁定/取消/未完成，报告写明范围、数量与排除项；报告脱敏（不含正文、账号名）。结果保留在内存并显示检查时间与是否已过期。
- 首批 provider：archives（可解析性、稳定 ID 重复、关系端点缺失、修订分支）、归物（状态与生命周期一致性）、周期日记（路径与模板引用）、safe（仅容器存在/版本/大小；锁定时为 locked，不尝试解密）。
- 有限修复：只读检查 → 修复计划与影响预览 → 用户确认 → owner 以当前哈希重验 → 备份/恢复事务 → 修改 → 复查。首批只开放可证明可重建的派生项（档案索引重建）与 owner 支持的归物状态投影纠正；其他项只给定位与说明。禁止自动清空坏文件、删除无端点关系、销毁孤儿密文、清除未完成迁移备份。
- 体检结果需要持久回看时（扫描完成/修复失败）经通知基础设施发送，使用 health 自己的来源类型与 opener。

### 7. 来源登记

新增 `docs/third-party/bz.md`（逐项：上游 SHA/路径、虎虎落点、复制/改编/交互复刻/未采用、偏离原因）、bz LICENSE 原文、page-flip 许可；更新 `NOTICE`、`docs/references.md` 与 `docs/third-party/licenses/sources.json`，按 `pnpm notices`/`pnpm check:notices` 机制生成，不手写依赖清单。

## 验收合同

| ID | 前置条件 | 动作或事件 | 可观察结果 | 验证接缝 |
|---|---|---|---|---|
| AC-001 | 任一票复制/改编/复刻 bz 内容 | 核对来源登记 | `docs/third-party/bz.md` 有对应条目（SHA d76a087、上游路径、方式、落点、偏离原因）；复制文件头有署名；bz 与 page-flip 许可原文存在 | `pnpm check:notices` + `pnpm test:license-texts` + `pnpm test:docs` |
| AC-101 | 同一操作连续 100 次进度更新 | 发送反馈 | 只有一个活动反馈实例，终态替换进度；不同失败不被同文案吞掉 | shared 协议单测 + host 适配 DOM 测试 |
| AC-102 | 写入失败 / 部分成功 / 取消 / 锁定 | 操作结束 | 终态分别呈现，成功提示仅在 owner 提交回执后出现 | 单测（伪 owner 回执时序） |
| AC-103 | notifications 模块禁用 | safe/archives 写入失败 | 仍显示必要错误反馈 | 模块生命周期测试 |
| AC-104 | 两个窗口 | 各自触发反馈后关闭一个窗口 | 反馈渲染在所属 Document；关闭窗口后其 Portal/计时器清理 | DOM 测试（双 Document） |
| AC-105 | 反馈文案含敏感字段标记 | 发送 | 敏感原文不出现在反馈、通知或日志 | 哨兵字符串单测 |
| AC-111 | 事件端口已创建 | 订阅、重复退订、AbortSignal 中止、handler 同步抛错/异步拒绝 | 退订幂等；中止后不再接收；异常隔离不影响其他订阅者 | shared 事件单测 |
| AC-112 | 两个插件实例/Vault | 各自发事件 | 事件不跨实例传播；无 module-level 全局表 | 单测 + `pnpm test:architecture` |
| AC-121 | 档案根目录 | 文件夹重命名、移出根目录、`.md↔.txt` 改名 | 新旧路径范围均失效，archives 索引更新正确 | host 适配单测 + archives 服务测试 |
| AC-122 | modify 先于 metadata 就绪 | 依赖 frontmatter 的读取 | 读取方等待就绪或校验内容版本，不读到旧值 | 适配单测（伪 metadataCache 时序） |
| AC-123 | 高频 modify 与 rename/delete 混合 | 突发事件 | 合并刷新有上限与最大等待；rename/delete 语义不丢；队列溢出时保守 rescan | 适配单测 |
| AC-124 | 模块卸载/禁用 | 卸载后再触发 Vault 事件 | 无残留回调；旧 generation 结果不更新新会话 | `pnpm test:workbench-lifecycle` + 单测 |
| AC-131 | 自动化运行结束 | 发送通知 | 行为与现状一致（名称快照、详情、已读、投递状态），使用泛化协议 | notifications/automations 单测 + `pnpm test:safety-regressions` |
| AC-132 | 非自动化来源（health） | 发送通知并打开 | 无需 runId/automationId；由该来源贡献的 opener 打开目标 | notifications 单测 |
| AC-133 | 注册一个测试渠道贡献 | 发送选择该渠道的通知 | 渠道收到投递，投递状态写入记录；未注册渠道报告 unavailable 而不报错 | notifications 单测 |
| AC-134 | 现有 inbox 文件 | 读取与追加 | 路径与幂等 ID 语义不变；重复 ID 不重复投递 | notifications 单测 |
| AC-201 | 保险箱已锁定 | 执行快速取密命令 | 先显示解锁；解锁后进入搜索 | safe DOM 测试 |
| AC-202 | 已解锁，有多条目多账号 | 输入查询、上下选择、Enter；IME 组合中按 Enter | 按平台/条目/账号命中，列表无明文；Enter 复制并 30 秒条件清理；IME 中不提交 | safe DOM 测试 |
| AC-203 | 查询无结果 | 观察并点击“生成新密码” | 空态出现动作；点击前不生成；生成 12 位四类字符；不自动保存或覆盖 | safe DOM 测试 + 生成器单测 |
| AC-204 | 选择器打开或复制进行中 | 锁定 / 禁用模块 / 关闭窗口 | 选择器关闭、查询清空；晚到回调不展示秘密 | safe DOM 测试（延迟解密桩） |
| AC-211 | 宽 / 窄容器 | 打开保险箱 | 宽为三段式，窄为列表→详情；无第二套 shell | safe DOM 测试 + UI runner |
| AC-212 | 条目含可选手机号/邮箱/长备注/多账号 | 查看详情 | 全部字段可见，长备注可读且操作栏可达 | safe DOM 测试 + UI runner |
| AC-213 | 账号间存在关联与失效关联 | 查看并跳转 | 显示关联与反向引用；跳转定位到稳定 ID；失效关联显示诊断 | safe DOM 测试 |
| AC-214 | 旧格式与当前格式密文 | 解锁与使用新界面 | 手机号/邮箱/关系/标签/回收站/备份不退化；收藏为标签，条目 schema 未变 | safe 全量测试 + `pnpm test:safety-regressions` |
| AC-301 | 档案已初始化 | 安装归物预设 | 物品类型、生命周期 `table` 字段与表单可用；已有用户定义不被覆盖 | archives 服务测试 + 黄金样本 |
| AC-302 | 物品使用中 | 转卖 → 丢弃 → 返库 | 每次迁移追加带 rowId 事件；离场日期可改；离场态互换保留日期；返库不删历史 | 归物领域单测 |
| AC-303 | 同一 operationId 重复提交 / 预期哈希过期 | 执行迁移 | 不新增重复事件 / 拒绝并提示冲突，不覆盖新状态 | 归物领域单测 |
| AC-304 | 多币种、未知售价、0 售价、月精度日期、零天、负净成本 | 计算统计 | 币种分栏无总额；未知≠0；月精度不计精确天数；零天/负值单独标注 | 统计纯函数单测 |
| AC-305 | 跨年度生命周期 | 计算去年月度趋势 | 按当时有效事件重放，与今日状态无关 | 统计纯函数单测 |
| AC-311 | 有物品数据 | 打开归物页 | KPI、状态条、筛选、卡片、详情的数值来自同一计算结果 | 归物 DOM 测试 + UI runner |
| AC-312 | 执行状态迁移 | 点撤销 / 他处已修改后点撤销 | 撤销恢复；已修改时提示冲突不覆盖 | 归物 DOM 测试 |
| AC-313 | 同一物品 | 归物页与通用档案编辑器交替编辑 | 互不覆盖，三方合并规则生效 | archives 服务测试 |
| AC-321 | 有多年数据 | 打开年度报告 | 显示购入/离场、月度金额、分类分布、回收与持有时间，与卡片口径一致 | 归物 DOM 测试 |
| AC-401 | 日记目录有/无若干日期 | 调用批量只读列表 | 只返回已存在笔记；零写入 | navigator 单测（写 API spy） |
| AC-402 | 跨月/跨年日期集合 | 分卷与月份跨度 | 边界正确，空月份处理确定 | 分卷纯函数单测 |
| AC-411 | 宽容器 | 打开书页日记，翻页、方向键、月份索引、日历跳日 | 定位正确；打开同一周期笔记文件 | navigator DOM 测试 + UI runner |
| AC-412 | 窄容器 / reduced-motion / 翻页引擎加载失败 | 浏览 | 单页纵向或无动画切换，功能完整 | navigator DOM 测试 + UI runner |
| AC-413 | 页面未打开 | 插件启动 | 翻页库与书页 UI 不在启动闭包；包体预算无静默放宽 | `pnpm test:architecture` + `pnpm check:bundle` |
| AC-414 | 1,000 篇日记 fixture | 打开并翻页、隐藏页面 | 只挂当前卷与有限预取；隐藏后无持续动画帧 | DOM 测试（节点数与 rAF 计数） |
| AC-421 | 部分卷已加载 | 搜索 | 显示索引状态与范围；未扫描完不显示“无结果” | navigator DOM 测试 |
| AC-422 | 浏览空白日期 | 不写入离开 / 写一笔并保存 / 模板取消 | 不建文件 / 经模板创建一次 / 如实提示且无空白文件 | navigator 服务测试（写 API spy） |
| AC-423 | 已有日记在编辑器中有未保存修改或被外部修改 | 书内写作保存 | 走文档修改契约处理冲突，不整篇覆盖；原文与首页日历一致 | navigator 服务测试 |
| AC-501 | 人物档案 | 打开人物详情 | 概览/资料/关系/纪事视图可用；窄容器分段导航 | archives DOM 测试 + UI runner |
| AC-502 | 人物档案 | 新增/编辑/删除手工纪事 | 经 `ARCHIVES_COMMANDS` 预期哈希写入 rowId 行；未涉及字段与自由正文逐字不变 | archives 服务测试 |
| AC-503 | 两个同名人物 | 分别添加纪事 | 按 entityId 归属，不混档 | archives 服务测试 |
| AC-504 | 企业/自定义类型档案 | 打开详情 | 仍为通用布局，不受人物增强影响 | archives DOM 测试 |
| AC-601 | 含坏 JSON/YAML、缺文件、未来版本的 fixture 库 | 完整扫描 | 写 API spy 记录零创建/修改/删除；坏文件字节不变 | health 集成测试 |
| AC-602 | 扫描进行中 | 取消 / 单 provider 抛错 | 结果为取消/未完成，不标全绿；其余 provider 正常出结果 | health 单测 |
| AC-603 | provider 所属模块禁用或保险箱锁定 | 扫描 | 显示不可用/locked，不计为通过，不尝试解密 | health 单测 |
| AC-604 | 扫描结果 | 查看报告 | 范围、数量、排除项、检查时间可见；无正文/账号名 | health DOM 测试 + 哨兵单测 |
| AC-611 | 档案重复 ID、关系端点缺失 | 扫描 | 报告定位；同步待复核状态不直接删除 | archives provider 测试 |
| AC-612 | 归物状态与生命周期不一致 | 扫描 | 报告不一致项 | 归物 provider 测试 |
| AC-621 | 可修复项（索引、归物投影） | 生成计划 → 确认 → 执行 → 复查 | 预览影响；owner 以当前哈希重验；执行后复查通过 | health＋owner 集成测试 |
| AC-622 | 报告生成后数据已变 | 执行修复 | 拒绝旧哈希，提示重新扫描 | health 集成测试 |
| AC-623 | 批量修复部分失败 | 执行 | 逐项列出已提交/未提交，不称整批成功；可恢复入口存在 | health 集成测试 |
| AC-624 | 不可安全修复项 | 查看 | 只给定位与说明，无修复按钮 | health DOM 测试 |
| AC-631 | 扫描完成或修复失败 | 离开页面后 | 通知中心可找到结果，打开回到体检页 | health＋notifications 测试 |
| AC-901 | 全部票完成 | 运行整体门禁 | `pnpm run build`、`pnpm run lint`、`pnpm test`、`pnpm test:architecture`、`pnpm test:i18n`、`pnpm test:docs`、`pnpm check:styles`、`pnpm check:bundle`、`pnpm check:notices` 全部通过 | 命令与退出码 |
| AC-902 | 全部票完成 | 核对文档 | `docs/safe.md`、`docs/contacts.md`、`docs/navigator.md`、`docs/data.md`、`docs/architecture.md` 与新增体检文档描述当前实现 | `pnpm test:docs` + 回读 |
| AC-903 | 全部 UI 票完成 | 独立浏览器 UI runner | 各页面在宽/窄、亮/暗、中/英、长文本、键盘、reduced-motion 下通过 DESIGN 验收；宿主内表现标“待用户验收” | `node scripts/ui-review/run.mjs` |

## 范围

- **IN：** 上文 1–7 节。
- **REUSE：** sonner、Obsidian Notice、ServiceKey/ContributionPoint/Lease、`storageWriteQueue` 与恢复 owner、`ARCHIVES_COMMANDS`/`ARCHIVES_QUERY`、档案 money/date/table 字段与三方合并、`NAVIGATOR_PERIODIC`、safe 现有模型/密码学/自动锁/30 秒剪贴板/12 位生成器/备份协议、`src/ui/components/huhu/` 组件、`scripts/ui-review/run.mjs`。
- **OUT：**
  - OOS-001：huhubot/Bot、任何 AI 画像、模型调用与 AI Run 存储（LOG-007、LOG-011）。
  - OOS-002：私密聊天/素材导入、证据流水线、`.huhu/archives/private/` 加密集合（LOG-011、LOG-016）。
  - OOS-003：外部通知渠道（微信、短信、邮件、飞书等）的实现；本 change 只提供扩展点（LOG-020）。
  - OOS-004：bz 整体移植、第二大脑/小橘/Steam/影视/RSS/工具坞、加密日记与“信封”按钮、手写字体（#17 §0、bz ADR-0230 决策 3）。
  - OOS-005：safe 加密格式、KDF/AAD、重加密与备份协议变更；收藏新字段（LOG-019）。
  - OOS-006：归物估值与汇率换算、自动记账（#17 §10.4）。
  - OOS-007：§12.3 禁止的自动修复项（LOG-014）。
  - OOS-008：把全部既有 Vault 监听一次性迁到新适配；本 change 只接入 archives 及新功能，其余按后续需要迁移。

## 验证策略

| 接缝 | 层级 | 覆盖合同 | 现有先例或命令 | Evidence 类型 |
|---|---|---|---|---|
| shared/host 纯协议与适配单测 | 单元 | AC-101–105、AC-111–112、AC-121–124 | `pnpm exec vitest run <file>`；`src/shared/json-store.test.ts` 先例 | 命令与退出码 |
| notifications/automations 套件 | 单元/集成 | AC-131–134、AC-631 | 现有 notifications service.test、`pnpm test:safety-regressions` | 命令与退出码 |
| safe 模型、WebCrypto、DOM 测试 | 单元/DOM | AC-201–214 | `src/modules/safe/**/*.test.ts(x)`、`SafePage.dom.test.tsx` | 命令与退出码 |
| archives 服务、黄金样本、DOM | 单元/DOM/格式 | AC-301–321、AC-501–504、AC-611 | `test/golden/archives-v2.test.ts`、`archives-generic.dom.test.tsx` | 命令与退出码；样本差异 |
| navigator 服务与 DOM | 单元/DOM | AC-401–423 | `src/modules/navigator/module.test.ts` | 命令与退出码 |
| health 单测与写 API spy 集成 | 单元/集成 | AC-601–631 | 新建（就近 `*.test.ts`） | 命令与退出码 |
| 架构、包体、样式、i18n、文档、许可 | 门禁 | AC-001、AC-413、AC-901–902 | `pnpm test:architecture`、`check:bundle`、`check:styles`、`test:i18n`、`test:docs`、`check:notices`、`test:license-texts` | 命令与退出码 |
| 独立浏览器 UI runner | 组件 E2E | AC-211、AC-311、AC-411–412、AC-501、AC-903 | `node scripts/ui-review/run.mjs` | 截图相对路径与结果（本地，不入库） |

宿主内真机（多窗口迁移、原生剪贴板、真实 Obsidian 启动）由用户验收，agent 不执行、不跟踪；未完成时对应项标“待用户验收”。

## 约束与风险

- **NFR-001 启动：** 新增 UI、翻页库与 health 扫描不进入插件启动同步闭包；不在启动路径读取整库（#16）。验证：`pnpm test:architecture`、`pnpm check:bundle`。
- **NFR-002 隐私：** 密码、账号名、日记正文不进入反馈、事件 payload、通知、体检报告和日志。验证：哨兵字符串测试。
- **NFR-003 包体：** page-flip 引入的增长需在包体报告中有差异与理由，不静默提高阈值。
- **DEC-001 迁移：** 通知协议泛化是共享合同变更，先由单一票完成协议与现有消费者（automations）迁移，再扇出 health 等新来源；代码层不保留旧类型别名。持久数据不依赖发布状态免除兼容：现有 inbox 文件、档案实体与 safe 密文必须按当前格式继续可读（AC-134、AC-214、DEC-002）。0.0.2 已发布（提交 78f70c0），永久 ADR“产品线收缩与发布前无兼容义务” ADR-002 的豁免是否仍适用不作为本 change 依据。
- **DEC-002 档案预设升级：** 人物预设新增纪事字段、归物预设新增类型，均通过档案定义发布与修订流程，不重解释已有实体；用户已修改的预设不被覆盖。
- **风险：** safe 回归（以 safe 全量测试与 `test:safety-regressions` 承接）；档案未知字段保留（黄金样本承接）；日记正文单一来源（写 API spy 承接）；bz 上游继续变化（以 d76a087 为固定参考，实施时如需采用新提交须记录差异）。

- **排期依赖：** UI 视觉合同待 P 原型产出 change DESIGN（用户已预先批准，LOG-013）；在此之前 UI 实现票保持未就绪。这是排期依赖，不是未决决定。

### 未决问题

无。
