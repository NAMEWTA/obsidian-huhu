---
schema_version: 1
artifact: source
change: 2026-10-31-dev-stabilization-overhaul
source_type: github-issue
canonical_locator: https://github.com/NAMEWTA/obsidian-huhu/issues/41
captured_at: 2026-11-02T03:17:00Z
content_sha256: 5f29785422eee7a735447757df269146748460d47db08c4d6f0bda4374476386
remote_state: open
close_capability: supported
---

# Source: [Epic / dev 稳定化与产品线收缩] 稳定性、性能、功能修复与全界面统一，整体删除 Browser、huhubot、网页分区与网易云音乐

## Capture Metadata

- **Capture method:** GitHub REST API 只读读取 issue 与 comments（`GET /repos/NAMEWTA/obsidian-huhu/issues/41` 及其 `/comments`）；未执行远程写入。
- **Author:** NAMEWTA（Anner）
- **Created / updated:** 2026-11-02T03:16:28Z / 2026-11-02T03:16:28Z
- **Labels or classification supplied by source:** none
- **Attachments:** none
- **Redactions:** none（正文未含凭据、Cookie、令牌或个人隐私）
- **Pagination / fetched at:** 正文完整；评论 0 条；读取时间 2026-11-02T03:17:00Z
- **Base / head SHA:** 不适用（Issue）。捕获时 `dev` HEAD 为 `87473f9e8a1c92de5073e3e978e8d5201cede85e`
- **Hash scope:** `content_sha256` 为 UTF-8 紧凑 JSON `{"body","comments":[{"author","body","createdAt"}],"title"}`（键排序、无空白）的 SHA-256
- **Supersedes:** 不适用；本 change 以 #41 为唯一来源（切换记录见 LOG-024）

## 2026-11-03 最新用户指令（覆盖原 Issue 的旧数据保护条款）

HUHU 尚未正式发布。开发期旧中文目录、旧 Bot Profile、Browser/huhubot 数据、旧设置、看板字段、Cookie 会话与旧 Agent 布局均非受支持的历史版本。**不要求保留、迁移、回读或兼容任何发布前旧数据**；无需旧数据字节不变、旧库、旧布局恢复等验证，也不提供旧数据手动清理指引。仅支持现行格式的新库及功能，可删除旧类型、协议、迁移路径与专用测试；当前有效数据的写入正确性、隐私、权限、凭据和外部动作安全仍然有效（ADR-011，2026-11-03 用户最新指令，取代 D-019）。

下文 `Original Content` 是 2026-11-02 #41 的原始快照，`content_sha256` 不因这段说明而更改；与 ADR-011 冲突的旧目录保留、AC-406、旧布局恢复和旧库验收条款不再作为实施合同。

## Original Content

# HUHU dev 稳定化、性能修复、全界面统一与产品线收缩总计划

> 本 Issue 是 `dev` 稳定化与产品线收缩的唯一实施与验收入口。规划、决定、批次进度与验收结论只在这里跟踪。规划文档：`.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/`（README、spec、tickets-map、goal-plan、ticket/）。
>
> **实施原则：不保留兼容层。** 可以直接调整接口、状态机、内部协议、组件 API 和样式令牌，同批次更新全部调用方、测试、构建与文档；不留永久兼容分支、双读双写、旧组件副本或历史别名。“不兼容”不等于可以静默删除用户资料、弱化权限、跳过持久化屏障或隐藏失败。

## 1. 目标

1. **稳定化与修复主线：** 在当前 `dev` 上实际解决启动、天气、Hook 发布、功能缺陷、诊断、包体预算与来源记录问题，并统一全插件（保留模块）的视觉与交互；每项都以 `docs/e2e/dev-overhaul/ledger.md` 账本中的固定 commit、命令、退出码或截图作为证据，缺少平台条件的项如实标为未验收。
2. **产品线收缩删除主线：** 从产品中整体删除 **Browser（HUHU 浏览器）**、**huhubot**（HUHU Bot，包括 superbot 方向）以及 **Home 网页嵌入分区与网易云音乐**，代码、入口、原生运行时、合同、构建发行链、测试与文档全部清理干净；这些功能不再做任何优化、修复或重构。

## 2. 范围

### 2.1 稳定化与修复主线（保留）

