# ADR: 2026-10-31-dev-stabilization-overhaul

本文件是当前 change 的架构决定合同，不是永久项目 ADR，也不证明实现已经落地。涉及永久 ADR 的替代或回写只能经 `<Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/SKILL.md</Path>` 提升。

## ADR-001: 一次性升级，不保留兼容层，保护语义不变

**Status:** accepted
**Source:** LOG-002（#41 实施原则与 §6 约束）
**Supersedes:** none

### Decision

接口、状态机、内部协议、数据模型、组件 API 与样式 token 需要改变时，在同一批次更新全部生产者、消费者、生成类型、夹具与文档，并删除旧实现；不保留永久双实现、双读双写或历史别名。真实停止与资源归属、Profile 锁、撤权与物理清除、来源版本绑定、审批与效果对账、秘密隔离、多窗口归属、未保存编辑保护、已提交事实可恢复，这些结果要求不随实现重写而降低。

### Context / Trade-off / Consequences

代价是旧二进制不能打开新数据，旧缓存/设置可能需要重建；用户资料的处理方式由 D-009、D-010 单独决定，不得默认覆盖或清空。

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

原约定把中文目录视为用户库结构；它本身不随语言变化，但英文用户会在库里看到中文目录。代价是已有库的默认目录与新名称不同，处理方式见 D-009。

### Verification / Migration

全新中/英文库、初始化后切语言、自定义名称、重启与目录碰撞用例；不保留代码层中文路径别名，旧库处理按 D-009，不自动移动或删除用户文件。

## ADR-007: 新 schema 使用隔离的新 Bot Profile，旧 Profile 只读保留

**Status:** accepted
**Source:** LOG-010
**Supersedes:** none

### Decision

依赖存储 schema 变化后，新版本在按 schema 版本隔离的新 Profile 位置运行；旧 Profile 原样保留，不覆盖、不删除、不迁移，新版本不对其加锁或写入。首次启动明确告知旧数据位置与只读状态。不实现迁移器，不双读。

### Context / Trade-off / Consequences

迁移器会成为需长期测试的兼容链（与 ADR-001 冲突）。代价是旧会话与记忆在新 Profile 中不可见。

### Verification / Migration

存在旧 Profile 的 fixture 下启动新版本：旧 Profile 字节不变、未被锁定；新 Profile 在独立位置创建；提示可见。

## ADR-008: 发布前的旧默认目录不做任何处理

**Status:** accepted
**Source:** LOG-014
**Supersedes:** none

### Decision

HUHU 尚未正式发布，旧中文默认目录按兼容问题对待：新版本不检测、不迁移、不读取、也不写入这些目录，不提供移动命令，只使用 ADR-006 的新路径。旧目录中的文件保持原样，由用户自行处理。

### Context / Trade-off / Consequences

备选方案（把旧目录一次性写成显式路径，或提供带备份的移动命令）都需要一段只为发布前数据存在的代码，与 ADR-001 冲突。代价是：已有库升级后，HUHU 在新路径下从空开始，旧内容在 HUHU 界面中不可见，但文件仍留在库里。

### Verification / Migration

存在旧中文默认目录的 fixture 下启动新版本：旧目录与文件字节不变、无移动或删除；HUHU 读写只发生在新路径；代码中没有旧中文默认路径的引用。

## ADR-009: 本 change 暂停 Browser 及集成面的全部开发与修复

**Status:** superseded（2026-11-02 由 ADR-010 取代；以下正文保留为历史）
**Source:** LOG-018
**Supersedes:** 本 change 先前“13 模块全覆盖”中的 Browser 实施范围；不改变历史来源或永久设计快照。

### Decision

Browser 模块、native/browser-runtime、Agent 浏览器标签与资料移交、Home 网页面板、宿主会话恢复及专用测试/构建/资产全部冻结。混合文件中的 Browser 分支、路径和接口也冻结；具体定位及共享变更边界见 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`。不开发、不修复、不重构、不改样式、不迁移、不做专项性能/测试修复。以后由用户单独启动完整重构；其他实施授权不自动解除本决定。

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
- 删除时一并清理用户数据：不可逆且超出代码范围，见 D-019。

### Consequences

- 构建与发行链大幅缩短：默认 `pnpm build` 不再含 Browser 生成段，CI 不再需要 Go，发行资产只剩插件文件。包体预算按实测只降不升（NFR-003）。
- 已完成的 T-04、T-06、T-09 交付物随删除消失，其历史 Evidence 保留；AC-281–AC-342 中的 huhubot 项撤回（Spec OOS-008），不计为通过。
- 旧库中的 Browser/Bot 数据成为遗留数据，插件不再读写，也不自动清理；文档提供手动清理说明。
- Home 网页嵌入分区、网易云音乐整项功能及其库内 Electron 会话（`src/host/desktop/browser-session*.ts`）一并删除（D-018，2026-11-02 用户决定，LOG-022）；“网页快捷卡”链接卡片保留并改由系统浏览器打开（D-021，用户 2026-11-02 确认）。会话目录与 Cookie 留在用户库中，按 D-019 不自动删除。

### Verification / Recovery

T-39 逐文件盘点与残留检索脚本；T-46 全量检查与真实 Obsidian 新库/旧库端到端截图（D-020）。删除批次在 dev 上按票提交，可由 Git 历史恢复；用户数据不受删除影响。D-018 已按用户决定改为删除，T-29/T-42/T-44 已同步修订（plan_revision 25）。
