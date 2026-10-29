# T07 独立双轴复审 R2

本轮两个轴均为 **pass**；当前固定输入没有需要修复的新增 finding。R1 的三个问题均由独立冻结双 bin 反例重放确认关闭，Root 追加的 query 超时/关闭语义也已独立验证。这个结论只放行本次 T07 代码审查，不代替整个 change、后续 Ticket 或用户实机验收。

实际 Reviewer：`codex:/root/review_t07_r1`，与 R1 为同一位未参与实现的独立 reviewer；无递归委派。派遣要求及沿用身份为 gpt-6-astra/high，模型选择以 Root 保存的真实 spawn 回执为准，本报告不以身份文字代替该回执。本人没有修复产品、构建二进制、写正式工件或改变正式状态。

输入：`.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07-review-input-round2.md#review-input`。

- Input-SHA256：`80e66f4ab3e1f859f3e13bd529b90b92c76f787d7d0a92c812c92bc72202d0d8`；实际 JSON.parse/JSON.stringify 摘要一致。
- mode 为 working-tree，观察 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；原 `resolveReviewScope` 重跑70条显式路径，working_snapshot/index/tracked diff 等比较一致。仅工具允许的范围外 inventory/exclusions 不参与产品漂移判断。
- 69份来源（含显式段落锚点）前后逐一重算一致。R2任务原件 SHA256 `4bed8e77ed0c89b623468d3c4199ee0a9af24b11649a629452bf56ae8e015293` 一致。
- T07实际增量仍以 dispatch working copy 为基线：当前 delivery 70条中44 added、24 modified、2 unchanged，outside_allocation_changes=[]。未将同一路径中的前序票字节算成本票新增工作。
- 对 i2/i3 完整产品清单独立比较，仓库产品只有 `native/pty-server/src/bin/huhu.rs`、`src/control/{client,locator,broker}.rs` 和 `tests/control.rs` 共5文件变化；当前产品清单逐项摘要无错。临时工具/证据路径增删不算产品变化。
- 最终固定目录 `/tmp/huhu-t07-c-review-r1-linux-final-20261026T035611Z`：huhu SHA256 `74a7941aab96e71602a9a573ea1c3315331464d08acfd2b1177957783f544f1e`，huhu-pty SHA256 `d5bca2651893ac7a6337af1ed68587c876206d034c1f8ddea9c7d98c2ae22ba4`，两者0555。前后核验一致，未使用可变 target bin 作为本次测试输入。

前后核验：`/tmp/huhu-t07-review-r2-freeze-before.json`（04:13:26.914Z）与 `/tmp/huhu-t07-review-r2-freeze.json`（04:15:15.304Z），均2026-10-26 UTC、errors=[]。

## 发现与阅读范围

沿用 R1 已读取且摘要未变的根 AGENTS 发现顺序、workspace/catalog/runtime、SpecDev C 权威入口与公共 review Skill、source-discovery/risk-review/Fowler/reviewer-contracts/review-evidence/working-tree-review，以及 dev 的架构、测试、许可规则。本次是原完整70路径的复审，不把范围缩成修复5文件；未变路径的人工分析及检查证据复用 R1，变化5文件完整差异、最终源码和新增测试均重新阅读，另读 R2 新来源、Root query-effect 决定及实际检查日志/CAS。

继续以当前 Spec、implementation-contracts、T07及其 engineering、GP执行合同、engineering-packet 和接缝决定作为规范权威。当前工作副本没有本票提交引用，commit-source 分支不适用；没有缺规范跳轴。产品文档 `docs/agent-workbench-cli.md` 用于核对交付行为，不以其替代规范。Ticket 的 ui_change=false、styles.css 无本票增量，不为控制面审查启动 UI 流程。

复核的风险链包括：OS参数与CLI parse → discovery/locator/client → raw codec/IPC/broker/outbox → TS raw frame/helper/NativeHost → ControlEnvironment/Router/Commands/Paging → Controller/SpaceService/WorkspaceService/Sessions。未变实现的独立 R1 结论继续覆盖同代 lease/私有 handle、关闭ACK与native settled、本地frame责任、同步capture/提交/保留/启动、routeEnvironment、精确目标与scope、rename与分页、旧通道公平轮盘、canonical/生成器/共享fixture、CI双bin顺序、许可/相似度。R2重点重新跟踪修复进入这些接缝后的容量、超时、取消、错误分类及责任结算；未发现新的可证实风险。

<a id="standards"></a>

