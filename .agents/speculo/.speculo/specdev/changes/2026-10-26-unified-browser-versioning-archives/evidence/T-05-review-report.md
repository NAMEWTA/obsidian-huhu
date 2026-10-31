# T-05 独立双轴审查原始报告

Reviewer: native:/root/review_browser  
Implementer: native:/root/audit_browser  
Mode: native；未参与 T-05 实现，沿用独立 reviewer，未递归派遣。  
Input-SHA256: `7e0209d2ad8f16e137cd66e42675d8298c12c35a5d2706287f00ed61e417624d`  
Observed: 2026-10-27；standards=request-changes；specification=request-changes。3 个唯一 P2，两个真实组合链/磁盘反例，一个实际 React DOM 行为反例。

## review-input

完整固定对象：[T-05-review-input.json](T-05-review-input.json)。实际对整个对象执行 `JSON.parse` → `JSON.stringify` 后计算 UTF-8 SHA256，得到上述摘要；它不同于内部 scope.input_sha256。

- working-tree 显式 23 文件，base/head 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`。按 T-02-r3、T-03-r2、T-04-r2 联合前序识别本票变化，没有把共同 HEAD 当成未提交实现的完整前序。
- 开始逐项核验输入中 23 文件 after SHA256 与 47 份来源原字节 SHA256，全部匹配。完整 scope、sources、exclusions 以链接对象为准，未修改输入。
- 结束实际重跑相同 `validate-specdev.mjs --review-scope --repo <cwd> --mode working-tree --base 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，逐项传入同一 23 个 `--file`：base/head、index SHA256、tracked_diff SHA256、完整 working_snapshot 全部 MATCH；47 份来源再验无漂移。
- inventory 排除项新增本轮输入 JSON、sources/browser-lifecycle-preflight.md、src/modules/archives/ui/RelationTypeDesigner.tsx；没有移除项。它们不在冻结代码/来源内，不声称整个工作区无变化。Map7 在本次输入中已固定；没有把未来 T32 release 写集变化当成本票源码。
- 按 source-discovery 发现的规范为 Spec/ADR/Ticket、Issue #1 本地冻结原文、SRC-010、现有 browser docs，以及 DESIGN revision2/PAGE-004/批准封板。未提交 working-tree 模式不推断新 commit message。没有发现 browser 子树额外 AGENTS/CONTRIBUTING/CODING_STANDARDS。实际使用 code-review、dev、ui 与风险/错误/测试/架构/设计参考；不跳过任何轴。
- reviewer 补读 UI source-discovery 要求的 `.agents/speculo/workflows/specdev/common/rules/design-contract.md`，原字节 SHA256 为 `10d961892c212bd00780746ee09be8bd6fad99aa1327c43e6dbef27f3d3e396c`。此为补充规则观察，不冒称原输入 47 项内已有此条，也不改完整输入摘要。真实视觉验收仍按 SRC-010 交用户。

## standards-output

Reviewer: native:/root/review_browser  
Axis: standards  
Result: request-changes  
Input-SHA256: `7e0209d2ad8f16e137cd66e42675d8298c12c35a5d2706287f00ed61e417624d`  
Observed: 追踪授权来源 → IdentityService → CredentialStore → composition → staging/target → Workspace → PAGE-004；完整文件与真实消费者中仍有以下 3 项缺口。均为本票应闭合的继承接缝，不声称它们由本次新增代码首次引入。

### S-01 / P2：人工保存已经提交，最终网页租约检查却把结果改报权限失败

- 位置：`src/modules/browser/services/workspace.ts:1452`–`:1457`，重点 `:1455`；组合处理在 `src/modules/browser/services/create-workspace.ts:111`–`:127`，真实 UI 消费在 `ui/BrowserWorkspace.tsx:992`–`:1000`。
- 可达时序：人工保存完成 readIdentity 与授权检查，IdentityService.savePrepared/真实 CredentialStore 已提交新密文；其 Promise 尚未完成返回期间，原控制查看器释放、空间暂停或租约到期。composition 正常刷新并返回保存 summary 后，Workspace 又执行 human(request)，于是抛 human_lease_expired。
- 风险：此时读取授权失效不能撤销已提交的身份。用户得到“人工租约已过期”的保存失败，丢失本次已确认提交的版本回执；UI 的关闭和 refreshed 成功路径不执行，重试保存可能新建重复身份。这不是迟到秘密读取：本次返回值只有已提交版本的 summary，源读取在提交之前已经检查。
- 独立实际反例：使用 create-workspace.test.ts 的合成 fixture，真实 composition、BrowserWorkspaceService、IdentityService、临时 DesktopCredentialStore 与 BrowserPersistence。创建种子 Space、订阅查看器并取得 human lease；在实际 credentials.create 成功后、其返回前执行真实 workspace.pause，然后等待 saveIdentity：

