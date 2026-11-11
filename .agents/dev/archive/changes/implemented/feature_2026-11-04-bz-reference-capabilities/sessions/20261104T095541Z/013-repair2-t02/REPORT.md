# 任务回报

Session: 20261104T095541Z
Task: 013-repair2-t02
Status: completed

## 聚焦交接

已按 012-rereview-t02 的 R1 修正来源去重覆盖其他操作状态的问题，并自查同类交错与到期路径。先补 31 项新用例，在旧实现观察到 17 项行为断言失败；修正后 shared 共 53 项全部通过，组合回归为 101 项单测及 7 项 DOM 测试通过。生产/测试类型检查、架构、i18n、全仓零警告 lint 均通过。本轮只修改 shared 运行时及其测试，completed 仅表示候选交回；独立复审、正式 Evidence、Ticket 状态和最终验收仍归 Lead。

## 产物与验证

### 本轮全部修改文件

- `src/shared/feedback/index.ts`：复用来源匹配前检查现有展示项仍是可合并的普通提示；提示进入进度、终态或错误级别时，解除指向该展示 ID 的旧去重关联。
- `src/shared/feedback/feedback.test.ts`：保留既有 22 项测试的完整字节，追加 31 项反例与交错回归。
- 本任务 `REPORT.md`：一次写入的修复回执。

未修改 TASK、既有实现/修复/审查 REPORT、Ticket/Map/Goal、正式 Evidence、host、app、两个消费者、词典、构建产物或只读 sonner 文件。没有安装依赖、Git 写操作、提交、推送或发版。工作区复用 current `/home/wta/projects/obsidian-huhu`、dev，基线沿用 `29644dc5833bb209e6282f84fa71441a5a1b99d4`；其他执行者的修改保持原样。

### R1 → 测试 → 修正

R1 原始顺序为 A 普通提示 → A 进度 → B 同来源普通提示。旧实现虽然检查了新输入，却通过旧 recent 记录直接复用已升级成进度的活动 ID，导致 A 的进度被 B 覆盖并安装普通提示计时器。

新增测试都位于 `src/shared/feedback/feedback.test.ts`：

| 测试 | 数量 | 覆盖与观察 |
|---|---:|---|
| `a later source hint cannot replace another operation progress or expire its display`（`:186`） | 1 | 精确复现 R1；A 原 ID、确定进度和 durationMs=0 保留，B 独立显示；触发 B 的计时回调只清除 B，A 最终结果仍替换 A 原 ID。 |
| `interleaved source operations retain unique progress and results: %s`（`:213`） | 20 | 穷举 A/B 各自 start→progress→result 保持顺序时的全部 20 种交错；每次发布后检查所有已开始的进度/终态保持自己的 ID、内容、常驻语义与唯一性；最后同时保留 A success 和 B failed。 |
| `a source hint cannot merge into another operation %s display`（`:243`） | 7 | 旧项分别为不确定进度、错误级别、success/partial/failed/cancelled/locked 时，新操作普通提示既不能覆盖旧项，也不能被旧项终态锁吞掉。 |
| `expired %s status leaves no source hint that suppresses a later operation`（`:259`） | 3 | 旧普通提示升级为 error/success/failed，展示到期后仍在默认去重窗内；旧关联不得压掉另一操作的首次普通提示。 |

实际修正位置：

- `src/shared/feedback/index.ts:89`：取得匹配活动并在复用前核验其当前状态；只有无 progress、无 outcome、非 error 级别的普通展示项可作为 sharedId。保留已修复的 ownedId 归属检查，进度/终态不会继承其他操作的展示身份。
- `src/shared/feedback/index.ts:109`：当展示升级为进度、终态或错误时，移除仍指向该 ID 的旧去重记录，再登记当前状态自己的记录。这样不仅避免覆盖活动进度，也避免升级项消失后留下错误的来源抑制窗口。
- 原有普通提示合并、作用域和时间窗策略继续保留；没有关闭来源去重或提高 256 条近期记录上限。终态历史、真实提交回执、隐私处理和 target close/dispose 均未改写。

### 红 → 绿证据

在新增测试后、修改生产实现前，实际执行：

`pnpm exec vitest run src/shared/feedback -t 'source hint|interleaved source'`

终端退出码 **126**；选中的 31 项新用例中 **17 项失败、14 项通过**，其余 22 项既有测试未被本次 `-t` 选择。失败来自实际行为断言：原始 R1 活动数只有 1；6 种交错中另一操作的 start 覆盖已存在 progress；7 类非普通展示被覆盖或吞掉新提示；3 类到期旧关联导致新操作活动列表为空。没有编译或夹具初始化失败。

修正后执行完整 `pnpm exec vitest run src/shared/feedback`，退出码 **0**，53 项全部通过；不再使用筛选。既有 22 项测试完整前缀的 SHA-256 仍为 `b61a484e9e69c471f7cc82c0b2aecf00c85435ac0ef6cc2a06b4561cb6be55b6`，没有删除、跳过或弱化既有断言。

### 最终实际命令与退出码

