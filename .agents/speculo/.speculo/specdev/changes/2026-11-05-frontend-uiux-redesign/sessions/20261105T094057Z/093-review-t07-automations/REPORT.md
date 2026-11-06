# 任务回报

Session: 20261105T094057Z
Task: 093-review-t07-automations
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_t07，high 审查角色；未参与 072 实现及任何修复，未委派。**standards：request-changes；specification：request-changes。确认 1 项 P2 导航取消缺陷；两个轴分别列证据，未合并排名。** 其余已定义的能力保留、列表/开关、真实日期转换与定向生命周期检查未发现新增阻塞问题。此结论仅覆盖候选源码与实际测试，不认证像素、命中、多窗口宿主或完整 Ticket 已通过。

**明确释放 072 的全部 59 源/测试/fixture 及本次 17 项只读上下文输入冻结。** 最终字节/模式审计 drift=[]；没有修改 source、state、assets、配置、Evidence、Git/index、用户 vault 或外部状态。仓库只写本不可覆盖 REPORT；过程材料均在 /tmp/huhu-t07-high-review。

## 产物与验证

### 输入、独立性及真实差异

Review mode: working-tree（完整原始实施基线到 072 完整候选）；Risk: high；Independence: required；Strategy: independent；Mode: native。派遣来源为 093 TASK 与 Lead 工具消息；Lead 应从真实派遣/返回核对 reviewer 与实现者身份，结构校验不认证身份。原作者为 072 的 medium 实现角色，不把作者自述或测试数量当独立结论。

072 REPORT SHA256=2ee258bae0196c3c653ed6bcfd314ad238a6df43cfda9695e444e4044169346d，final-candidate.json SHA256=cd3ef69363650b482bd5913c44bbc77ccf9a11297ea05684022e1a9c3c0bc6d3，均与派遣值匹配。原始 50 项 before.json 的副本逐字校验，并进一步与 Git 基线 37fcede4210a19bcc2a74809e7fdd301e5717957 的对应真实对象比较，mismatches=[]。最终 59 项，36 变更、0 删除；包含原始自动化 UI 全部文件、strict resolver 与邻接测试、生产 fixture，并未只审最后补丁或拿 HEAD 冒充 dirty 候选。

真实完整差异 /tmp/huhu-t07-high-review/complete.diff，SHA256=afe532c4f2773d60da29b0710ed98a800f9fd086b5429f5503ea436bff34d07e；最终 59 项 canonical manifest 输入摘要=2635d35e2c08b4b131a6e19ecd79263a438cd76dbfe5022da04951e78f9c4d23。17 项上下文包括实际 API/schema/Service/store、模块/i18n、共享 DateTime/Date/Dialog/DetailPane、providers/owner-document/surface/IME、Workbench host 契约与 pages；其输入摘要=c189f2df6e15454c6337bb365945f455cd9e394c409f599b6da386653cefeaf4。真实副本保存在 /tmp/huhu-t07-high-review/candidate/，清单、开始/最终审计与 baseline 验证均在同目录。

标准来源按顺序核对 AGENTS、dev/ui 技能及适用测试/设置/i18n/Obsidian API、公共 review/risk/error/test-reliability 合同，工具配置实际使用 vitest.config.ts、eslint.config.mts 与限定 tsc 配置。CLAUDE.md 现存仅 @AGENTS.md 转引，未恢复或修改；未找到独立 CONTRIBUTING/CODING_STANDARDS。规范来源：无 commit/PR 引用分支，按本地明确委派读取 T07、Spec、Goal/Map、DESIGN3/UI-002 与批准快照、063 能力预检。读取时 Map 已为 32，30→32 仅涉及通知纯 UI 词典及 T16 许可收口，T07 范围/AC/设计绑定未变，未扩大审查。相关永久 context/ADR 索引无自动化命中；设计索引定位 DESIGN-0002，被本 change 的已批准 DESIGN3 明确替换。authority-manifest.json 留存实际主要原文哈希。

项目 dev SHA256=0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744、ui SHA256=12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4 与 TASK/票据一致。设计绑定仍为 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。075/078 共享日期同日 reset、用户 canClose 端口证据仅对未变生产者复用；本票真实消费另沿代码及生产表单检查。

### standards 输出

Reviewer: native:/root/review_t07
Result: request-changes

**S01 · P2：取消的导航在等待 dirty 决定后仍修改页面目标。**

位置：src/modules/automations/ui/workbench-page.ts:20–21，src/modules/automations/ui/automation-presentation.tsx:50–70。

