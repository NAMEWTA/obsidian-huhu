# HUHU Bot 全量代码复审与修复（2026-10-28）

本轮以 `NAMEWTA/bot` 的实际工作区为依据，起点为 `23785924829c1db0847f9ae564b7b2f668cbfe25`。上一会话在实现后清理历史日志并重写分支处结束。本轮没有继续、修改或删除旧 provider 会话；旧 Ticket、原型与历史通过记录均不代替当前源码和重新执行的检查。

本次覆盖个人 Bot 的 TypeScript 模块、全部 Go Runner、版本化 HAP、Obsidian Host、存储和恢复、设置、页面及相关构建/文档。代码层与真实 Provider/宿主/目标系统验收分别记录。change 的形式 draft/active 状态未伪造为 Ready 或归档；本轮未提交、推送、升版本或发版。

本轮代码审查与修复已收口：最终固定输入的 Go/HAP 与 TS/桌面/UI 独立双轴复核均通过，没有仍待修复的已确认 finding；适用工程检查和本机宿主场景通过。此结论限于下面的源码范围和实际证据，未测产品验收仍单列保留。

## 实际结构与数据所有权

| 层 | 实际入口与职责 |
| --- | --- |
| 模块装配 | `src/modules/huhubot/manifest.ts` / `module.ts`；独立桌面模块，设置可单独打开，业务页或显式连接才启动 Runner |
| 公共合同 | `src/modules/huhubot/api.ts`；模块间通过 API，`BOT_RUNTIME` 提供懒连接和私有凭据操作 |
| 页面投影 | `services/workbench/` 的 Zustand 服务；共享目录、草稿、任务/事件、记忆、审批和数据，不由组件直接读写 Profile |
| 宿主适配 | `platform/obsidian/` 与 Host read/write 服务；显式来源、窗口/leaf/lease 绑定，写入须确切审批和可信回执 |
| 本机适配 | `platform/desktop/`；校验版本化二进制、进程/私有凭据通道、显式文件选择与受管导出读取 |
| Go 应用 | `native/huhubot/internal/application/`；统一命令/查询、委派、预算、记忆作业、效果、恢复和清理门 |
| Go 适配 | `internal/adapters/`；SQLite、模型引擎、凭据、Checkpoint、portable、HAP/stdio，不反向污染 Domain/Application |
| 版本化 wire | `contracts/hap/v0.1/`；生成 Go 合同及夹具，TS 方法校验使用同一 schema，共 75 个方法 |

Vault 中的内容和隐藏运行数据继续遵守 `huhu/` / `.huhu/` 边界。Bot SQLite、WAL、Checkpoint 与 portable artifacts 由 Go 在本机 Profile 管理；TS 导入不直接写 Profile，而经有界分块上传由 Go 校验并发布。Vault 复制不携带本机有效 Profile 身份；认证凭据不进入普通设置、HAP、日志、导出或模型上下文。

## 发现并修复的主要问题