| 命令 | 退出码 | 结果 |
|---|---:|---|
| `pnpm exec vitest run src/shared/feedback` | 0 | 1 file / 53 tests 通过，包含原 22 项和新 31 项。 |
| `pnpm exec vitest run src/shared/feedback src/modules/safe/services/safe-service.test.ts` | 0 | 2 files / 101 tests 通过：shared 53 + safe service 48。 |
| `pnpm exec vitest run --project dom src/host/obsidian/feedback.dom.test.tsx src/modules/safe/services/feedback.dom.test.tsx src/modules/archives/ui/generic/feedback.dom.test.tsx` | 0 | 3 files / 7 tests 通过；真实 sonner 双 Document、窗口/加载清理、F4 切换及 notifications 禁用后的两条真实消费者路径。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型检查通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型检查通过。 |
| `pnpm test:architecture` | 0 | 1287 modules，无分区、宿主依赖、桌面、桶文件或循环违规。 |
| `pnpm test:i18n` | 0 | 32 dictionaries / 5293 keys，通过。 |
| `pnpm run lint` | 0 | 全仓零警告。 |
| `git diff --check -- src/shared/feedback` | 0 | 无空白差错；新增文件内容另由类型、lint、测试与人工核对覆盖。 |
| Python stdin：SHA-256 比对原候选其余 9 文件和原 22 项测试完整前缀 | 0 | 全部匹配上一轮已复审快照，确认既有通过实现与断言未被修改。 |
| `sha256sum src/shared/feedback/index.ts src/shared/feedback/feedback.test.ts` | 0 | 交回快照见下表。 |

本轮没有额外失败门禁；唯一非零检查为上文主动观察 R1 的回归红灯。类型检查按 TASK 指定使用 skipLibCheck，没有改动 tsconfig 或第三方声明。

### AC 与已通过行为的保全

- AC-101：原 100 次进度/同实例结果、F1 两操作独立结果、F4 单展示端测试保持通过；新增精确 R1、20 种有序交错及定时回调覆盖。
- AC-102：原 committed 回执时序、F2 首次转换、F3 终态不可复活测试全部执行并通过，未改变其实现合同。
- AC-103/104：host、app 与两业务消费者实现/测试未改，重新执行双 Document、关闭窗口、迟到 mount、加载失败回退、sonner→Notice 和禁用通知后的真实错误反馈测试，全部通过。
- AC-105：隐私转换未改，shared 哨兵和两个消费者敏感原文检查随上述套件通过。
- 原候选其余 9 文件为 policy.ts、host 两文件、app/main.ts、safe service/测试、RecordEditor、archives 消费者测试及 i18n；逐文件摘要均与上一轮复审快照一致。本轮没有触及持久化、密码学、文案、样式或模块生命周期装配。

### 项目 Skill Execution Records

实际回读并应用 SpecDev I、implementation-procedure、execution-preflight 和 dev Skill；继续使用同会话已读且适用的范围、状态/错误、TDD 和测试可靠性合同。

1. dev 规则 2、8：修正完全留在 shared 纯逻辑与就近测试，没有新增导入、宿主包、DOM、Node/Electron 或模块互访，架构门禁通过。
2. dev 规则 3：不修改启动装配或动态 UI 导入；app/main.ts 与上一轮快照一致，没有引入同步 UI 依赖。
3. dev 规则 4：保持既有 target close/dispose 与终态清理；新增定时回调验证一个普通提示到期不能清除另一操作的常驻进度，原清理回归继续通过。
4. dev 规则 6：不动数据路径、密文、档案命令或数据格式；safe 48 项服务测试及真实档案消费者回归通过。
5. dev 规则 7：没有新增用户文案，继续复用原 t/词典；词典未改且 i18n 门禁通过。
6. dev 规则 9：全仓 lint 零警告，未关闭规则或增加例外。
7. dev 规则 11 与 testing 选择表：只修 R1 及同类交错，先红后绿；保留全部原测试/阈值，验证最近接口与真实消费者；不改 TASK/正式状态/他人文件、不安装依赖、不运行禁用构建或 Git 写操作。

保留原 index.ts 的 bz 仓库、固定提交 d76a0870329403247917a00c43019e203a2560a4、原路径、MIT、原版权与修改说明。本轮根据本地审查修正自身操作隔离，没有新增外部复制、依赖或上游版本；继续沿用先前已核验的来源：https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/notice.ts 。既有 bz 登记由 Lead 管理，本轮未写 docs。

### 候选快照

```text
74676661c0bf539b8f4dd063696d48746d94ac29de3230bd32c7e72f6a1aa75f  src/shared/feedback/index.ts
bba4b656136d26714a5a3c7b9a7bcef27e9fefbcee66494cc776d3cbb56c7c49  src/shared/feedback/feedback.test.ts
```

### 未执行 / 未验证

- `pnpm run build`、`pnpm run build:css`、`pnpm notices`：未执行，owner Lead，TASK 禁止执行者改写共享产物。
- `pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。
- 双轴独立复审、正式 Evidence、Ticket 状态和最终验收：未执行，owner Lead / 独立 reviewer。
- 真实 Obsidian、原生 Notice/窗口动画、桌面剪贴板：仍待宿主验收，DOM 与端口测试不替代真机结果。
- 未运行全仓 pnpm test 或未触及的全量档案格式/保险箱套件；实际验证范围见命令表。

## 问题与下一步

无实现阻塞。R1 原始反例及同类状态/到期交错均已有回归与修正候选；保留原 F1–F4 的全部回归。请 Lead 冻结新快照，安排独立双轴复审并执行共享构建与最终验收。本报告不宣称 Ticket done，也不代替 reviewer 的通过判定。