## 标准轴

Reviewer: codex:/root/review_t07_r1
Axis: standards
Result: pass
Input-SHA256: 80e66f4ab3e1f859f3e13bd529b90b92c76f787d7d0a92c812c92bc72202d0d8
Observed: 70路径/69来源/最终双bin前后无漂移；复用原完整生产链审查，独立阅读5文件修复及影响路径；原CLI/timeout反例和query×closing四格在新冻结bin上实际运行并回读。无新增 actionable finding。

R1标准finding处置：

1. **STD-01 关闭**。`client.rs:30` 的 final whole-response 防线和 `client.rs:49` 附近候选剩余预算共同覆盖本地诊断；`locator.rs:156` 接受实际数组预算。先计量带完整target/error/details空数组的envelope，再以 `RESPONSE_BYTES - base + 2` 替换数组；装不下返回完整容量错误，没有截断身份或假装返回完整候选。fallback保留原请求身份，合法请求本身≤32768B，固定失败envelope不会越过49152B。独立原长target/三个locator反例现JSON正文30331B（含换行stdout30332B），exit2/CAPACITY_EXCEEDED/none；原来是53251B正文。永久测试还包含精确49152/+1、空候选和原候选计数边界，实际完整native日志通过。
2. **STD-02 关闭**。`bin/huhu.rs:8` 起扫描所有OS参数，数量和字节独立饱和累计，拒绝后不再保存正文而继续识别--json。原第66参数--json与前置--json均返回206B JSON、exit2/none，非法UTF8返回205B INVALID_ARGUMENT JSON。新永久用例覆盖第1/65/66/71位置、非法UTF8组合、64/65参数、32768/32769字节和未发现endpoint，完整native执行通过。未放宽接纳容量，也未执行参数前缀命令。
3. **STD-03 关闭**。`client.rs:173` 起请求write使用独立H；完整write完成后接收窗口为T+H。broker仍按自身收到请求后的T观察，不因progress续命。独立真实CLI/broker的200ms启动timeout现在保留 committed-session/reserved-runtime、launch-pending，exit6/WAIT_TIMEOUT/unknown；cancel→迟到result→settled→unregister真实完成。接收尾段仅提供有界传输机会，没有重发/恢复业务。H=2000ms；分层网络等待总预算T+4H的说明不被解读为任意OS调度/同步文件系统下的绝对墙钟保证。
4. **追加query-effect审查通过**。`broker.rs:451` 附近依canonical现有transport=query区分纯查询，timeout为WAIT_TIMEOUT/exit6/none，closing为WAIT_CANCELLED/exit130/none；mutation仍为unknown，closing仍EFFECT_UNKNOWN/exit8。独立四格同时核验target、phase、一次请求、迟到settled、unregister ACK以及Browser cookies继续可用。判别没有提前改变T08的readOnly/wait设计。

标准轴没有剩余或新增finding；未将纯格式偏好或尚无可达触发证据的猜测列为问题。此结论不是穷尽所有并发排列或平台行为的证明。

<a id="specification"></a>

## 规范轴

Reviewer: codex:/root/review_t07_r1
Axis: specification
Result: pass
Input-SHA256: 80e66f4ab3e1f859f3e13bd529b90b92c76f787d7d0a92c812c92bc72202d0d8
Observed: 独立对照当前Spec §3.3/§3.5/§3.10、AC-010/011/012/052/055、implementation-contracts §2–4、T07验收/engineering-packet及Root接缝和query决定。原三项合同缺口已关闭；剩余未变合同沿用R1完整范围审查与仍有效证据。无新增规范finding。

- **SPEC-01 关闭**：whole-response 49152B合同现在覆盖discovery失败路径，剩余预算按完整target/error/envelope计算；外部CLI原反例符合上限且返回明确none容量失败。离线schema继续使用独立SCHEMA_BYTES，不把schema输出错误套进运行响应上限。
- **SPEC-02 关闭**：implementation-contracts全局--json及完整机器错误记录合同，在超参数数量/字节/非法UTF8组合下仍成立；参数预算不变，拒绝发生在endpoint发现和业务之前。原反例真实stdout可解析。
- **SPEC-03 关闭**：Spec及engineering规定的已知target/phase在普通启动timeout中不再丢失；新session/runtime与launch-pending准确回到调用者。effect=unknown仍准确保留业务可能继续这一语义；迟到责任不提前释放、不重放。真实断链的无进度降级与有界尾段的操作系统限制不冒称可保证收到所有回执。
- **查询合同保持一致**：纯query无业务效果时timeout/closing返回none，准确退出码与客户端既有query降级一致；mutation、stop等不能因此宣称none。Root同链决定只落实当前canonical已有类别，不提前要求后续Ticket能力。