```json
{"saveResult":"human_lease_expired","durableIds":2,"manualSummary":{"id":"bf26dd49-c5bb-4cdc-a148-d24c63f00647","identityId":"49058124-d578-468a-b411-477c65690209","label":"Manual saved fact","source":"manual-login","createdAt":1793037908587,"cookieCount":2,"originCount":0,"persistent":true},"spaceMode":"paused"}
```

- 依据：dev 的真实消费者与状态一致性；error-handling 的“已确认全部提交应回读结果，不能再次创建相同效果”。新 plan 保存和创建 Space 已采用的提交后晚取消事实规则也应到达这个人工消费者。
- 最小满足条件：保留 readIdentity 前后及发布前的必要授权检查；保存处理者确认提交后，最终响应应保留该 summary/已提交事实，不由后续网页租约失效覆写为未提交式错误。不需要给旧 lease 增加任何网页读写权限。补 human lease 在发布前与发布后失效两侧的组合回归，断言持久版本、响应事实和 UI 一致，且不重复保存。

### S-02 / P2：辅助列表刷新失败覆盖已确定提交结果，缓存又隐藏新身份

- 位置：`src/modules/browser/services/create-workspace.ts:96`–`:103`，同类接缝 `:125`–`:127`；refresh 定义在 `:46`–`:48`。IdentityService.savePrepared 成功后已删除私有 plan，位置 `services/identity-service.ts:45`–`:51`。
- 可达时序：新密文已通过原子发布，savePrepared 已返回真实 summary；接着 refresh 调用 availability/listIds/read，遇到正常可发生的目录 I/O、解密/provider 或其他版本读取故障。
- 风险：commitIdentityImport 拒绝并只给 UI 一个刷新错误；新身份已经保存，缓存仍是旧列表，原 plan 又已被消费。用户既没有已提交回执，也不能用原 plan 对账重取结果，重新导入会创建另一随机版本。锁定/晚取消发生在提交后而影响 refresh 时也不能因此宣称保存未发生。
- 独立实际反例：同一真实组合 fixture，另准备一份合成 plan。仅令后续 credentials.listIds 抛 EIO；保存本体仍由真实 CredentialStore 执行。恢复 listIds 后读取所有实际密文，确认新标签存在，并尝试同 plan：

```json
{"commitResult":"EIO","savedNewIdentity":true,"durableIds":2,"visibleIdentities":1,"samePlanRetry":"source_grant_invalid"}
```

- 依据：error-handling 的已提交/未知/未发生必须区分，辅助报告失败不能抹掉业务 owner 已确认的提交事实；dev 的状态归属与真实消费链一致性。
- 最小满足条件：将已提交 summary 与可重试的目录刷新结果分离；保留本次可定位的成功回执及可见身份事实，同时对刷新失败给出独立、真实的故障/恢复反馈，不能把所有异常盲目转成成功。commit 与人工 save 两处一致处理。补发布后 listIds/read/provider 故障，断言版本只创建一次、已知提交不丢失，恢复后列表能收敛；发布前 create 失败仍正确失败。

### S-03 / P2：人工保存入口仍没有发布前取消通路

- 位置：`src/modules/browser/ui/BrowserWorkspace.tsx:959`–`:962`、`:986`–`:998`；API `src/modules/browser/api.ts:95` 的 saveIdentity，以及 Workspace/组合人工 save 接缝见 S-01。
- 可达前提：用户通过 human 空间菜单选择“保存身份种子”，点击保存；readIdentity、凭据保护、读回核验或发布前磁盘 I/O 尚在等待。
- 实际行为：pending 时取消按钮 disabled，Dialog.onOpenChange 也拒绝关闭；saveIdentity 请求没有 signal，内部 planId 没有传回 UI，无法通过 discardIdentityImport 中止它。普通文件/source 导入新增的取消路径没有覆盖这个实际消费者。
- 独立 DOM 反例：在 happy-dom 中运行真实 BrowserWorkspace/TestProviders/共享 Dialog，使用 human lease fixture，正常打开菜单与保存对话框；将 saveIdentity 保持未完成以表示发布前等待，点击保存后输出：

```json
{"manualSavePending":true,"cancelDisabled":true}
```

