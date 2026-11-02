Session: 20261029T021146Z
Task: 005-repair-workbench
Status: completed

## 聚焦交接

已交付 WB-S01–S05、WB-P01–P03 与 WB-L01 的同范围候选修复，正式定向测试覆盖完整历史身份、浏览器错误消费、归档、回执、取消、筛选、截断与模态焦点。关键决定是库外准入及 owner 绑定只接受完整账号、设备和精确来源；普通终端元数据保存在独立的 terminalRows 投影，不进入原生继续或其他历史消费者。当前源码已停止写入，24 个交付路径的聚合 SHA-256 见下，未改正式 Evidence、状态工件、Git index 或根产物。Lead 应在此候选上完成全局类型、构建、i18n、真实浏览器及独立双轴复核，并判定下述既有 opaque row.key 风险；本报告的 completed 仅表示候选交回。

## 执行身份与基线

- 执行者：原生 worker `codex:/root/repair_workbench`；本次派遣为 `gpt-6.1-sol / xhigh`，未递归派遣。
- 工作区：`/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`；HEAD `78102da2811953e72fe317cd08cd91311d9cac0d` 保持不变。
- 输入：TASK、GP-044 / Map41、T-18、原始 `002-final-workbench/REPORT.md`，以及 Spec / DESIGN revision1 / implementation-contracts / ADR 的相关合同。
- 已有工作副本改动和 Lead 的37路径恢复予以保留；本报告只列本人后续实际写入路径，不将其他writer的改动归为本人。
- 源码已停止；无本worker遗留后台验证进程。没有提交、推送、发布、真实用户库迁移或Provider运行。

## Finding → 修复与正式回归

| Finding | 本轮候选行为 | 正式观察面与结果 |
|---|---|---|
| WB-S01 | OwnedHistorySession带完整 accountKey/deviceId/transcriptPath/sourceRef；NativeHistory依本机设备和已配置账号物化完整tuple，缺精确来源不扩大权限。Rust scan/query/read均比较完整tuple，OpenCode owned_digest包含全部身份字段；Space owner绑定复用相同matcher。 | `ownership.test.ts`覆盖TS三种native请求、owner正反账号/来源/device及缺来源；Rust `owned_history_requires_exact_account_source_and_device`验证双账号同ID仅一条被准入、错误source/device/旧不完整tuple均不授权。原生历史42 tests通过。 |
| WB-S02 | SharedBrowserPort.open等待布局提交并检查结构化error和partial/unknown；reuse激活同样传播失败。排队尾链只承担串行化，动作自己的Promise保持失败可见；Browser模块现有catch实际清理新Page。 | `shared-browser-close.test.ts`覆盖恢复冻结/保存错误、reuse partial/unknown及既有close；`browser/module.test.ts`新增真实BrowserEngine消费失败后getPage为空、native未启动。 |
| WB-S03 | nativeImport且从未有lastAttempt的metadata-only记录获得not-started证据并可归档Session/Space，无需启动Provider；缺lastAttempt且无import证据的旧记录仍保持未知，不能归档。 | router正式fixture使用真实SpaceService/WorkspaceService验证Session/Space归档、零spawn/stop；另以持久旧记录回读验证未知记录仍incomplete。既有stop/recovery回归保留。 |
| WB-S04 | Router在history操作后读取prepared最终target，覆盖import新Session、resume/open runtime；已有输入确认receipt的相关性保护保持原状。 | `router.test.ts`三种history成功envelope均带最终已知身份；同文件原有输入相关性/失败测试通过。 |
| WB-S05 | read catch保留signal、AbortError和WAIT_CANCELLED分类；NativeHistory自身取消产生标准AbortError及稳定code。真正来源不可读仍可metadata-only unavailable。 | `control/history.test.ts`验证显式code和读正文期间signal取消+普通native Error，均拒绝WAIT_CANCELLED；原有来源不可读与分页回归通过。 |
| WB-P01 | 视图新增更新时间24小时/7天/30天/全部范围，默认Agent；可选普通终端元数据，只显示已有记录且无正文/继续动作。Provider原生rows与terminalRows分开，避免JumpPalette等消费者误将Shell当原生历史继续。 | `history-store.test.ts`验证terminalRows元数据及零body read；实际Panel DOM验证默认隐藏、显式包含、只读终端卡片与时间过滤。父接线从真实Space记录取目录/身份，不调用launch。 |
| WB-P02 | 每次preview保留previewPartial，并在refresh复用；实际Row显示“只读取前段”，partial时改称片段对话而非“最新”。CLI preview同时保留native body cap为partial/source-capacity。 | Store的原生partial夹具到真实SessionRow链路、CLI正文上限和刷新复用回归均通过。 |
| WB-P03 | 复用Lead已恢复的AlertDialog继续确认；窄屏history使用所属document的Dialog，保持Tab约束、Escape关闭与有条件返回触发器。 | 恢复的resume DOM测试验证默认取消与取消零启动；新真实AgentWorkspace测试验证窄屏history Tab循环、Escape、视图状态关闭及返回toolbar触发器；既有控制Dialog owner-document回归通过。 |
| WB-L01 | 移除父级重复open回写和不再需要的Toolbar callback，仅由Toolbar拥有切换动作。 | 真实AgentWorkspace+Toolbar接线测试第二次点击后control=false，aria-pressed=false。 |