未变合同仍包含：无模块时不隐式激活；不从cwd/UI焦点猜目标；显式Session反解其Space；headless terminal/Agent创建与业务门；原Provider读权限与关闭责任；分页完整envelope；未实现后续能力明确拒绝；无跨代重放。R2没有引入改变这些行为的源码/配置差异，生产required4当前bin证据再次通过。不把transport synthetic fixture等同生产业务E2E，也不将用户保留的实机验收改写为自动化通过。

## 实际执行与证据复用

本reviewer本次实际执行（全部工具命令exit0）：

1. R2任务摘要、原scope resolver、69来源及双bin前后核验；见freeze两份JSON。
2. `python3 /tmp/huhu-t07-review-r2-cli-probe.py`：4个子进程原反例/对照的argv、UTC、exit、stdout路径保存在同名JSON。脚本负责记录，审查时另读完整结构/长度；成功记录不单凭脚本退出码代表产品合格。
3. `python3 /tmp/huhu-t07-review-r2-timeout-probe.py`：真实新CLI/broker，synthetic Host只发布进度，没有真实业务效果。CLI exit6，保留最新身份/阶段，真实late settlement与关闭ACK。原脚本及R1记录未覆盖。
4. `python3 /tmp/huhu-t07-review-r2-query-probe.py`：query/mutation × timeout/closing共4个带断言场景；新bin、隔离HOME/XDG临时根，结果分别exit6/130/6/8，所有预期字段与一次请求断言通过；每场真实Browser cookies响应成功。helper均已退出/读取线程回收。
5. `python3 /tmp/huhu-t07-review-r2-audit.py`：对Root integration3审计2105个去重快照、C修复审计301个去重快照、delivery94个去重快照重算hash/字节，errors=[]；复核i2/i3产品只有5文件差异。首次辅助清单展示曾把/tmp工具/二进制清单变化也列入，随后按仓库产品路径过滤；这不是产品红灯，也没有改变被审查输入。

复用而未自行重跑的当前记录：

- C当前完整 `cargo test --locked`：111个顶层test、0failed/0ignored；嵌套tree子fixture不重复计数。回读原完整日志和同源输入快照。
- Windows --tests交叉check、授权7路径rustfmt check、同源--locked --bins build、immutable复制和verify-helper均exit0。producer的“复制时verify pending”由之后实际final-verify收据补齐，不以复制元数据冒充验收。
- Root新双bin required生产链：3文件4tests全通过、0skip、exit0，实际argv、bin摘要、04:06:08–04:06:10Z日志和无漂移记录已核验。此次没有重复运行该组；R1独立运行旧bin的证据只作为历史，不充作新bin通过证据。
- R1已审的未变JS/config/deps/build产物保持相同摘要：生产lint/architecture/i18n/generated/Promise/bundle/notices/build可复用；i1真实554pass/1fail与i2修好activity后的18项定向通过仍各自保留，没有宣称新的全555绿。
- 五文件新相似度真实run exit0，原55可比较未变文件沿用原审查。只读取数字、摘要及我方片段：普通饱和计数、断言、非阻塞I/O、临时目录清理等未发现可疑改写。没有读GPL参考源码；数字相似度不是来源证明。

明确保留的非全绿与未验证边界：

- 全量cargo fmt check **exit1**：generated wire和两个inherited_fds文件。generated wire是T07生成文件，本次修复未变，不能说成pre-T07；两个inherited_fds与HEAD相同。授权7修复路径的scoped检查通过。不把纯生成格式差异升级为行为finding，也不声称全fmt绿。
- 早期真实red、第一次110-test版本、copy预检metadata计数错误均留在原证据，不倒填为当前成功。
- 原6个范围外Bot文档锚点失败仍未修；没有新的docs全绿声明。
- 未运行真实Obsidian、真实用户Vault/账号/Provider、五平台实机E2E或Windows实机ACL/ConPTY；交叉类型检查不等于实机验收。未重新构建Rust或根产物、没有新的全555回归或联网许可审计。
- 本次只写/tmp审查材料，没有产品/正式工件写入，没有提交、推送、发版、归档或Ticket/Goal状态迁移。

READ-ONLY SOURCE STOPPED
