# 任务回报

Session: 20261104T095541Z
Task: 026-implement-t04
Status: blocked

## 聚焦交接

文件变化适配器、每插件实例装配、archives 首个订阅与 repository 主动失效候选已实现。最终 75 项相关测试、生产/测试类型检查、全仓 lint、架构门禁和工作台生命周期脚本均通过。规模脚本在 first.isComplete 应为 true 的断言失败；仅将 runtime 替换为未修改 HEAD 版本的内存对照也在同一断言失败，因此没有证据将它归因于本次增量，但规模验收仍未闭合。按 blocked 交回候选，不宣称 T-04 done；Lead 需接收后安排独立双轴审查、调查规模基线并重验，同时维护正式 Evidence 与状态。

## 产物与验证

### 全部修改/新增文件

1. 新增 `src/host/obsidian/file-changes.ts`：FILE_CHANGES 类型键、路径快照、独立 raw/metadata 事件、文件/目录 rename、有限批次队列与溢出 rescan、计时与监听清理、部分挂载失败清理。
2. 新增 `src/host/obsidian/file-changes.test.ts`：5 项适配器公共行为测试。
3. 新增 `src/modules/archives/services/generic/file-changes.ts`：context.events 到真实 ArchiveRuntime 的消费绑定、repository 提交失效发布、隐藏草稿 store 的提交后失效装饰器。
4. 新增 `src/modules/archives/services/generic/file-changes.test.ts`：10 项服务、时序、提交与完整适配链路测试。
5. 修改 `src/modules/archives/services/generic/runtime.ts`：提交监听与清理、受 active 保护的 rescan 入口；沿用现有 epoch/version 读保护，异步事件错误只对当前 epoch 报告。
6. 修改 `src/modules/archives/module.ts`：移除本模块四个直接 vault.on 监听，改为 bindArchiveFileChanges(runtime, context.events, context.lifetime)；隐藏草稿 store 包裹提交后失效；其他装配语义保持。
7. 修改 `src/app/main.ts`：每实例创建 FileChanges，register 处理回滚，onunload 先停适配器再停事件端口。
8. 新增本 REPORT，按 Return 一次性写入并回读。

未修改 TASK、正式 Evidence、Ticket/Map/Goal/README、其他模块监听、api.ts、contracts、持久化格式、依赖或生成产物；无 Git 写操作、安装/升级、提交、推送或发布。其他并行 dirty 内容原样保留。

### 依据、工作区与边界

工作区 `/home/wta/projects/obsidian-huhu`，dev，base/HEAD `29644dc5833bb209e6282f84fa71441a5a1b99d4`，引用 README execution-context。Map 已核对至 revision 5，T-04 仍依赖 T-02/T-03；实际读取两票 Evidence 的 passed 结果与当前 T-04 Ticket。当前 Spec/ADR/CONTEXT/Goal 的相关事件、数据与 OOS-008 约束沿用本会话既读内容，未重选架构；Work、预检、TDD/错误/可靠测试/注释与 dev 的未变化合同复用，本次完整读取 dev Skill 并检查命中规则。

先沿 main → host adapter → T-03 端口 → archives/module → generic/runtime → files port/index/command receipt 检查真实调用链，读取已有 runtime/application 测试、MemoryArchiveFiles、vaultContactsFiles、archiveDraftStore。适配器和测试、服务和测试、runtime、archives/module、main 是实施前列明并获授权的最小写集。共享文件编辑前原件保存在本地 /tmp/huhu-t04-baseline-99olazzk/main.ts 与 archives-module.ts，不纳入仓库；main 相对该基线仅新增适配器导入、字段、创建/register 与 unload 释放。

### 关键决定与运行语义

