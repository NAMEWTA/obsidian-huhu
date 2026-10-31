# 来源对象身份竞争修复候选

Session: 20261025T043239Z
Task: 038-source-identity-repair
Status: completed

## 聚焦交接

035 的 STD-01/SPEC-01 已按原对象替换输入修复：后台 Vault 读前、读后及异步 SHA-256 完成后的缓存发布点，核对原 TFile 仍是同一路径 registry 中的对象，且 path/mtime/size 未变化。scope 搜索沿用同一复核，拒绝后不返回正文、不发布 source、不占用缓存条目；已同步捕获的未保存编辑器正文仍保持本次快照。STD-02/SPEC-02 的唯一 schema 修复由037负责；本票只消费其冻结版本，永久实际捕获→Host read/search 回归已覆盖原边界及1MiB上限。生产与测试源码已经停写，当前是待Root接纳、独立复审的候选；未修改正式状态。

本轮沿派单 gpt-6.1-sol/xhigh 实施偏好，不声称底层模型鉴定。回读038 TASK、035完整双轴报告及原始 source/range 探针；复用已读 dev、测试与 Obsidian API 参考。只改自有三处源码/测试及038报告与日志；没有改API/schema/Go/依赖/构建产物，没有再委派、提交或发布。

## 产物与验证

生产修改仅 [sources.ts](../../../../../../../../../src/modules/huhubot/platform/obsidian/sources/sources.ts)：内部 `FileVersion`/`unchangedFile` 统一核对对象与版本，`save` 在异步hash后、生成句柄和缓存写入前执行复核；scope读操作也在实际task开始时复核，避免前置检查与真正读取之间的微任务窗口。编辑器捕获不重新读取 live 文件，因此编辑器内容、leaf 或registry之后变化不会替换已捕获正文。

永久回归位于 `sources.test.ts` 和 `services/host-read/host-read.test.ts`：

- 同路径新TFile、相同mtime/size，覆盖后台读开始前、读等待中，以及note/scope哈希等待中的身份替换；原对象正常对照、未保存整篇编辑器正文、现有选区/focus/Unicode/surrogate/lease/真实不可取消Vault任务配额均保留。
- hash测试只暂停外部 WebCrypto 调度，实际digest仍委托生产SHA-256；不是替换应用判断。失败发布后仍能填满全部128 source/scope槽，证明拒绝不泄漏条目。
- 实际 ObsidianSources.captureSelection→HostReadService.read/search，在ASCII原文131072、131073、1048576 UTF-16 code units的末尾一字节选区都返回Z，范围为原文绝对坐标。1048577字节未保存正文拒绝；实际1MiB整篇快照最多输出65536字节并标记truncated，65537读/搜索预算仍拒绝。中文/emoji/换行的原文UTF-16坐标、UTF-8 hash与输出预算保持。

冻结输入见 12-final-input.json（历史日志已清理：`logs/12-final-input.json`）：30文件，文件本身SHA256 `c6297dbbe9e80cad778addaf1cd45b277a31f73d70d86635d7e1ae161f0ffc0b`。自有文件SHA256：

| 文件 | SHA256 |
| --- | --- |
| sources.ts | e7128894ee98e5f4dd28c3c011c675c65174a385937ef6a4b0052a9a32171561 |
| sources.test.ts | 1113bb41e3b720767a823c1669eff21f2697e74ec784632052b42c5b2571c866 |
| host-read.test.ts | ae4f71bdc624517b98cf34158989f4e0a58ace7295ce5c24c0a46c1ab3a14a2c |

037通知并实际核对的唯一schema SHA256 `63d16a0a891b14d6c685514d57913ccccbaac59c184f9b76b45d8a6779db9e4e`，仍63 methods/126 params-result shapes，226共享方法样本。原文start/end整数上限1048576与正文maxBytes<=65536分离；本票未写共享文件，未扩正文预算。

原035 `/tmp/huhu-chat-review` 探针及bundle只读复制到本票 [logs/probes](logs/probes)，原脚本副本保留。baseline使用原035冻结bundle；断言只从“观察缺陷”改成“应拒绝替换/应读取合法选区”，正文、stat与边界输入不变，得到实际红灯。当前生产另行bundle后以相同探针输入转绿；baseline/current各文件摘要见 13-probe-manifest.json（历史日志已清理：`logs/13-probe-manifest.json`）。038初始源文件和037已冻结schema摘要另见 00-input.json（历史日志已清理：`logs/00-input.json`）。没有覆写035原探针/日志；没有把原观察性exit0当产品验收。

命令和实际退出码见 14-command-results.json（历史日志已清理：`logs/14-command-results.json`），全部由本agent实际执行；红灯工具返回126，输出是对应产品断言失败，不是审批阻断。

| 检查 | 实际结果 |
| --- | --- |
| 原035隔离source/range期望回放 | 两项红灯；正常原对象返回ORIGINAL_ALLOWED_BODY，替换仍泄漏REPLACEMENT_PRIVATE_BODY；原131073选区INVALID_HOST_PARAMS。见01两个日志。 |
| 永久sources测试，修复前→后 | [02](logs/02-permanent-identity-red.log)：4失败/10通过；[03](logs/03-permanent-identity-green.log)：14通过。 |
| 定向来源、Host及core/protocol套件 | [04](logs/04-targeted-final.log)：exit0，5文件61 tests，1.34s；226方法样本由方法测试消费，不额外计成tests。 |
| 当前生产独立source/range probe | [08](logs/08-source-probe-green.log)/[09](logs/09-range-probe-green.log)：exit0，替换拒绝SOURCE_CHANGED，原对象及131072/131073合法选区返回原正文/Z；service/source均dispose。 |
| 生产与测试tsc | [06](logs/06-production-tsc.log)/[07](logs/07-test-tsc.log)：exit0，无输出；真实会话1264/75700均Wait完成。 |
| 定向eslint | [10](logs/10-local-lint.log)：exit0，生产零警告；仓库配置忽略测试，测试类型由独立tsc检查。 |
| TS architecture | [11](logs/11-ts-architecture.log)：exit0，1204 modules，无zone/host/desktop/barrel/cycle违规。 |

所有执行命令、Vitest worker和probe都已完成；没有启动Go Runner、系统provider、真实Obsidian或用户Vault。本轮无新增依赖、公共方法、数据迁移和发行资产。根全量build/lint和完整Go↔TS集成窗口由Root在全体停写后统一执行，不冒称本agent本轮重跑；037自身schema/Go验证以其原报告为准。

## 问题与下一步

无阻塞。Root下一步以冻结源码与037 schema共同收口构建、集成与未参与实现者复审；035 Grant幂等问题属于另派owner，不在本票写集。真实Obsidian窗口/Vault、OS与模型现场由用户后验；本轮外部类与App/Vault/editor是有限替身，只证明生产捕获/缓存/Host消费者代码路径。

最终输入再核对、进程扫描和实际return结构校验见 [15-return.log](logs/15-return.log)。completed只表示038候选交回，业务接纳由Root决定。