- 风险：用户不能在不可撤销发布之前停止这一敏感保存，慢读回或 provider 等待期间也没有可请求取消的操作。关闭整个视图不提供保存取消信号，不能代替用例取消。
- 依据：T-05 的逐步取消合同，ui 的可见异步操作/恢复机制，error-handling 要求明确取消时点与等待完成事实。
- 最小满足条件：人工保存也有本次操作独有的取消信号/plan 归属并贯穿 source read 后续、CredentialStore 发布前门；UI 允许请求取消，等待已确认结果。fs.link 已开始并成功后按真实 committed 回报，不删除正确密文、不伪称已回滚。增加人工入口在 readback/加密/发布前以及已提交后的取消用例，保留 source/target 权限隔离。

## specification-output

Reviewer: native:/root/review_browser  
Axis: specification  
Result: request-changes  
Input-SHA256: `7e0209d2ad8f16e137cd66e42675d8298c12c35a5d2706287f00ed61e417624d`  
Observed: 规范依据包括 Spec AC-007、T-05 原验收、Issue #1 §12.1–12.6 和批准 DESIGN revision2/PAGE-004。以下与标准轴是同三个唯一缺陷，不重复计为六个。

### R-01 / P2：manual-login 保存的提交事实未贯通至用户

位置及反例同 S-01。Issue #1 §12.2 将隔离 Space 人工登录后的明确保存列为身份入口；§12.4 要求发布完成后才报告结果，PAGE-004 与错误合同要求取消/失败不报虚假成果。当前相反方向也不成立：已提交身份因后来网页租约失效被表现为保存失败。完整来源差距票不能仅验证 file/source plan。修复条件为保留既有源授权边界并贯通已提交回执。

### R-02 / P2：已经完成的身份发布因刷新故障失去可定位结果

位置及反例同 S-02。AC-007 要求失败可解释、不返回伪成功数量；Issue #1 §12.4 的发布/回执和 Ticket 的失败可定位要求，也不允许在已确认提交后仅抛辅助读取错误、隐藏新增版本并消费原 plan。修复条件为提交与刷新分别表达，保留版本定位，恢复列表不重新创建业务效果。

### R-03 / P2：人工入口遗漏“任一步取消”

位置及 DOM 观察同 S-03。Spec AC-007 的触发条件明确包含 Cookie/Identity 导入任一步取消；T-05 要求每一步取消可定位；Issue #1 §12.2/§12.4 覆盖 manual-login 来源及无论成功/失败/取消的资源处理。当前人工保存从点击起没有发布前取消入口。满足条件为补全该消费者的取消与已提交后事实反馈；不要求撤销已经完成的原子提交。

## 已核对的生产链与成立部分

