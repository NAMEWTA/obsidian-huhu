---
schema_version: 3
artifact: spec
change: 2026-10-31-dev-stabilization-overhaul
status: ready
ready_for_tickets: true
sources:
  - SOURCE:<Path>{roots.state}/specdev/changes/{change}/source.md</Path>
  - TRIAGE:<Path>{roots.state}/specdev/changes/{change}/triage.md</Path>
  - DECISIONS:<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>
  - USER-DECISION:单一 change 承载 #37，Browser 按 LOG-018 暂停（ADR-009）
  - USER-DECISION:采纳十项一致性修订（LOG-017）
  - USER-DECISION:round 2 采纳 D-008、D-010、D-011、D-012、D-013 推荐；真机验收由用户自行完成（LOG-009 至 LOG-013）
---

# Spec: dev 稳定性、性能、功能修复与全界面统一（#37）

## 问题与目标

**谁受影响：** 在 Obsidian 里使用 HUHU 的用户（首页、终端工作台、自动化、任务、保险箱等），以及维护发布链和 Bot Runner 的维护者。

**当前问题（证据等级见 triage）：** Bot Runner 停止语义把“超时”和“失败”混在一起，检查点占用业务调用（#28）；上下文条目重复落库传递闭包造成写放大（#29）；Windows 上 Hook 首事件突发发布失败（#31）、子进程中途 EOF 根因未知（#30）、macOS 断电持久性未验证（#34）；首页启动仍为可选恢复等待最多 5 秒（#16）、第二看板天气可能长期 Loading（#22）；7 个可见功能缺陷（#19–#21、#23–#26）；全插件 UI 不统一（#35）；包体预算余量仅约 160 B（#33）；来源记录有缺口（#27）；失败诊断未收口（#32）。

**成功标准：** #37 §15 的 A16、A19–A35 与 G1–G3 在当前 dev 上全部有实际证据；缺少平台条件的项保持未验收并写明缺口。agent 交付的完成条件止于自动化测试与 GitHub Actions runner 证据；标为“用户真机验收”的部分由用户自行完成（LOG-012），未完成时不挡批次合入 dev，但挡关闭 #37。“原 Issue 已关闭”“新增了测试文件”“代码看起来合理”都不算证据（ADR 见 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>`，术语见 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>`）。

## 解决方案与外部行为

按 #37 §13 的批次推进，每批独立 PR 合入 dev，引用 #37 但不自动关闭它。

- **B0 基线（W0、W7 初测、W6 清单）：** 固定实施 SHA，为每个 A 编号建立“报告环境 / 当前复现 / 证据等级 / 根因状态 / 任务 / PR / 结果”账本，放在 `<Path>docs/e2e/</Path>` 体系内；建立虚构/脱敏的功能与规模 fixture；运行现有测试与构建并记录基线失败；重建包体报告。
- **Bot Runner 停止（W2，ADR-002/003）：** 调用方可以分别观察到“停止请求已接收、执行器已排空、持久化已完成、Profile 已释放”。等待超时返回当前阶段，资源 owner 继续清理；宿主在 Profile 释放前不重开该 Profile。检查点不再由业务调用同步承担。
- **依赖存储（W1，ADR-004、ADR-007）：** 条目数增加不再导致同一来源闭包逐条重复落库；撤权、删除、清除、恢复行为不变。新 schema 在按版本隔离的新 Profile 运行，旧 Profile 只读保留、不迁移，首次启动告知旧数据位置。
- **Hook 发布（W3）：** 原规格 32 scope × 3 事件突发时 96/96 完整送达、每 scope 有序、无重复、无遗留槽位/lease；容量不足或超时准确失败并可定位。安全校验（路径、scope token、大小、reader 所有权）全部保留。
- **启动与天气（W4，ADR-005）：** 任何可选账号/网络/凭据读取不返回时，首页和工作台立即可进入和交互。天气有明确可见状态：未配置、等待启动、加载、有缓存且刷新中、成功、离线/失败、已失效；任何阶段挂起都能到达终态或可恢复状态，不跨看板串数据。
- **功能缺陷（W5）：** 内置名称本地化且与身份、路径分离，新库默认路径为固定英文 kebab-case（ADR-006）；终端默认只显示简洁状态，不确定状态持续可见；大区域无无意义 tooltip；自动化通知以运行时名称快照和结果为主；约 420px 容器保留名称与主操作；分屏命令/快捷键/菜单/拖拽行为一致且无静默无效；任务保存、列表与计数一致，日期完整显示。
- **UI 统一（W6）：** 单一 token 源与统一组件全状态外观，覆盖非 Browser 的全局 Shell、12 个未冻结模块与全部非 Browser 的已注册 home 子项。视觉/交互合同固定于本 change 的 DESIGN revision 2、项目基线 DESIGN-0002 与原型 UI-001；用户已批准九项推荐，DESIGN-0002 人工发布例外已回读，G-DESIGN 已关闭（LOG-016）。B5/B6 仍遵守逐票依赖和实施授权。
- **预算与来源（W7、W8）：** 预算理由与阈值一致，不靠提高上限换绿灯；来源页区分运行依赖、复制/改编、素材/字体、仅行为参考。