- 装配、目录和运行入口：统一模块词典位置；补齐模块声明、管理导航、独立页面身份与懒启动；修正安装验证、本机目录、Vault/Profile 绑定和停止期间的在途启动所有权。
- 真实模型设置：凭据经私有通道登记，系统保护不可用时明确使用会话内存；应用真实预算/CAS；模型编辑只投影 draft 合同字段，避免将服务端 revision/status 混入严格 wire。
- 持久命令：创建 Bot/群聊/direct Session、发送与导入的未知结果保留原始 command/key；内部错误或请求取消不被误认作已回滚；保存时不覆盖中途草稿。
- 授权和审批：来源/扩大范围显式选择；群资料具有真实接收者与 deliver 权限；同 lease 续期保留合法绑定；撤权、成员身份变化、连接关闭立即清理正文并阻止迟到投影复活；切会话不能误批准旧审批。
- 任务与协作：修正 notify 的真实线程/邮箱消费、实际 delegation.completed 事件；扫描完整有界事件分页以发现中段效果；终态继续接收迟到用量结算和对账，效果读取并发有界。
- 数据完整性：导出使用授权视图并保留真实记忆正文；导入按完整修订/CAS、主体及预览有效期校验，重复导入回读持久回执；替换群聊同步移除旧成员并推进成员身份。
- 物理清除：portable 发布、上传与 Profile/会话清理共用 Go 清理门；失败保持持久受限且可重试；清除旧 Checkpoint/备份/凭据及 SQLite WAL 旧帧，busy 或错误不谎报成功。
- 清理恢复：受限连接不取得 Host；数据页独立读取待完成清理，重启后可重试；全清后新 Profile 重新初始化零额度、暂停预算，实际重新 hello 成功。
- 导入预览合同：补齐固定令牌下的复制 ID 候选、全部已有目标及其修订；多目标歧义在服务和底层同时拒绝非复制操作。预览预算 64 KiB、4096 条冲突上限、八项 batch 和超限后连接保持由真实 HAP 回归覆盖。
- 主路径完整性：记忆实际上下文分片、权限/身份名录翻页、停用 Bot 的删除预检与关联阻塞说明均接已有真实 API；重连后的编辑页使用当前连接。
- 实际 wire 消费：记忆与数据目录使用服务端允许的 50 项分页；私有上下文先选择真实成员会话或获授权委派，再显式读取正文。首屏接受服务端的 canonical scope，后续分片锁定同一修订、manifest 与 scope；临时任务使用实际 executor/child Run 身份。
- 宿主可用性：修复重连后残留离线错误、窄屏表单和页脚裁切，以及被宿主样式隐藏的裸复选框/单选框；改用现有 Checkbox 和 SegmentedControl。预算初次读取期间禁止编辑，保存冲突保留草稿，确认丢弃后才读取新修订。

Profile 全清不支持保留记忆，保留内容须事先显式导出；会话正文删除仍支持按用户选择保留独立固定/全局条目。本 Profile 存在其他活动运行或未结束模型生产者时，清理明确拒绝，避免暂停无关的已受理任务。外部导出副本和已写入 Vault 的笔记不随 Profile 清除。

## 逐项 AC 回读

以下是当前代码和自动化接缝的映射，不是 55 条实际产品验收全部通过的声明。`S4` 的真实 endpoint/model、完整 `S5/S8` 宿主编辑/故障/多窗口及 `S6/S9` 其他目标系统实测仍需相应环境；三协议本地 HTTP fixture 不冒充真实 Provider。

