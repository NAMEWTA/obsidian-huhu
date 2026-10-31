# T-17 独立双轴审查原始报告

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（调用 TASK 与 T-17 Evidence 声明；派遣真实性由 Lead 回读原生工具核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: 1ddd3bc467e266145b2172176e6f394d8a36af4be03b9646e6e3cbcae5a58da9

本 reviewer 未参与该范围的实现、修复或测试编写。本轮只读源码，唯一写入为本报告；未再派遣 Agent，未改正式状态、源码、产物、index 或规范。

## review-input

冻结原文：[T-17-review-input.json](T-17-review-input.json)。完整对象经 `JSON.parse` 再 `JSON.stringify` 的 UTF-8 SHA256 如上；不是其中 scope.input_sha256 的替代名称。范围为该 JSON 的 14 个 archives/golden 文件（包括新增文件），不以 tracked diff 排除新增实现。

开始核对：14 个 after 字节及 6 个 sources 字节均与原 SHA256 匹配。结束前重新运行原 review-scope 工具，逐项核对 base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256，全部 MATCH。其他域仍活跃，排除路径由原冻结清单与 TASK 界定，其变动未作为本票审查对象。

原输入 sources 没有列原 T-17 Ticket、Map 及本轮实际展开的 dev/review references。为避免伪称原 JSON 已完整绑定这些来源，本报告末尾单列补充来源摘要；原 Input-SHA256 保持不变，Lead 完成证据绑定时应纳入实际适用来源。

## 来源发现与范围

- commit/source 引用：当前 HEAD 等于基线，没有本票新增 commit 可供引用；规范来自调用方冻结本地来源，不查询可变远端正文。
- 显式来源 found：原 Ticket 17、Spec AC-018/019/023、ADR-001、Issue #3 冻结正文、SRC-010、Map revision 4。本票没有 UI 改动，UI DESIGN 一致性不适用。
- 仓库同域文档 found：`docs/contacts.md`；架构入口 `docs/architecture.md` 及 dev architecture/Obsidian API/testing references。档案公开功能文档当前描述既有 v1 界面，不据此要求本票提前交付 T-19 UI。
- 标准 found：根 `AGENTS.md`、`.agents/skills/dev/SKILL.md`、ESLint/TypeScript/Vitest 配置和 `.editorconfig`。指定目录下没有额外 AGENTS；根文件发现没有 CONTRIBUTING 或独立 CODING_STANDARDS。Fowler baseline 已使用，未发现需要另报的纯风格问题。
- 影响闭包：`api.ts` 服务键 → `module.ts` 发布 → `archive-services.ts` → controller/application → 新 repository → 既有 ContactsFiles/Vault 适配与共享 WriteQueue；旧 create/parse 路由、catalog/query 消费合同、golden 和 v2 集成测试均已回读。
- 不将 T-18 更新/原生草稿保护、T-19 UI、T-20 关系、T-21 迁移、T-22 修订图分叉的缺失列为本票缺陷。以下发现都发生于本票实际新增的创建/读取路径。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: request-changes
Input-SHA256: 1ddd3bc467e266145b2172176e6f394d8a36af4be03b9646e6e3cbcae5a58da9
Observed: 固定 14 文件的实际源码、调用闭包与下述内存执行反例；4 项已确认 finding。

### S-01 — P1：Markdown 分区可以跨字段注入，成功创建后读回值不等价

- Path：`src/modules/archives/core/persist/v2/markdown.ts:47`（47–53、70–87）。
- 可达前提：一个类型含 Markdown 字段 a、b；创建时只填写 a，a 的合法普通字符串内容包含 `<!-- huhu:field b -->\nphantom\n<!-- /huhu:field b -->`。写入器只禁止 a 自己的标记，故成功；读取器对每个字段全 raw 搜索，故把嵌在 a 内的 b 标记也当成 b 的独立受管区。
- 已观察结果：原值 `{name:"X",a:"…b 标记…"}`，解码后新增 `b:"phantom"`，错误回调为 `[]`。a 与 b 都实际填写时可转为重复标记诊断，使自己刚创建的记录只读。扫描全 raw 也覆盖 YAML/标题中的标记文本。
- 风险：未经调用方填写的字段被制造，或合法输入在重载后成为损坏记录；readOnly/isComplete 无法揭示前一种情况。
- 依据：dev 持久化一致性规则及 error-handling 的真实状态保证；用户内容不能被错误解释为另一结构字段。
- 修复满足条件：让受管分区有明确、不可嵌套的边界与冲突规则，解析只认实际正文分区；创建前拒绝/安全编码所有可能歧义的字段标记，并证明所有接受输入的值读回不产生额外字段。补交跨字段、文本/YAML/标题标记以及已有 b 值的公共创建→重载负例；不得写后才报告损坏而返回成功。