- FILE_CHANGES 是 host 所拥有的类型键；只含路径、oldPath、文件/目录标志和变化类型，无正文/账号/异常原文。每插件独立适配器，经该实例的 T-03 端口发布，不新增全局订阅表。
- create/modify/delete/rename 不过滤文件后缀；支持目录，rename 捕获当时的 oldPath/newPath，并保留 md↔txt、移入/移出与依赖附件变化。metadataCache.changed 独立标为 metadata，不把 raw modify 冒充 metadata 就绪。
- 按 kind/path/oldPath 合并，重复记录移到最后保持最后发生顺序；delete/create 不互相吞掉。默认 trailing debounce 40 ms，最大等待 200 ms，容量 2048；持续 modify 也会在最大等待内发布。超限清空细节并保持 rescan=true，后续直到 flush 不再增长，避免发布不完整的局部真相。
- archives 通过 context.events.on(...,{lifetime:context.lifetime}) 订阅。rename 先失效旧范围，再按当前文件集读取新范围；目录 invalidate 先移除陈旧范围再发现当前文件；overflow rescan 调用 runtime 的受生命周期保护的 reload。
- archives 原有解析直接读原文并验证 epoch/version，不依赖 metadataCache 的 frontmatter；因此 modify 先于 metadata.changed 时仍读取最新原文，而不是等待可能永不到达的 metadata 回调。metadata 事件提供另一轮失效提示。
- runtime 保留旧 epoch 结果不得 apply 的保障，补充当前 epoch 才能报告 flush 错误；测试实际制造旧读跨 dispose/rescan 晚到，不回写新状态、不向新代报告旧错。
- 可见 repository 在 finishWrite 验证真实文件内容并 apply 后发布路径失效；失败或冲突不发布。私有草稿 adapter 无 Vault 事件，装饰器在底层 write/remove 确认后发布 `.huhu/archives/drafts` 逻辑目录失效；写入失败、取消后晚到提交不发布，不泄露 draft 内容。
- dispose 停止排队、清 timer、移除属于 vault/metadata 的各自引用。逐个注册后立即登记清理，构造中后续注册失败也释放已经取得的 listener。main 的退出顺序先关闭适配器，防止向已关闭端口追加工作。
- 启动与索引读取仍沿既有只读流程，没有写笔记、改目录、迁移 data 或变更档案命令预期哈希协议。其他模块的 Vault 监听未迁移。

### 来源与 Lead 待汇总条目

只读实际读取固定上游：
https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/obsidian-adapter.ts

通过 `gh api 'repos/yeshimei/bz/contents/src/core/obsidian-adapter.ts?ref=d76a0870329403247917a00c43019e203a2560a4' --jq .content | base64 --decode` 读取。继承既有批准来源，不新增依赖或从零重选方案。

请 Lead 汇总到本票只读的 bz.md：

| 固定 SHA / 上游 | HUHU 落点 | 方式 | 偏离原因/适配 | 验证 |
|---|---|---|---|---|
| d76a0870329403247917a00c43019e203a2560a4 / src/core/obsidian-adapter.ts | src/host/obsidian/file-changes.ts；main.ts 装配；archives/services/generic/file-changes.ts 消费 | 改编 | 继承原文件变化与 metadata.changed 分离、捕获 rename 新旧路径、按来源解绑；改为实例化类型事件端口，保留所有文件与目录，增加有界合并/最大等待/溢出重扫、生命周期与失败清理；不迁入 bz 域分类或全局单例 | host 5、services 10；完整相关 75 项通过，双 tsc/lint/架构通过，规模待验收 |

改编实现文件 `src/host/obsidian/file-changes.ts` 文件头已保留仓库、完整固定 SHA、原路径、MIT、`Copyright (c) 2026 叫我包仔` 及修改说明。其他新服务/测试为 HUHU 接口适配与自行编写的测试，没有复制上游测试。未越界修改 NOTICE 或 bz.md。

### AC 覆盖与 TDD 事实

| 合同 | 实际接缝与观察 |
|---|---|
| AC-121 | host 新旧路径/目录/md→txt 捕获；service 目录移动、移出根、md→txt→md；完整 Vault→FileChanges→DomainEvents→ArchiveRuntime 索引链路通过 |
| AC-122 | raw modify 和 metadata 分离；原文已更新而 cachedRead 仍旧，真实 runtime 索引仍得到 Current raw；metadata 晚到不回退 |
| AC-123 | modify 风暴最多等待 100 ms 的定向配置，合并为一条；delete/create 顺序；1000 个路径超容量只发 rescan；真实 rescan 发现最终路径；目录 invalidate 清理陈旧条目 |
| AC-124 | host dispose 后两事件源 listener 数归零、计时器归零、flush 无回调；部分挂载失败清理；runtime 旧读跨 dispose/rescan 不能 apply 或报告旧错；main/T-03 装配与工作台生命周期回归通过 |

实际 red/green：