binding.navigate(next, abort) 仅在调用 surface.navigate 前检查此次请求的 abort；Presentation 在 await canClose() 后只检查页面 lifetime signal 与 closed，没有接收/复核该次导航 signal。生产 shell 的 NavigationTransition 每次新目标会 abort 旧请求（src/shell/navigation-transition.ts:20），WorkbenchPages.prepare 在 await binding.navigate 后虽检查 signal，但此时 presentation.target、request、rerender 与 context.changed 已发生；外层拒绝 commit 不能撤销这些内部效果。

真实反例：创建生产 createAutomationsPage binding→surface.onOpen→列表 Edit Alpha→在生产 EditorView 修改名称→binding.navigate 到 Beta，实际 DiscardDialog 出现后 abort 该次导航→点击实际 Discard。期望 target 保留原 tasks；实际 getTarget 含 resourceId=Beta。无 abort 配对控制正常到 Beta。私有测试用真实 retained editor/guard/确认，没有 mock canClose 或复制实现；fixture Service 是 UI 时序 port，不用于声称领域行为。最初的单端口 counter 与真实表单版本分别保存，最终实际断言红灯，不是 setup/编译/timeout 失败；日志另有 React act 警告，不是目标失败依据。

可达影响：旧跳转等待期间用户发起另一导航，旧请求被 shell 取消，但迟到决定仍能改变保留页目标、排入 focusId=edit 请求并发布 changed；新目标还在准备或准备失败时会呈现已取消的旧详情，重新打开该保留页也可观察错误目标。这是新 await 引入的取消竞态，不能由列表层 current(generation) 或页面生命周期 signal 覆盖。

最小满足条件：将每次导航的取消/身份一直传到决定后的 mutation 边界，在 target/request/changed 等副作用前复核；保留同一 dirty 决策和现有强制清理语义，不改 shared host 的不可取消 onClose。补生产 binding+真实 dirty guard 的已 abort/未 abort 配对回归；取消请求不得再写旧 target 或打开旧 editor。此处未实施修复。

其余实际观察：

- WorkbenchTarget 是唯一业务选择；focusedRow 只作临时键盘高亮。定义/单次 run/缺失详情通过 DetailPane，列表节点保留；new/all-runs 独立区域隐藏列表。失败提示在实际右 Sheet 内也可读。
- 同 id 列表/详情操作共用 pendingIds 与 pending 快照，Switch busy/禁用、重复阻止与行点击隔离真实连通；toggle 只保存最新 definition 的 enabled，不调用 stop、不伪造 Promise<void> receipt/CAS 或 enabled-only revision。Service 才拥有持久数据与 revision。
- EditorView 在 beforeSave、save、run 后检查存活、可见、signal 与版本；保存后读真实 service.definitions。新旧表单 key/dirty callback 隔离及迟到 save/run 反例保留。用户 close 通过绑定 guard；hide 保留真实表单并释放 Radix 层；强制 teardown 不冒充 veto。
- RetainedEditorDialog 重用现有 Dialog/Portal 与可见上下文，stash 为 hidden/inert；公共 composer 保留 ownerWindow、source/prefill/link、saved/undefined、abort 与观察器/窗口监听清理。源码检查不证明真实 popout adoption 或像素焦点已通过。
- core 修改仅 opt-in strict resolver，原候选算法、默认 earlier 与 scheduler 保持；字段原始无效片段通过 DraftIssues 阻止旧有效值保存，未在共享 UI 引入模块依赖。没有新持久 schema/服务仓库或未授权领域重构。Fowler 启发式未产生另一个有实证风险的 finding。

### specification 输出

Reviewer: native:/root/review_t07
Result: request-changes

**V01 · P2：关键 await 后的导航身份保证缺口。** 对应 S01 的同一真实反例，分别按 093 Acceptance「关键 await 后 owner/session/identity 校验」、T07 的 dirty 外部导航/晚到结果保证及公共取消合同判断：页面 lifetime 检查不能代替本次导航身份。已取消旧请求仍写业务选择，规范轴不能通过。满足条件与 S01 一致，不要求新增设计或领域能力。

其余规范核对：