### S-02 — P1：预设目录声明的字段与 v1 写入器支持集不一致，公开创建静默丢值

- Path：`src/modules/archives/core/legacy-adapter.ts:18`（18–30）；关联 `core/catalog.ts:387`（387–394）、既有 `core/persist/markdown.ts:243` 附近 createMarkdown 的按 kind 过滤。
- 可达前提：调用方从公开 catalog 获取 person/company 字段，再通过相同 public createEntity 提交 person.website 或 company.birthday（也包括 company 的 birthplace/mobiles/wechat 等）。目录对两个 kind 无差别暴露所有 scalar/list 字段，命令按目录接受，实际 v1 createMarkdown 却过滤这些字段。
- 已观察结果：公共 service → repository → application.create → 实际 v1 serializer/parser 的内存 Vault 端口中，person.website=`https://example.com`、company.birthday=`2000-01-01` 均创建成功，回执与随后 query 的相应值均变为 `""`；磁盘表示根本没有该值。
- 风险：接口公开宣称可填的字段在无错误返回下被删除。原有 UI 未暴露这些字段不能保护新增公开命令消费者。
- 依据：dev 公共接口两端同步、格式兼容与持久化一致性；禁止新接口通过旧 codec 静默丢值。
- 修复满足条件：预设字段目录与真实 v1 写入支持集保持单一权威，拒绝不能保存的非空输入或提供明确支持；所有 advertised 字段经公共命令写出、回执、重载查询必须相等。兼容路径不得通过悄然升级 v2 来规避。

### S-03 — P2：索引读取失败仍允许分配同一稳定 ID，恢复后形成重复实体

- Path：`src/modules/archives/core/catalog.ts:401`（401–406）；关联 125–130，旧创建入口 `core/application.ts:316` 附近相同检查。
- 可达前提：已有 id=`same-id` 的实体文件临时 cachedRead 抛错；调用者预分配相同 ID，以不同名称再调用 createEntity。load 仅保存 path/readFailed，既无 entity 也无 entityId，创建只查已有 entities 与同 ID 诊断。
- 已观察结果：query `isComplete:false`，诊断 `[readFailed]`；随后 createEntity 成功，产生 `P/First-same-id/基本信息.md` 和 `P/Second-same-id/基本信息.md` 两份相同身份。原文件可读后才发现重复。
- 风险：以已知不完整的身份索引证明不存在，正常重试或资料暂不可读时可主动制造身份歧义。队列串行只避免本地 create 重叠，不补足未读取事实。
- 依据：dev 不可读文件不能当空数据；error-handling 未知结果不得推成安全重试；api.ts 声明非法/歧义输入明确拒绝、身份不被静默复用。
- 修复满足条件：无法完整核验身份的读取失败/不透明损坏不得用于授权该创建，返回稳定可解释错误并保持无新实体写入；同时覆盖 v1 与 v2 的公共创建路径、恢复可读后的成功重试和无重复落盘。

### S-04 — P2：已知损坏文件的身份没有参加重复检测，有效副本被标为可写