| AC | 实际实现与代码证据入口 | 验收边界 |
| --- | --- | --- |
| AC-001 | module/client-runtime 懒启动、独立设置；runtime 回归与宿主探针 | 宿主检查见下文 |
| AC-002 | assistant/conversation 持久身份、临时执行；assistant/delegation 合同 | 完整用户重启路径后验 |
| AC-003 | 配置修订快照、AgentEditor 严格 draft；assistant/engine 合同 | 真实模型任务待验 |
| AC-004 | disable/deletePreview/delete、关联屏障和删除 UI；assistant/DOM 回归 | 真实关联处置后验 |
| AC-005 | session 准入/幂等回执、不可变发送命令；chat/groups/TS 回归 | 实际模型交互后验 |
| AC-006 | group coordinator/UserBatch 和共享 transcript；groups 合同 | 真实模型协作待验 |
| AC-007 | 稳定身份 mention、无效 token 拒绝及草稿；mentions/groups/DOM | 宿主主路径见下文 |
| AC-008 | group incarnation/historyRevision、任务屏障、客户端失效；groups/events | 多客户端故障组合后验 |
| AC-009 | 受权 discovery/分页和明确目标；collaboration-policy/工具合同 | 真实模型选择待验 |
| AC-010 | 委派事务/原始回执、独立 work thread；delegation 合同 | 真实模型委派待验 |
| AC-011 | temporary 及持久创建 proposal 确认/拒绝；delegation/ProposalClient | 真实模型提案待验 |
| AC-012 | notify/question/reply、root mailbox和真实上下文；delegation 实测 | 真实模型多轮待验 |
| AC-013 | 调用树深度/数量/循环限制；collaboration-policy/delegation | 真实模型调用轨迹待验 |
| AC-014 | 原子预算预留、known/estimate/unknown；usage/engine/合同 | 真实 usage 待验 |
| AC-015 | 部分结果、后代终结条件及 TaskClient；delegation/tasks | 真实模型部分失败待验 |
| AC-016 | 树级取消和在途效果结算；delegation/approval/effect 合同 | 真实宿主竞态后验 |
| AC-017 | 恢复核查/用户 resume/Checkpoint 校验；recovery 合同 | 真实崩溃现场后验 |
| AC-018 | Agent/work-thread 记忆与上下文隔离；private-memory 合同 | 真实模型上下文待验 |
| AC-019 | 私有记忆维护作业、去重和暂停；private-memory 合同 | 真实维护模型待验 |
| AC-020 | 全局提案确认/拒绝/CAS；globalmemory/DOM | 真实模型提案待验 |
| AC-021 | 纠正、forget、pin 和旧作业失效；private-memory 合同 | 代码夹具覆盖 |
| AC-022 | 来源/接收者/派生依赖授权检查；access/groups/private-memory | 真实外发待验 |
| AC-023 | 三协议 Eino adapter 与独立本地 HTTP 合同 | 三条真实 endpoint/model 未运行 |
| AC-024 | 显式来源/范围、稳定 origin 与撤权；sources/Host/Workbench | 真实附加见宿主证据，其余后验 |
| AC-025 | Approval/效果绑定及 Host 写预览；approval/NoteEffects/DOM | 真实模型驱动笔记修改待验 |
| AC-026 | 版本/unsaved/create 冲突；Host/效果回归 | 完整原生编辑冲突后验 |
| AC-027 | 原子 command receipt/扫描唤醒、exact retry；chat/delegation/TS | 代码夹具覆盖 |
| AC-028 | 多工具审批门/取消与 CP 事务；approval/engine 合同 | 真实模型竞态待验 |
| AC-029 | 最小回执/unknown/reconcile 和终态后事实；effect-reconcile/TS | 真实写入丢回执后验 |
| AC-030 | Run 游标/乱序/缺口/快照恢复；events/TS reducer/client | 代码夹具覆盖 |
| AC-031 | 服务端授权续读和多 leaf 投影失效；events/审批/记忆/数据回归 | 完整真实多窗口撤权后验 |
| AC-032 | 终结/磁盘与持久事务失败；execution/recovery 合同 | 真实磁盘故障后验 |
| AC-033 | 模块与进程所有权/EOF/停止；runtime/native smoke | 完整用户退出路径后验 |
| AC-034 | 真实文件身份锁/别名拒绝；foundation 合同 | 其他 OS 实测后验 |
| AC-035 | framed stdio/schema/反向 Host；foundation/TS 与 native smoke | 本机原生通过 |
| AC-036 | 协议错误/限流/取消、部分内容；engine/chat 合同 | 真实 Provider 故障待验 |
| AC-037 | SQLite 版本/迁移/备份/坏库拒绝；migration/foundation | 其他 OS 实测后验 |
| AC-038 | 派生正文/作业清除、保留选择、WAL 截断；bootstrap/effect-reconcile | 真实用户内容选择后验 |
| AC-039 | 删正文保留最小绑定/原指纹、原效果核查；effect-reconcile | 真实 Host 对账后验 |
| AC-040 | 持久 cleanup fence/受限恢复/新身份与预算；bootstrap 真实 SQLite/HAP | 完整宿主故障恢复后验 |
| AC-041 | 显式选择、授权导出、stage/预览/CAS/原回执；portable/DOM | 原生文件选择/跨库导入后验 |
| AC-042 | 私有凭据通道/系统保护与内存模式、清理 gate；credentials | 各 OS 凭据服务实测待验 |
| AC-043 | 官方资产元数据/hash/路径、失败保留旧二进制；installer/tooling | 其他 OS 安装实测待验 |
| AC-044 | Go 依赖/TS 分区检查；architecture 与内层 SDK/SQL 禁入 | 代码检查通过 |
| AC-045 | ledger/调用树 usage、终态迟到结算；Go/TaskClient | 真实 Provider usage 待验 |
| AC-046 | 有界帧/队列/分页/历史与取消夹具；performance/events | 未宣称达到整产品 p95 候选目标 |
| AC-047 | 持久目录/搜索/新建/返回/dirty 确认；DOM/宿主探针 | 主路径见下文，复杂组合后验 |
| AC-048 | 附加/mention/草稿/内联任务审批/写目标；DOM/Host | 模型完整周报场景后验 |
| AC-049 | 任务树/部分结果/局部取消/恢复/效果；tasks/DOM | 真实模型/宿主故障组合后验 |
| AC-050 | 私有/全局/context、来源、分片与确认；memory/DOM | 真实模型维护场景后验 |
| AC-051 | 加载/离线/未知命令/清理失败重试；runtime/DOM | 已测分支见回归，其他现场后验 |
| AC-052 | 响应式容器/明暗与代表性宽度截图；视觉/宿主探针 | 完整 200% 缩放/长中文矩阵后验 |
| AC-053 | IME/Enter/焦点/弹层与触区组件合同；DOM | 真实 IME/reduced-motion/触屏组合后验 |
| AC-054 | 入口中立 facade、Host能力、同 Session 并发；foundation/合同 | 未来 Web 无网络入口 |
| AC-055 | 五目标交叉编译和清单同源码；Linux x64 原生 smoke | 其余 OS/架构真机未运行 |

