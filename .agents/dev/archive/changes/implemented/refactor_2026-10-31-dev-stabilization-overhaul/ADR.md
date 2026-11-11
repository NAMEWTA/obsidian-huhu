# ADR: 2026-10-31-dev-stabilization-overhaul

本文件是当前 change 的架构决定合同，不是永久项目 ADR，也不证明实现已经落地。涉及永久 ADR 的替代或回写只能经 `<Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/SKILL.md</Path>` 提升。

## ADR-001: 一次性升级，不保留兼容层，保护语义不变

**Status:** accepted
**Source:** LOG-002（#41 实施原则与 §6 约束）
**Supersedes:** none

### Decision

接口、状态机、内部协议、数据模型、组件 API 与样式 token 需要改变时，在同一批次更新全部生产者、消费者、生成类型、夹具与文档，并删除旧实现；不保留永久双实现、双读双写或历史别名。真实停止与资源归属、Profile 锁、撤权与物理清除、来源版本绑定、审批与效果对账、秘密隔离、多窗口归属、未保存编辑保护、已提交事实可恢复，这些结果要求不随实现重写而降低。

### Context / Trade-off / Consequences

旧二进制、缓存和设置可能无法使用，但项目未正式发布，不提供向后兼容；当前有效数据与权限安全语义不降级（ADR-011）。

### Verification / Migration

G1：引用清点无旧别名/旧组件/双状态真相；G2：数据切换、权限与外部动作屏障检查。

## ADR-002: 停止按四种事实分阶段报告，保留持久性

**Status:** accepted
**Source:** LOG-003；永久 ADR-027
**Supersedes:** none

### Decision

Runner 停止明确区分“停止请求已接收、执行器已排空、持久化已完成、Profile 已释放”四种事实，并统一 Go、TS 宿主、CLI 与测试夹具的调用合同。扩展现有 `RequestStop/Done/WaitClosed`，以调用方期限观察实际阶段；替换 `Close()` 的固定 3 秒整体封装（重构或删除并迁移调用方由实现决定）。超时返回当前真实阶段，不报假成功，也不统一归为执行器失败；资源 owner 在调用方超时后仍负责清理，宿主重开须等真实完成或进入明确恢复流程。

### Context / Trade-off / Consequences

不采用默认撤掉关闭刷盘或提前解锁：那会把 Runner 停止的耗时问题换成 ADR-027 持久性承诺的退化。自动强杀只能是带恢复信息的最后手段。

### Verification / Migration

慢于 3 秒的刷盘注入、调用方先超时再等完成、重复 stop、退出中到达的响应、生产者未收敛与重启竞争（W2.5）。

## ADR-003: 检查点与业务提交分离，成为有界维护

**Status:** accepted
**Source:** LOG-003
**Supersedes:** none

### Decision

`withinTx` 不再在 COMMIT 后持有连接同步执行 TRUNCATE。检查点由存储 adapter 拥有的有界维护调度执行：可合并、有背压、有停止归属，仍遵守现有 Profile/单写连接串行约束。业务提交在 COMMIT 成功即成立；维护失败或超时不改写该事实，也不触发业务重试。隐私删除要求的清除/截断不能被后台调度跳过。

### Context / Trade-off / Consequences

模式（PASSIVE/RESTART/TRUNCATE）、阈值与文件复用策略待 Windows 实测（W2.8）决定，候选不预先视为有效修复。

### Verification / Migration

分阶段采样连接等待、提交、FULL 屏障、检查点、关闭 WAL 同步（W2.6）；长读者下 WAL 不无限增长，关停不遗留匿名维护任务（W2.9）。

## ADR-004: 依赖不再按条目重复落库传递闭包

**Status:** accepted
**Source:** LOG-004
**Supersedes:** none

### Decision

上下文条目只保存其表示与来源版本引用，不再为每个条目写入完整 effective 传递闭包。优先采用版本绑定（来源种类、稳定身份、revision/hash、必要作用域）的规范化直接依赖图，在受控事务/快照中解析有效依赖。只有 W1.1 的消费者盘点与访问成本证明直接图不合适时，才改用不可变、按版本共享的依赖子图，并须证明共享身份与失效规则。

### Context / Trade-off / Consequences

最终表结构在 W1.1 决策记录后定稿；本 ADR 锁定的是不变量与选择门槛。不能承诺所有历史快照总成本为 O(n)，但必须去掉“同一传递依赖被每个条目重新展开落库”的乘数。

### Verification / Migration

50/100/200 Run 可复跑规模用例，用结构性行数断言与增长曲线证明（W1.6）；撤权、删除预览、物理清除、恢复、namespace 隔离、revision 错配回归通过。旧 Profile 切换方式见 D-010。

## ADR-005: 可选初始化完全退出启动关键路径（替代提案）

