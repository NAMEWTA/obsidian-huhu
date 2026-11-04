# 产品线收缩与发布前无兼容义务

状态：Accepted（已采纳决策；实现与验收状态沿来源分别核验）

日期：2026-11-04

内容 owner：来源 change 的已接受 ADR 与 LOG；提升网关：specdev/archive-and-consolidate，host:claude-code/root。

来源：2026-10-31-dev-stabilization-overhaul / ADR.md（`changes/archive/2026-10-31-dev-stabilization-overhaul/ADR.md`，纯文本路径，归档移动前链接不可解析）（原始字节 SHA-256 `5fce2ab40d051fc5fc54260f93c977387be0113b916002ac78cd0dceb4a08656`，归档后位置）。ADR-005 另见同 change 的 LOG-028、evidence/T-12.md、evidence/T-13.md；ADR-006 另见 LOG-029、evidence/report-legacy-removal.md。evidence 目录不入库，仅作本地来源。

本条只保留仍成立的长期取舍。来源 ADR-002/003/004/007（Bot Runner 停止阶段、检查点、依赖闭包、Profile 隔离）随 huhubot 删除失去对象，ADR-008/009 为被取代的中间决定，均留在来源 change，不提升。

## ADR-001: 整体删除 browser、huhubot 与 superbot，不留空壳

**Status:** accepted
**Source:** change ADR-010；LOG-020、LOG-022
**Supersedes:** 永久 [Bot应用权威与恢复边界](2026-10-31-huhu-bot-architecture.md) 整份；[浏览器历史档案边界](2026-10-31-unified-browser-versioning-archives.md) 的 ADR-004、ADR-006；[终端协作与身份边界](2026-10-31-agent-workbench-refactor.md) 的 ADR-005

### Decision

HUHU 产品线不再包含浏览器模块、huhubot（含 Go Runner、HAP 合同）和 superbot 方向（后者仓库内无独立代码）。删除是物理删除：模块、原生程序、构建与发行资产、各模块里的入口、服务键、设置、词典和外链路由全部移除，不保留开关、别名或隐藏入口。Home 的网页嵌入分区、网易云音乐及其库内 Electron 会话一并删除；Home 的“网页快捷卡”保留，外链统一交给系统默认浏览器。三块能力的优化、修复和重构计划不再成立。

### Context / Trade-off / Consequences

备选是继续冻结等待重构、或隐藏入口保留代码。前者让死代码长期占用构建、CI 和审查成本；后者保留供应链与维护负担，并与“清理干净”的产品决定冲突，均被用户否决。代价是三块能力的已有设计合同随之失效（见 Supersedes），重新引入需要从新的设计与 ADR 开始，不能把旧 ADR 当作现役约束。构建与发行链随之缩短：默认构建不含 Browser 生成段，CI 不需要 Go，发行资产只剩插件文件与终端辅助程序。

### Verification / Migration

当前文档、项目 Skill 与根说明不再描述这些能力（`pnpm test:docs` 通过）；残留检索清单以来源 change 的 removal/inventory.md 为准。无数据迁移：旧数据不在受支持格式内（ADR-002）。

## ADR-002: 发布前不保留历史数据与向后兼容；当前数据的安全语义不降级

**Status:** accepted
**Source:** change ADR-001、ADR-011；LOG-002、LOG-029
**Supersedes:** none

### Decision

HUHU 正式发布前，开发期产生的旧目录、旧设置键、旧存储格式、旧布局、旧会话和旧集成凭据都不是受支持的历史版本。接口、状态机、数据模型需要改变时，在同一批次更新全部生产者、消费者、夹具与文档，并删除旧实现；不保留双读双写、历史别名、版本升级链、导入旧数据的界面，也不为旧数据写“手动清理”指引。

遇到旧格式数据时，走当前的“无效/损坏/不可识别”路径：拒绝、报告，不覆盖、不静默改写用户文件。设置归一化只保留当前字段，已退役字段（包括旧集成凭据）不得被读回再写入库内设置。保险箱载荷只认当前版本。

下列不因此降级：当前格式数据的写入正确性、隐私、权限、凭据与外部动作安全、未保存编辑保护、已提交事实的可恢复性。现行逻辑里名字含 legacy 的部分（终端 legacy 键盘编码、评论“无颜色”的 `legacy` 颜色 id、第三方 CLI 数据目录读取、可丢弃缓存的版本重建、档案用户自定义类型的 schema 升级恢复）是当前功能，不在删除之列。

### Context / Trade-off / Consequences

项目尚未正式发布，旧数据没有外部用户。保留迁移链会让每个格式长期背负双实现，并成为误写旧凭据、误读旧字段的来源。代价是开发者本机的旧库不再可用；旧凭据可能残留在开发者设备的设置文件中，但已不被读取，下次保存时不再写回。本决定的有效期止于首次正式发布：发布后，对已发布格式的变更必须重新评估兼容与迁移义务，不能援引本条继续免除。

### Verification / Migration

只验证当前格式的新库及功能；旧路径、旧字段的代码引用清零。删除带来的误伤需要单元回归保护：来源 change 的一次删除曾误删 `SyncEngine.replaceData` 中唯一的 `this.data = newData`，由看板冲突回归暴露并补测试，说明批量删除旧分支后应跑完整安全回归，不能只看类型检查。