## 验证与独立审查

环境为 Ubuntu 26.04.1 x86_64、Linux 7.0.0-38、Node 26.11.1、pnpm 11.1.3；Go 固定 `go1.26.10`、`GOWORK=off`、`CGO_ENABLED=0`。检查在工作区执行，未代称为远程 CI 或发行验收。

Go 最终完整命令 `pnpm check:huhu-bot` 已通过，包含 TS-14 / GO-07/08 的最终合同与实现，见[完整 Go 检查](checks/go-all.txt)。[五目标交叉编译](checks/native-five-targets.txt)完成，[Linux x64 原生 stdio 冒烟](checks/native-smoke.txt)覆盖 SQLite 重开、EOF 与 shutdown。[资产清单](native-assets-current.json)再次核对五个二进制、checksum、版本及源码树一致，源码树 SHA256 为 `059656e0eca6b33e5b958cf773bc42c93f5e6623cab372f9d6143ebf0bdf2716`。其他目标的交叉编译不等于对应真机测试。

Go 独立审查者 `native:/root/review_runtime` 未参与实现；[最终双轴报告](final-go-review.md)对[482 文件冻结输入](final-go-input-delivery.json)给出 standards/specification 两轴 pass、无剩余 finding，canonical JSON.stringify SHA256 为 `caac63f228eda48db11bf0b471396b69d2c3f664f0a7f4acdc5fa9d603de0349`。这包含发现并修复映射、同名歧义和预览帧限额之后的增量，结束时源码及规则均无漂移；原 481 文件的过度结论已由最终报告明确纠正。data/frontend 后来参与修复，其自测不充当独立批准。

全仓 Vitest 的成功命令为 `GOCACHE=/home/wta/.cache/go-build pnpm exec vitest run --maxWorkers=4`，实际 **436 个文件、3681 项测试通过，3 个文件 / 4 项测试跳过**，见[完整输出](checks/vitest-full.txt)。这次成功之后的局部 Memory、设置和视觉变动另跑全部 Bot 与 release 回归，不把旧全量结果冒充最终源码重新全跑。共享 GOCACHE 只复用编译缓存，测试的 HOME、凭据和 Profile 隔离仍保留。

失败也保留：[首次全量](checks/vitest-full-first-failed.txt)虽然断言通过，仍因 worker teardown 的 `Closing rpc while onUserConsoleLog pending` 整体失败；[原用例隔离重跑](checks/teardown-isolated.txt)通过。[第二次全量](checks/vitest-full-disk-failed.txt)因隔离 HOME 下多套 Go 编译缓存耗尽临时空间，三个原生集成套件失败；清理本轮临时缓存并显式复用已有 GOCACHE 后才得到上面的完整 exit 0。未改断言或将这些失败记作通过。