- Path：`src/modules/archives/core/catalog.ts:253`（253–258）；关联 243–250。
- 可达前提：两个文件具有同一合法 huhu-id，其中一个因无效 createdAt、缺定义或未来格式只进入 diagnostics；另一个正常进入 entities。诊断已保留 entityId，但重复计数只遍历 entities。
- 已观察结果：损坏文件 diagnostic `{code:"invalidDate", entityId:"same-id"}`；另一个同 ID entity 为 `readOnly:false`，没有 duplicateId 诊断。
- 风险：公共查询明知同一 ID 指向两个文件仍将其中一份作为唯一可写对象，未来消费者可能按 ID 选中/编辑错误副本。`isComplete:false` 的全局标志不能替代实体级身份歧义与诊断。
- 依据：dev 公共查询一致性与持久化身份安全；风险审查的数据/恢复场景，不能只验证正常解析记录之间的重复。
- 修复满足条件：从允许的实体路径与可信 envelope 建立身份占用/歧义事实，将可识别 entityId 的损坏/未来记录一并纳入；所有有效同 ID 实体只读，按路径报告重复，不需修复或迁移原文件。补交“有效+损坏/未来/缺定义”的重载公共查询反例。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: request-changes
Input-SHA256: 1ddd3bc467e266145b2172176e6f394d8a36af4be03b9646e6e3cbcae5a58da9
Observed: 按本票范围分别对照原 Ticket、Spec、ADR 与完整冻结 Issue 条款；下列 4 项独立违反合同。

### A-01 — P1：受管 Markdown 字段不满足字段身份与缺失值往返合同

- Path：`src/modules/archives/core/persist/v2/markdown.ts:47`、`:73`。
- 合同：T-17 codec/空值精确往返；Spec AC-018/019；Issue #3「稳定身份与可读存储」「首期字段范围」要求 fieldId 确定字段、Markdown 使用稳定受管分区、缺失与值分离。
- 反例与风险：只填写 a，a 内容包含 b 标记，读回却无诊断地多出 b=`phantom`。这改变“未填 b”的业务事实，属于本票新建即重载路径，不能推迟给 T-18 更新修复。
- 满足条件：接受的 a 内容不能成为 b；创建→真实序列化→重新读取的字段集合与值相等。歧义输入必须写前明确拒绝或采用无损编码，并覆盖两字段同时有值及 YAML/标题混入标记。

### A-02 — P1：统一公开命令没有对旧预设字段给出真实可保存合同

- Path：`src/modules/archives/core/legacy-adapter.ts:18`；`src/modules/archives/core/catalog.ts:387`。
- 合同：T-17 复用旧 codec 路由且公开契约同步两端；Spec AC-023；Issue #3 迁移兼容条款明确“不能让通用表单提交新字段后由旧 codec 静默忽略”。
- 反例与风险：catalog advertise person.website/company.birthday，public createEntity 通过验证后丢弃输入并成功返回；该缺陷已由公开服务经实际 application 与旧 codec 执行确认。
- 满足条件：目录仅声明可落盘字段，或命令对不支持输入明确拒绝；宣称支持的每项值须在回执和重载公共查询保留，继续维持 v1 格式且不隐式迁移。

### A-03 — P2：身份预检不完整时仍创建，违反失败不制造歧义的本票边界

- Path：`src/modules/archives/core/catalog.ts:401`；`src/modules/archives/core/application.ts:316` 附近。
- 合同：T-17 正常/失败矩阵要求无隐式覆盖/伪成功且重复 ID 可定位；CreateArchiveEntity.id/API 合同声明已有身份不被静默复用；Spec AC-023 与 ADR-001 稳定身份。
- 反例与风险：已有 same-id 文件 EIO 后 query 明确不完整，但同 ID 不同标题创建仍成功；恢复读取后形成两份身份。此为本票新建安全性，不要求实现 T-18 结构化更新才能修正。
- 满足条件：读取不完整导致无法排除身份冲突时拒绝受影响创建，无新增文件；恢复读取后以同一 ID 校验重复或安全重试，v1/v2 共用该保证。

### A-04 — P2：重复身份检测忽略损坏文件中已识别的 ID

- Path：`src/modules/archives/core/catalog.ts:253`。
- 合同：T-17 明确“损坏/重复 ID 可定位”；Spec AC-023 的缺 ID/重复/歧义/损坏分组。损坏本身不允许把已识别身份抹出重复检测。
- 反例与风险：同 ID 的坏日期文件仅 invalidDate，正常副本 readOnly=false 且没有 duplicateId；消费者得不到本票承诺的实体身份歧义事实。
- 满足条件：坏日期/未来格式/缺定义而能读出身份的文件参加重复检测，正常副本只读，诊断定位全部相关路径，且不改写任何原文件。

## 检查、反例与未验证项

