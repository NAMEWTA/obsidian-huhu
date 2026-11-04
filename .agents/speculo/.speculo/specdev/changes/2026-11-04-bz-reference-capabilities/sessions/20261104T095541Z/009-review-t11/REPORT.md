# 任务回报

Session: 20261104T095541Z
Task: 009-review-t11
Status: completed

## 聚焦交接

已完成 T-11 的独立双轴审查，两轴均为 request-changes。发现三个可操作问题：跨时区跳日的日期循环不能结束、读取失败与公开拒绝契约不符、实际 bz 改编尚未进入来源登记。亲自运行的既有 navigator/home 回归、两套类型检查、lint 和架构检查均通过；额外反例揭示的问题不被现有测试覆盖。仅写本 REPORT，未修改业务文件、测试文件或正式状态；completed 表示审查报告交回，不表示候选通过。

## 范围、独立性与依据

- Strategy: independent；Risk: medium；Independence: required（当前用户请求与 Goal Plan §4）。
- Reviewer: 承接本冻结 TASK 的当前 Codex 会话，未参与 T-11 的实现、接线或修复；真实派遣身份由 Lead 结合原会话核验，不虚构 session ID。
- Implementers: 004-implement-t11、006-implement-t11-wire 的实现会话，Ticket owner 为 `herdr:impl3`，共享路径 owner 为 Lead `herdr:w3:p1/claude`。
- Mode: working-tree；base/observed HEAD 为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。
- Input-SHA256: `8bbbbe5be0707bab6a4b10f2ad10a9e703e63b70b40fdb2a1155bc41e297eb78`（冻结 TASK 标识）。
- 六个冻结输入：navigator 的 `api.ts`、`module.ts`、`core/diary-volumes.ts`、`core/diary-volumes.test.ts`、`services/periodic-batch.ts`、`services/periodic-batch.dom.test.tsx`。开始、检查后及写报告前逐字节摘要均与 TASK 一致；只读 scope 工具确认两个修改、四个新增，模式均为 `100644`。
- 已跟踪文件按指定 base 的 diff 阅读，四个新增文件完整阅读；其他票和 change 状态工件不属于本次交付快照。`docs/third-party/bz.md` 仅作为必需的来源登记消费者只读核对，不视为本 reviewer 的可写路径。

规范来源沿用并核对本 change 的 Spec §4/§7、AC-401/402、AC-001、ADR-002/003、CONTEXT、Map、Goal Plan、README Execution Context，完整读取当前 Ticket 和两份实现 REPORT。标准来源为 AGENTS.md、dev Skill 及 architecture/testing/licensing/obsidian-api 参考，以及已读且仍适用的 SpecDev reviewer-contracts、risk-review、范围、来源、错误和测试可靠性规则。没有生产 UI 变更，ui Skill 的视觉验收不适用。

影响链已核对：NAVIGATOR_PERIODIC → module 服务对象 → listPeriodicNotes → runtime journal.inspect/preview → 既有周期路径、PreviewStore 与 Vault；旧 home 日历仍消费 NavigatorPeriodic 单篇接口。分卷仅依赖纯日期字符串，实际对照了固定 bz `src/diary/volume.ts`。除本 REPORT 外无预计写入。

## Standards Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 8bbbbe5be0707bab6a4b10f2ad10a9e703e63b70b40fdb2a1155bc41e297eb78

### R1 — major — 跳过的本地日期使倒序循环永不前进

- 位置：`src/modules/navigator/services/periodic-batch.ts:20`（缺失笔记分支在第 24 行直接 continue）。
- 问题与影响：循环假设 `addPeriods(period, date, -1)` 总是得到更早的时间，但真实本地日历不保证这一点。在 `Pacific/Apia`，2011-12-30 被整个跳过；从 2011-12-31 减一天会归一化回 2011-12-31。请求包含该边界时不断检查同一天。没有笔记时循环没有 await，会占住 UI 线程；有笔记时会不断读取并累积同一条目。停用回调也无法打断同步空范围循环。
- 亲自复现：以 `TZ=Pacific/Apia node --input-type=module` 运行内存 esbuild（`write:false`）加载真实 listPeriodicNotes，参数为 day、`new Date(2011,11,29)`、`new Date(2011,11,31)`；source 返回稳定 journal，inspect 返回 missing。在第四次 inspect 人为抛出 `review-stop`，避免审查进程真的挂死。四次 date 均为 `Sat Dec 31 2011 00:00:00 GMT+1400`，未访问 12-29。复现命令退出 0 表示成功观察到该反例，不表示行为正确。
- 最小复现核心：

