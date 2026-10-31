Session: 20261029T021146Z
Task: 010-repair-history-residuals
Status: completed

## 聚焦交接

已交付 G-S03 / WB-S03-R、G-S04 / WB-S06、G-P05 / WB-P04 的窄修候选，全部新正式行为反例已 red→green，原风险闭包定向测试仍通过。新建导入专属的 neverStarted 证明与 adopt 来源证据分开，第一次启动接纳先持久清除证明；历史来源选择在 native read 前和 TS 接收、缓存、CLI预览、导出中完整核对，索引碰撞保留原来源及标注并明确阻止正文读取，没有更换 opaque key 或创建持久迁移。窄状态已贯通 history、筛选/行菜单和确认 portal，生产CSS分配真实44px布局最小尺寸；DOM只证明组件状态与CSS minima，实际Chrome几何、命中和邻接验证留给Root。当前21个源码/测试/文档路径已 SOURCE STOPPED，本报告 completed 仅代表候选交回，Lead继续统一构建、全局检查、Chrome与独立双轴复核。

## 产物与验证

**身份与边界。** 当前执行者 `codex:/root/repair_workbench`，复用原生 Sol / xhigh 实现身份，未递归派遣。GP-046 / Map43、同T-18；工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`、branch `NAMEWTA/terminal`、HEAD `78102da2811953e72fe317cd08cd91311d9cac0d`，不建立新工作区。完整读取010 TASK、008/007原始报告与分配反例，回读Map实施背景/Skill矩阵、dev/ui、T18/Goal并复用未变的I预检/TDD/错误/可靠性及获批Spec/DESIGN合同。只修改本TASK写集和本REPORT；core/space/model.ts本次无必要改动，未修改Root的harness/M12文档、正式状态/Evidence、上层规范、Git index、根产物或用户数据，无提交/推送/发布。

**逐 finding 行为与正式证据。**

| Finding | 候选实现与满足条件 | 正式回归 |
|---|---|---|
| G-S03 / WB-S03-R | NativeImportEvidence新增向后兼容的可选字面证明neverStarted，仅import真正新建Session时写入；adopt和重复import不增加证明。prepareSession首个启动接纳与lastAttempt在同次持久写入中清除证明。归档、恢复展示与首次继续均只信该证明或真实终止依据；codec拒绝证明与已有attempt矛盾的记录，旧无证明导入保持保守。 | workspace-service-stop实际SpaceService/NativeResumeService.importSource(adopt created=false)→reload→WorkspaceService.archiveManaged为incomplete，getManaged仍unconfirmed且不能通过prepareSession。space-service-history验证fresh证明重启保留、启动前消费、恢复缺attempt不能复活；旧fresh导入Session/Space归档零spawn正例保留。 |
| G-S04 / WB-S06 | 新纯source-identity比较器核对key、Provider、accountKey、native ID、transcriptPath、sourceRef。NativeHistory冻结选择，read发送带当前deviceId的expectedSource，拒绝错来源返回；export冻结同一选择且无错误正文写出。Rust在正文预算/读取前检查expectedSource。HistoryStore不复用不同精确来源的同mtime缓存，保留原行来源和标注并标changed；不发布错来源read正文。CLI preview也拒绝错来源。 | 原008两条Store反例转为正式测试，验证A/B同key同mtime缓存、错来源body均不可ready；native-history.export错来源拒绝且Vault.create零写入；ownership覆盖expectedSource全tuple和await期间选择变更；control/history错来源回执unavailable/changed，无B正文。 |
| G-S04索引冲突 | 保留原opaque三元组key与业务标注格式。scan的save_in_scan在同key不同精确来源时保留原summary/locator，清空正文、记录本轮冲突；最终将该key标为changed/identity-collision，避免同一批次后续原来源更新把冲突覆盖。重复扫描仍可解释；重复副本移除后原来源可恢复读取。 | Rust实际scan/query/read测试先A后增加B、A/B并存、相同mtime，sourceRef保持A而非切B，返回changed+稳定冲突原因且正文为空；重复scan仍changed，移除B后恢复A正文且不含B。另有expectedSource不同的请求被拒绝，READ_BUDGET_HOOK未触及正文访问。 |
| G-P05 / WB-P04 | narrow由真实AgentWorkspace容器状态传入Panel并显式携带到Dialog/AlertDialog及两个DropdownMenu portal；局部CSS给交互控件min-width/min-height 44px，使用真实布局尺寸避免只扩大伪元素。宽屏无narrow标记，保持原桌面布局。 | 真实Panel/确认/筛选菜单的生产CSS computed minima均44px；保留Tab、Escape、取消零启动和返回触发器回归。Root已接收最终选择器，真实Chrome layout/hit-test/相邻rect不重叠由Root在重建后验证，worker不冒称已完成几何验收。 |

**有效 red→green。** 下列退出126为宿主报告的实际Vitest失败退出；Rust失败实际退出101，均有目标行为断言。没有删测试、跳过、放宽原有风险断言或把fixture错误当作产品red。

- G-S03：`pnpm exec vitest run src/modules/agent/services/workspace-service-stop.test.ts -t 'adopting an exact source'` 退出126，实际archived而期望incomplete；修复后相关stop/history-import/native-resume三文件58 tests退出0，最终闭包也通过。
- G-S04缓存：`pnpm exec vitest run src/modules/agent/services/history-store.test.ts -t 'same-time locator'` 退出126，B行仍ready且含A body；修复后保留原A身份/标注并changed/unavailable、清空body。该保守隔离比把旧标注投到B后仅idle更强，符合“不静默改属”。
- G-S04正文：同Store文件 `-t 'a body returned'` 退出126，A行发布Private B body为ready；修复后changed/unavailable且状态全文不含B正文。
- G-S04导出：`pnpm exec vitest run src/modules/agent/platform/desktop/server/native-history.test.ts -t 'export refuses'` 退出126，错来源未拒绝；修复后拒绝且created.size=0，原missing/changed/permission/partial/whole导出回归仍通过。
- G-S04 CLI：`pnpm exec vitest run src/modules/agent/services/control/history.test.ts -t 'control preview rejects'` 退出126，错误回available/B body；修复后unavailable/changed/空正文，16项控制历史测试通过。
- G-S04原生碰撞：`CARGO_TARGET_DIR=/tmp/huhu-010-repair-history-residuals-cargo cargo test --locked --manifest-path native/pty-server/Cargo.toml --bin huhu-pty duplicate_locators_keep -- --nocapture` 首次退出101，sourceRef错误变B；修后原来源A保留且明确冲突，最终44 tests通过。
- G-S04原生预读：同Rust命令选择 `a_selected_source_mismatch` 首次退出101，expectedSource被忽略、stale选择能读另一行；修后在body前拒绝，未触发READ_BUDGET_HOOK。
- G-P05：`pnpm exec vitest run --project dom src/modules/agent/ui/history/SessionHistoryPanel.resume.dom.test.tsx -t 'narrow history, filter'` 有效red退出126，实际minHeight为空而非44px；修后history/confirm/filter三种组件控制均获得44px显式CSS minima，取消仍零启动。

**夹具处置。** 首次P05测试用DOM环境的import.meta URL读取CSS得到非file scheme，修正为仓库绝对路径后才获得上述有效red。一次旧取消测试仍使用key-only假row，新来源校验在到client barrier前拒绝，造成30秒fixture等待及断言拒绝；已将该测试输入补为完整来源DTO，保留“client等待期间取消后零native请求”的原断言，后续全文件及最终闭包退出0。两次fixture失败均不计产品red，也未通过削弱来源校验迁就夹具。

**最终实际命令。**

```sh
pnpm exec vitest run src/modules/agent/platform/history src/modules/agent/platform/desktop/server/native-history.test.ts src/modules/agent/services/history-store.test.ts src/modules/agent/services/control/history.test.ts src/modules/agent/services/control/router.test.ts src/modules/agent/services/spaces src/modules/agent/services/workspace-service-stop.test.ts src/modules/agent/services/workspace-service-stop-native.test.ts src/modules/agent/services/launch/native-resume.test.ts src/modules/agent/services/controller-resume.test.ts src/modules/agent/ui/history src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx
```

退出0，22文件、233 tests通过。原history继续、归档、owner隔离、控制回执/取消、Toolbar、Dialog/AlertDialog风险均在本闭包中保留。

```sh
CARGO_TARGET_DIR=/tmp/huhu-010-repair-history-residuals-cargo cargo test --locked --manifest-path native/pty-server/Cargo.toml --bin huhu-pty agent_data::tests
```

退出0，44 passed、0 failed，50无关测试filtered；不是全Rust、release helper或五平台验证。

```sh
pnpm exec eslint --max-warnings 0 src/modules/agent/services/spaces/records.ts src/modules/agent/services/spaces/space-service.ts src/modules/agent/services/workspace-service.ts src/modules/agent/services/history-store.ts src/modules/agent/services/control/history.ts src/modules/agent/platform/history/service.ts src/modules/agent/platform/history/source-identity.ts src/modules/agent/ui/history/SessionHistoryPanel.tsx src/modules/agent/ui/AgentWorkspacePage.tsx src/modules/agent/i18n.ts
pnpm exec stylelint src/modules/agent/styles/agent.css --max-warnings 0
```

两条均退出0，零警告。另对本21路径执行`git diff --check -- <paths>`退出0。只对本Rust文件rustfmt，新建纯helper文件prettier；没有全树格式化。全局类型检查按TASK交Root，已局部核对新增literal/codec/DTO与原消费者，未把Vitest转译当作全局类型通过。

**Skill与设计符合性。** I按稳定公开接缝执行每个反例的red→green；dev落实数据归属、可区分错误、持久证明消费与适用检查；ui使用既有Dialog/AlertDialog/Menu和局部状态属性，无新界面库、依赖、许可改编或页面重画。继续绑定DESIGN revision1 digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`、PAGE-001/002及AC-061；来源/归档对应原AC-028/029/035/040。细指针窄窗也适用44px，不以pointer:coarse代替。