| 工作包 | 内容 |
|---|---|
| **W0 基线与诊断** | 固定实施 SHA；为每个账本编号建立“报告环境 / 当前复现 / 证据等级 / 根因状态 / 实施任务 / 结果”；建立虚构或脱敏的功能与规模 fixture；先跑现有测试与构建并记录基线失败；确认 Windows CI 真正到达目标用例。诊断清单逐项决定保留、收敛或删除：`src/modules/agent/services/workspace-service-stop-native.test.ts`（目标会话停止、无关会话不被误停的双向验证；Ubuntu Node 22 偶发失败单独验证）、`src/modules/agent/platform/desktop/hooks/hook-spool.test.ts`（区分未发布、发布未消费、重复消费与资源未释放）。成功路径安静，失败输出有上限且脱敏。 |
| **W3 Hook 发布可靠性** | Windows 上 32 scope × 3 有序事件冷启动突发：分段测量等待 collector、持有 collector、路径校验、token 校验、写入发布、消费回收；修复后 96/96 送达、每 scope 有序、无重复、无遗留槽位或 lease；容量不足或超时准确失败可定位；路径、scope token、大小与 reader 所有权等安全校验全部保留。 |
| **W4 非阻塞启动与天气** | 首页与工作台激活不等待任何可选账号、网络或凭据读取（已完成）；天气覆盖未配置、等待启动、加载、有缓存且刷新中、成功、离线/失败、已失效七种状态，完整请求生命周期（缓存读、主备 Provider、缓存写、发布）任一阶段挂起都能到达终态或可恢复状态，不跨看板串数据。 |
| **W5 功能缺陷** | W5.1 内置名称本地化，与稳定身份、路径分离；新库默认路径为固定英文 kebab-case（单表定义，旧中文目录不迁移、不读写）。W5.2 终端默认简洁状态，停止未确认、清理失败、异常退出持续可见并可操作，折叠展开不重建 xterm。W5.3 Home 与 Note history 大区域无整块 tooltip，区域经 `aria-labelledby` 命名。W5.4 自动化通知以运行时名称快照与结果为主文案。W5.5 约 420px 容器保留自动化名称与主操作。W5.6 分屏命令、快捷键、菜单、拖拽复用同一业务动作，无静默无效。W5.7 任务 Through 日期完整显示、可换行。 |
| **W6 全界面统一** | 单一 token 源与基础组件全状态（W6.1–W6.5）；异步、键盘、焦点、`.huhu-ui` 隔离、容器宽度布局、危险操作合同（W6.6–W6.10）；home 外框与配置（W6.11）、信息与内容（W6.12）、任务与规划（W6.13）、媒体子项图片/视频/相册（W6.14）、其他子项与可视化（W6.15–W6.17）。覆盖全局 Shell、11 个保留模块（agent、archives、automations、comments、home、icons、navigator、notifications、safe、task、versioning）与全部保留的 home 子项。视觉与交互合同为 change DESIGN revision 3、项目基线 DESIGN-0002 与原型 UI-001（方向：圆润、克制、内容优先的桌面工作台）。最后清理死 CSS、旧组件、`--db-*` 等过期别名、并行主题分支与临时开关。 |
| **W7 构建与性能** | 用锁定工具链重建 JS/CSS、eager closure 与模块 activation 报告并校正预算理由；Hook 字符串脚本采用有语义保障的构建期压缩；去除重复实现与废弃路径，建立可解释的开发余量，不靠提高阈值换绿灯；沉淀可复跑的启动与规模采样脚本（冷/热进程、模块激活、可交互、输入到新画面、任务提交到投影、查询/滚动、内存与长任务）。 |
| **W8 来源与文档** | 补齐行为参考与采用材料的稳定来源记录（Notebook Navigator、Obsidian Copilot、Marginalia、Hover Annotations、Margin Annotations、Side Note、Commentator、Smart Composer、dbx、Windows Terminal），区分运行依赖、复制/改编、素材/字体、仅行为参考；同步数据路径、生命周期、错误状态、性能与 UI 规范文档。 |

### 2.2 产品线收缩删除主线（R）

按顺序执行，每步完成后仓库可构建、可测试：