## 验收合同

ID 的前两位对应 #37 的 A 编号（AC-16x ↔ A16），9xx 对应 G1–G3，0xx 对应 B0 基线。

| ID | 前置条件 | 动作或事件 | 可观察结果 | 验证接缝 |
|---|---|---|---|---|
| AC-001 | 最新 dev | 建立 B0 账本 | 18 个 A 编号各有报告环境、当前复现步骤、证据等级、根因状态；实施 SHA 与相对 `505d51b` 的差异已记录 | `docs/e2e/` 账本回读 |
| AC-002 | 最新 dev | 运行适用现有测试与构建 | 基线失败逐项记录；Windows CI 是否真正到达目标用例有证据，不只看 job 颜色 | 命令与退出码；CI 日志定位 |
| AC-161 | `cookies.get` 永不返回 | 激活首页与工作台 | 未等任何可选恢复即可交互；无固定 5 秒等待 | `pnpm test:music-account` 扩展 + `pnpm test:workbench-lifecycle` |
| AC-162 | 后台恢复进行中 | 拒绝 / 迟到成功 / 模块销毁 / 登录或登出竞争 | 迟到结果不覆盖用户之后的决定；销毁后无残留回调 | 同上，DOM/模型测试 |
| AC-163 | 小库与万篇笔记大库 fixture | 运行可复跑采样脚本 | 独立 fixture 脚本在三平台输出冷/热进程、非 Browser 模块 activate、组件可交互与输入/提交到画面趋势，标明 mock 边界、原始值与计时点；不称作真实 Obsidian 启动测量；实际插件启动及原 300ms/250ms 预算属用户真机验收，缺失项标未验收 | 新增采样脚本（待建）+ CI 记录 |
| AC-191 | 全新英文/中文库 | 初始化、切换语言、重启 | HUHU 生成的默认目录与固定文件名为 `vault-layout.ts` 中唯一一张表定义的英文 kebab-case 名，并与 `docs/data.md` 一致；内置类型/字段显示随语言变化；存储路径与稳定身份不变；用户自定义名称与显式路径不被翻译；代码中无中文默认路径残留 | `pnpm test:i18n` + archives/vault-layout 单测 + `pnpm test:docs` |
| AC-192 | 已有旧中文默认目录的库 | 升级后首次加载并使用各模块 | HUHU 只读写新路径；旧目录与其中文件字节不变，未被移动、删除、覆盖或合并；代码中无旧中文默认路径引用，也无检测或迁移逻辑（ADR-008） | 旧目录 fixture 测试 + 引用清点 |
| AC-201 | 终端正常运行 | 打开工作台 | 默认只显示简洁状态与必要动作；技术字段在可展开详情 | agent UI DOM 测试 |
| AC-202 | 停止未确认 / 清理失败 / 异常退出 | 观察终端 | 状态以用户文案持续可见并提供检查入口；折叠展开不重建 xterm、不丢输入/选择/滚动 | agent UI DOM 测试；宿主内表现属用户真机验收 |
| AC-211 | 真实 Obsidian | 鼠标停在 Home / Note history 空白处 | 无整块区域 tooltip；区域经可见或隐藏标题 `aria-labelledby` 命名；图标按钮仍有名称 | DOM 可访问名称断言；宿主 tooltip 复现与确认属用户真机验收 |
| AC-221 | 两看板、多天气实例 | 成功、未配置、主备网络失败、缓存读/写挂起、旧请求晚到、切换/隐藏恢复 | 每种情况到达明确状态；无无限无解释 Loading；无跨看板串数据；旧缓存标注时间 | `pnpm test:weather-mapping` + `pnpm test:dashboard-isolation` 扩展，故障注入 |
| AC-231 | 自动化运行结束（含运行后改名、删除、空名称、超长名称、多次运行） | 显示 toast 与持久通知 | 主文案为运行时名称快照与结果；详情按稳定 ID 显示现名或“已删除”；空名称显示本地化“未命名自动化”；ID 在详情可复制；失败在 toast 消失后仍可在通知中心找到；不泄露密码/token/敏感参数 | notifications/automations 单测 |
| AC-241 | 自动化容器 420px / 600px / 宽屏、长英文名、200% 缩放 | 渲染列表 | 名称与启停、运行、编辑可见可达；无无解释整页横向溢出 | 容器宽度 DOM 测试 + `scripts/obsidian-acceptance/独立组件 UI runner（T-23 建设，见 execution-boundaries）.mjs` |
| AC-251 | 单标签组 / 最后一个标签 / 多组 / 固定标签 / 非终端页 / 弹出窗口 | 经命令面板、快捷键、菜单、拖拽分屏 | 四个入口同一业务动作；成功有布局变化与合理焦点；不能执行时给出原因；不误停终端或改动其他窗口 | agent workspace 模型测试；宿主内分屏属用户真机验收 |
| AC-261 | 任务页与看板嵌入视图 | 创建/编辑/完成/删除，筛选内外 | 保存后列表与计数来自同一领域结果，无重复行；失败保留输入 | `pnpm test:task` 扩展 |
| AC-262 | 中文/英文日期、420px、200% 缩放 | 查看 Through 日期 | 日期完整，可换行，不截断 | DOM 布局测试 + 独立组件 UI runner（T-23 建设，见 execution-boundaries） |
| AC-271 | 来源清单（Notebook Navigator、Obsidian Copilot、Marginalia、Hover Annotations、Margin Annotations、Side Note、Commentator、Smart Composer、dbx、Windows Terminal） | 核对来源页 | 每项有使用性质、仓库/版本、许可核对状态、HUHU 对应位置，或经核对的不适用说明；README 致谢指向完整记录 | `pnpm check:notices` + `pnpm test:docs` + `pnpm test:license-texts` |
| AC-281 | 注入慢于 3 秒的刷盘 | 调用方以期限请求停止 | 返回真实阶段而非假成功或笼统执行器失败；之后等待可观察到真实完成；Profile 释放前不重开 | Go 合同测试（`native/huhubot` 下 `go test`） |
| AC-282 | 重复 stop、退出中到达响应、生产者未收敛、重启竞争 | 执行停止 | 无重复提交、无提前重开、无遗留匿名维护任务 | Go 合同测试 + TS 宿主测试 |
| AC-283 | 检查点维护失败或超时 | 业务事务已 COMMIT | 业务结果仍为已提交，无业务重试；长读者下 WAL 不无限增长；隐私清除仍执行截断 | `sqlite/base` 下 checkpoint/durability 测试扩展 |
| AC-284 | Windows（GitHub Actions runner） | 测量 PASSIVE/RESTART/TRUNCATE 与阈值 | 吞吐、读者阻塞、FULL 屏障、磁盘占用、恢复代价有记录；与 W1 联合重测时分别报告模型收益与 I/O 收益 | GitHub Actions Windows runner 测量脚本 |
| AC-291 | 50/100/200 Run，链式/分支委派/共享来源/多来源/撤权 | 运行规模用例 | 结构性行数断言证明同一来源闭包不随条目逐条复制；输出各阶段行数、WAL 增量、耗时、峰值内存 | 新增 Go 规模测试 + `pnpm bench:huhu-bot` |
| AC-292 | 新依赖存储 | 编辑、撤权、删除预览、物理清除、跨 namespace、revision/hash 错配、检查点恢复 | 全部回归通过；清除后无不可追踪残留；无无界递归 | Go 合同测试 |
| AC-301 | Windows TS↔Go fixture | 正常退出、Run/Close 错误、信号终止、父管道仍打开、stdin EOF、停止中断流、重开、效果对账 | EOF 有确定性根因回归，或明确记录剩余风险并保持未完成；重连不造成重复外部动作 | `effect-reconcile`、`foundation` 合同测试 |
| AC-311 | Windows（GitHub Actions runner） | 32 scope × 3 有序事件冷启动突发，多轮（目标 ≥20 轮） | 96/96 送达，每 scope 有序，无重复，无遗留槽位/lease；报告轮次、失败数、环境；Linux/macOS 无退化 | `hook-spool.test.ts`（真实进程，隔离串行编排） |
| AC-312 | 容量满 / 撤销 / generation 变化 / 路径替换或重解析点 | 发布事件 | 准确失败且可定位，成功接收的事件不消失，安全校验仍生效 | `hook-spool.test.ts` + `spool-guard` 测试 |
| AC-321 | #37 §4.1 诊断清单 6 处 | 逐项决定保留/收敛/删除 | 成功路径安静；失败输出有上限且脱敏；`workspace-service-stop-native` 偶发失败有独立验证结论（未复现不写成已修复） | 对应测试文件回读 + 运行记录 |
| AC-331 | 当前锁定工具链 | 重建 JS/CSS/eager/activation 报告 | 报告与 `outputBudgetReason` 一致；无静默提高阈值；启动闭包无新禁止依赖；确需增长有差异、价值、替代方案与批准记录 | 冻结期构建序列（execution-boundaries） + `pnpm check:bundle` |
| AC-332 | 字符串脚本（HOOK_PUBLISHER_SCRIPT、SPOOL_GUARD、HOOK_SCRIPT）若做构建期压缩 | 运行真实发布/撤销/错误路径 | 压缩前后协议行为相同，含 Windows 路径与引用；来源声明保留 | 语法检查 + hook 真实进程测试 |
| AC-341 | 锁定的 Go 与 SQLite/ncruces 版本 | 审计 Darwin VFS `xSync` 与 fullfsync 路径 | 源码位置与实际配置有记录 | 审计记录 |
| AC-342 | macOS | 正常关闭、进程崩溃后重开（agent，GitHub Actions macOS runner）；系统/虚拟机骤停后重开（用户真机验收） | 每种故障模型分别有证据；骤停未由用户完成时 A34 保持未验收；结论经 A 回写 ADR-027 | Go 合同测试 + CI；骤停属用户真机验收 |
| AC-351 | change DESIGN 已批准（D-013） | 迁移非 Browser 的全局 Shell、12 个未冻结模块、全部非 Browser 的已注册 home 子项 | 每项未冻结入口有清单、全状态与前后证据；覆盖亮暗/用户主题、中英文、长文本、宽窄、多窗口、IME、键盘、200% 缩放、reduced-motion | `pnpm test:ui-styles` / `test:ui-runtime` + 独立组件 UI runner（T-23 建设，见 execution-boundaries）；宿主内全状态属用户真机验收 |
| AC-352 | 同上 | 对比度与命中区检查 | 普通文本 ≥4.5:1，大文本与适用非文本 ≥3:1；桌面命中区 ≥32px、触控 ≥44px；名称/主操作不可达、整页横向溢出、失败丢输入、虚假成功均为阻断 | 设计检查记录 + DOM 几何测试 |
| AC-353 | UI 迁移完成 | 清点样式与组件 | 无死 CSS、旧组件、`--db-*` 等过期别名、并行主题分支或临时开关 | `pnpm lint:css` + `pnpm check:styles` + 引用清点 |
| AC-901 | 全部批次合入 | G1 检查 | 未冻结范围无永久兼容层、双实现、双状态真相、失联旧样式；Browser 冻结导致的保留引用逐项定位，不新建兼容分支、不伪称全仓归零 | 引用清点 + 代码审查 |
| AC-293 | 存在旧格式 Bot Profile | 启动新版本 | 新 Profile 在按 schema 版本隔离的位置创建；旧 Profile 字节不变、未被加锁或写入；首次启动提示旧数据位置与只读状态；无迁移器、无双读 | Go/TS 隔离 fixture 测试 |
| AC-902 | 涉及数据格式或资料目录变化 | G2 检查 | 新格式切换方式、用户资料保护、敏感字段、权限、外部动作屏障符合 ADR-001、ADR-006、ADR-007；旧库与旧 Profile 未被覆盖或清空 | 迁移/隔离 fixture + 审查 |
| AC-903 | 收口 | G3 检查 | 适用测试、构建、原生检查、文档、来源与生成产物一致；未验项未被填成通过 | 冻结期适用全量检查（原 test:all 目录逐项核对） + 原生/平台检查记录 |

