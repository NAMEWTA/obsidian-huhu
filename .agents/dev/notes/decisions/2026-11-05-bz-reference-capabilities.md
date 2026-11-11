# 公共基础设施与档案、日记、体检的权威边界

状态：Accepted

日期：2026-11-05

内容 owner：来源 change 的已接受 ADR 与 LOG；提升网关：specdev/archive-and-consolidate，codex:/root（109-archive）。批准来源为用户 2026-11-05「继续派遣 GPT 6.1 sol medium 去进行提交推送，然后归档」，范围与原 Lead 见来源 sessions/20261104T095541Z/109-archive/TASK.md。

来源 change：2026-11-04-bz-reference-capabilities。原 ADR.md SHA-256 `64699829fa153f057129629485866a120d5448f02786a5b1b845d1d945f077bf`；LOG.md SHA-256 `7615bab3264009a0c0fea2bab4d7d8091975ea7d0ef96421940a6c12225b89ab`。归档后来源为 `changes/archive/2026-11-04-bz-reference-capabilities/ADR.md` 与同目录 LOG.md。保留原始外部引用，本次只复用已有来源记录，未重新联网研究。

ADR-001–006 逐条满足稳定机制与接手者必知条件，保留原理由、取舍、负向保证和恢复验证义务；无现役决定被替代。既有发布前旧数据政策仍有效，本条的无迁移与当前数据安全保证不承诺兼容所有历史格式。实现与验收见来源 evidence/T-01.md 至 T-20.md 及本地 final-review.md；真实 Obsidian 宿主表现仍待用户验收。


## ADR-001: 归物本以档案物品预设为唯一权威

**Status:** accepted
**Source:** LOG-001
**Supersedes:** none

### Decision
归物本归 archives：物品类型预设＋专属视图＋档案内领域命令，同一物品只有一份档案 Markdown 主记录，不建立 bz 式 `belongings.json`。

### Context / Trade-off / Consequences
bz 用独立 JSON 小账本（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4/src/belongings ）；虎虎已有稳定 ID、修订、money/date/table 字段，再建 JSON 会造成双写与恢复冲突。代价是生命周期必须用档案 `table` 字段表达并由专门命令校验。

### Verification / Migration
重建索引不丢生命周期；专属页与通用档案编辑互不覆盖。

## ADR-002: 书页日记是周期笔记的只读投影

**Status:** accepted
**Source:** LOG-002
**Supersedes:** none

### Decision
书页日记归 navigator，保留一日一周期笔记与模板，书页只读投影；浏览不建文件，写入走现有周期笔记与文档修改契约。

### Context / Trade-off / Consequences
bz 是一条记录一个时间戳文件（https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/docs/adr/adr-0230-diary-book-ui.md ），只借鉴其展示与交互，不迁移虎虎文件身份。

### Verification / Migration
现有日记无迁移可读；首页日历、Navigator、书页打开同一文件。

## ADR-003: 复用 bz 的分层——交互复刻、纯逻辑改编、安全与存储不迁入

**Status:** accepted
**Source:** LOG-006、LOG-009
**Supersedes:** none

### Decision
bz（MIT）已有相似实现时优先仿造复刻：交互与布局按 bz 复刻并用虎虎 React/shadcn 与语义 token 重写；无宿主依赖的纯逻辑可复制改编并逐文件署名；safe 密码学、存储路径与恢复协议不替换。

### Context / Trade-off / Consequences
bz 为原生 DOM＋模板字符串，且把新库默认落到插件目录 `storage/`，与虎虎数据边界冲突；整体移植不可行。偏离 bz 处必须在 `docs/third-party/bz.md` 写明原因。

### Verification / Migration
来源登记逐项列出上游 SHA/路径、采用方式与虎虎落点；保留 bz LICENSE 原文。

## ADR-004: 统一反馈与领域事件基建先行

**Status:** accepted
**Source:** LOG-012
**Supersedes:** none

### Decision
统一操作反馈协议、实例作用域的类型化领域事件和文件变化适配作为独立阶段先于功能建设：纯协议在 shared，宿主适配在 host，展示在 ui，生命周期由 app 注入。

### Context / Trade-off / Consequences
曾推荐按需提炼；用户选择先建，以便后续功能复用。代价是首阶段无直接用户功能，须先接一个现有 owner 验证，避免空框架。事件只作失效提示，不成为写入层。

### Verification / Migration
连续同任务进度只有一个活动反馈；卸载后监听全部清理；rename 同时失效新旧路径。

## ADR-005: 通知为可扩展渠道的统一基础设施

**Status:** accepted
**Source:** LOG-017、LOG-020
**Supersedes:** none

### Decision
notifications 泛化为统一通知基础设施：请求的来源/目标为可辨别类型，opener 与渠道均为可注册贡献点；in-app/system 为首批渠道，外部渠道（微信、短信、邮件、飞书等）后续接入。

### Context / Trade-off / Consequences
现状渠道是 `src/shared/automation/types.ts` 的封闭联合，target 只认自动化运行。封闭类型每加一个渠道都要改共享类型并牵动自动化，不利扩展。

### Verification / Migration
既有 inbox（`.huhu/notifications/<device-id>/inbox.json`）幂等与已读语义不退化；自动化通知行为回归。

## ADR-006: 新增 health 模块，只读扫描与 owner 执行的有限修复

**Status:** accepted
**Source:** LOG-014
**Supersedes:** none

### Decision
新增正式登记的 health 模块，以各数据 owner 贡献的 provider 进行只读扫描，并开放按 #17 §12.3 流程、由 owner 重新校验后执行的有限修复。

### Verification / Migration
挂写 API spy 的完整扫描零写入；锁定/取消不算通过；过期报告修复拒绝旧哈希。


## ADR-007: 翻页引擎隔离于启动闭包并提供阅读回退

**Status:** accepted
**Source:** 从来源 LOG.md 的 LOG-018 提升；实现来源登记 docs/third-party/bz.md
**Supersedes:** none

### Context / Trade-off / Consequences

用户在仅 CSS 动效与内嵌引擎之间选择允许内嵌。采用翻页引擎增加包体、资源与生命周期成本；阅读可用性不能依赖动画。参考记录为 https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/docs/adr/adr-0230-diary-book-ui.md ，独立第三方 StPageFlip 的 MIT 许可不由 bz 许可替代。

### Decision

翻页引擎按需加载，不进入启动闭包；窄屏、reduced-motion 及引擎不可用时保留无动画阅读回退。登记第三方许可与通知，不以引擎引入改变周期笔记正文权威。当前采用 page-flip 2.0.7 嵌入适配副本，而非要求后续必须改为 npm 依赖；具体版本与改编范围以来源登记为准。

### Verification / Migration

来源 T-12 的加载边界、释放、DOM 与 UI 验收；检查包体和许可。隐藏与关闭停止动画和预取；没有日记文件迁移。

## ADR-008: 密码本收藏复用标签而不新增密文 schema

**Status:** accepted
**Source:** 从来源 LOG.md 的 LOG-019 提升；T-07
**Supersedes:** none

### Context / Trade-off / Consequences

用户在新收藏字段与现有标签之间选择标签。复用标签避免为了视图增加密文格式与迁移负担；收藏的查询和显示须消费同一标签事实。

### Decision

密码本收藏使用现有标签表达，不建立独立收藏字段或存储副本，不改变加密条目 schema。

### Verification / Migration

来源 T-07 的 SafePage 与关联回归；不需要密文迁移。收藏表达不得削弱现行解锁、锁定清理和剪贴板安全保证。
