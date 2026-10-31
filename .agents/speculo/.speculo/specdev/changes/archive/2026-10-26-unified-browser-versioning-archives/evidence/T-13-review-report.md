# T-13 独立代码审查原始报告

Reviewer: native:/root/review_code
Implementers: native:/root/implement_t01
Mode: native
Independence: 本 reviewer 未参与 T-13 实现或修复；只读源码、规范与测试，唯一写入为本报告；未再次派遣。
Input: evidence/T-13-review-input.json
Input-SHA256: 806a9a075a2d77e39977f8ac0758d1dbe33deb181634db7424fc8e0e0f420743
Observed: 2026-10-26；对输入对象 JSON.parse 后 JSON.stringify 的 UTF-8 字节计算 SHA-256。22 个代码文件的内容/模式、7 个输入 sources 均匹配；HEAD/base 均为 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa。结束前再次核对上述字节和模式、Git ls-files --stage -z 摘要以及固定 tracked_diff_command 摘要，均匹配。未用 HEAD 代替未提交交付。

## 范围与依据

固定 working_snapshot 的 22 个 versioning 文件为审查对象，新增文件实际读取，已有文件对照基线 diff。沿 module → Obsidian buffer/事件 → AutomaticHistory → LocalHistoryStore/CheckpointStore/JsonStore → HistoryQueryService → NoteHistoryPanel/NoteReviewService/NoteReviewPage 检查；追踪实际 Git preflight、runner、设置、错误状态、模块卸载顺序和既有消费者。browser/archives 活动 writer、T-01 测试及用户原有框架改动不属于本轮代码审查范围；未判断整个 change 已完成。

来源发现：本轮为 working-tree、无新增 commit，commit message Issue/PR 发现不适用；显式 Ticket、Spec、ADR-003、DESIGN PAGE-003、SRC-010 均找到并读取。仓库 docs/architecture.md、docs/data.md、docs/sync.md 提供相关当前基线。适用标准为 AGENTS.md、dev/ui 及架构、模块编写、设置/i18n、Obsidian API、测试、设计系统、无障碍参考；读取公共 code-review 的 working-tree/source-discovery/Fowler/risk/reviewer/evidence 合同和 error-handling/test-reliability。范围内未发现嵌套 AGENTS、CLAUDE、CONTRIBUTING 或另一个 CODING_STANDARDS 入口；读取实际 package.json、Vitest/TypeScript/ESLint 配置及测试接缝。没有新增外部代码或依赖；既有研究和批准设计足以支持本次审查，未进行新的外部方案研究。

设计对照：Ticket design_ref 为 revision 2 / digest f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c / PAGE-003 / AC-017；approval-sealed.md 最终绑定相同值。实际读取原型 final/index.html 与 app.js 的历史、设置、捕获时刻和显式刷新行为。生产实现复用历史侧栏、专注比较页与工作台设置页；配额显示单位为 MiB，默认 1024 对应 1 GiB。无 Git 时查询比较可走 inline 路径，恢复按钮禁用符合本轮明确安全边界。30 天/1 GiB 设置存在；T-14 回收未实现不作为 T-13 缺陷，也不据设置存在宣称回收已完成。

补充来源回读摘要（原输入 sources 未列出的必需 Ticket/批准记录与原型，供 Lead 补齐后续固定输入；不改变上方原始 Input-SHA256）：

| Locator（相对 change） | SHA256 |
|---|---|
| ticket/13-automatic-history.md | c82a2edc38fce54a4a08dac5e10c086f6e86041d154e02d28bedd6792f717272 |
| prototypes/UI-001/approval-sealed.md | 54b933fb590bf845f02a446407246d6752d44a0d80442cace3140fc819c1c68d |
| prototypes/UI-001/final/index.html | 0cd97261fe438a6c755494a45b131365149a32a65a4dc5a470f54f53b7487ccf |
| prototypes/UI-001/final/app.js | 1950858ee6e15df37e8782c125dd640d0ba82081daaea6021bca55ff910e1202 |

## standards-output

Reviewer: native:/root/review_code
Axis: standards
Result: request-changes
Input-SHA256: 806a9a075a2d77e39977f8ac0758d1dbe33deb181634db7424fc8e0e0f420743
Observed: 发现 3 项可达行为问题；均为正确性/隐私/生命周期/失败状态问题，不是格式偏好或 Fowler 启发式命中。下列反例通过实际生产类、内存存储及 Obsidian 类桩执行，未写源码或测试文件。

### STD-01 — P1：rename/delete 后仍采集旧 previous，重新建立失效路径身份，并可绕过隐藏排除

