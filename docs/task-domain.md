# Task 领域：重构决策与实现

本设计对应 Issue #7。领域名、模块 ID 和目录统一使用单数 `task`。这是替换式重构，不提供旧 Home 任务 API、看板任务格式或任务创建自动化格式的兼容层。代码入口为 `src/modules/task/api.ts`，模块装配为 `src/modules/task/module.ts`。

## 1. 目标与边界

Task 是独立的业务领域，Home 是消费它的展示容器。关闭看板、移除任务小组件、切换看板，不会删除任务、释放 Task 服务或停止仍启用的任务提醒。工作台有独立任务入口，日历、自动化和 AI 工具使用相同的应用服务，不操作看板 DOM、不以 Markdown 行号标识任务。

| 边界 | 拥有的职责 | 不拥有的职责 |
|---|---|---|
| task | 任务、重复系列和发生实例；创建/截止/提醒时间；完成、重开、取消；资源关联；逾期和处理日投影；查询、命令及回执 | 看板网格、通用计划执行器、档案正文、AI 网络传输 |
| home | 看板网格、尺寸、成员及任务视图挂载 | 任务主数据、任务提醒来源、任务仓储生命周期 |
| automations | Cron 计划计算、设备归属、执行/通知与持久投递记录 | 任务完成状态、截止责任、重复发生实例主数据 |
| navigator | 文件夹定位、笔记导航及日历展示 | 任务存放位置策略、任务 CRUD |
| archives | 实体 ID、类型、名称与打开实体的公共能力 | 被关联任务的数据和状态 |
| AI 工具宿主 | 用户身份、授权、审批、传输与调用审计 | 另一套任务状态机或越过 Task 的文件写入 |

记账、习惯、阅读和番茄钟属于后续独立审计对象。本次不改写它们的业务规则。纯展示组件也不必机械地变成一个聚合；领域划分依据数据所有权和业务不变量，不依据组件数量。

## 2. 目录与依赖

```text
src/modules/task/
  api.ts                       公共类型、服务 key 和工具协议
  manifest.ts / module.ts       独立模块注册、启动、释放、公共能力装配
  core/
    model.ts                   Task、TaskSeries、命令、查询、回执、Repository port
    commands.ts                唯一状态转换及幂等命令处理
    time.ts                    日历日期、时区、截止点、逾期和承接日期
    recurrence.ts              稳定 occurrence、有限批次恢复、只读预览
    resources.ts               引用校验、去重、匹配与重命名
    validation.ts              输入校验、格式版本和损坏数据拒绝
    query.ts                   分页、四类状态视图、时间维度及反向关联查询
    calendar.ts                日历展示 DTO，不拥有任务数据
    tool-schema.ts             工具 JSON Schema 与运行时参数检查
  services/
    service.ts                 串行应用命令、快照、恢复及订阅
    calendar.ts                日历适配，写入仍调用 Task 命令
    tools.ts                   带宿主授权检查的结构化工具入口
  platform/
    repository.ts              原子最新字节变换与版本化 JSON 存储
    resources.ts               Obsidian 文件/文件夹及档案能力适配
  contrib/
    widgets.ts                 向 Home 贡献任务视图
    automation-source.ts       Task 自己贡献提醒来源
  ui/                          独立工作台、编辑器、关联选择、紧凑视图
```

`core` 不依赖 React、Obsidian 或 Home。跨模块仅通过 `api.ts` 导入。UI 延迟加载；模块启动不会加载 React 页面。Home 保有非拥有型的日历/视图引用，不能销毁 Task 的服务。原 `HOME_TASKS`、`HOME_CALENDAR` 和 Home 的 `calendar-service.ts` 已移除，不设置转发别名。

## 3. 主数据：可见 JSON 事务库

主数据位于 **`huhu/任务/tasks.json`**，格式版本为 1。使用一个文件原子保存：