## 范围

- **IN：** #37 W0–W8 中扣除 ADR-009 Browser 冻结范围后的条目及其 A16、A19–A35、G1–G3 验收；B0–B7 批次实施；D-008 至 D-013 决定后的对应行为。
- **REUSE：** `Core` 的 `RequestStop/Done/WaitClosed`；`WithinDurableTx` 与 ADR-027 持久性语义；天气 12 秒单请求超时、主备 Provider、请求代次与看板代次保护；网易云迟到结果保护与窗口计时器；Hook pool 的资源上限、共享 reader、lease、scope token 与路径检查；`workspace-splitRight/splitDown` 已有命令与分组模型；`src/ui/components` 与 `src/ui/components/huhu` 的组件层次；`.huhu-ui` 隔离；`<Path>scripts/bundle-budget.json</Path>` 的预算与 forbidden eager areas；`<Path>docs/references.md</Path>` 已有来源记录；`<Path>docs/e2e/</Path>` 证据体系。
- **OUT：**
  - OOS-001：#36 Personal Agent、#9、#17 的新业务能力。
  - OOS-002：更换技术栈、更改插件 id、改成 Web 应用、替换执行引擎、重写终端/编辑器/差异引擎，或修改保险箱加密与剪贴板策略。
  - OOS-003：完整移动端支持（320px 只作压力测试）；Obsidian 宿主整体无障碍认证。
  - OOS-004：引入第二套 UI 运行时或图表库；安装 Radix Themes/Primer 完整运行时；加载 Uiverse CDN。
  - OOS-005：提交、推送、发版与升版本（由用户另行授权）。
  - OOS-006：agent 执行或跟踪真机验收（真实 Obsidian、Windows/macOS 实机、虚拟机骤停）；由用户自行完成（LOG-012）。