**Status:** accepted
**Source:** LOG-008（#41 W4、A16）
**Supersedes:** none（对永久 ADR `<Path>{roots.state}/specdev/adr/2026-10-31-home-cookie-restore-deadline.md</Path>` ADR-001 的替代提案，经 A 提升后才生效于永久知识）

### Decision

首页与工作台激活不再等待网易云 Cookie 恢复、外部账号探测或其他可选 I/O，包括不再存在固定 5 秒的关键路径等待。后台恢复由模块 lifetime 拥有，具备错误收敛、订阅通知、去重与销毁清理；登出、交互登录、模块禁用、窗口关闭和 Vault 切换使旧恢复失效，迟到结果不能覆盖用户之后的决定。

### Context / Trade-off / Consequences

永久 ADR-001 的 5 秒上限是把首页从无限等待中解救的缓解；它仍让首页在凭据服务不返回时多等 5 秒。保留其中“迟到 Cookie 不能登录”“计时器归所属窗口”的保护，去掉关键路径等待。

### Verification / Migration

永不返回的 `cookies.get` fixture 下直接断言首页/工作台已可交互（不是等 5 秒后通过）；覆盖拒绝、迟到成功、销毁后完成、登录/登出竞争（W4.4）。无数据迁移。

## ADR-006: `huhu/` 下 HUHU 生成的默认路径改为固定英文 ASCII

**Status:** accepted
**Source:** LOG-009
**Supersedes:** none（替代 `src/shared/storage/vault-layout.ts` 注释中“目录名有意为中文”的既有约定）

### Decision

新库中 HUHU 生成的默认目录与固定文件名统一为英文小写 kebab-case，集中定义在 `vault-layout.ts` 一张表，并写入 `docs/data.md`。显示名称全部经 `t()` 本地化，不作主键、关系目标或路径；用户输入的标题、自定义名称和显式路径不翻译、不改写。

### Context / Trade-off / Consequences

原中文默认目录是发布前开发产物，不纳入现行格式的保留或兼容合同（ADR-011）。

### Verification / Migration

在当前格式新库验证中英文初始化、语言切换、名称、重启和目录碰撞；删除旧中文路径别名，不执行旧目录保留或迁移验收（ADR-011）。

## ADR-007: Bot Profile 旧隔离方案（已撤回）

**Status:** superseded（huhubot 删除；2026-11-03 ADR-011 撤回旧 Profile 保留义务）
**Source:** LOG-010、LOG-020、用户 2026-11-03 指令

### Decision

原新旧 Bot Profile 隔离、只读保留与兼容方案不再实施。T-11、AC-293 已取消；无旧 Profile 字节不变验收。

## ADR-008: 仅支持当前英文路径（旧目录保护已撤回）

**Status:** superseded in part（ADR-006 仍定义当前路径，旧目录保护由 ADR-011 撤回）
**Source:** LOG-014、用户 2026-11-03 指令

### Decision

仅使用 `vault-layout.ts` 的英文 kebab-case 默认目录；删除旧中文目录检测、迁移、别名与回退。未正式发布，旧目录非受支持历史格式，无须保证原文件保留或字节不变。

### Verification

只验证当前格式新库以及旧路径代码引用清零。

## ADR-009: 本 change 暂停 Browser 及集成面的全部开发与修复

**Status:** superseded（2026-11-02 由 ADR-010 取代；以下正文保留为历史）
**Source:** LOG-018
**Supersedes:** 本 change 先前“13 模块全覆盖”中的 Browser 实施范围；不改变历史来源或永久设计快照。

### Decision