- 位置：`src/modules/versioning/platform/obsidian/history-capture.ts:29`（follow 的 previous）、`:49`（rename）、`:55`（delete）；消费者 `src/modules/versioning/services/local-history-store.ts:87`、`:105`。
- 可达前提与风险：活动 old.md 已形成 previous 后重命名为 new.md，rename 正确搬走 paths[old.md]，但 previous 保留旧路径/旧文本。下一次切换或 file-open，follow 将旧 previous 再交给 sample；LocalHistoryStore 按不存在的旧路径分配新 documentId。用户重建 old.md 时会继承这些来自另一篇笔记的历史。删除同样没有撤销 previous 或已排队的旧路径捕获。
- 隐私反例：自动历史开启、首次周期尚未到达，活动 draft.md 内容为 `do not archive`；将它移动至 `.private/draft.md`，rename 将目标视为排除路径，第一次查询 draft.md 历史为空；再切换笔记，实际历史中出现 `do not archive`。此时真实来源仍在隐藏目录，旧的可见路径绕过了资格检查。
- 实际执行结果：普通 rename 后 `old: 0, new: 1`；切换后 old 再出现快照；重建 old 后读取文本为 `['recreated', 'original']`。隐藏移动后先 `[]`，切换后变为 `['do not archive']`。
- 依据：dev 的数据归属/生命周期规则、变更范围合同要求真实消费者闭环；采样资格必须针对当前有效文档身份，不能只验证已过期字符串路径。
- 修复条件：rename/delete 同步更新或退役 outgoing previous，并阻止已排队的旧身份捕获重新建立 paths 映射；对隐藏/配置目录移动重新验证当前来源资格。保留正确的新路径历史及旧路径同名重建隔离，不以删除有效旧快照掩盖问题。回归覆盖实际 host adapter + AutomaticHistory + LocalHistoryStore 的事件顺序（含 preflight/写入延迟），验证普通 rename、隐藏移动、delete/recreate。

### STD-02 — P2：停止采集未取消真实 Git preflight，模块关闭会被后台进程拖住

- 位置：`src/modules/versioning/services/automatic-history.ts:14`、`:69`、`:89`；`src/modules/versioning/platform/desktop/local-history-protection.ts:9`、`:20`、`:25`；`src/modules/versioning/module.ts:354`。
- 可达前提与风险：在 Git 保护预检尚未结束时关闭自动历史或停用模块。AutomaticHistory 只 abort 自己的 signal；assertProtection 接口不接收 signal，locateGit 和三条 repo.git 命令均没有取消传播，runner 仅在预检最终退出时 dispose。stop 又 await tail，模块随后才停止原有同步时钟、review、restore 和 SyncService。慢/挂起的 Git 因此可让停用停在 disposing，其他模块资源继续存活直到该命令完成或超时（runner 默认单命令 120 秒）。设置重新启用后的新采集也排在旧 preflight 后面。
- 实际执行结果：使用可控的未完成 assertProtection 调用，stop 后状态已是 off，但 `stopped: false`；只有外部 release 预检后 stop 才完成。真实子进程未启动；不可取消事实由生产调用链和 runner 选项核对，不能将桩反例称为实机进程验收。
- 依据：dev 硬性规则 4（模块自己停止、关闭不留计时器/进程）；error-handling 的取消需传播并等待外部结束，而非仅改变显示状态。
- 修复条件：将生命周期取消传到 Git 发现/保护检查和 runner，确保 stop 请求终止在途预检并等待其实际结束；清理其余独立资源不应依赖一个不可取消预检。验证挂起预检时关闭/重开，Git 进程已结束、计时器/订阅已释放、新采样不被旧工作阻塞；已准入持久写入仍按原保证完成或核对。

### STD-03 — P2：空采样将尚未修复的索引错误清成 ready

- 位置：`src/modules/versioning/services/automatic-history.ts:65`、`:81`；错误展示消费者 `src/modules/versioning/module.ts:58`、`src/modules/versioning/ui/settings-page.tsx:67`、`src/modules/versioning/ui/history/NoteHistoryPanel.tsx:276`。
- 可达前提与风险：索引损坏导致一次采集进入 error，随后关闭所有 Markdown 叶或仅保留排除路径；下一周期 selected=[]。循环没有读取/验证索引，却无条件把 phase 清成 ready、error 清空，因此侧栏、设置及工作台状态全部撤销错误提示，而磁盘故障仍存在。
- 实际执行结果：index.json=`{corrupt` 时首次采样得到 `phase: error, error: versioning.localHistory.corrupt`；将 capture 返回值改为 [] 后再次采样得到 `phase: ready, error: undefined`，磁盘内容仍为 `{corrupt`。
- 依据：error-handling 要求失效状态持续存在时提示持续可见，不能将未执行或无效果的步骤转成恢复成功；dev 的状态/失败语义约束。
- 修复条件：区分无工作、采集成功与已验证故障恢复；空采样不能清除尚未重新验证的存储/读取错误。回归覆盖损坏索引→无可采集叶→周期/空事件，以及修复索引后真正成功采集才恢复 ready。

## specification-output