1. **R1 盘点：** 在最新 `dev` 上逐文件盘点 Browser、huhubot、Home 网页嵌入分区与网易云音乐的全部命中（模块、原生、合同、根产物、脚本、测试、验收脚本、文档、i18n、样式、CI），列出允许保留的例外。
2. **R2 huhubot 插件侧：** 删除 `src/modules/huhubot` 及全部产品入口（manifest 注册、导航、设置、命令、ribbon、工作台页面）。
3. **R3 huhubot 原生与发行链：** 删除 `native/huhubot`、`contracts/hap`、对应构建、发行资产与 CI 作业。
4. **R4 Browser 入口与 Home 网页分区、网易云音乐：** 删除 Browser 产品入口；Home 卡片、RSS、终端 URL、自动化“打开网址”统一改用系统默认浏览器；删除 Home 网页嵌入分区（`sectionType: web`）与网易云音乐整项功能（播放器小组件、音乐面板、账号登录与恢复、客户端、专用验证脚本与测试命令）。保留“网页快捷卡”（点开一个网址），只去掉“打开方式”选项。
5. **R5 Agent 浏览器集成：** 移除 Agent 工作区中的浏览器标签、资料移交与 Cookie 辅助；旧布局中的 browser 标签不再出现，其余标签、分组与会话完整恢复。
6. **R6 Browser 本体：** 删除 `src/modules/browser`、`native/browser-runtime`、库内 Electron 会话 `src/host/desktop/browser-session*`、根目录 `browser-*.cjs` 产物与构建发行链；完成后恢复默认 `pnpm build`。
7. **R7 文档：** 清理现行文档、根说明、开发规则与项目 Skill 中的悬挂引用。
8. **R8 删除主线验收：** 构建、lint、测试、文档、i18n、包体、通知与原生检查通过或相对基线无新增失败；agent 在真实 Obsidian 中执行端到端检查并保存截图。

**遗留数据：** 删除代码不等于删除数据。插件不删除、移动或改写 `.huhu/browser*`、`.huhu/huhubot/`、本机 Bot Profile、localStorage 键、userData 目录、看板中的网页分区配置、音乐相关设置与小组件布局；这些只按通用未知值规则忽略，加载时不改写用户文件，不新增迁移器、兼容分支或“已移除”占位页。可能残留登录 Cookie 的旧会话目录在 `docs/data.md` 中说明手动清理方式。

## 3. 验收标准

以规划文档 `spec.md` 的 AC 编号为准；账本编号沿用 `docs/e2e/dev-overhaul/ledger.md`。

**稳定化与修复**

- [ ] **AC-001 / AC-002 基线：** 每个账本编号都有报告环境、当前复现、证据等级与根因状态；现有测试与构建的基线失败逐项记录，Windows CI 目标用例的到达有证据。
- [ ] **AC-163（A16）启动与规模：** 独立 fixture 采样脚本在三平台输出冷/热进程、模块激活、组件可交互与输入/提交延迟；小库与万篇笔记大库有可复核结果，未测平台明确未通过。
- [ ] **AC-191 / AC-192（A19）默认路径与名称：** 新库默认目录与固定文件名来自 `vault-layout.ts` 单表的英文 kebab-case 名，切换语言不重命名目录；旧中文默认目录及文件字节不变。
- [ ] **AC-201 / AC-202（A20）终端状态：** 正常只显示简洁状态与必要动作；不确定状态持续可见并提供检查入口；折叠展开不重建 xterm、不丢输入、选择与滚动位置。
- [ ] **AC-211（A21）区域提示：** Home 与 Note history 空白处无整块 tooltip，区域与图标按钮名称仍正确。
- [ ] **AC-221（A22）天气：** 两看板、多实例的成功、未配置、主备网络失败、缓存读写挂起、旧请求晚到、切换与隐藏恢复都到达明确状态，无无限 Loading，无跨看板串数据。
- [ ] **AC-231（A23）自动化通知：** 主文案为运行时名称快照与结果，详情按稳定 ID 解析现名或“已删除”，无敏感信息泄漏。
- [ ] **AC-241（A24）窄容器：** 420px / 600px / 宽屏、长英文名、200% 缩放下名称与启停、运行、编辑可见可达，无无解释整页横向溢出。
- [ ] **AC-251（A25）分屏：** 命令面板、快捷键、菜单、拖拽为同一业务动作，目标明确，无法执行时给出原因。
- [ ] **AC-262（A26）日期：** 中文/英文日期在 420px 与 200% 缩放下完整显示、可换行。
- [ ] **AC-271（A27）来源记录：** 清单每项都有来源与使用性质记录或经核对的不适用说明，链接与生成通知检查通过。
- [ ] **AC-311 / AC-312（A31）Hook：** Windows 96/96 送达、每 scope 有序、无重复、无遗留槽位或 lease（目标 ≥20 轮）；容量满、撤销、generation 变化、路径替换时准确失败，安全校验仍生效。
- [ ] **AC-321（A32）诊断：** W0 诊断清单逐项有保留/收敛/删除决定；成功路径安静，失败有上限且脱敏；`workspace-service-stop-native` 偶发失败有独立验证结论。
- [ ] **AC-331 / AC-332（A33）包体与脚本：** 报告与预算理由一致，无静默提高阈值；压缩前后 Hook 脚本协议行为相同（含 Windows 路径）。
- [ ] **AC-351 / AC-352 / AC-353（A35）全界面统一：** 全局 Shell、11 个保留模块与全部保留的 home 子项逐项有入口清单、全状态与前后证据；普通文本 ≥4.5:1，大文本与适用非文本 ≥3:1，命中区桌面 ≥32px、触控 ≥44px；无死 CSS、旧组件、过期别名、并行主题分支或临时开关。