```text
TaskState
  version / revision
  tasks[id]       任务及发生实例
  series[id]      重复模板、规则、恢复游标及终止边界
  receipts[id]    命令指纹和已提交回执
  events[]        创建、更新、完成、重开、取消、系列及资源变更历史
```

选择 JSON 而不是“每任务一份 Markdown”是明确的事务取舍：创建系列、生成实例、保存幂等回执和状态变化必须一起提交，不能先创建任务、再写回执而在崩溃重试时重复创建。关联笔记和档案仍然保存在原处；Task 库只保存引用，不复制其正文。

Repository port 要求同步的“读取最新状态 → 变换 → 提交”回调，实际使用已有 `contentFiles(app).process()`，不提供不安全的先读后写回退。每次事务重新解码最新字节；版本未知、JSON 损坏、缺少必要结构、无效时间或身份均拒绝写入。已观察到的库文件被删除后，也不会把它当新空库自动覆盖。无变化事务保留原字节。

**一致性范围**：这是单个 Obsidian Vault/进程中带宿主原子写入的文件事务，不是分布式数据库。多窗口共享串行写入；多个服务实例通过最新字节和 `expectedRevision` 拒绝丢失更新。两台设备离线各改文件再同步，仍需同步层报告/解决文件冲突；不得宣称有跨设备线性一致性。冲突标记或非法合并内容被严格解析拒绝，不能静默重建。

该布局适合个人任务库，代价是查询/保存会处理库内对象，历史和幂等账本不自动清理。超大规模、多写者需求出现时可替换 Repository 实现；不能为了压缩文件删除仍可能重试的幂等回执。当前不引入数据库、网络服务或新依赖。

## 4. 模型与业务不变量

### 4.1 身份与状态

`Task.id` 是稳定身份，`revision` 是乐观并发版本。`TaskSeries.id` 与实例 ID 分离；系列的用户编辑版本与恢复游标分离，正常补齐实例不让用户正在编辑的模板无故发生版本冲突。

任务持久状态只有 `open / completed / cancelled`。`overdue` 为派生性质，不是互斥持久状态。

- 完成：仅允许 open → completed，记录真正的 `completedAt`。
- 重开：completed → open；清除当前完成标记；过去的提醒不会自动重发。
- 取消：保留任务和历史，停止提醒；不物理删除笔记，也不删除关联对象。
- 已取消任务不能被普通修改、重开或重复恢复复活。
- 创建时间及 ID 不可由更新命令改写。
- 更新是完整替换可编辑字段；省略可选的 due/planDate/reminderAt 表示清除它们，关系数组明确传入。

### 4.2 三种时间与附加时间

| 字段 | 含义 | 存储类型 |
|---|---|---|
| createdAt | 这个真实任务实例创建时刻 | UTC 毫秒时间点 |
| due | 事项应完成的日期和可选时刻 | `{date: YYYY-MM-DD, time?: HH:mm}`，配合任务 IANA timezone |
| reminderAt | 独立的提醒触发时刻 | UTC 毫秒时间点，可与 due 不同日 |
| planDate | 用户计划在哪一天处理 | 所属任务时区的日历日期 |
| updatedAt / completedAt | 实际变更/完成时刻 | UTC 毫秒时间点 |
| effectiveDate | 当前应出现在哪个处理日 | 只读派生值，不写回 due |

例如新加坡时区 9/20 10:00 创建，9/30 截止，9/25 09:00 提醒，三个时间分别保存。文件创建时间不进入 Task.createdAt。

日期-only 的截止点为该时区当日 23:59:59.999；指定 HH:mm 时以所选分钟结束为截止点。到达截止点本身未过期，越过才过期。日期与绝对时间点不能混用 UTC 日期截断。DST 不存在的当地时间拒绝；折叠的当地时间选较早的那个瞬间。编辑器中的提醒输入按显示的任务时区解释。

过期天数按当地日历日差计算，不以“毫秒差除以 24 小时”代替。当天晚于指定截止分钟的事项可以已过期但日差为 0；原截止时刻仍可见。

