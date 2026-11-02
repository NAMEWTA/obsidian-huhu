# 本 change 的架构决定

## ADR-001: 通用档案采用 v2 身份、独立关系和可携带业务事实

**Status:** accepted
**Source:** LOG-003；Issue #3 冻结正文
**Supersedes:** none

### Decision

实体与关系分别使用 archive-record/archive-relation v2 外层标识；业务类型和稳定 ID 独立。关系文件是唯一业务真源；定义、不可变修订与迁移/回退事实在可见档案目录。档案拥有主资料与关系，home 拥有任务与里程碑，通过引用连接。

### Context / Trade-off / Consequences

来源已比较旧内嵌表、整库 JSON 与独立关系文件；采用独立文件便于携带、审查和局部恢复，但文件数量增大，必须验证三万业务文件场景。隐藏设备日志不能决定业务权威；v1 保持可读、既有基本字段按旧 codec 路由写入，关系和新字段写入必须显式迁移。

### Verification / Migration

Spec AC-018–025、027–030。迁移稳定 ID、源 hash、关系预写/读回、owner CAS、可携带回执和冲突回退必须验证；现有旧 parser 对 v2 标识拒绝写入须保留。采纳不代表 P0–P4 已落地。

## ADR-002: 受管档案历史覆盖由档案 owner 预检

**Status:** accepted
**Source:** LOG-004；固定代码探索报告的跨域静态风险
**Supersedes:** none

### Decision

versioning 可以提供档案的只读历史比较。覆盖恢复必须由 archives 核验实体、关系、定义和迁移状态，且只能走支持的安全恢复路径；未支持、结果未知或不安全时拒绝覆盖并保留比较能力。

### Context / Trade-off / Consequences

目前普通 Markdown 恢复只确认仓库范围及正文/编辑叶条件，不能证明未来档案多文件协议的语义完整性。直接覆盖单文件更方便但可能绕过权威切换；完全禁止查看又会损失调查能力。采用 owner 预检与明确拒绝，安全恢复能力可分阶段增加。静态风险尚未复现为数据损坏，不以此声称已发现/修复生产 bug。

### Verification / Migration

Spec AC-026。必须有从真实 versioning 恢复入口触发、在无 owner/不完整迁移/关系缺件时不写磁盘的负例；安全路径须返回档案 owner 的可回读回执。当前合并提交未实施此新增产品行为。

## ADR-003: 自动本地历史显式启用并保护恢复依据

**Status:** accepted
**Source:** LOG-006；[Issue #2 第十四章](sources/issue-2-body.md)；用户确认“1、采用”“全部按推荐”
**Supersedes:** none

### Decision

自动本地历史默认不采集，由用户主动开启；采集普通笔记的当前内容，包括未保存 buffer，排除隐藏及受管敏感内容。内容有变化时默认每 5 分钟以及切换笔记、重要操作时采样，按内容 hash 去重；默认保留 30 天、每库每设备 1 GiB，间隔、保留期和配额可配置。

### Context / Trade-off / Consequences

只采已保存内容不能覆盖尚未保存的编辑，默认开启又会让用户未明确选择的正文进入恢复存储，因此采用显式开启与 buffer 采样。30 天/1 GiB 是用户采纳的初始产品政策，不是来源事实、性能实测或所有版本永不丢失的保证。自动历史和恢复前强制检查点有不同触发条件，不能因自动采集关闭或暂停而跳过恢复所需检查点。

保留期限和配额只允许回收没有保护引用的旧快照；未闭合恢复和仍承诺可撤销的对象必须保留。清理后仍不足时暂停新自动采集并持续提示，不为满足配额删除恢复依据；强制检查点若写入失败，仍按既有恢复合同拒绝覆盖。

### Verification / Migration

Spec AC-017、AC-034。固定时钟和内容变化验证周期/事件采样、去重及未开启不采集；以小配额夹具验证过期对象回收、保护对象保留、空间不足暂停、重启后保护引用仍有效。真实编辑器验证未保存 buffer 的正确来源，不通过自动采样保存正文或创建 Git 提交。

## ADR-004: 浏览器以四组桌面平台作为完整交付门

**Status:** accepted
**Source:** LOG-007；[Issue #1 NFR-05、8.3、21.2](sources/issue-1-body.md)；用户确认“按你说的这四组”
**Supersedes:** none

### Decision

本 change 的 browser 完整交付必须覆盖 Windows x64、macOS ARM64、macOS x64、Linux x64。Windows ARM64、Linux ARM64 保留后续扩展，尚未支持时明确拒绝；移动端不据此获得受管浏览器运行时支持。

### Context / Trade-off / Consequences

Issue 明确三类 OS，但未确定 CPU 组合。用户在四组硬验收与六组硬验收之间选择前者。平台名单是目标，不改变当前 PR 仅实现 Linux x64 的事实；Node/插件 CI 通过不等于原生收容、凭据与宿主行为通过。

### Verification / Migration

Spec AC-012。四组各自产生固定资产/构建对应的 G-01～G-06、适用 T-01～T-22 证据；OS 专属能力按实际平台核验。缺少任一目标组的必需证据时不能宣称 browser 完整目标完成，环境缺失保留待验收而非静默缩范围。

## ADR-005: 档案结构化写入不代替用户提交原生草稿

**Status:** accepted
**Source:** LOG-008；[Issue #3 保存、单文件写入与宿主合同](sources/issue-3-body.md)；用户确认“拒绝，避免覆盖”
**Supersedes:** none

### Decision

档案表单保存、删除、迁移及受管恢复涉及的任一原生编辑叶与磁盘不一致，或多个相关叶之间存在内容分歧时，拒绝该结构化写入并保留表单草稿。用户自行保存或解决差异后，重新读取与校验再重试；一致时才执行原有字段级三方合并。

### Context / Trade-off / Consequences

自动合并后保存会改变用户自由正文的提交时机；首个安全合同选择明确拒绝，不自动保存、丢弃或覆盖原生 buffer。此合同补充 ADR-002 的业务 owner 检查，二者都必须通过；业务迁移合法不意味着编辑器草稿可以被覆盖。

### Verification / Migration

Spec AC-020、024–026、AC-033。从真实表单/删除/迁移/历史恢复入口分别触发，验证无目标覆盖、草稿保留、差异可定位；多个窗口/分屏与预检后再次编辑仍会在提交前重校验。已有部分迁移步骤沿既有 journal 保留，不伪称全局回滚或自动删除已核验的新资源。

## ADR-006: Cookie 与 Identity 为必需，origin storage 保留条件扩展

**Status:** accepted
**Source:** LOG-009；[Issue #1 FR-17 与 12.5](sources/issue-1-body.md)；用户确认“保持扩展，Cookie/Identity 为必需”
**Supersedes:** none

### Decision

Cookie/Identity 主线属于 browser 硬交付；localStorage/IndexedDB 保留条件扩展，不作为本 change 核心交付的必过条件。源文“localStorage 初版只支持明确的第一方 origin”解释为将来启用该扩展时的首个支持边界。

### Context / Trade-off / Consequences

源文 FR-17 的“扩展”与 12.5 的“初版”存在强制程度歧义。用户未选择将第一方 localStorage 纳入硬交付；扩展仍保留，不能删除目标或声称已支持。不支持的输入须明确拒绝，不静默忽略 origin storage 后报告完整导入成功。

### Verification / Migration

Spec AC-007。当前能力表、预检、RPC/CLI 输出必须区分 Cookie 导入与不支持的 origin storage。未来实现扩展时另补站点脚本运行前恢复、来源 storage-key 语义和目标读回的实际证据，不借本决定降低源文的数据隔离要求。