**删除主线**

- [ ] **AC-401 盘点：** 每个命中文件都有处置（删除 / 改写 / 允许保留及理由）。
- [ ] **AC-402 入口：** 新库与含旧设置的旧库启动后，导航、设置、命令面板、ribbon、工作台中都没有 Browser 或 Bot 入口与命令，旧开关不报错。
- [ ] **AC-403 外链：** 桌面端 Home 卡片、P1、RSS、终端 URL 与自动化“打开网址”统一用系统默认浏览器打开；移动端行为不变；含旧打开方式字段的配置正常加载。
- [ ] **AC-404 Agent 工作区：** 含旧 browser 标签与 `.huhu/browser-materials/` 的工作区打开后，终端与页面标签、分组、会话完整恢复，browser 标签不再出现。
- [ ] **AC-405 残留：** 删除批次合入后，构建、发行与 CI 中没有被删目录、合同、根产物与命令；残留检索只剩盘点允许的例外。
- [ ] **AC-406 遗留数据：** 升级后插件不删除、移动或改写第 2.2 节列出的遗留数据；含旧网页分区、音乐小组件或音乐设置的看板正常加载且加载时不被改写；`docs/data.md` 说明凭据风险与手动清理。
- [ ] **AC-407 文档：** 现行文档、根说明、项目 Skill 与规划文档不再描述已删功能与命令；`pnpm test:docs` 相对基线无新增失败。
- [ ] **AC-408 收口：** 构建、lint、`pnpm test`、`test:all`、docs、i18n、包体、通知、`check:native` 通过或相对基线无新增失败；真实 Obsidian 端到端截图齐全。

**总体收口**

- [ ] **AC-901（G1）：** 无永久兼容层、双实现、双状态真相、失联旧样式或未登记例外。
- [ ] **AC-902（G2）：** 数据格式与资料目录变化的切换方式、用户资料保护、敏感字段、权限与外部动作屏障符合约束。
- [ ] **AC-903（G3）：** 适用测试、构建、原生检查、文档、来源与生成产物一致，未验项没有被填成通过。

## 4. Ticket 列表与状态

截至 2026-11-02（`plan_revision 25`）。状态：done 已完成、in_progress 进行中、ready 可开工、draft 待细化。

**稳定化与修复**