## TDD 红绿事实

以下red均为实际行为断言失败，未将编译/夹具失败当作red；最终所有对应正式测试均green。

- S01：`CARGO_TARGET_DIR=/tmp/huhu-005-repair-workbench-cargo cargo test --locked --manifest-path native/pty-server/Cargo.toml owned_history_requires_exact_account_source_and_device -- --nocapture` 首次退出101，明确出现total=2而期望1。中间一次修复编译发现4处Scope缺device字段，已补齐；该编译失败不计行为red。后续完整agent_data 42 tests退出0。
- S02：`pnpm exec vitest run src/modules/agent/shared-browser-close.test.ts -t 'opening propagates'` 退出126，open错误地resolve page；修复后该文件和Browser消费者测试退出0。
- S03：`pnpm exec vitest run src/modules/agent/services/control/router.test.ts -t 'a never-started'` 退出126，得到incomplete而非archived；修复后真实归档正反回归通过。
- S04：初始正式测试名 `history resume envelope contains the resulting generation`，运行router同名定向选择退出126，target缺sessionId/runtimeId；最终扩为import/resume/open三种回执测试并通过。
- S05：`pnpm exec vitest run src/modules/agent/services/control/history.test.ts -t 'read cancellation preserves'` 退出126，错误resolve unavailable；修复后15项history控制测试通过。
- P01时间：Panel DOM `-t 'the time filter'` 退出126，缺时间选项；新增实现后返回实际recent结果。
- P01终端：Store `-t 'ordinary terminal'` 退出126，缺终端元数据投影；Panel DOM `-t 'ordinary terminal metadata'` 退出126，缺包含选项；最终独立terminalRows与真实UI行为通过。
- P02：Store `-t 'a truncated body'` 退出126，缺previewPartial；Panel DOM `-t 'a partial native body'` 退出126，缺截断提示；CLI `-t 'native body cap'` 退出126，把prefix当available；最终均通过。
- P03：`pnpm exec vitest run --project dom src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx -t 'narrow history'` 退出126，无法找到Dialog；修复后Tab/Escape/返回焦点测试通过。
- L01：同Page文件 `-t 'the real toolbar'` 退出126，第二次点击后仍true；修复后返回false。
- 兼容夹具：既有desktop/server/native-history.test.ts的owned正例只给provider+id，修复后会安全拒绝，旧断言出现[]与旧二元组不一致（退出126）。该路径属于已获配agent-data-client.ts同目录就近回归；已先向Lead发送具体路径，后按TASK原有同目录测试授权最小升级为完整身份，保留原scan/query/read/dedup/stale断言，6 tests退出0。未修改shared/native协议文件。

## 适用验证与实际退出码

1. 最终本范围组合：

```sh
pnpm exec vitest run src/modules/agent/platform/history src/modules/agent/services/control/history.test.ts src/modules/agent/services/control/router.test.ts src/modules/agent/services/control/commands.test.ts src/modules/agent/services/controller-resume.test.ts src/modules/agent/services/controller-space.test.ts src/modules/agent/services/history-store.test.ts src/modules/agent/services/workspace-service-stop.test.ts src/modules/agent/services/spaces src/modules/agent/shared-browser-close.test.ts src/modules/browser/module.test.ts src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx src/modules/agent/ui/history src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx
```

退出0：23文件、216 tests通过。

2. 最终Rust定向：

```sh
CARGO_TARGET_DIR=/tmp/huhu-005-repair-workbench-cargo cargo test --locked --manifest-path native/pty-server/Cargo.toml --bin huhu-pty agent_data::tests
```

退出0：42 passed、0 failed，50无关测试被过滤；不是全Rust/五平台或release资产验证。

3. 生产TS/TSX局部Lint：