```ts
const visits: string[] = [];
const journal = {
  root: () => 'Notes/Journal', weekStart: () => 1,
  inspect: (_period: string, date: Date) => {
    visits.push(date.toString());
    if (visits.length === 4) throw new Error('review-stop');
    return { status: 'missing' };
  },
};
await listPeriodicNotes(() => journal as never, 'day',
  new Date(2011, 11, 29), new Date(2011, 11, 31));
```

- 建议修正：使日历游标严格递减并正确跳过不存在的本地日，不能仅依赖一次本地 Date 归一化；至少增加无进展保护以防阻塞。补一个独立 `TZ=Pacific/Apia` 进程的回归，确认跨越该日期的空范围能结束，存在 12-31/12-29 日记时各返回一次且没有重复。
- 依据：新公共批量查询的终止性、SpecDev 无进展与生命周期要求；具体范围没有拒绝此合法日期或时区的约束。

### R2 — minor — 真实读取失败不会按新公开契约拒绝

- 位置：`src/modules/navigator/api.ts:115`，实际调用点 `src/modules/navigator/services/periodic-batch.ts:25`。
- 问题与影响：新接口承诺 `Other read failures reject`，但批量服务复用的 `runtime.journal.preview` 不具备这个保证。`platform/vault-source.ts:17` 捕获 cachedRead 失败并返回 null，PreviewStore 等待其 5000ms 读取期限后返回 undefined，`ui/runtime.ts:285` 的 preview 再把仍存在的文件包装成 existing/summary undefined。列表成功返回，调用方无法按公开契约捕获错误，亦无法区分空摘要和读取失败。
- 亲自复现：使用已有 periodic-batch DOM 测试的真实 fixture、模块与 runtime，只对宿主 cachedRead 注入拒绝。以下探针经 Vitest 项目的内存 transform 加入，磁盘文件未改：

```ts
test('review probe: batch propagates unreadable note failures', async () => {
  const f = await fixture({
    'Notes/Journal/daily/2027/01/2027-01-02.md': 'Existing body',
  });
  vi.spyOn(f.vault.app.vault, 'cachedRead')
    .mockRejectedValue(new Error('review-read-denied'));
  await expect(f.periodic.list('day', new Date(2027, 0, 2),
    new Date(2027, 0, 2))).rejects.toThrow('review-read-denied');
}, 10000);
```

- 结果：在真实读取期限后，断言因 `promise resolved ... instead of rejecting` 失败；收到 path/date 正确、status existing、summary undefined 的数组。不是测试 timeout 或 fixture 初始化失败。探针注册到共享 plugins 数组而形成四份相同内存用例，四份均得到同一行为失败；工具退出码 126。
- 建议修正：让批量读取提供公开承诺的失败传播，或明确采用既有 preview 的尽力读取/超时降级语义并同步 API 契约；若需要消费者识别失败，提供可辨别状态。增加真实 runtime 的拒绝与超时回归，避免只测试一个会抛错的伪 journal。不要通过断言变宽声称已实现拒绝保证。
- 依据：新公共 API 的错误契约、SpecDev 错误不得伪装为成功的规则。本条指出新增接口与既有依赖能力不匹配，不要求顺手重构全部单篇预览。

其余已检查项：api.ts 只新增类型与键类型，module.ts 最小接线，未引入启动 UI 静态边；列表无创建/模板调用；journal 身份及 root/weekStart 的 await 后重验有真实竞态测试；分卷无宿主依赖、不修改输入，月界、跨年、空月份及容量规则与固定 bz 实现一致。

## Specification Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: 8bbbbe5be0707bab6a4b10f2ad10a9e703e63b70b40fdb2a1155bc41e297eb78

- AC-401：一般范围内的真实服务接线、存在/缺失过滤、路径/日期/摘要、倒序、零 Vault 写入和停用/配置变化行为均通过现有集成测试；但 R1 的合法本地日期范围无法返回，不能完整通过该合同。R1 是跨轴适用的同一个 major，不重复计数。
- AC-402：当前分卷、volumeOf 与月份跨度的五项测试通过，已对照上游规则，未发现可操作的行为缺陷。
- IN/OUT：冻结六文件只实现查询与纯分卷，没有 UI、周期身份迁移或 home 修改；module.ts 属于 Lead 的已授权共享接线范围。

### R3 — minor — 已改编分卷缺少要求的实际来源登记