最终局部回归命令为 `GOCACHE=/home/wta/.cache/go-build pnpm exec vitest run src/modules/huhubot test/release --maxWorkers=4`，**55 个文件、374 项测试通过**，见[最终 Bot / release 输出](checks/bot-release.txt)。其中包含预算初次加载、保存期间锁定、不同 leaf 的凭据字段身份，以及冲突取消保留草稿、确认后重读并以新修订保存的回归。之后没有继续修改生产代码。

| 检查 | 实际结果与回执 |
| --- | --- |
| `pnpm run build` | [通过](checks/build.txt)：生产和测试类型检查、26 个样式源一致、重建 `main.js` |
| `pnpm run lint` | [通过](checks/lint.txt)，`--max-warnings 0` |
| `pnpm lint:css` | [通过](checks/css-lint.txt)：25 文件，无新增违反，原有 3 组规则基线保留 |
| `pnpm test:architecture` | [通过](checks/architecture.txt)：1263 模块，无分区、宿主包、桌面边界、barrel 或循环违反 |
| `pnpm test:huhu-bot-architecture` | [通过](checks/go-architecture.txt)：77 个 Go 生产文件 |
| `pnpm test:i18n` | [通过](checks/i18n.txt)：31 词典、4977 键，en/zh、占位符和引用匹配 |
| `pnpm check:bundle` | [通过](checks/bundle.txt)：实际闭包、禁止 eager 区域及测量后预算 |
| `pnpm test:promise-callbacks` | [通过](checks/callbacks.txt)：使用真实 Obsidian 控件类型 |
| `pnpm test:workbench-entry` | [通过](checks/workbench-entry.txt)：3 项，唯一注册 owner 与 shell 合同边界 |
| `pnpm test:build-text` | [通过](checks/build-text.txt)：换行及许可 banner 等价 |
| `pnpm test:huhu-bot-tooling` | [通过](checks/native-tooling.txt)：24 项，目标清单、构建锁、许可闭包及拒绝分支 |
| 第三方 notices 检查 | [通过](checks/notices.txt)：105 npm、62 crates、52 Go runtime/modules，无依赖变动 |
| `pnpm test:docs` | [通过](checks/docs.txt)：当前文档与本轮证据的结构、事实和本地链接；未抓取外部链接 |

TS/桌面/UI 的[最终独立双轴报告](final-ts-review.md)对[136 文件冻结输入](final-ts-input-host-closure.json)给出 standards/specification 两轴 pass、findings 为空，canonical JSON.stringify SHA256 为 `a79e0f7b56911cc2cb9aeffeb8ab3a4bae8e52b2b821fce2f656c7a10c890e15`。审查者未参与实施，开始和结束均核对 136 个源码项、12 个标准/规范来源无漂移；最终独立增量执行 [7 个 DOM 文件 / 39 项测试](checks/reviewer-ts-visual-consumers.txt)及[预算初读反例](checks/reviewer-ts-visual-settings-overlay.txt)，并另行查看 7 张真实宿主代表图。此前创建幂等、授权清理、事件窗口、实际 schema 与 native client 的有效独立证据按变化范围复用，不冒称全部重跑；相关原始输出保存在 `checks/`，审查报告中的临时 `.log` 名称对应同名 `.txt` 副本。验收探针是执行并核对哈希的辅助脚本，未混入这 136 项业务源码批准范围。

## 真实 Obsidian 与生成产物

使用 `/opt/Obsidian/obsidian`、Xvfb、独立的新 Vault/HOME/OS Profile，加载当前构建的插件与本机 Runner。实际[运行输出](checks/obsidian.txt)退出码为 0；[完整 JSON](obsidian-results.json)记录 **60 个渲染场景 + 8 个流程**。60 场景为八个业务页在 390/800/1440 三种宽度、明暗两种主题下的 48 项，加设置顶部与预算区域各 6 项。390 指桌面窗口窄容器，不宣称移动端支持。