Browser 模块、native/browser-runtime、Agent 浏览器标签与资料移交、Home 网页面板、宿主会话恢复及专用测试/构建/资产全部冻结。混合文件中的 Browser 分支、路径和接口也冻结；具体定位及共享变更边界见 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>`。不开发、不修复、不重构、不改样式、不迁移、不做专项性能/测试修复。以后由用户单独启动完整重构；其他实施授权不自动解除本决定。

### Context / Trade-off / Consequences

用户明确将 Browser 留到之后完整重构；本 change 暂不实现其 UI 一致性或其他修复。代价是部分共享清理可能因冻结消费者保留，必须记录延期而不伪称全仓清零。其余 12 模块及非 Browser 集成继续规划；无法独立修改的具体子项暂停。

### Verification / Recovery

只读清点直接路径和共享消费者，固定冻结输入摘要；执行前后核对未变化。冻结资产缺失时不生成，受影响构建保持未验收。非 Browser 修改导致回归时修正或撤回该修改，不给 Browser 打补丁。解冻须用户明确恢复并重审 Spec/票/设计绑定。

## ADR-010: 产品线收缩——整体删除 browser、huhubot、superbot

**Status:** accepted
**Source:** LOG-020（2026-11-02 用户请求）；D-017–D-020
**Supersedes:** ADR-009（Browser 冻结）；ADR-002、ADR-003、ADR-004、ADR-007 在本 change 内随 huhubot 删除失去适用对象（历史正文保留）。永久 Bot ADR-001–ADR-027 与永久 context 的相应 superseded 标记只能经 A 网关执行。

### Decision

从 HUHU 产品线整体移除三块能力，不做任何保留：

1. **browser**：`src/modules/browser`、`native/browser-runtime`、根目录 `browser-worker.cjs`/`browser-cli.cjs` 及校验和、`tsconfig.browser-worker.json`、专用构建/装配/安装/验证脚本、Browser 工作流与发行资产，以及 Agent、Home、自动化、app/shell 中的 Browser 入口、服务键、设置、词典与外链路由。外链统一改为系统默认浏览器。
2. **huhubot**：`src/modules/huhubot`、`native/huhubot`（Go module）、`contracts/hap`、huhu-bot 构建/通知/验证/基准脚本、`huhu-bot.yml`/`huhubot-storage-windows.yml`、`lint.yml` 的 Go 段、`release.yml` 的 bot 资产，以及 app/shell/i18n/设置/版本排除中的注册。
3. **superbot**：即 huhubot 的 superhuhu/Pi SDK 重构方向，仓库内不存在独立代码；该方向不再进行，删除范围由 huhubot 覆盖。

这三块的优化、修复、重构、升级计划一律取消（T-05、T-07、T-08、T-10、T-11、T-33），不再新增任何此类规划。与其无关的稳定化、修复与 UI 统一票全部保留。删除作为本 change 的一条主线，由 T-39–T-46 按依赖顺序执行，删除即物理删除，不保留空壳、开关、别名或兼容分支（ADR-001）。

### Considered alternatives

- 继续冻结（ADR-009）等待重构：用户已放弃重构，冻结只会让死代码长期占用构建、CI、包体与审查成本。
- 隐藏入口、保留代码：与“所有代码和功能清理删除干净”冲突，并保留供应链与维护负担。
- 为开发期旧数据另建保留、迁移、清理或兼容机制：不实施（ADR-011）。

### Consequences

- 构建与发行链大幅缩短：默认 `pnpm build` 不再含 Browser 生成段，CI 不再需要 Go，发行资产只剩插件文件。包体预算按实测只降不升（NFR-003）。
- 已完成的 T-04、T-06、T-09 交付物随删除消失，其历史 Evidence 保留；AC-281–AC-342 中的 huhubot 项撤回（Spec OOS-008），不计为通过。
- 开发期 Browser/Bot 数据不属于受支持格式，无保留、回读、兼容或手动清理文档要求（ADR-011）。
- Home 网页嵌入分区、网易云音乐整项功能及其库内 Electron 会话（`src/host/desktop/browser-session*.ts`）一并删除（D-018，2026-11-02 用户决定，LOG-022）；“网页快捷卡”链接卡片保留并改由系统浏览器打开（D-021，用户 2026-11-02 确认）。旧会话目录与 Cookie 不属于现行数据合同（ADR-011）。

### Verification / Recovery

T-39 逐文件盘点与残留检索；T-46 在当前格式新库做真实 Obsidian E2E；不要求旧库兼容或字节不变测试（ADR-011）。D-018 已按用户决定改为删除，T-29/T-42/T-44 已同步修订（plan_revision 25）。

## ADR-011: 预发布项目不保留遗留数据与向后兼容

**Status:** accepted
**Source:** 用户 2026-11-03 最新指令：项目没有正式发布，暂无历史包袱，无需任何保留或兼容
**Supersedes:** ADR-007 旧 Profile 保留、ADR-008 旧目录保留、ADR-010 D-019 数据保护与清理要求，以及冲突的旧 AC/Ticket 表述

### Decision

HUHU 尚未正式发布。开发期旧中文目录、旧 Bot Profile、Browser/huhubot 数据、旧设置、看板字段、Cookie 会话与旧 Agent 布局均非受支持的历史版本。**不要求保留、迁移、回读或兼容任何发布前旧数据**；无需旧数据字节不变、旧库、旧布局恢复等验证，也不提供旧数据手动清理指引。仅支持现行格式的新库及功能，可删除旧类型、协议、迁移路径与专用测试；当前有效数据的写入正确性、隐私、权限、凭据和外部动作安全仍然有效（ADR-011，2026-11-03 用户最新指令，取代 D-019）。

### Verification / Consequences

- **AC-406 撤回**，AC-293 已取消；AC-192 仅测当前英文路径，AC-402/403/404/408 仅测当前功能与新库。
- T-39–T-46 不再使用旧库、旧看板、旧浏览器布局、旧 Cookie/Profile 不变性测试；无手动清理指南要求。
- `source.md` 与历史 LOG/Evidence 保留事实原文以供溯源，但不作为与本决定冲突的实施合同。