- AC-061/062/063 的源码/DOM 接缝具备：列表节点/筛选/scroll 保留、概览/运行记录/单 run/缺失深链右详情、统一 pending/失败回读真值、启停不停止已开始运行。实体来源回焦、F6、IME/Esc、fine/coarse 命中、两 Document 与 responsive 的最终可见效果仍由 Root 实际矩阵/宿主验收，源码未认证它们已通过。
- 七 action 保留：agent 的 agentId、Space/cwd、prompt、fresh/reuse/specific 与 session/account 引用、extraArgs；script 的 Space/cwd/script/shell；notify/body 与 source-bound 限制；command/file/url 选择与 URL normalize；create-task 的 text/date/time/timezone/absolute reminderAt。模板、预检 command/shell、通知渠道/notifyOn、grace/device/revision、source/link、删除偏好/历史保留和运行状态/筛选/50 条继续加载均沿既有入口保留。calendar retry 仍调用 retryRun(run) 保留原 delivery 身份，未替换成新的 manual run。
- AC-023 真实 EditorView/SchedulePicker 或 task reminder→AutomationService→JsonStore/memoryVault 的 8 个联合控制全部通过：NY 2026 gap/fold 保存零写入，UTC/Shanghai 精确 epoch；once 不持久化虚假 zone，编辑中的显示 zone 可临时保留；task.date 为纯日，manual trigger 与 task.time/timezone/reminderAt 相互独立。不是以共享 mock validator 当域证据。
- ScheduleSpec 实际仅 manual/once.at/recurring.expression/start/timezone，063/T07 已明确没有 end/UNTIL/COUNT。本次保留实际不支持结束日期的说明，不按原型虚造字段；这是已批准能力边界处置，不是遗漏已有能力。
- DESIGN3/UI-002 的列表/右详情/编辑 Dialog/独立 new 与 all-runs 组合方向满足源码要求；canonical HU 控件与本模块 en/zh 使用连通。未运行像素或完整状态矩阵，不能宣称 Design Conformance 全部完成。

### 本 reviewer 实际检查与限制

| 检查 | 结果与真实材料 |
| --- | --- |
| 59 源+17 上下文 hash/mode 与原始 baseline 核对 | 通过；start-audit.json、baseline-verification.json、final-audit.json；drift=[]，未据此声称整个 working tree clean |
| pnpm exec vitest run src/modules/automations --maxWorkers 2 | 21 文件通过/1 文件失败，161/162 测试通过；module-tests.log。最外 shell 以 tail 展示日志返回 0，不能当 Vitest 通过；失败已单独复现如下 |
| pnpm exec vitest run src/modules/automations/automation.test.ts -t 'inbox renders' --maxWorkers 1 | 实际进程退出 126；1 失败/29 未选；inbox-ssr-counter.log。失败是 InboxPanel→useLeafMetrics 缺 HuhuProviders 的范围外 SSR 迁移债 |
| pnpm exec vitest run --config /tmp/huhu-t07-high-review/vitest.config.mts --maxWorkers 1 | 实际退出 126；生产 binding/真实 dirty guard 配对 1 通过/1 目标断言失败；navigation-counter-final.log，原始版本 navigation-counter-real.log；S01 有效红灯 |
| pnpm run test:safety-regressions | 退出 0；六个安全脚本全部通过，含 NY/Lord Howe、实际 session 并发和任务/冲突控制；safety.log，仅内存/临时数据 |
| pnpm exec tsc -p /tmp/huhu-t07-implementation/tsconfig-fixture.json | 退出 0、日志空；types.log。限定 UI/resolver/tests/生产 fixture 图，不是全仓 type pass |
| pnpm exec eslint src/modules/automations/ui src/modules/automations/core/schedule/zoned-occurrences.ts --max-warnings 0 | 退出 0、零警告；lint.log |
| node --check scripts/ui-review/fixtures/frontend-redesign/T-07/index.mjs | 退出 0；只证明协议语法，未运行浏览器 |
| validate-dispatch.mjs --stage dispatch（当前 093） | 退出 0，errors=[]/warnings=[]；结构检查，不替代审查或独立身份 |

范围外债单独记账：automation.test.ts:652 的既有 SSR 测试直接 renderToStaticMarkup(InboxPanel)，当前 T11 InboxPanel.tsx:101 新增 useLeafMetrics 依赖 HuhuProviders，触发上述失败。该 test 和 InboxPanel 不在 59 源写集，T07 数据/日期/DOM 测试通过；072 的 05:40 历史 162/162 与当前组合 161/162 分别如实保留。该债需 T11/Lead 按真实测试入口修订，未改掉原风险断言，也未归为 S01 的根因。

未构建 main.js/styles.css，未运行浏览器矩阵/完整 66、真实 Obsidian popout/宿主、用户 vault/CLI/剪贴板。Root 持有这些验收门；作者 --check/preflight、模块 Node/DOM 与本报告都不代替真实可见验收。没有对未变基础票再开循环检查。

## 问题与下一步

Lead 可对 S01/V01 执行最小导航 signal/身份修复并增加真实 guard 配对回归，再只冻结受影响输入复审；无需扩大到调度、其他模块或共享原语重写。另将既有 inbox SSR 迁移债交 T11/Lead，在组合门禁完成前保留其失败事实。

全部审查输入已明确释放，072、075/078 与本报告保持不可覆盖。Root 继续拥有最终 CSS/资产、实际矩阵、宿主和正式 Evidence/状态裁决；本次没有宣布 T07 或任何 Gate 完成。
