# ADR: 2026-11-04-bz-reference-capabilities

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