```sh
pnpm exec eslint --max-warnings 0 src/modules/agent/platform/history/service.ts src/modules/agent/platform/desktop/server/agent-data-client.ts src/modules/agent/services/controller.ts src/modules/agent/services/control/history.ts src/modules/agent/services/control/router.ts src/modules/agent/services/spaces/space-service.ts src/modules/agent/services/workspace-service.ts src/modules/agent/services/history-store.ts src/modules/agent/module.ts src/modules/agent/ui/AgentWorkspacePage.tsx src/modules/agent/ui/history/SessionHistoryPanel.tsx src/modules/agent/ui/workspace/WorkspaceToolbar.tsx src/modules/agent/i18n.ts
```

退出0、零警告。首次把测试文件也传入eslint的调用退出0但有7条“测试被配置忽略”警告，已改用上述生产文件零警告检查，不将忽略测试声称为已Lint。

4. 最后变更仅为Shell分组复用已有i18n键后，再运行Panel DOM完整10 tests和该生产文件eslint，均退出0。
5. `pnpm exec vitest run src/modules/agent/platform/desktop/server/native-history.test.ts` 退出0，6 tests通过。
6. `git diff --check -- <本报告交付路径>` 在收尾阶段退出0。仅对本Rust文件运行rustfmt，新建ownership测试运行prettier；未格式化Rust全树或批量重排无关TS。

## Skill Execution 与 Design Conformance

- I：实际读取Map→dev/ui→T18与Goal，并使用implementation-procedure、execution-preflight、codebase-design、TDD、错误/可靠性和设计合同。全部修改在同current工作区、获配owner边界实施；从真实调用入口或稳定公开接缝获得red/green。
- dev：实际执行完整来源准入、生命周期错误传播、i18n双语及本范围适用测试/生产TS ESLint。未引入依赖、外部代码或新的数据writer；records.ts保持交给数据owner。
- ui：沿既有组件、布局、词典和DESIGN实现；使用项目Dialog/AlertDialog，未重新选模板、重画页面或改全局样式。
- DESIGN revision1 digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`；PAGE-001工具切换、PAGE-002历史筛选/partial/确认/窄屏模态对应AC-061，PAGE-004浏览器错误消费对应AC-041。上述证据是生产React/服务的DOM与单元证据；真实浏览器截图与宿主行为由Lead/用户另验，不用DOM冒充视觉或Provider实机通过。

## 修改路径与候选摘要

- `native/pty-server/src/agent_data.rs`
- `src/modules/agent/platform/desktop/server/agent-data-client.ts`
- `src/modules/agent/platform/desktop/server/native-history.test.ts`
- `src/modules/agent/platform/history/service.ts`
- `src/modules/agent/platform/history/ownership.test.ts`
- `src/modules/agent/services/controller.ts`
- `src/modules/agent/module.ts`
- `src/modules/agent/shared-browser-close.test.ts`
- `src/modules/browser/module.test.ts`
- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/workspace-service.ts`
- `src/modules/agent/services/control/router.ts`
- `src/modules/agent/services/control/router.test.ts`
- `src/modules/agent/services/control/history.ts`
- `src/modules/agent/services/control/history.test.ts`
- `src/modules/agent/services/history-store.ts`
- `src/modules/agent/services/history-store.test.ts`
- `src/modules/agent/ui/history/SessionHistoryPanel.tsx`
- `src/modules/agent/ui/history/SessionHistoryPanel.dom.test.tsx`
- `src/modules/agent/ui/AgentWorkspacePage.tsx`
- `src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx`
- `src/modules/agent/ui/workspace/WorkspaceToolbar.tsx`
- `src/modules/agent/i18n.ts`
- `docs/agent-workbench.md`

上述24路径按下列逐文件SHA-256清单拼接的聚合摘要：`23eeeac1d2b60e40b4adcdc55ba7da217833a6c175e3082780407dc91163e882`。该摘要只冻结本人候选切片，不代表其他writer或根产物已完成整合。