### 4.3 自动顺延是投影，不是改承诺

未完成且超出 due 的事项，在当前处理列表中承接到今天；次日继续派生到新的今天，原 due 不变。用户显式设置了未来 planDate 时尊重该安排，但仍显示逾期责任。无日期、已完成和已取消项不会被判定为“未完成已过期”。

本方案不在午夜批量改写库、不每天复制任务、不产生第二个实例、不以顺延为由重发提醒。用户主动修改 due 是另一条更新命令，变更历史记录前后截止日期。

### 4.4 分类与查询

“全部”包含已完成和未完成；“未完成”包含已逾期；“已完成”查看完成时间；“已过期”仅为未完成且已超过 due 的集合。取消默认不进入普通列表，可通过 `includeCancelled` 查询审计记录。

查询可指定文本、时间维度、日期范围、升降序、资源关联以及 offset/limit。每页最多 500 项。计数在相同文本/日期/关联条件下计算，不被当前状态按钮截断。创建、提醒、完成排序使用绝对时间点；截止与处理日期按业务日历日期排序。未设定所选时间的项放在末尾。

## 5. 重复任务和提醒

Task 通过 Automations 的公开计划计算接口验证 Cron 与计算下一发生时间；Task 自己拥有系列模板、发生实例、完成状态、结束边界及恢复游标。默认时间型规则由编辑器转换为每天、工作日、每周、每月、每年或自定义 Cron。

发生实例 ID 由系列 ID 与 occurrence 时间点确定。周期创建只复制模板的可编辑字段，不能复制另一实例的完成状态或临时修改。每个实例拥有真实 createdAt。只读未来预览使用 `virtual` 标识及 `seriesRevision`，createdAt=0 仅为预览 DTO 占位，不能显示为真实创建时间。

恢复每事务最多生成 200 个发生实例，并保存游标；保留错过的实例及最近将来实例。提醒提前跨度较长时，还会生成提醒已到期的后续实例，避免最近将来事项挡住下一提醒。恢复重试不会生成重复 ID，取消的实例也不会复活。一个手工实例化的远期事项不会阻止较近的事项补齐。

未来预览默认不写入。用户明确编辑/完成/取消预览时，先执行 `materialize`：验证该时间确实属于当前系列、核对模板版本，持久化唯一实例，然后走普通任务命令。“仅本次”只修改此实例；“本次及以后”在同一事务中截断原系列、取消未完成的后续实例、创建新系列/任务，并保留已完成历史。

提醒来源为 `source.kind='task'`，由 Task 模块贡献，不由 Home 汇总。提醒身份包含 task ID 和明确 reminderAt，不包含当天承接日；修改任务标题不导致新的提醒投递身份。投递前重新检查任务是否仍开放和提醒是否仍有效。完成、取消和清除提醒会停止后续投递。离线恢复沿用 Automations 的投递账本和宽限语义，超过原事项截止后不再发送过时提醒。

创建任务的自动化动作使用新契约：`text/timezone/date?/time?/reminderAt?`，不接受 board path、cardId 或 calendar target。执行先持久化本次投递冻结的任务草稿和 commandId，再调用 Task；副作用成功但后续回执记录失败时，重试使用相同 commandId 返回已提交回执。自动化运行日与实际创建日分别保留。

**运行限制**：Obsidian 完全关闭时，本插件不会成为系统后台服务。重新打开后按有限批次恢复；提醒和重复计划需要 Automations 可用。Task 模块中的 30 秒心跳及窗口恢复焦点只负责刷新派生视图与恢复，实际通知仍经 Automations。

## 6. 资源关联

引用为 `{kind:'file'|'folder', path}` 或 `{kind:'archive', id}`。文件、文件夹使用规范化 Vault 相对路径；拒绝绝对路径、隐藏目录、遍历路径、控制字符和非法路径。档案使用稳定 ID，不限定 person/company，也不复制档案字段。