Reviewer: native:/root/review_code
Axis: specification
Result: request-changes
Input-SHA256: 806a9a075a2d77e39977f8ac0758d1dbe33deb181634db7424fc8e0e0f420743
Observed: 分别对照 T-13、Spec AC-017、ADR-003 与 DESIGN PAGE-003。正常查询比较链路有生产接线；下列失败/隐私/生命周期合同尚未闭合。3 项规范发现与标准轴的同一组 3 个实际缺陷对应，未将两轴合并判定。

### SPEC-01 — P1：排除隐藏内容与 rename 身份合同被旧 outgoing 捕获破坏

- 位置：`src/modules/versioning/platform/obsidian/history-capture.ts:29`、`:49`、`:55`；`src/modules/versioning/services/local-history-store.ts:87`。
- 风险与证据：活动笔记移到隐藏目录后，切换仍将先前缓存的可见路径文本写入恢复对象；普通 rename 后旧路径身份被再建，重建旧名称可看到另一篇笔记的正文历史。实际内存反例及结果见 STD-01，属于已执行的代码证据，不依赖测试通过推断。
- 依据：Spec AC-017 和 ADR-003 要求排除隐藏/受管敏感内容；来源 issue-2-body.md 第十四章要求通过设备侧记录与 rename 事件维护 identity，同名重建保留边界；T-13 验收要求真实未保存 buffer 与复杂 rename 的查询闭环。
- 满足条件：修正 outgoing 与排队采样身份生命周期，新增同一路径 rename/隐藏移动/delete-recreate 的 host-to-store 反例验证；已移走或删除的来源不能以旧路径再次采集，新旧身份的查询严格隔离。

### SPEC-02 — P2：关闭/取消仅改变采集状态，未结束其预检工作

- 位置：`src/modules/versioning/services/automatic-history.ts:69`、`:89`；`src/modules/versioning/platform/desktop/local-history-protection.ts:20`；`src/modules/versioning/module.ts:354`。
- 风险与证据：关闭采集后 Git 预检仍运行；停用模块在 await tail 期间尚未停止其余同步资源。可控预检反例和真实调用链见 STD-02。
- 依据：T-13 验收明确“取消/关闭模块释放计时器”；项目模块生命周期合同同时约束预检进程及关闭后资源，不以 off 文案代替停止。
- 满足条件：取消能到达实际预检进程并等待结束，关闭时其余独立资源完成清理；补充关闭与重开交错场景，不以测试中手动放行不可取消 Promise 作为取消成功证明。

### SPEC-03 — P2：存储失败仍在时用户错误状态会自行消失

- 位置：`src/modules/versioning/services/automatic-history.ts:81`；其 error 展示消费者同 STD-03。
- 风险与证据：损坏索引未修复，关闭可采集笔记后的空周期将状态改为 ready；实际反例见 STD-03。
- 依据：T-13 “失败状态可见”与 DESIGN PAGE-003 的失败/保护反馈要求。首次显示过错误不足以满足故障仍在时的可见性。
- 满足条件：空采样保留未解决失败；只有关联故障重新验证成功或完成明确恢复动作才解除，补充持久故障→无工作→恢复的状态测试。

## 实际检查与未验证项

- 已检查固定 diff、全部新增文件、生产入口及直接消费者；默认 off / 5 分钟、device 设置、双语文案、隐藏/config 路径过滤、散列对象读回校验、索引备份只读回退、无 Git 查询/比较、固定 B 与显式刷新均有实际代码接线。采样能力未注入笔记 writer 或 Git commit；没有找到采样直接保存笔记/提交 Git 的调用。
- 执行三段不落盘的 Node + esbuild write:false 内存探针：rename/同名重建与目录事件探针；腐败索引/空采样和停止探针；隐藏路径移动探针。均调用实际生产类，Obsidian 使用项目已有类桩；其观察结果已逐项记录。未把这些探针称为真实宿主验收。
- 目录 rename 的孤立 TFolder 事件探针确实没有搬迁子路径，但现有 navigator/vault-index.ts 明确记录宿主 children 各自收到 rename 事件；因此该孤立桩事件不足以证明真实宿主缺陷，不列 finding。真实目录事件时序仍由用户宿主验收覆盖。
- 实施者报告的 20 文件/124 测试、定向 lint、types、architecture/i18n 为上游执行记录，本 reviewer 未无理由重复运行，也不据此免除上述语义审查。没有构建、修改产物、提交或推送。
- 真实 Obsidian 主窗/popout、真实未保存 buffer 事件顺序、真实进程取消、四平台实机、性能与人工视觉（1440/390、明暗、键盘/焦点/触屏）均未运行，按 SRC-010 为 user-owned / not-run；不声称 Design Conformance 视觉通过。T-14 保留策略及整个 change 的集成/产物一致性不在本票审查结论内。

Summary-Counts: standards=3 request-changes；specification=3 request-changes；unique behavior defects=3；skipped_axes=none。
Disposition: 两轴均 request-changes；本报告不修复源码、不更新 Ticket/Map/Goal 正式状态。已完成本轮审查并停写，等待原 owner 修复后重新冻结输入补审。