已检查通过的源码事实：三个新 serviceKey 的 module 注册真实存在；controller/application 对接实际 Vault 适配；第三类型不需新增业务枚举；定义修订使用独立 UUID 路径、内容 hash 校验和可见 current 指针；读取不会发布/迁移；新实体按确切 revision 解码；old parser 不接受 archive-record，带未来 version 的旧 kind 也不可被旧 patch 写入；创建时间由实际创建操作提供，v1 不从加载时间伪造 createdAt；数值/decimal/金额/false/null/缺失/月精度有显式 codec；快照 clone；文件事件/重载会 invalidate；dispose 清理 repository 和 listener。

没有发现本票夹带其他域重构、运行任意脚本/远程 schema、跨模块私有导入、Node/Electron 进入 core、或遗漏新增错误的 en/zh。默认 required 不在草稿创建时强制完整性符合草稿语义；不将尚未实施的完成状态命令报作本票缺陷。

自动执行：

1. Node crypto 检查固定 14 文件及 6 来源原字节；计算完整 Input-SHA256。
2. Node 内存 esbuild `write:false` bundle 直接执行当前 serializer/parser，确认跨字段 Markdown 与旧预设读写差异。
3. Node 内存 esbuild bundle 直接实例化实际 ContactsApplication 与 archiveServices，注入内存 ContactsFiles，依次调用公开 publish/create/query，确认预设丢值、读取失败重复创建、损坏 ID 未参与重复诊断。使用真实生产 application/repository/codec 代码，端口为内存夹具；不声称真实 Obsidian 或实际 Vault API 执行已验证。
4. 再运行原 `validate-specdev.mjs --review-scope --mode working-tree --base 265e65f... --file <原14路径>`，上述关键字段全部 MATCH。

关键原始输出：

```text
markdown roundtrip {"original":{"name":"X","a":"<!-- huhu:field b -->\nphantom\n<!-- /huhu:field b -->"},"decoded":{"name":"X","a":"<!-- huhu:field b -->\nphantom\n<!-- /huhu:field b -->","b":"phantom"},"errors":[]}
public legacy roundtrip {"kind":"person","key":"website","receipt":"","query":""}
public legacy roundtrip {"kind":"company","key":"birthday","receipt":"","query":""}
read failure before duplicate {"isComplete":false,"diagnostics":[{"path":"huhu/档案/P/First-same-id/基本信息.md","code":"readFailed"}]}
duplicate creation accepted {"first":"huhu/档案/P/First-same-id/基本信息.md","second":"huhu/档案/P/Second-same-id/基本信息.md","id":"same-id"}
known corrupt duplicate: entities=[{"id":"same-id","readOnly":false}], diagnostic={"path":"huhu/档案/P/First-same-id/基本信息.md","code":"invalidDate","entityId":"same-id"}
base_sha MATCH
observed_head MATCH
working_snapshot MATCH
index_sha256 MATCH
tracked_diff_sha256 MATCH
```

两个探针初版有执行夹具问题（ESM bundle 含动态 require、CJS 顶层 await），没有到达反例；改为内存 CommonJS 与导出 async promise 后成功。失败夹具不作为产品红灯或通过证据。

未重复作者报告的 92/92、最终 8/8、类型、架构/i18n、定向 lint；源码已显示其覆盖正常路径但未覆盖上述组合负例，作者检查数量不替代语义审查。未构建产物（归 T-32 Lead）。未运行真实 Obsidian activate/重启、多窗草稿、四平台实机、性能或人工视觉验收，按 SRC-010 由用户执行；本报告不宣称这些通过。

后续修复会改变固定输入。修复后必须重冻受影响范围并由未参与修复的 reviewer 复查；本报告 request-changes 不可被作者复测绿色替代。

## 补充实际读取来源的原字节摘要

以下来源独立于原 review-input JSON 列明，未伪装进该对象已有的 Input-SHA256：