## 验证策略

| 接缝 | 层级 | 覆盖合同 | 现有先例或命令 | Evidence 类型 |
|---|---|---|---|---|
| Go 合同与真实进程测试 | 合同/故障注入 | AC-281–284、AC-291–292、AC-301、AC-341 | `native/huhubot` 下 `go test ./...`；`sqlite/base/checkpoint_test.go`、`durability_test.go`；`tests/contract/{effect-reconcile,foundation,events,approval}` | 命令 + 退出码 + 关键输出 |
| Bot 规模与基准 | 合同/性能 | AC-291、AC-284 | `pnpm bench:huhu-bot`、`pnpm check:huhu-bot` | 行数/WAL/耗时表 |
| Hook 真实进程集成 | 合同 | AC-311、AC-312、AC-332 | `src/modules/agent/platform/desktop/hooks/hook-spool.test.ts` | 每轮结果与环境 |
| TS 模型/DOM 测试 | 单元/DOM | AC-161–162、AC-201–202、AC-221、AC-231、AC-241、AC-251、AC-261–262 | `pnpm test:music-account`、`test:workbench-lifecycle`、`test:weather-mapping`、`test:dashboard-isolation`、`test:task`、`test:unit` | 命令 + 退出码 |
| 本地化与文档/来源 | 单元 | AC-191、AC-271 | `pnpm test:i18n`、`test:docs`、`check:notices`、`test:license-texts` | 命令 + 退出码 |
| 构建与包体 | 构建 | AC-331–332 | 冻结期构建序列（execution-boundaries）、`pnpm check:bundle` | 报告与差异 |
| 样式与 UI 运行时 | 单元/静态 | AC-351–353 | `pnpm lint:css`、`check:styles`、`test:ui-styles`、`test:ui-adapters`、`test:ui-runtime` | 命令 + 退出码 |
| GitHub Actions Windows/macOS/Linux runner | 合同/性能 | AC-163、AC-284、AC-311、AC-342（崩溃部分） | 现有 CI 工作流 | job 日志与目标用例到达证据 |
| 用户真机验收 | 端到端 | AC-163（实机预算）、AC-202、AC-211、AC-251、AC-342（骤停）、AC-351 的宿主部分 | 由用户自行执行；agent 不执行、不跟踪 | 用户记录在 #37 |
| 收口 | 全量 | AC-001–002、AC-901–903 | `pnpm test:all` 与适用原生/平台检查 | 账本与运行记录 |