关联集合去重，每任务最多 100 个。选择器支持名称/路径搜索，并显示可用、对象缺失或提供模块不可用。文件/文件夹重命名时同步变换任务及系列模板引用；档案 ID 不随路径或显示名称改变。关联对象删除不删除任务，不会自动创建替代对象。

反向查询示例：`query({related:{kind:'archive',id:'…'}})`；文件夹 `recursive:true` 可匹配后代文件引用，默认仅匹配直接关联。该能力已是公共查询，不要求 Archives 再维护一份待办列表。档案详情页嵌入任务视图可以作为后续展示集成，不是本次重建实体系统。

## 7. 公共接口与 AI 工具

### 7.1 服务

- `TASKS`：命令、query/get/getSeries/history/preview、只读快照、订阅及恢复。
- `TASK_CALENDAR`：现有日期网格需要的投影；操作由稳定 Task ID 转换为领域命令。
- `TASK_RESOURCES`：搜索、解析及打开关联资源，只返回资源元数据，不读取关联文件正文。
- `TASK_VIEWS`：独立页面、编辑器与紧凑视图挂载，供其他模块消费。
- `TASK_TOOLS`：版本 1 的 JSON Schema 工具集合。

```ts
import { TASKS, TASK_TOOLS } from '../task/api';

const tasks = context.services.peek(TASKS);
if (!tasks) throw new Error('Task module unavailable');
const created = await tasks.execute({
  kind: 'create',
  commandId: crypto.randomUUID(), // 重试必须保留这个 ID 和同一 payload
  draft: {
    title: '提交项目报告', description: '', timezone: 'Asia/Singapore',
    due: { date: '2026-09-30' },
    reminderAt: Date.parse('2026-09-25T09:00:00+08:00'),
    relations: [{ kind: 'file', path: '项目/报告.md' }],
  },
});
if (!created.ok) throw new Error(created.error.code);
const current = tasks.get(created.receipt.taskId!);
if (!current) throw new Error('Task not found');
await tasks.execute({ kind: 'complete', commandId: crypto.randomUUID(),
  id: current.id, expectedRevision: current.revision });

// tools 的 grants 由可信宿主提供，不允许模型自行填写授权。
const tools = context.services.peek(TASK_TOOLS);
const definitions = tools?.list();
const overdue = await tools?.call('task.list', { filter: 'overdue', limit: 50 },
  { grants: ['task:read'] });
```

### 7.2 工具目录

| 工具 | 能力 |
|---|---|
| task.list / task.get | 分页查询或读取稳定 ID 的任务 |
| task.history | 有上限的任务/系列历史 |
| task.preview | 有上限、无写入的未来重复实例投影 |
| task.resources.search / task.resources.resolve | 搜索引用目标、检查目标状态 |
| task.create / task.update | 创建或替换可编辑字段 |
| task.complete / task.reopen / task.cancel | 同一领域状态机的任务操作 |
| task.series.get / task.series.update / task.series.cancel | 读取系列、变更或取消本次及以后 |
| task.occurrence.materialize | 明确持久化一个有效未来发生实例 |

工具声明输入 Schema、输出封套 Schema、只读/破坏性/幂等注解。运行时拒绝未知工具、未知字段、类型错误、过大分页、缺少授权或已取消调用。写工具需要 `task:write`，读工具需要 `task:read`；写请求需要 commandId，已有记录/系列的变化需要 expectedRevision。冲突返回 currentRevision，不静默覆盖。

回执在同一事务中记录 payload 指纹。相同 ID/相同内容可重放；相同 ID/不同内容返回 idempotency-conflict。所有 UI、工具和自动化都调用相同 reducer。

**本次提供进程内能力，不启动 HTTP/MCP 监听端口，也不假装所有 AI 提供方已经接入。** 将这些工具暴露给某个 Agent 时，宿主仍必须负责身份、授权范围、审批、日志和传输。工具注解不是授权措施；关联路径也不是可执行命令。

### 7.3 异步边界与参数所有权