```text
e8d79a5dee80284572f7cc117e82d63f4a339fd5601ff468b16996b94701aff4  native/pty-server/src/agent_data.rs
2c54980cd4ec9e7ab3f6bbd4b2a99e2bb888a468ade5881de8db05915d002b87  src/modules/agent/platform/desktop/server/agent-data-client.ts
1d44c48338d4f4870c674b2c051f798f4394c033f8f9e7fb9dd8d648f049893d  src/modules/agent/platform/desktop/server/native-history.test.ts
e3721945c3a933faec8b0e89d0d23f7b51ce04c0ee95c98adaa6cb5d091a737b  src/modules/agent/platform/history/service.ts
fd6a425db1a6a1c2fce05c8732bbc7cf6378da69dfc6adfa53420de3eea2a240  src/modules/agent/platform/history/ownership.test.ts
9910ad31298b77e8e80a2e0c762cbef1fb7be6845de464d480a32120204056d9  src/modules/agent/services/controller.ts
87e9a5e4978e8b878f3452078ffdbf612e3fddd41cd5cde3a1ca9aca52174db5  src/modules/agent/module.ts
dc905ab89c8e4534d2d494f292dbaf1e80704bf63c45346a11527303dc1376a1  src/modules/agent/shared-browser-close.test.ts
7d21bc6b1b8a14a1285cb43b26f08054cbcdbd264c5166f7eadf44fac6731c6e  src/modules/browser/module.test.ts
83e119975a51fab08caab8de752126be75ad9924f88170ebc2b1e4b53bbef7c4  src/modules/agent/services/spaces/space-service.ts
114ccfcc456f336ac1dab875704b826de006316d037968ecbaa375976c86ca07  src/modules/agent/services/workspace-service.ts
9cdf1bd8d1b012e6b7dab34e892e8b9045bef6672e7a560d29d4ac543edf15be  src/modules/agent/services/control/router.ts
5612f3acda4cf53244c9488c24b7ce5edd2ca0fd8ef3ed6c007fed98b66ac1ae  src/modules/agent/services/control/router.test.ts
855f8c1ad52f371b8f8598ef5e1a5505409987ac353db01e803bef5d32c18e9a  src/modules/agent/services/control/history.ts
9205d46273280885908a0b1c7076a65d32b566ac4919c53b77c61ea53091768a  src/modules/agent/services/control/history.test.ts
bf95b2eba4c1a54794b3e40eba5a5b971b43b07e12b137ae7926afdece329569  src/modules/agent/services/history-store.ts
a2adf1d55c759fd6e490540c12a1f6f0179317d191618236c66a0e8be14146fb  src/modules/agent/services/history-store.test.ts
3c121808bf0f35a6f9f9717cfda320d1978af67b184fe633e573a4417432aa64  src/modules/agent/ui/history/SessionHistoryPanel.tsx
c5bd473a5c93bcdbea41843d2b57d6f3b95fdf1ba74053f5799e23635e0a6717  src/modules/agent/ui/history/SessionHistoryPanel.dom.test.tsx
7d153c7f8c40e7a9cb539e5d87e8d59097f45e432e08b40a3c42d41d9294b8ae  src/modules/agent/ui/AgentWorkspacePage.tsx
b22eda72b3e471b5a1dac971416b7c8f69d60888699695ffaea4033e538555e0  src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx
33a6b25eccca4a0941d75cf157a6a59ece7f50143175769ee56117838c817c09  src/modules/agent/ui/workspace/WorkspaceToolbar.tsx
9a9e4a8992aea782c83e6ac383930f224872e1e6bae43647b30501118d363985  src/modules/agent/i18n.ts
ae238c67acd75f5cb54de64ef1452dea36dc10560270824099292f5e6573b841  docs/agent-workbench.md
```

## 未验证项、保留风险与下一步

- 未运行全局TypeScript检查、全量Vitest、构建、共享全局校验/i18n或根产物生成；按TASK交Lead在所有源停写后串行执行。未运行真实Obsidian、真实Provider、用户账号、真实长会话、五平台或性能验收。
- S01的owned准入、owner matcher和OpenCode owned缓存摘要已使用完整tuple；现有opaque历史row.key仍为原三元组，未修改持久标注key或增加业务迁移。同账号同nativeId、不同locator且两者均属于当前Vault时仍可能共享既有索引主键；此线索已单独发给Lead，未把它声称为本轮已验证修复。若Lead判定“完整来源贯通cache身份”必须连opaque row.key一起收缩，需要在保留旧history.json标注与不扩大legacy来源归属的前提下追加明确兼容方案及回归；本worker没有擅自变更该持久标注身份。
- Shared Browser的partial/unknown会作为失败传播且新Page被消费者dispose；并不声称已经回滚布局的部分/未知持久效果，调用方须保留原错误核对实际状态。
- 原生来源测试只在隔离临时Vault/目录及生产native execute接缝运行，不是发行helper/stdio/真实Provider E2E。
- Lead在本worker收尾时出现模型capacity错误，具体新路径及opaque key风险已通过原生消息交回；这不构成用户新的产品授权或业务完成证据。
- 源码已停止。下一安全动作：Lead回读REPORT与源摘要，完成全局检查和根产物后冻结整体快照、派遣未参与实现的两轴reviewer；本worker不写done/verified。