截图、可访问性、WAL 规模采样与启动采样的自动化目前不存在，标为待建，不虚构已有脚本。CI 先沉淀趋势与结构指标；确定性的状态、资源与行数约束是硬门禁，共享 runner 上的耗时波动不单独作为正确性判断。

## 约束与风险（适用时）

- **DEC-001（ADR-001）：** 不保留兼容层；同批次完成引用清点、消费者更新与旧实现删除。
- **DEC-002（ADR-002/003、永久 ADR-027）：** 超时不等于已停止；检查点不属于业务提交；不默认撤关闭刷盘。
- **DEC-003（ADR-004）：** 依赖不逐条落库闭包；最终 schema 在 W1.1 决策记录后定稿。
- **DEC-004（ADR-005）：** 可选初始化不在启动关键路径；对永久 ADR“首页可选恢复时限”的替代经 A 提升。
- **NFR-001 数据安全：** 任何资料目录或 Profile 格式变化不得默认覆盖旧库、自动移动或清空用户文件；数据格式变化的 PR 单独说明新格式与切换方式。
- **NFR-002 诊断与隐私：** 失败诊断有上限且脱敏；不把凭据、完整笔记、环境变量全集写入日志；协议 stdout 只用于协议。
- **NFR-003 预算：** 不提高 `scripts/bundle-budget.json` 阈值换绿灯；确需增长单独记录差异、价值、替代方案与批准。
- **NFR-004 可回滚：** 存储大改与 UI 大改不进同一提交；同一合同的生产者/消费者完整提交，不让中间不一致状态进入 dev。
- **DEC-005（ADR-006）：** `huhu/` 下 HUHU 生成的默认路径为固定英文 kebab-case，单表定义。
- **DEC-006（ADR-007）：** 新 schema 用隔离的新 Bot Profile，旧 Profile 只读保留、不迁移。
- **DEC-007（ADR-008）：** 发布前的旧中文默认目录不检测、不迁移、不读写；旧文件原样保留，由用户自行处理。
- **风险：** macOS 断电模型取决于用户真机验收（A34 可能长期未验收）；包体余量极低，W6 的组件统一可能先撞预算；W5 多项尚未在当前基线复现，根因可能与报告不同。

