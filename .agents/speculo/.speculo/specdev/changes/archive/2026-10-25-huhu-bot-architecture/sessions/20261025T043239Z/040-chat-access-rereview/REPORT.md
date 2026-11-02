# T01/T02维护与T03/T05修复后独立双轴复审

Session: 20261025T043239Z
Task: 040-chat-access-rereview
Status: completed

## 聚焦交接

标准轴 **pass**；规范轴 **pass**。035的三项P2均在原输入接受回放及真实消费者中满足最小条件，未发现新的可证实阻断。这个结论只针对固定T01/T02维护与T03/T05代码候选，不替代T27工程接纳、后续Ticket或用户现场验收。

实际Reviewer为 `native:/root/foundation_review`，未参与实现或修复，未再委派。沿派单gpt-6-astra/high偏好记录，不声称底层模型attestation。唯一输入 `evidence/T-03.md#review-input-r2`，SHA256 `78581af912849fe0591b3bb697859a903e167b2642a099d4185d95c7e2d81588`；131实际文件/36来源，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，Map10/Goal9。

实际比较035固定快照：**9文件变化、122文件完全相同，36规范来源全部相同**。变化仅为generator/public及Go嵌入schema/共享fixture、Grants service及测试、ObsidianSources及两个测试文件。未变的API、SQL、executor、conversation、配置/凭证、生命周期、依赖和工程规则按摘要及影响闭包复用035/033观察，没有把旧pass用于新代码。

完整回读035两轴/原始探针材料和037/038/039最终报告、相关实际红绿输出；026/027/028及其原始证据沿035已完整回读且相关未变观察复用。035原REPORT和raw-probes摘要仍分别为 `3f132d0d2ec4467a6a8e9ba4bce7c8235485115e4f74245ae456160bcb56e16a`、`8063a7ea630374080aba6e395cc0f90bc1ff2b67112c13f94dcd7bb9147df627`，原失败没有覆写。

## 产物与验证

原始命令、接受断言diff、独立探针和实际输出见 [raw-probes.log](raw-probes.log)。所有新探针在 `/tmp/huhu-chat-rereview`；只向040目录写REPORT/日志。隔离Go module中99个固定native文件均与当前工作副本逐字节相同；仅在副本添加独立测试。TS使用实际生产bundle，外部Obsidian类/Vault/editor为受控边界；不是用户Obsidian现场。

| 独立实际验证 | 结果 |
| --- | --- |
| 035对象替换、原131072/131073选区输入，改为接受断言 | 两项exit0；正常原对象返回原文、替换对象拒绝SOURCE_CHANGED；两个一字节选区均返回Z。 |
| 035 Grant真实Facade/SQLite输入，改为原结果接受断言 | exit0；仅更换commandId时Create返回原Grant、Revoke返回完整原Receipt；只有原一次撤销、一create及一revoke receipt。 |
| 035三代派生来源独立探针 | exit0；三Run的effective source保留，撤销read后第三代正文也被过滤；第四轮Engine只得到两个无来源用户意图。 |
| 新增长坐标实际capture→HostReadService read/search→JSON→Go ValidateMethod | 16个实际请求/结果全部通过：原边界、相邻边界、1MiB末尾和131072之后emoji邻接的Z；输出均一字节、search保留原文UTF16范围。该探针是实际JSON转交Go校验，非live stdio；live TS-Go另由access suite覆盖。 |
| 定向sources/host-read/core-protocol Vitest | exit0，5文件61 tests；涵盖读前/读中/哈希发布点替换、scope同类窗口、拒绝不占缓存、编辑器快照、64KiB/1MiB及Unicode、lease/底层不可取消任务。 |
| `go test -mod=readonly -v ./tests/contract/access ./tests/contract/foundation -count=1` | exit0，access1.355s、foundation4.369s，含实际bootstrap/stdio↔TS Host进程及226共享样本。 |
| 隔离重生成、独立schema语义比较、Python标准验证 | 全部exit0；六份生成输出逐字节一致；仅18处start/end.maximum从131072变1048576；126形状、226样本、25 decimal negatives、3 frame goldens。 |
| Root r2 build/lint/原反例接受回放 | 已回读原始日志，均exit0；build/lint运行时TS/schema已冻结，039仅Go变化，不把Lead命令冒称reviewer全仓重跑。 |

本轮没有机械重跑未变化的全部chat/凭证/用户OS场景。035已实跑的原子受理、SQLITE_FULL、commit后wake前崩溃、Usage未知、pin/删除预览、EOF/关闭、中断不自动重放等证据仍对应未变字节；本轮沿调用链复核Grant修复没有改变事务/epoch/CAS顺序，schema变化没有改方法身份、预算或严格验证器。

新增扩展日志最初沿用ASCII探针的originalBytes=text.length标签，在emoji分支实际表示UTF16长度；已改为同时记录UTF16长度131075与UTF8字节131077。随后外层尝试比较两次全vector SHA失败，因为每次捕获的opaque source/view ID本来随机；这是探针元数据断言错误，原输出保留。新生成的16个实际vector已再次通过Go严格校验，不把该错误说成产品red或声称随机句柄稳定。

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: pass
Input-SHA256: 78581af912849fe0591b3bb697859a903e167b2642a099d4185d95c7e2d81588
Observed: 对完整固定候选按9项变化与122项有效未变观察分别判断。三个原问题经过接受回放，并检查修复对权限、缓存、异步资源、原文坐标、wire验证、幂等事务的影响；未发现新的正确性、安全、恢复、资源或Fowler维护性阻断。不是以作者新增测试全绿代替独立反例。