- 位置：`src/modules/navigator/core/diary-volumes.ts:1`；缺失对应条目的消费者位置为 `docs/third-party/bz.md:18` 的逐项登记表。
- 问题与证据：新文件明确改编 bz 固定提交的 src/diary/volume.ts，文件头署名齐全，但当前登记表仍仅含 LICENSE 与四类未采用项，第 5 行仍称尚未复制/改编/复刻功能实现。检索 `src/diary/volume.ts` 和 `diary-volumes.ts` 均无映射。004 REPORT 已给出待 Lead 汇总条目，006 REPORT 也继续保留该待办；候选交回时尚未落实。
- 复现：`rg -n 'src/diary/volume\.ts|diary-volumes\.ts' docs/third-party/bz.md` 无命中；对照该新文件第 1–3 行及 Ticket「执行约束」即可确认。本次写报告前再次检查，两个路径仍未登记。
- 影响与依据：Ticket 明确要求复制/改编时逐文件署名并在 bz.md 追加条目，Map/Spec AC-001 同样要求在实际采用处登记，不能用实现 REPORT 中的未来汇总要求替代。本条不是声称 MIT 全文或版权缺失：许可全文已有保留，缺的是项目要求的实际对应关系和现状说明。
- 建议修正：由拥有文档共享集成权限的 Lead 补充固定 SHA、上游 src/diary/volume.ts、HUHU core/diary-volumes.ts、方式“改编”、容量/只读输入等偏离及实际验证，更新“尚未改编”描述。不要要求本只读 reviewer 或无该写集的实现者越权修改；来源登记补齐前保留待验收。

唯一 findings 总数：major 1、minor 2、blocker 0；标准轴 R1/R2，规范轴 R1/R3。

## 产物与验证

环境：`/home/wta/projects/obsidian-huhu`，dev 当前工作区；未安装或升级依赖。没有运行构建、build:css 或 notices 写入，没有 Git 写操作、推送或发版。

| 命令或检查 | 退出码 | 实际观察 |
|---|---:|---|
| TASK 六文件 `sha256sum`，及写报告前 Python 原字节摘要断言 | 0 | 六文件始终匹配冻结输入 |
| `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4`，对六个输入各传 `--file` | 0 | 范围为指定六文件，包含四个新增文件 |
| `pnpm exec vitest run src/modules/navigator` | 0 | 48 文件、535 测试通过，包含分卷 5 项和批量服务 8 项 |
| `pnpm exec vitest run src/modules/home/platform/calendar/daily-notes.test.ts` | 0 | 1 文件、4 测试通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型通过 |
| `pnpm run lint` | 0 | 零警告通过 |
| `pnpm test:architecture` | 0 | 1287 模块，无分区、宿主包、桌面边界、barrel 或循环违规 |
| `git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 -- src/modules/navigator/api.ts src/modules/navigator/module.ts` | 0 | 已跟踪差异无空白错误 |
| `gh api repos/yeshimei/bz/contents/src/diary/volume.ts?ref=d76a0870329403247917a00c43019e203a2560a4` | 0 | 完整读取并对照固定上游分卷、定位和月份跨度逻辑 |
| `TZ=Pacific/Apia node --input-type=module`，esbuild 内存加载 R1 核心 | 0 | 成功观察四次相同游标；人工第四次抛错止损，证明生产循环不能前进 |
| 首次 `startVitest` 内存 R2 探针（只注册根 plugins） | 126 | 没有注入项目，8 项按筛选跳过；注入次数 0，探针未执行，不计为有效行为证据 |
| 第二次 `startVitest` 内存 R2 探针（注册项目 plugins） | 126 | 有效行为红灯：4 份同一断言均失败，实际成功返回 summary undefined；8 原有项未选中 |

R2 探针通过 Node stdin 调用 `vitest/node.startVitest`，使用 `jiti`（`fsCache:false`）读取现有 vitest.config.ts，只在内存向所选测试追加上述用例，`project:['dom']`、`testNamePattern:'review probe:'`、`run:true`、`watch:false`。没有把临时用例写入仓库，也没有修改生产代码、既有测试或配置。负例不会改变前述原始 535 项回归通过的事实，也不构成整票通过。

既有 YAML 非安全标签/集合键夹具有预期 warning；内存宿主没有 IndexedDB 时走现有缓存回退。未隐藏这些输出。分卷采用来源为实际读取的 [bz 固定 volume.ts](https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/diary/volume.ts)，许可原文沿用此前已核验的 [同提交 LICENSE](https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/LICENSE)。

未验证：真实 Obsidian、UI 与产物/包体集成未执行；本票无 UI，构建和产物由 TASK 指定 Lead 串行处理。不带 skipLibCheck 的既有第三方声明失败不重复运行；没有修改依赖、编译配置、阈值或忽略规则。没有将上述未验证项宣称通过。

## 问题与下一步

Lead 应将 R1/R2 交回实现 owner，在原授权内修复并补行为回归；R3 由拥有来源文档写集的 Lead 集成。修复后重新冻结受影响候选再独立审查；当前报告不改 Ticket/Evidence，不把 request-changes 转成通过。没有审查执行层面的阻塞，报告已完成，业务候选仍待修正与验收。