- host 首次空接缝：`pnpm exec vitest run src/host/obsidian/file-changes` 退出 126，预期四条原始/metadata/rename 记录而实际无批次；实现后退出 0。
- archives 首次空消费接缝：`pnpm exec vitest run src/modules/archives/services/generic/file-changes.test.ts` 退出 126，目录移动后索引仍是旧路径；接入后退出 0。
- 部分挂载失败：host 同命令退出 126，已取得的 listener 数 1，应为 0；逐个登记与失败释放后通过。
- rescan 代际：services 同命令退出 126，旧读虽不回写但仍报告一次 unavailable；加 epoch 报告守卫后通过。
- 目录 invalidate：services 同命令退出 126，已不存在实体仍在索引；失效旧范围后重新发现文件集，随后通过。
- 开发期间有一次新测试把 EntityRecord 的名称断言误写为不存在的 name 字段，修正为 values.name；不计为生产缺陷 red。初次双 tsc 的本票 TS2769（Vault overload 的联合事件名）与 TS7030（callback return）已修正，最终均为 0。

没有删弱旧测试、提高阈值或永久跳过。乱序/晚到测试使用明确的 deferred/barrier；adapter 时钟使用可控 timers，不依赖随机 sleep。

### 实际命令与退出码

| 命令 | 退出码 | 结果 |
|---|---|---|
| `pnpm exec vitest run src/host/obsidian/file-changes src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 最终 13 文件、75/75 通过；含 host 5、services 10、黄金样本、main/反馈回归 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 最终生产类型通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 最终测试类型通过 |
| `pnpm test:architecture` | 0 | 1299 模块，无分区/宿主包/桌面边界/桶导入/循环违规 |
| `pnpm run lint` | 0 | 最终全仓零警告通过 |
| `pnpm exec eslint src/host/obsidian/file-changes.ts src/modules/archives/services/generic/file-changes.ts src/modules/archives/services/generic/runtime.ts src/modules/archives/module.ts src/app/main.ts --max-warnings 0` | 0 | 定向生产文件通过 |
| `git diff --check` | 0 | 已跟踪工作区空白检查通过；不把他人内容计入本票 |
| 对 4 个新增文件分别执行 `git diff --no-index --check /dev/null <file>` | 全为 0 | 新增源码与测试空白检查通过 |
| `sha256sum` 下列 7 个交付文件 | 0 | 候选摘要如下 |

Ticket 的 lifecycle/scale 两个 pnpm 脚本都默认写 scripts/tmp，超出本任务仓库写集；本次按同一入口源码和原参数，仅将临时 outfile 改到 /tmp 后真实运行，未修改 package.json/脚本或弱化断言：

| 等价命令 | 退出码 | 结果 |
|---|---|---|
| `pnpm exec esbuild scripts/verify-workbench-lifecycle.ts --bundle --platform=node --format=cjs --outfile=/tmp/huhu-t04-checks-yk2k94c2/lifecycle.cjs --log-level=warning` | 0 | 临时编译成功 |
| `node --test /tmp/huhu-t04-checks-yk2k94c2/lifecycle.cjs` | 0 | 10/10 生命周期场景通过；等价 test:workbench-lifecycle 的实际入口 |
| `pnpm exec esbuild scripts/accept-archives-v2-scale.ts --bundle --platform=node --format=cjs --outfile=/tmp/huhu-t04-checks-yk2k94c2/scale.cjs --alias:obsidian=./scripts/obsidian-stub.ts --log-level=warning` | 0 | 临时编译成功 |
| `node --expose-gc /tmp/huhu-t04-checks-yk2k94c2/scale.cjs` | 126 | 规模脚本完整性断言失败，未获得完整规模数据 |
| `node --input-type=module` 内存基线实验（下述） | 外层 0；基线子进程 1 | 成功确认 HEAD runtime 对照也在同一断言失败；外层 0 表示对照实验成功，不代表规模验收通过 |

### 规模阻塞的精确事实

候选 bundle 的 main 位置约 11416 行，对应脚本 `assert.equal(first.isComplete, true)`；first.total 的前一条断言已通过，但完整性返回 false。输出为 `AssertionError [ERR_ASSERTION]: false !== true`，因此没有宣布 1000/5000 实体与关系规模数据通过。

为判断是否由本票引入，仅通过只读 `git show HEAD:src/modules/archives/services/generic/runtime.ts` 获取未修改 runtime；esbuild onLoad 插件只在内存替换该文件，其余当前输入保持相同；编译临时基线 /tmp/huhu-t04-checks-yk2k94c2/scale-baseline.cjs，使用实际 process.execPath --expose-gc 运行。基线也在 first.isComplete 的同一断言失败（bundle 约 11399 行），子进程退出 1。本实验没有 restore/reset/checkout 源码，没有编辑或跳过脚本断言。

这个对照证明相同完整性失败在未修改 runtime 下也存在，不证明所有性能维度无退化，也不替代通过的规模验收。根因尚未确认，需要 Lead 安排调查现有样本/索引完整性状态并复验；不建议删除或放宽断言。

### dev Skill 的实际应用

1. 规则 2：协议适配在 host，业务绑定在 archives/services，模块装配只调用本模块服务；未从其他模块内部导入，真实 architecture 通过。
2. 规则 3：main 仅新增纯 host 事件适配器，不静态引入模块实现或 UI；预算/构建归 Lead。
3. 规则 4 与 Obsidian 生命周期参考：每插件管理一个 adapter；register 与 unload 幂等释放；订阅绑定模块 lifetime；读 epoch/version 与 late-read/partial-bind 测试覆盖关闭、重扫与失败。
4. 规则 6：档案仍经 vaultContactsFiles 与原命令写入，隐藏草稿沿原 repository，仅追加成功回执失效；没有迁移目录、变更格式或恢复协议，黄金样本通过。
5. 规则 8：宿主 event/timer API 仅在 host/app；测试 fake timers/IO 在边界，shared/core 未引入宿主包。
6. 规则 9：修复实际类型错误并执行全仓 lint 零警告，没有关规则、改 ignore、--fix 他人文件或提高阈值。
7. 规则 10/licensing：固定 MIT 原始来源、文件头版权与修改说明保留；来源映射交 Lead，未复制 GPL 代码或增加依赖。
8. 规则 11：只写上述授权源码/测试与 REPORT，脚本临时产物放 /tmp，不提交/推送/发布，不改 TASK/正式状态；维护报告中文。
9. testing 选择表：按风险执行 host/services、完整 archives 与黄金样本、真实 main/T-02 回归、生命周期、规模、双 tsc、lint/architecture；规模未通过如实保留待验收，不用其他测试代替。
10. 规则 1、5、7、12：无视图/设置语义/产品文案或技能事实修改，不触发对应实现；无 UI 修改，不触发 ui 技能。

### 候选 SHA-256

```text
d2264ca810facc2f6fd35dbd14ce70753f94691acd9fe4fce4301ab21d92a467  src/host/obsidian/file-changes.ts
0f18b0778ad5020bc7e9e1db5c8da026ba33d64ee304eb53aef05e5d1227bc39  src/host/obsidian/file-changes.test.ts
767bb97806a14fe4c1ba5e44a3ce7470a24165a396eeeaea433f0f29673a506e  src/modules/archives/services/generic/file-changes.ts
c8607ddbb08a48163b776bd6c8a3abf4144725ee10f87a901c3d3fc6e27ba7c6  src/modules/archives/services/generic/file-changes.test.ts
309c026af2fea1f3dfd3b0c8ee34204d5af15a589626654b46ad907cae053b57  src/modules/archives/services/generic/runtime.ts
3399fec7dd55e4459d918e509a8b9a388a40d1c267f9885cd6c04a7b77c34188  src/modules/archives/module.ts
ba79fcd6c216e1c9bf7a612040fc9578c099f75abebf61a115bb301df41c15e4  src/app/main.ts
```

main 包含前票既有改动，以本地编辑前快照和上述最小增量核对，不将整文件归本票。

### 未验证项

- 规模验收：已运行但未通过；基线同样失败，保持待验收。
- `pnpm run build`、`pnpm check:bundle`、`pnpm check:notices`、UI runner：未执行，owner Lead。
- `pnpm run build:css`、`pnpm notices`：TASK 禁止，未执行；main.js/styles.css/通知生成文件未改。
- 独立双轴审查、来源表集成、正式 Evidence/Ticket 状态：由 Lead 指派/维护，本 REPORT 不冒称验收通过。
- 宿主内真实同步：按 Ticket 属用户验收，隔离 host/服务与内存规模脚本不冒充真实 Obsidian 同步表现。

## 问题与下一步

实现候选与 AC-121–124 行为证据已交回；唯一未闭合的本票检查是规模脚本的现有完整性断言。Lead 可先核对候选摘要、追加来源映射并安排独立审查，再调查规模基线而不弱化原断言，恢复后重跑真实规模入口及 Lead 专属构建门禁。本执行者不扩大写集修改 core/脚本以绕过断言，不写正式 Evidence，不等待交互回答。blocked 表示必需验收未闭合，不表示已完成源码被丢弃。