| Ticket | 内容 | 状态 |
|---|---|---|
| T-01 | 基线账本与当前 dev 基线运行 | done |
| T-02 | 包体基线重建与预算理由校正 | done |
| T-03 | 行为参考与采用材料的来源记录收口 | done |
| T-09 | 存储规模基准（历史基线，不再继续） | done |
| T-12 | Hook 发布链分段测量与 Windows CI 到达性 | in_progress |
| T-13 | Hook 发布池可靠性修复 | ready |
| T-14 | 可选初始化退出启动关键路径 | done |
| T-15 | 天气完整请求生命周期（服务层） | done |
| T-16 | 默认路径改为固定英文名，内置名称本地化 | done |
| T-17 | 自动化通知使用运行时名称快照 | done |
| T-18 | 分屏命令目标、执行与反馈统一 | done |
| T-20 | 启动与规模采样脚本及 CI 趋势 | in_progress |
| T-21 | Hook 字符串脚本构建期压缩 | ready |
| T-22 | 失败诊断收口与偶发失败验证 | ready |
| T-23 | Token 单一来源与基础组件全状态 | done |
| T-24 | 全局 Shell 与交互合同 | in_progress |
| T-25 | agent 界面（含终端状态分层） | ready |
| T-26 | home 外框、配置与天气呈现 | ready |
| T-27 | home 信息与内容子项 | ready |
| T-28 | home 任务与规划子项及 task 模块界面 | ready |
| T-29 | home 媒体子项（图片、视频、相册） | ready |
| T-30 | home 其他子项与数据可视化 | ready |
| T-31 | automations 与 notifications 界面 | ready |
| T-32 | archives 与 safe 界面 | ready |
| T-34 | Comments / Icons 界面 | ready |
| T-35 | navigator 与 versioning 界面（含笔记历史 tooltip） | ready |
| T-36 | UI 收缩清理 | ready |
| T-37 | 包体结构减重与可解释余量 | draft |
| T-38 | 总体验收收口（G1–G3） | draft |

**删除主线（待实施；开工需要另行明确授权）**

| Ticket | 内容 | 状态 |
|---|---|---|
| T-39 | Browser / huhubot 删除盘点（逐文件，含网页分区与网易云音乐） | ready |
| T-40 | 删除 huhubot 插件侧模块与全部产品入口 | ready |
| T-41 | 删除 huhubot Go 运行时、HAP 合同与构建发行链 | ready |
| T-42 | 删除 Browser 产品入口、外链改系统浏览器，并删除 Home 网页分区与网易云音乐 | draft |
| T-43 | 移除 Agent 工作区中的浏览器标签、资料移交与 Cookie 辅助 | draft |
| T-44 | 删除 Browser 模块、原生运行时、构建产物与发行链（含库内会话） | draft |
| T-45 | 清理文档、开发规则与 specdev 历史中的悬挂引用 | draft |
| T-46 | 删除主线验收：构建、测试与真实 Obsidian 端到端（截图） | draft |

依赖：T-39 → T-40 → T-41 → T-42 → T-43 → T-44 → T-45 → T-46 → T-38。票号保持稳定，不再实施的票在规划文档中保留取消记录，不属于本 Issue 的需求。

## 5. 非目标

- 新增 Agent 业务能力或其他领域功能。
- 更换技术栈、更改插件 id、改成 Web 应用、替换执行引擎，重写终端、编辑器或差异引擎，修改保险箱加密与剪贴板策略。
- 完整移动端支持（320px 只作压力测试）；Obsidian 宿主整体无障碍认证。
- 引入第二套 UI 运行时或图表库；安装 Radix Themes / Primer 完整运行时；加载 Uiverse CDN。
- 为已删除功能保留任何代码、占位页、迁移器或兼容分支。
- 自动删除或清理用户磁盘上的遗留数据。
- 发版与升版本（另行授权）。
- agent 执行或跟踪稳定化主线的用户真机验收（真实 Obsidian、Windows/macOS 实机）；这部分由用户自行完成。删除主线的真实 Obsidian 端到端由 agent 执行并保存截图。

## 6. 约束

- **不保留兼容层：** 同批次完成引用清点、消费者更新与旧实现删除，最终只有一套实现。
- **数据安全：** 任何资料目录或格式变化不得默认覆盖旧库、自动移动或清空用户文件；数据格式变化单独说明新格式与切换方式。
- **诊断与隐私：** 失败诊断有上限且脱敏；凭据、完整笔记、环境变量全集不写入日志或截图。
- **预算：** 不提高 `scripts/bundle-budget.json` 阈值换绿灯；确需增长单独记录差异、价值、替代方案与批准。
- **可回滚：** 高风险改动与 UI 大改不进同一提交；同一合同的生产者与消费者完整提交，不让中间不一致状态进入 `dev`。
- **证据：** 每项勾选附固定 commit、环境、命令/步骤与结果；“新增了测试文件”“代码看起来合理”都不算证据；删断言、无条件重试、放宽时限或用 Linux 结果代替其他平台都不算通过。
- **流程：** 直接在 `dev` 上按批次提交并普通推送；提交信息引用本 Issue（Refs），不写自动关闭关键词；所有验收完成后由用户决定关闭本 Issue。

## Source Comments

无。

## PR Evidence

不适用（Issue 来源）。