公共服务接收的是调用时的数据，而不是调用方随后可继续修改的对象。`execute(command)` 在返回 Promise、进入串行队列之前同步深复制命令；目标 ID、commandId、expectedRevision、字段和嵌套关联从此使用同一份领域持有的副本。校验、幂等指纹和事务消费此副本。调用方可以继续编辑自己的草稿，但不能借此改变已提交请求；重新提交修改后的内容必须使用新的 commandId。

无法复制的数据返回结构化 `invalid-input`，不写盘、不把仓库标成损坏，也不阻塞下一条有效命令。工具入口同样先获取独立参数副本，再校验和传给服务或异步资源适配器。这里的数据复制是所有权边界，不是用来隔离恶意进程内 JavaScript 的沙箱。

命令数据与取消信号必须区别处理：数据被复制，可信宿主传入的 `AbortSignal` 保持实时。排队后取消仍可阻止尚未提交的写入；事务已经提交后，必须返回真实成功回执，不能因稍后的卸载伪报写入失败。调用方发生超时或连接中断时仍应使用相同 commandId 和原始 payload 查询或重试，不假设取消已经回滚提交。

资源查询在异步适配器返回后重新检查取消信号及 Task 的 ready 状态。模块已关闭或仓库进入 error 时，迟到的资源结果返回 `unavailable`；已取消调用返回 `cancelled`。该读路径检查不附加在已提交写命令之后，不改变写入提交点。

回归测试位于 `src/modules/task/services/boundary.test.ts`，覆盖调用后修改创建/更新参数、幂等重放、无法复制的输入、AI 写入参数、异步资源参数、关闭/错误状态的迟到结果和实时取消。真实宿主验收范围仍按第 10 节执行。

## 8. 独立界面与看板

完整工作台提供四类筛选、文本搜索、时间维度、时间区间、排序与分页；列表分别显示截止、提醒、创建和完成信息，过期行显示原截止与当前承接日。编辑器支持多资源、独立提醒、重复规则、本次/以后、历史、冲突反馈和取消确认。失败时保留草稿，模块关闭后拒绝迟到提交。

紧凑视图共享同一服务，只减少呈现；通过 Home 贡献点挂载，不创建独立任务库。新看板默认引用 `provider:'task', kind:'tasks'`，不再内嵌示例 Task 数据。现有 Home 的普通 Markdown 复选框解析属于笔记/卡片展示，不是新的 Task 领域数据源。

## 9. 破坏性变更与交付顺序

不扫描/导入旧 `huhu/待办/待办.md`、日记中的复选框或看板任务卡；不提供原 Home API/存储设置的代理或自动迁移。旧原始文件保持原样，重构不会替用户删除它们。旧任务自动化的路径/cardId 字段必须改成新契约。历史回执中的旧文件定位不再作为 Task API。

实现顺序为：领域模型及事务仓储 → 独立生命周期/公共契约 → 完整 UI 与紧凑视图 → 日历/Navigator/Automations 接入 → 结构化工具与验证 → 文档/构建产物与 PR。

## 10. 验证与真实宿主边界

`pnpm test:task` 覆盖时间、逾期、四种分类、幂等重试、并发冲突、损坏/丢失文件、重复恢复/长提前提醒、未来实例、权限及 UI 草稿/确认。模块测试验证不激活 Home/Navigator/Automations 也可进行任务 CRUD；自动化集成测试验证冻结投递与失败重试。

另执行 production/test TypeScript、架构边界、国际化、UI 适配、全仓自动化测试及构建产物检查。实际结果以 PR 验证记录为准，不把计划中的检查写成已通过。

自动化 DOM/Vault 模拟不等于真实 Obsidian、移动端、系统通知或两设备同步验收。发布前还应在真实宿主检查：禁用 Home、弹出窗口操作、插件热关闭、离线跨日、移动端布局、编辑器同时打开任务 JSON、同步冲突和系统通知权限。代码不承诺 Obsidian 关闭期间实时发送提醒。