## ADR-003: 可选初始化不进入启动关键路径

**Status:** accepted
**Source:** change ADR-005；LOG-008
**Supersedes:** 永久 [首页可选恢复时限](2026-10-31-home-cookie-restore-deadline.md) ADR-001（其对象网易云 Cookie 恢复已随 ADR-001 删除，所保留的原则由本条承接）

### Decision

工作台和首页基本结构、本地交互可用之前，不等待账号恢复、外部探测或其他可选 I/O，包括不设固定时限的关键路径等待。此类恢复在后台进行，由所属模块的 lifetime 拥有，具备错误收敛、通知、去重和销毁清理；登出、交互登录、模块禁用、窗口关闭和 Vault 切换使旧恢复失效，迟到的结果不能覆盖用户之后的决定，计时器属于所属窗口而不是全局。

### Context / Trade-off / Consequences

旧决定用 5 秒上限缓解“凭据服务不返回时首页无限等待”，仍让每次这类故障多等 5 秒。把可选能力移出关键路径后，可选功能的故障只影响该功能。代价是后台恢复完成前该功能显示未恢复状态。

### Verification / Migration

用永不返回的读取夹具直接断言首页或工作台已可交互，而不是等超时后才通过；覆盖拒绝、迟到成功、销毁后完成和登录登出竞争。无数据迁移。

## ADR-004: HUHU 生成的默认路径固定为英文 ASCII

**Status:** accepted
**Source:** change ADR-006；LOG-009
**Supersedes:** `vault-layout.ts` 注释中“目录名有意为中文”的旧约定

### Decision

可见 `huhu/` 下 HUHU 生成的默认目录与固定文件名统一为英文小写 kebab-case，集中定义在 `src/shared/storage/vault-layout.ts` 一张表，并写入 `docs/data.md`。显示名称经 `t()` 本地化，不作主键、关系目标或路径；用户输入的标题、自定义名称和显式路径不翻译、不改写。

### Context / Trade-off / Consequences

路径不随界面语言变化，语言切换、同步和跨设备时不会出现同一对象多个目录。旧中文目录属于发布前产物，不检测、不迁移、不别名（ADR-002）。

### Verification / Migration

在当前格式新库验证中英文初始化、语言切换、重启与目录碰撞；旧中文路径的代码引用清零。

## ADR-005: Hook 事件按发布序号排序，槽位无序，收集器等待按剩余时限优先

**Status:** accepted
**Source:** LOG-028；evidence/T-13.md；提交 9287af1、450263d
**Supersedes:** none（从 LOG-028 提升，未写入来源 change 的 ADR.md）

### Decision

状态 Hook 的发布池里，槽位只是容量单位，不携带顺序：事件释放的槽位会被后来的事件复用，按槽位号读取会让后发事件先于先发事件。同一 scope 内的投递顺序由发布时写入引用的发布序号 `seq` 决定，序号取发布进程的系统单调时钟（`process.hrtime`），读取端对同一 scope 同类槽位按 `seq` 排序；缺失或非有限的 `seq` 按引用无效处理。全局数据槽位不承载顺序，从随机起点分配，避免突发时每个发布者都从 0 起扫描。争用收集器的等待者按剩余时限提高优先级，不使用会让最早等待者输给新到者的指数退避。容量与既有时限不因此放宽。

### Context / Trade-off / Consequences

最初的缺陷在 Linux 20 轮里 16 轮出现 `0,2,1` 乱序，而原用例没有顺序断言，所以一直通过。发布序号用单调时钟而不是墙钟，避免回拨造成错序；并发发布者之间没有顺序语义，不作保证。排序读取在 scope 内有多个槽位时多读几个小文件，只在有积压时发生。

### Verification / Migration

32 个 scope、每个 3 个事件的真实进程用例无条件断言每 scope 恰好按序且不重复，并有确定性回归覆盖“槽位被早先事件释放后复用”；Windows CI 连续两次 20 轮每轮 96/96 无顺序违例（run 41752095795）。引用格式只认当前带 `seq` 的形态（ADR-002）。

## ADR-006: 原生 helper 握手缺少必需能力即启动失败

**Status:** accepted
**Source:** LOG-029；evidence/report-legacy-removal.md（提交 f0dfaad、a8df267）
**Supersedes:** none（从 LOG-029 提升）

### Decision

插件与终端辅助程序启动时核对协议版本，并核对握手声明的当前所需的全部能力；缺少任一必需能力（或输入上限描述）就拒绝使用该 helper 并明确提示安装匹配的发行版本。宿主层与会话层把这些能力当作必需，不再保留“能力缺失则降级运行”的分支。仅在特定平台才有意义的能力（如前台所有权相关的编辑器事务只在 Linux）按平台决定是否必需，由握手代码为准。

### Context / Trade-off / Consequences

能力缺失降级会让同一插件在不同 helper 版本下出现不同安全语义，且降级分支无法被发行矩阵完整验证。代价是 helper 与插件必须同版本发行，不匹配时终端不可用而不是部分可用；这与发布前无兼容义务一致（ADR-002）。

### Verification / Migration

握手单元测试覆盖缺能力的失败路径；协议版本与能力表的权威是 `src/host/desktop/native/helper.ts` 与 `native/pty-server`，本条不重复能力清单。