**035 STD-01关闭。** `sources.ts` 的unchangedFile同时比对原path/mtime/size与registry对象；captureNote后台读在任务实际开始、Vault.read结束、save异步SHA-256完成后且发布句柄/缓存之前复核，scope搜索也使用同一检查。原“同路径、同stat、新TFile，read中返回替换正文”输入现在拒绝SOURCE_CHANGED，正常原对象保持可读。当前定向实际测试证明读前及note/scope哈希窗口同样拒绝，拒绝后仍可填满128槽；已经同步捕获的未保存编辑正文在leaf/registry/editor变化后仍保持原文。没有恢复读live对象的隐式fallback，也没有改变不可取消Vault的配额释放规则。

**035 STD-02关闭。** `generate.mjs` 单独为start/end设置整数上限1048576，maxBytes仍沿原预算；独立语义diff确认唯一schema仅18个对应坐标maximum改变。UTF16 code units不超过该文本UTF8字节数，1MiB文本的合法坐标可表达；仍拒绝超过捕获容量、负数、非整数和surrogate错误。原一字节边界、1MiB末尾及emoji之后坐标均可通过真实capture/read/search，实际JSON由Go共同schema接纳。定向测试验证整篇1MiB最多返回65536字节并truncated，65537预算拒绝；没有用扩正文预算掩盖坐标问题。Go嵌入schema与公共schema逐字节相同。

**035 STD-03关闭。** `grants/service.go` 复制强类型command后仅将副本CommandID清空用于摘要，传给repo的原meta和业务内容未变；Create/Revoke均如此。独立原Facade/SQLite探针确认新attempt恢复同一Grant/完整Receipt，包括原receipt的command身份，不追加写入。实际access回归验证更换workspace/scope/resource/recipient/operations/session/task/expiry/expectedRevision仍冲突；新key旧revision仍CAS拒绝；错误Profile及实际推进后的旧epoch均拒绝；撤销后的旧Create重放仍为同一revoked Grant。没有归一掉业务字段、改key或跳过DB检查。

完整维护观察：原受理/最终化/配置pin/历史read-send分离/派生来源/最终Grant准入的实现字节未变，三代provenance及当前live TS-Go再次通过；资源、EOF/WAL和双向协议由受影响suite与旧有效观察共同覆盖。模型未装配保持安全失败，未引入直接读Vault、秘密输出、新依赖或跨模块边界。重复哈希策略的本次行为分歧已消除，没有仅因仍存在独立小helper而提出启发式阻断。

Findings: 无新增。035三个标准轴finding的最小满足条件均已满足；旧request-changes记录仍保留为r1事实。

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: pass
Input-SHA256: 78581af912849fe0591b3bb697859a903e167b2642a099d4185d95c7e2d81588
Observed: 独立依据T03原子单聊/持久执行、T05 AC-022/024/054、T01/T02维护、Spec §6/8/9、ARCH事务合同、ADR与LOG-051重新判断。修复恢复明确来源身份、合法选区跨消费者可用性和共享幂等意图语义，没有扩大范围或改变已批准的数据/权限合同。用户现场not-run不计作本轮代码阻断。

**035 SPEC-01关闭。** T05目标/AC-024要求本次明确资料固定来源。原对象读中被同路径新对象替换，现在在任何句柄/缓存发布前拒绝；原来源正常对照保持，scope同类窗口覆盖，已同步捕获的未保存编辑器快照不被重新读出的live正文替换。实际capture/HostReadService接受回放符合Spec §6 origin/revision/hash固定的代码合同。

**035 SPEC-02关闭。** T05明确提供选择/读取/搜索，T01唯一wire合同必须供Go/TS共同消费。独立原边界和1MiB/Unicode实际请求结果可往返两个验证器，原文UTF16坐标与输出UTF8预算保持区分。18处schema最大坐标调整覆盖相关SourceRange载体，没有新增方法、扩权限或放宽65536正文预算；生成一致性与226样本相互印证，不以生成fixture替代真实捕获结果。

**035 SPEC-03关闭。** T05 AC-054及ARCH同key/同输入恢复原结果的合同现在适用于Grant：仅新commandId不改变业务意图，原Create/Revoke结果可恢复；业务变化、旧epoch和失效CAS仍拒绝，撤销不会被旧Create重放复活。真实SQLite保留一份原操作事实，与其他Session/Run/Assistant的attempt/intent分离一致。

本轮还确认权限交集、read与send分离、合法多代派生来源、最终MarkRunning/Finalize准入、真实配置pin与Usage删除保护仍由相同实现提供；独立三代与当前live TS-Go观察没有出现撤权后正文流出。T03原子状态、未知usage、崩溃恢复及T01/T02安全边界按未变摘要复用035/033完整判断，没有宣称整个change已完成。

Findings: 无新增。035三个规范轴finding的最小满足条件均已满足；此轴独立按规范和实际行为判断，不由标准轴pass替代。

## 问题与下一步

无剩余可证实代码阻断。Root可回读本报告与raw-probes后，结合自身工程/资产验证更新正式Evidence和依赖门；reviewer未修改Ticket/Map/Goal、未提交或发布。

真实Provider、Obsidian窗口、用户Vault、目标OS/keyring仍为user-owned/not-run；本次未启动旧默认D-Bus探针。T04事件续读、T06审批、T08真实协议Engine、T16恢复操作、T20模块/UI等仍是后续范围；ADAPTER_NOT_ASSEMBLED是当前正确阶段边界，不能冒称这些后续能力已完成。当前ignored发行资产及T27许可/工程另由其owner接纳。

末次131文件/36来源及HEAD/index/modes/baseline一致性、所有probe停止/Wait及return0实际回执附raw-probes.log。全部写入仅限040报告/日志；交回后立即停写释放槽位。