```json
[
  {
    "kind": "specification",
    "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/17-archives-v2-contract.md",
    "sha256": "0e216c28bb838f43cea70e334b7bd5fcf9ae4d5a76623e0d5515fce4a2394bc5"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-26-unified-browser-versioning-archives/tickets-map.md",
    "sha256": "1f16f163c46b5d9cd4587392e6c5d3c15c10a0cf3c5ee35e3f24167241e5bae1"
  },
  {
    "kind": "specification",
    "locator": "docs/contacts.md",
    "sha256": "7f7479e00880c6faa12eaada4800f052c82ee9dccaaf8080a3cff0e6d371662b"
  },
  {
    "kind": "standards",
    "locator": "docs/architecture.md",
    "sha256": "ee522347c6a5bd49eefbce24725518fbb9148ca2fb39ecac895b6d5b0fd52160"
  },
  {
    "kind": "standards",
    "locator": ".agents/skills/dev/references/architecture.md",
    "sha256": "34b54dcc8df7a01563e22b9d0bd84fd520486068fe09f69183a2d5fd0f2e3800"
  },
  {
    "kind": "standards",
    "locator": ".agents/skills/dev/references/obsidian-api.md",
    "sha256": "9fac8f21f8d4806331176cc8bf62cd1ffff94aaec3b58ba5a6c06bf348479417"
  },
  {
    "kind": "standards",
    "locator": ".agents/skills/dev/references/testing.md",
    "sha256": "43c1ff5b5f4a865a158d5c5e4714cd6562a8c9a4c9911cde473ef3f0097525a3"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/.speculo/AGENTS.md",
    "sha256": "86b3e7a0b507a79fb40b679307ae045d36ccf894967e5f82c3f45dbd279e902c"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/references/change-scope/change-contract.md",
    "sha256": "cc39fcb9216ad22ae4a4fe5c218837bff8ed5ba02e3b79a77585d5bc4e16abf7"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/references/coordination/coordination-contract.md",
    "sha256": "736563f49903256de7367383dae2cc2f55112f2b592e066e9684253960775ed4"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/skills/code-review/SKILL.md",
    "sha256": "845d9c8d1dcaf383a0bf32dd4f7057ddef4ba963c55f8f3f57f34ed6695f55d3"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/skills/code-review/references/working-tree-review.md",
    "sha256": "f24a2d7eedb4ea76d4b416e8bfebc88eb13fe534590ff622e259b72063ab2e4d"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/skills/code-review/references/source-discovery.md",
    "sha256": "fc1ab8a59f3e5afd7ea99a91056dba681f4fd90da12662328126c9b569a02446"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/skills/code-review/references/fowler-smells.md",
    "sha256": "bcf1cf1b8ff7304266a4951bd3ce7dea57163a8ecf4b39641c6c796563389815"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/skills/code-review/references/risk-review.md",
    "sha256": "f4e5a2509481afb9a179bfc3c3b64c6831a10ab1d248ace7361e314727e6163b"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/skills/code-review/references/reviewer-contracts.md",
    "sha256": "e9cff72349827a2c40463f3818fd6a34d8a8703a3672f32e45289d10506da567"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/skills/code-review/references/review-evidence.md",
    "sha256": "e81d124de9795aaa2e5175b5adfc89ee861d782c37244f75ba3575bb6738808f"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/rules/error-handling.md",
    "sha256": "e6e86a0d34dad87e299563120101011e40f3de223bf11e85f8a82ad06e428059"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/rules/test-reliability.md",
    "sha256": "23e3ef9bd7fbbf32e01764aae43361e990c3fec551ea116c81562010a605f3e3"
  },
  {
    "kind": "instructions",
    "locator": ".agents/speculo/workflows/specdev/common/rules/activation-and-memory.md",
    "sha256": "b34d897be251fb30e501e7328010a252c8279d5506cc61c75ebec441a8b39071"
  },
  {
    "kind": "standards",
    "locator": "eslint.config.mts",
    "sha256": "5a9af879d865ade134004971298a14c3d5cfc02818198ed59211c5f707aee0c5"
  },
  {
    "kind": "standards",
    "locator": "tsconfig.json",
    "sha256": "ff9c946a35f7582b584890d90e12509de830f3f6a46230c45e1b92e2843949cb"
  },
  {
    "kind": "standards",
    "locator": "vitest.config.ts",
    "sha256": "db3f5373ac5348593928419f404796bbed7cfcd7649d8fdbb705718ac674eb42"
  },
  {
    "kind": "standards",
    "locator": ".editorconfig",
    "sha256": "883e9b94eba3d12959a51e0b2132ead7a7c0fa4357094f1e1f2e5a039247a068"
  },
  {
    "kind": "standards",
    "locator": "package.json",
    "sha256": "2ef9fb6023d219de0e510b220cd2d186c2e1208ce2c03aa8d619858ced3b3d0d"
  }
]
```
