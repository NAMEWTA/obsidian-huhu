# T-05 repair-1 独立双轴复核原始报告

Reviewer: native:/root/review_browser  
Implementer: native:/root/audit_browser  
Mode: native；延续原独立 reviewer，未参与实现或修复，未递归派遣。  
Input-SHA256: `87786933a01e0cb89329ac295e3bf25148ee963698b7ba2afbd88cc5aa98043e`  
Observed: 2026-10-27；standards=pass；specification=pass；新 findings=0。

## review-input

完整固定对象：[T-05-review-input-r2.json](T-05-review-input-r2.json)。实际对整个对象执行 `JSON.parse` → `JSON.stringify` 后计算 UTF-8 SHA256，得到上述摘要；不是内部 scope.input_sha256。

- working-tree 显式 25 文件，base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；前序为 T-02-r3、T-03-r2、T-04-r2 联合快照。完整 scope、sources、exclusions 由输入对象固定，未修改输入。
- 开始逐项核验 25 文件 after SHA256 和 49 项来源原字节 SHA256，全部匹配。相对首轮 14 文件变化；新增纳入 workspace.test.ts、ui/testing/workspace.ts。原始首轮报告和此前补读 design-contract 均已正式冻结入来源。
- 结束实际重跑相同 `validate-specdev.mjs --review-scope --repo <cwd> --mode working-tree --base 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，逐项传入同一 25 个 `--file`：base/head、index SHA256、tracked_diff SHA256、完整 working_snapshot 均 MATCH；49 项来源再验无漂移。
- excluded additions 仅为本轮 T-05-review-input-r2.json，excluded removals=[]；不把新增输入造成的 inventory 变化宣称为整个仓库无变化。报告在结束范围核验后作为唯一允许的新输出落盘。
- 继续应用已读且摘要未变的 code-review/dev/ui、source-discovery、Fowler、risk-review、reviewer/reuse/evidence/working-tree、错误/测试可靠性、架构/测试、范围/研究及 design-contract；规范仍包括 AC-007、T-05、Issue #1 §12 原文、ADR/docs、SRC-010、DESIGN revision2/PAGE-004 和封板批准。没有跳过轴，没有创建或改写正式状态。

## standards-output

Reviewer: native:/root/review_browser  
Axis: standards  
Result: pass  
Input-SHA256: `87786933a01e0cb89329ac295e3bf25148ee963698b7ba2afbd88cc5aa98043e`  
Observed: 原 S-01/S-02/S-03 均经原生产反例与新增必要边界复核闭合；没有发现新的可达缺陷。

### 原 S-01 已闭合：发布前仍查源授权，发布后保留安全回执

- `src/modules/browser/services/workspace.ts:1454`–`:1467` 不再以最终 human lease 检查覆盖已提交 summary。最初的 human/runtime 校验和传入保存过程的校验仍保留；校验同时要求原 runtime 对象没有被替换。
- `services/create-workspace.ts:130`–`:150` 在 readIdentity 前后、生成 plan 后和 savePrepared 的发布前回调中检查取消/源授权；finally 清除源 Cookie 值及私有 plan。源读取失败或权限失效不会进入 committed 处理。
- `IdentityService.savePrepared` 将本次 signal 与 validate 传给真实 CredentialStore；`platform/desktop/identity/credential-store.ts:56`–`:70` 在异步保护、stage、读回及 binding 后检查，最后在 fs.link 前同步核验。旧 lease 没有因此获得额外网页读写能力。
- 独立重演原生产反例：真实临时密文 composition 中，credentials.create 完成后、返回前分别执行 workspace.pause 或 releaseViewer。两种情况现在都返回 publication=committed，已保存版本存在，缓存含该 id，回执没有 capture 或 SYNTHETIC 秘密值。
- 反向边界：把人工保存的真实 protector.protect 挂起，期间实际 pause 原空间，再放行保护。保存以 human_lease_expired 拒绝，磁盘密文总数仍为原来的 1；没有通过仅移除响应检查而放宽发布前授权。

### 原 S-02 已闭合：提交与目录刷新分别表达

- `services/create-workspace.ts:59`–`:64` 只在 savePrepared 已成功后建立 committed 回执并先把安全 summary 加入缓存；辅助刷新失败返回 catalogRefresh=pending，不掩盖已提交事实。create/savePrepared 本体仍在此 helper 之前 await，真实发布失败不会被 catch 成 committed。
- `:47`–`:57` 的目录读取按 identityRevision 防止较早读取覆盖后来确认的 save/remove；持续不一致或读取失败保留 pending。保存/删除确认时推进 revision。
- `IdentityService.list(requirePersistent)` 在已有持久身份时明确报告 provider 不可用/弱保护，不以空的持久列表覆写已知身份。公开 summary/receipt 均为白名单元数据，未增加 Cookie 值、capture 或源路径。
- Workspace 状态的 identityRefreshPending 与刷新用例、PAGE-004 的独立警示/重载按钮已接真实消费者。重载只尝试目录读取；没有再次调用 create 或重派网页动作。该用例仍受当前 owner/工作区既有边界约束，不授予只读副实例写权限。
- 独立重演：分别在保存已完成之后故障注入 listIds、read、availability/provider。三种原 S-02 情况均返回 committed+pending，缓存保留新 summary，故障下刷新明确失败；恢复端口后目录刷新成功，创建次数始终 1，磁盘版本数为 2。
- 新竞态对照：启动 refresh 并截住已从真实 CredentialStore 取得的旧 ids；然后保存新身份并让它自己的 refresh 失败；最后放回旧 ids。较早读取没有覆盖新 summary。恢复后再次目录读取收敛为两个真实版本。

### 原 S-03 已闭合：人工 UI 可取消且等待确认结果

- BrowserWorkspace.manualAbort 是本次人工保存独有的 AbortController；saveIdentity API → Workspace → composition → IdentityService → CredentialStore 均传递 signal。组件卸载也会请求取消。UI 取消或 Esc 请求不会直接宣称保存未发生。
- 人工保存期间取消按钮可用，显示等待确认；保存成功后 signal 已 aborted 则呈现“已提交且保留”，确认 cancelled 则呈现发布前取消。输入与持久开关在进行中锁定，避免回执对应参数漂移。
- 独立重演原实际 React DOM 反例：真实 BrowserWorkspace/TestProviders/共享 Dialog 中打开 human 菜单与保存对话框，令业务 Promise 保持未完成。取消按钮现在 enabled；点击后传入 signal.aborted=true，仍等待业务结果。分别完成 cancelled 与 committed 两侧时，页面显示正确终态，saveIdentity 调用均只有一次。
- 实际定向组合测试还覆盖人工 read、encryption、readback、真实 fs.link 发布 await 内取消：前三者不增加密文，已实际提交者保留 committed。源读前 viewer 已释放时不发出 readIdentity；发布前真实 create 失败仍报失败且不显示目录刷新警示，原 plan 可按既有规则重试。

### 未变主体与回归边界

首轮所核对的 source-reader/native schema2/columns、源能力证明与旧 schema、源/target 独立完整语义、ContextRef、受保护 capture、origin storage 早拒、staging/target 清理归属和新 Space 发布边界的代码主体没有被这次 repair 替换；对应完整文件/来源摘要与首轮对照可证。复核新增接口和全部人工/file/source UI 消费者后，没有发现信号跨操作复用、原 lease 被重新激活、秘密进入回执或发布失败被吞掉。既有 source/staging/target/new Space 的取消和清理事实仍适用，未扩展 closed-shadow 或历史 authority 策略。

Findings: []。原 S-01、S-02、S-03 关闭，不保留为开放项；未限制新发现数量。

## specification-output

Reviewer: native:/root/review_browser  
Axis: specification  
Result: pass  
Input-SHA256: `87786933a01e0cb89329ac295e3bf25148ee963698b7ba2afbd88cc5aa98043e`  
Observed: 按 AC-007、T-05、Issue #1 §12.1–12.6 与 PAGE-004 核对，原 R-01/R-02/R-03 均闭合；没有新增规范差距。

- R-01：人工 source 权限在读回及实际发布前仍有效才可提交；发布已确定完成后返回安全 summary，后续 source lease/viewer 失效不改变该事实。原失败反例与前置拒绝对照同时成立。
- R-02：已确认发布以 committed 定位；辅助目录故障独立表达 pending，并保留可见版本事实。恢复动作只重新读取目录，不重复创建身份。旧目录读取不能抹掉后来确认的保存。
- R-03：人工保存现在有独立、贯通的取消入口，UI 等待确认，发布前取消与原子提交后的晚取消分别反馈；没有承诺撤销已经完成的保存。
- 不变的核心范围仍以原 source 比较 staging/target、安全属性/完整集合与自然过期区分、准确 owned Context、拒绝未支持 origins、受保护存储和持久 cleanup 定位为准。实际修复没有给 Agent 开放身份秘密或来源授权。
- DESIGN revision2、digest `f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c`、PAGE-004 与封板来源未变。新增目录恢复提示、请求取消/终态反馈复用既有组件和中英 t()；DOM 证据只覆盖行为，不把人工视觉或真实宿主验收改写为通过。

Findings: []。原 R-01、R-02、R-03 关闭；skipped_axes=[]。

## reviewer 实际证据与命令

实际执行完整输入摘要、开始/结束代码与来源校验、相同选择的 review-scope 重建、原三项生产反例与修复相关边界。原报告只读保留，没有改写其中 request-changes。

组合实验读取当前 create-workspace.test.ts 的 fixture 前缀，仅在内存替换 vitest 包装，esbuild stdin/write:false 后 Module._compile；真实 composition/Workspace/IdentityService、临时 CredentialStore/Persistence 执行，故障只注入已说明的端口/await，finally 逆序 dispose 并清理合成临时目录。源 runtime 仍为合成 fixture，没有启动真实 Chrome/helper 或读取真实秘密。实际输出摘要：

```text
original S01 pause: publication=committed, durable=2
original S01 viewer: publication=committed, durable=2
original S02 list: publication=committed, refresh=pending, reloadCreates=1
original S02 read: publication=committed, refresh=pending, reloadCreates=1
original S02 provider: publication=committed, refresh=pending, reloadCreates=1
prepublication authorization fence: human_lease_expired, durable=1
older in-flight directory ids: laterVisible=true, readOnlyReload=complete
```

独立 DOM 实验沿首轮 happy-dom 内存 bundle：真实页面/Provider/UI，SpaceViewer stub，保存端口可控完成；实际输出：

```json
{"originalS03":"cancelled","cancelDisabled":false,"signalAborted":true,"calls":1,"status":"已在发布前取消，未发布新的身份或空间。"}
{"originalS03":"committed","cancelDisabled":false,"signalAborted":true,"calls":1,"status":"取消到达时，含 2 个 Cookie 的身份种子已经提交，已保存的身份保留。"}
```

实际风险定向测试：

```text
pnpm exec vitest run src/modules/browser/services/create-workspace.test.ts src/modules/browser/ui/BrowserWorkspace.dom.test.tsx -t 'manual|publication boundary|directory refresh|pre-publication|older in-flight|file-import receipt'
Test Files 2 passed (2)
Tests 20 passed | 12 skipped (32)
```

作者报告的 36 files/308 tests、test/worker tsc、10 生产 lint、architecture 1258 modules、i18n 5195 keys 未冒充 reviewer 重跑；没有无差别重复全套。当前定向组合测试覆盖了发布前/后、不同辅助故障和真实临时磁盘 fs.link，独立反例补证核心语义。

未运行真实 Chrome/helper/Obsidian/四平台/人工视觉/性能，依 SRC-010 由用户验收；未 build、未验证最终生成物组合，由 Lead 串行集成。没有读取真实资料/Profile/账号/系统秘密，没有改生产源码、正式 Evidence/Ticket/状态、旧报告或产物。T20 及范围外工作没有改写。

最终：standards=pass；specification=pass；开放 findings=0。交回后停写。