实际流程包含设置先打开时无进程、创建两个持久 Bot 与群聊、不同会话草稿隔离、原生来源选择、用户管理菜单及返回、真实 Runner 断连后从设置重连、私有记忆与合法成员上下文读取。没有使用真实凭据或调用 Provider，预算保持零额度。

全部场景外层/内层水平溢出为 0，108 个复选框观测和 12 个单选控件观测通过可见尺寸、边框/选中状态检查；运行错误和 Hook 错误均为空。保留了[窄屏聊天](screenshots/bot-chat-390-theme-light.png)、[Bot 编辑](screenshots/bot-agents-390-theme-dark.png)、[群聊编辑](screenshots/bot-groups-390-theme-light.png)、[记忆](screenshots/bot-memory-390-theme-dark.png)、[数据管理](screenshots/bot-data-390-theme-light.png)、[设置](screenshots/bot-settings-390-theme-light.png)、[预算](screenshots/bot-settings-budget-390-theme-dark.png)及[宽屏数据管理](screenshots/bot-data-1440-theme-dark.png)等全部 60 张矩阵截图，另有设置先打开的截图。Lead 已逐张查看上述八个代表性场景；界面实施者逐张读完全部 60 张的[回执与复现命令](frontend-host-final-report.md)和[截图摘要清单](frontend-host-screenshot-manifest.json)一并保留，复制后再次核对了全部图像哈希。该回执不是独立代码批准。Tasks/Approvals 的截图为真实空态，没有验证活动模型任务或审批预览。

中间的功能探针曾成功，但读图随后发现裁切和不可见控件；增加内层检测的[一轮真实宿主失败](checks/obsidian-data-header-failed.txt)还暴露数据页标题挤压。这些不是最终通过记录，修复后才使用全新 fixture 重跑上面的 60 项。

[最终产物与摘要](artifacts.json)记录 `main.js` **6737602 字节**、`styles.css` **1427325 字节**。已在内存按正式 esbuild 配置重建并逐字节比对 `main.js`；样式由构建检查与 26 个有序源匹配。真实宿主 JSON 中 main/styles/Runner 的 SHA256 与这份清单完全相同。

[包体实测](bundle-analysis.json)中启动执行闭包为 **125886 字节**，Bot 激活闭包 **547094 字节**；React/Radix 等禁止区域未进入 eager 集。旧 main/styles 预算本已低于起点 HEAD 的提交产物，不能据此假称本轮零增长；现按最终测量的 KiB 向上取整，并在 `scripts/bundle-budget.json` 中写明起点、净增、用途及无新运行依赖的事实。

宿主退出后已核对本轮 fixture 的 Obsidian/Runner 进程和 CDP 监听均已结束；没有操作用户的实际 Vault/Profile。[检查索引](verification.json)汇总命令、退出结果、源码冻结与证据位置。

## 尚未完成的产品验收

源代码与上述检查不代替三条真实 Provider endpoint/model 的运行、流式和 usage 验收；本次没有相应凭据或实测回执。OS 导入/导出文件选择、用户笔记写审批与未知效果恢复、完整多 leaf / 多窗口故障组合、真实 IME / 200% 缩放 / reduced-motion，以及 macOS、Windows 和其他架构真机仍未全测。整产品 p95 候选目标也未测量。55 条 AC 保持原合同，change 保持 active，未用本轮代码结论将这些后验项目改为已通过。

## 文档与历史边界

更新了当前开发、架构、工作台、数据文档及相关 dev/ui 参考；没有直接改写永久 ADR/context/design，也没有恢复已删除的历史日志或 `CLAUDE.md`。90 份历史报告中的失效 logs 链接改为带“历史日志已清理”说明的字面路径，另修正少量相对链接与未加代码括号的 Go 类型。历史内容不再伪装成可回读的现行证据，本轮结论由新冻结源码和实际执行支撑。