- **决定状态：** D-001 至 D-016 均已形成决定（LOG-001 至 LOG-018，设计树 consensus）。UI 类 AC（AC-351–353）的设计前置已通过（LOG-016），仅表示合同就绪，不表示生产行为验收完成。

### 未决问题

无。

## UI 设计硬引用

`<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>` revision 2 / digest `566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b`，固定项目 DESIGN-0002（`<Path>{roots.state}/specdev/design/revisions/DESIGN-0002.md</Path>`）与原型 UI-001。UI-GALLERY 对应 AC-351/352/353；UI-LIST 对应 AC-231/241/262；UI-SAFE、UI-BOT 对应 AC-351/352；UI-HOME 对应 AC-211/221；UI-TERMINAL 对应 AC-201/202。共同样式/可访问性验收同时适用于全部页面；精确页级映射见 DESIGN frontmatter。AC-251 的具体页面行为仍依赖 T-18 诊断，不用共享设计替代根因证据。

## 范围与执行修订（LOG-017、LOG-018）

- **OOS-007 Browser 冻结：** ADR-009 与 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>` 的 Browser 全部范围暂停；此前全插件/13 模块表述按此扣除。AC-351–353、AC-901/903 的交付只评价未冻结范围，Browser 部分记“用户暂停、延期重构”，不当成通过、不推动修复。
- **验证接缝：** agent 的 UI required E2E 为 T-23 独立 Chromium 真实组件 runner 与 DOM/合同测试；真实 Obsidian 不由 agent 执行或跟踪。冻结期构建使用 execution-boundaries 的明确序列，禁止默认 build 的 Browser 生成段。
- **原子合同：** ADR-001 的单位是同一集成批次。T-04/T-06 可以分票，最终联合验收前不把不一致中间态提交到 dev。
- **Ready 边界：** T-07/T-18/T-19 的根因与具体修复写集仍需 D；T-37/T-38 等上游产物。38 条 AC 均有负责票，不表示全部票已 Ready 或生产验收通过。
- **发布事实：** DESIGN-0002 的标准 promotion 预检失败，后按已批准的实施前发布指令人工落盘；保留该例外，不称作默认 A 工具成功。本轮仅修订 change 范围与设计合同，不再次发布永久基线。