**selector最小充分性。** 生成的Tailwind `.min-w-0:is(.huhu-ui, .huhu-ui *):not(#\#)`自带一个ID specificity；文本Button默认带min-w-0，Input/行toggle亦存在。单用三个.huhu-ui仍是零ID，不能覆盖min-width:0。局部history规则只用一个同级`:not(#\#)`并以narrow/role属性胜出，CSS注释已写明依据，Root已确认保留；不增加全局规则或更多ID。

**完整交付路径与SHA。** 以下为本人010写入路径；其他writer以及005原有未再次写入的路径不归入本清单。

- `src/modules/agent/services/spaces/records.ts`
- `src/modules/agent/services/spaces/records.test.ts`
- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/spaces/space-service-history.test.ts`
- `src/modules/agent/services/workspace-service.ts`
- `src/modules/agent/services/workspace-service-stop.test.ts`
- `src/modules/agent/platform/history/source-identity.ts`
- `src/modules/agent/platform/history/service.ts`
- `src/modules/agent/platform/history/ownership.test.ts`
- `src/modules/agent/platform/desktop/server/native-history.test.ts`
- `native/pty-server/src/agent_data.rs`
- `src/modules/agent/services/history-store.ts`
- `src/modules/agent/services/history-store.test.ts`
- `src/modules/agent/services/control/history.ts`
- `src/modules/agent/services/control/history.test.ts`
- `src/modules/agent/ui/AgentWorkspacePage.tsx`
- `src/modules/agent/ui/history/SessionHistoryPanel.tsx`
- `src/modules/agent/ui/history/SessionHistoryPanel.resume.dom.test.tsx`
- `src/modules/agent/styles/agent.css`
- `src/modules/agent/i18n.ts`
- `docs/agent-workbench.md`

依下列有序SHA行原样拼接的聚合SHA-256：`9ae16ca275da4569189e56d334a74d676845e7285fb62d61f114d53dc7f2b28e`。

```text
c94b7ade7ac50391b74d2df6784b6dc334a0c372118bb4f10a1b3abf5266b1a3  src/modules/agent/services/spaces/records.ts
03817b5bcfc32ac52ee2557d41457e5bfff37d50f1441fff21277f55edb63c3a  src/modules/agent/services/spaces/records.test.ts
c91d78b63ef55f8e289eba28aacba5e509e9fff22606ab1f884e5b0cc894e6b7  src/modules/agent/services/spaces/space-service.ts
d251cc9d41e496265a1d4510a744a4acf8b74b94c4882322fbebc69f4b14cd79  src/modules/agent/services/spaces/space-service-history.test.ts
5402d8b6c2fdb2fcb8e29fadc665f0354f59005ef0594230bbccba17876cb209  src/modules/agent/services/workspace-service.ts
a78ed23c1a3e79a6dc64d140374ced47767be5ad542498a5b98a24544018d015  src/modules/agent/services/workspace-service-stop.test.ts
28c83b575d50d73fc28aa655f1d4f2c0b2cc7a0efbbedd97b5f4e878d5f46658  src/modules/agent/platform/history/source-identity.ts
c3709785c681387e6b1b57720e6578a752c213a712fa2c3209eab95aca9a41bd  src/modules/agent/platform/history/service.ts
7cc80c1cf757fd25ababfaca3baa049752b224db748980c8c1dcdca6cd707329  src/modules/agent/platform/history/ownership.test.ts
ffe004e2409bb6eecc744de8f5806236395f3f7e85f33d43f837d0d84b38d618  src/modules/agent/platform/desktop/server/native-history.test.ts
ee693e0abc28bb426cb273d4235c5e61a24587eeb5a1fc3ff643aec52ac5eacc  native/pty-server/src/agent_data.rs
8cb7032144134885e54902cdea1983d3ce6ca862963da60704200ee92109ba1a  src/modules/agent/services/history-store.ts
05e7106dbae237d5d4dab774050bef4435cabd47e9f5a39925654480fd9e2a90  src/modules/agent/services/history-store.test.ts
1d7934f8c9cd8013ce539813d0f0ae478e730eab7ce4f7de884ecd49fdb9d888  src/modules/agent/services/control/history.ts
bd1c6aec4e7f070e3228f35bc498d90974ce11cd0f48b5e138c30740057f511e  src/modules/agent/services/control/history.test.ts
fac4c895a31fa74ca2287907970a2c568e6887b0ed432e81b310ef14eac2b657  src/modules/agent/ui/AgentWorkspacePage.tsx
a3c2a9d0cdbc511f89a432c7b39578c72fd90df533a50fdb1db0caedcc37147d  src/modules/agent/ui/history/SessionHistoryPanel.tsx
5990719086b64f95749968786e69fbde4724d9c78dd2beb2857e6c7a2a34c57d  src/modules/agent/ui/history/SessionHistoryPanel.resume.dom.test.tsx
70612543cd98f187dc1de1ee332fa40f4929a0c19a0acb54180bbccc64348265  src/modules/agent/styles/agent.css
c2eee2503302340f2246617f1724e26a6b1c876f33af0a6408b1101d64c2990e  src/modules/agent/i18n.ts
f936e5dd5b5653a52520cd84d0bd13b1e6521bdd64e0d813c1faf1e18d1f00f7  docs/agent-workbench.md
```

## 问题与下一步

- SOURCE STOPPED：本worker的21个产品/测试/文档路径已停止写入，无遗留后台测试进程；本REPORT以同目录临时文件不覆盖原子落盘并回读。不自行done/verified，不改旧报告。
- Root后续独占全局TypeScript、构建、全量Vitest/门禁/i18n、根产物及真实Chrome。未运行真实Obsidian/Provider、用户库、实际长会话、五平台或生产性能；不把native execute/DOM和CSS computed minima写成这些实机通过。
- Root Chrome selectors：`[data-agent-history-dialog][data-history-narrow]`、`[data-agent-history-panel][data-history-narrow]`、`[data-agent-history-confirm][data-history-narrow]`、`[data-agent-history-filter-menu][data-history-narrow]`、`[data-agent-history-row-menu][data-history-narrow]`。需测button/input/menuitem真实44px rect、elementFromPoint五点及邻接rect不重叠；Root已说明旧styles上的red由其保留，重建后green仍由其验收。
- 保留旧opaque key和history.json标注格式，未引入持久key迁移。当前索引对重复locator显式冲突，留原来源并阻止正文；清理重复副本后可恢复原来源。未对已被其他版本或人工改写的历史标注执行猜测归属或自动迁移。
- 本轮无需要用户补充的产品决定。下一安全动作是Root回读本REPORT和SHA，统一重建/验证、冻结新候选并交原独立reviewer复核。