- 一次性 SourceGrant、SecretUsePermit、BrowserCapability 相互独立，身份入口仍为 trusted UI，RPC/CLI/MCP 不获得人的源 Profile、凭据或原始身份读取权。
- 实际读取 native/browser-runtime/src/cookies.rs 的 schema2、columns、整数字符串和 Chromium/Firefox 映射；sourceRows 拒绝旧 reader、现代分区字段缺证、Firefox 非空 originAttributes、无等价 SameParty/opaque 等语义，已知旧 schema 的普通 Cookie 路径保留。不是只看 mock 结果。
- 已浏览 source-reader 使用处引用的 [Chromium 固定 schema 历史](https://chromium.googlesource.com/chromium/src/+/8f93c3443faacdb1096ada43a496bb07238c3137/net/extras/sqlite/sqlite_persistent_cookie_store.cc)：v12 source_scheme、v13 source_port/SameParty、v15 分区键、v21 移除 SameParty、v23 ancestor bit 与代码条件相符。另读 [Chromium 官方当前源码](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/net/extras/sqlite/sqlite_persistent_cookie_store.cc) 的 v24 域摘要说明（本次观察 blob `bb61afb851aaf7ef28aa5e705d329bb31bc2e164`），核对 v24 解密前缀处理；可变 main 只作补充事实核验，不替代本地冻结规范或受管 runtime 版本。
- 文件来源固定本次 UTF-8 字节/摘要，数据库使用独立复制的 SQLite/WAL 快照和最小环境 reader，capture 含采集区间、一致性等级、schema/字段；这些元数据进入密文，公开 summary 明确挑字段，不包含 capture/域列表/源路径或 Cookie 值。可信 UI 标签不等同 Agent 公开接口。
- provisionIdentity 分别拿原 source 比较 staging 和 target，不以 staging 已丢字段作为目标的正确基准。完整集合、键/值/domain/hostOnly/path/secure/httpOnly/SameSite/session/expiry/priority/source/partition、额外项与 Context 变化都在相应检查中；自然过期分开计数。
- createIdentityTarget 固定 owned-default runtime，driver 通过其自有 CDP pipe 操作 Storage；没有切到 Electron 默认 Session。非默认 Context 在纯 provision 合同中需准确 ID，当前生产适配只声明 owned-default。createPage/控制变化后关闭导入窗口。
- 新目标在 provisioning 时完成两次验证与 staging cleanup；随后才创建工作页并发布 ready。新建空间的 signal 不进入账本 payload；目标读写/cleanup 后取消会停止并清理；最终目录提交已经开始且成功时保留正确 Space。文件/source plan 的取消 controller 及 CredentialStore.fs.link 边界已正确区分发布前取消和已提交事实，S-01–S-03 指出人工/辅助接缝遗漏。
- source snapshot 残留 UUID 目录由 cleanup 初始化扫描恢复；runtime staging 在启动前记录 job，失败 target 在 catalog 保留定位，清理失败不会开放 ready；关闭/重试仍核对 owner。没有递归删除不属于本操作的资料。
- 未支持 origins/localStorage/IndexedDB 在 preflight 明确拒绝，不能保存成 Cookie-only 成功。密文采用既有认证封装/AAD、系统 provider 和 stage 读回/原子发布，无明文降级；capture 可选保持旧身份可读。
- PAGE-004 使用既有 shadcn/令牌/所属窗口 Portal，文件/source 导入及创建 Space 显示真实阶段、取消请求/确认与晚提交，计数不声称网站登录；DOM 证明行为和 focus 的有限部分，不证明 390/1440 明暗、popout 或真实宿主视觉。实际人工保存差距见 findings。
- T-02/T-03/T-04 未变依赖按冻结前序证据核对；本票未扩大观察/网页写能力、未重派已有副作用或改变旧 boot authority。最终 docs/生成物集成仍由 Lead 维护。

## reviewer 实际命令、证据与未验证项

实际执行完整输入 hash、开始/结束代码及来源核验、review-scope 重建；读取适用规则、来源和 23 文件/实际依赖，沿所有实际身份消费者核对。生产反例方法：读取 create-workspace.test.ts fixture 前缀，仅在内存移除 vitest 包装，esbuild stdin/write:false 后 Module._compile；真实组合服务/临时密文存储执行，finally 逆序 dispose 并删除合成临时目录，未读取真实资料或系统秘密。

S-01 在真实 create 完成后引入 pause；S-02 只故障注入提交之后的辅助 listIds。两者都回读磁盘事实和用户可见返回，不把 throw 本身当成根因。S-03 用独立 happy-dom 内存 bundle 运行真实页面、共享 UI，fixture 只保持业务 Promise pending；SpaceViewer 被 stub，未调用真实 runtime。首次自建 DOM harness 缺 HTMLFormElement 全局导致测试环境错误，补齐 happy-dom 构造器后重跑得到上列观察；该失败不归因产品。

实际风险定向测试：

```text
pnpm exec vitest run src/modules/browser/platform/desktop/identity/source-reader.test.ts src/modules/browser/services/identity-provision.test.ts src/modules/browser/platform/desktop/identity/credential-store.test.ts src/modules/browser/services/create-workspace.test.ts -t 'capabilities|source .* semantics|cancellation|cancel|committed|cleanup|connects an authorized|locatable|malformed'
Test Files 4 passed (4)
Tests 35 passed | 7 skipped (42)

pnpm exec vitest run src/modules/browser/ui/IdentityImportActions.dom.test.tsx src/modules/browser/ui/BrowserWorkspace.dom.test.tsx src/modules/browser/platform/desktop/runtime/driver-identity.test.ts
Test Files 3 passed (3)
Tests 14 passed (14)
```

共实际重跑 49 例，其中 12 DOM、2 driver synthetic CDP。定向验证支持已成立边界，没有覆盖本次三个缺口；绿色数量不能替代实际反例。作者 36 files/288 tests、test/worker tsc、15 生产 lint、architecture 1257 modules、i18n 5136 keys 的回执没有冒充 reviewer 重跑；未无差别重复整套。

未运行真实 Chrome/helper/Obsidian/四平台/人工视觉/性能，不读取真实账号/profile/系统秘密；按 SRC-010 由用户验收。未 build 或更新生成资产；这些由 Lead 最终串行集成。原始报告仅写本文件，没有修改生产代码、正式 Evidence/Ticket/状态或旧报告；未参与任何修复。

最终：唯一缺陷 3（P2×3）；standards=request-changes；specification=request-changes；skipped_axes=[]。交回后停写。
