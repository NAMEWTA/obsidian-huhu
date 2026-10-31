# T-01 独立双轴代码审查原始报告

Reviewer: native:/root/audit_browser  
Implementers: native:/root/implement_t01  
Mode: native  
Review-Mode: working-tree  
Input: [T-01-review-input.json](T-01-review-input.json)  
Input-SHA256: 8001d889372ba0bab66de33bcf909c7eafef66339013704e0d200c3290b0cde0

审查者未参与 T-01 实现、修复或测试编写。此前仅执行浏览器后续票的只读准备。本轮依 Lead 原生派遣执行两轴，不再派遣、不修改审查源码或正式状态。

## 固定输入复核

重新执行公共工具的 working-tree 显式文件范围冻结，基线与 observed HEAD 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`。以下字段与原输入完全一致：

| 字段 | 实测值 |
|---|---|
| index_sha256 | `08b42f1e1afd6e5287d85faf2be149b32c4e80d9b0cbe603c0d4f31909b4459d` |
| tracked_diff_sha256 | `f511c7d8089c4bca5527c1dce0cc1ee123c6c7847b82aa4bc3ebbce2fc510abc` |
| registry.test.ts SHA256 | `73d40bf639df927687ce1be3f84f22cdfa4df33bdd7209f5854e8736cadf6a47` |
| git-flow.test.ts SHA256 | `edb6b378717be3dfe406173ed086bbfb5835327fe8a065f548a9d25d70fb3f10` |

两文件 working_snapshot（before/after、字节数、Git mode）完整匹配。AGENTS、dev Skill、Spec、ADR、SRC-010 五份冻结来源的原始字节摘要全部匹配。Input-SHA256 由原 JSON 经 JSON.parse/JSON.stringify 后计算。`src/modules/versioning/core/excludes.ts` 与 HEAD 无差异。

实际修改范围仅 `src/app/modules/registry.test.ts` 和 `test/sync/git-flow.test.ts`。范围外方法/原型/计划改动属于既有用户与 Lead 工作，未作为 T-01 实现审查。原输入及本报告不进入自引用代码范围。

## 来源发现与适用依据

1. 当前是基于现有合并基线的未提交测试交付，没有新增 commit log；原合并来源由 change source/Spec 导航，不重新读取可变远程 Issue。
2. 采用显式提供的 T-01、Spec AC-001/AC-002、ADR 与 SRC-010。SRC-010 明确真实宿主、平台、性能及人工视觉验收交用户执行。
3. 查阅当前 `docs/architecture.md` 的模块、三类 View、browser 与 versioning 边界，以及 `docs/data.md` 的私有浏览器/材料/恢复资料路径；与代码和本票目标一致。
4. 标准采用 AGENTS 与 `.agents/skills/dev/SKILL.md`、其 `references/testing.md`，以及公共 code-review 的来源发现、双轴、Fowler、风险、working-tree、证据和 test-reliability 合同。根 CLAUDE.md 仅转引 AGENTS，无额外标准。未发现 CONTRIBUTING 或 CODING_STANDARDS 独立文件。核对 Vitest 项目划分和 tsconfig.test.json；不重复工具已覆盖的格式检查。

## standards-output

Reviewer: native:/root/audit_browser  
Axis: standards  
Result: pass  
Input-SHA256: 8001d889372ba0bab66de33bcf909c7eafef66339013704e0d200c3290b0cde0

Observed:

- `src/app/modules/registry.test.ts:21` 使用生产 `MANIFESTS` 和各真实 lazy factory，断言每个目标模块唯一、桌面可用、默认启用及页面键；在 finally 调用 instance.dispose。没有替换为手写 manifest 或虚构页面集合。该测试标题准确限定为 factory 页面合同，并未调用 activate 或宣称宿主生命周期通过。
- `test/sync/git-flow.test.ts:652` 经真实 `SyncService.connect/commit`、`desktopGitHost`、`protectRepository` 与真实临时 Git 仓库运行。断言旧 managed block 更新、用户规则前后缀保留、精确 untracked/commit 路径及重启后 HEAD 不变化；私有文件实际读回保留，防止通过删除资料得到绿色。
- `test/sync/git-flow.test.ts:705` 明确构造 HEAD、staged blob、working file 三种不同内容，核对原始 index 字节及 staged blob 备份，然后核对私有文件移出 index、可见档案继续跟踪、提交树无私有资料且工作文件内容保留。不是仅检查排除字符串。
- 测试继承当前独立 mkdtemp 仓库、全局 Git 配置隔离与 afterAll 清理；新增 service 均在 finally dispose，重启旧实例先 await dispose。没有新增 sleep、任意重试、全局串行化、宽泛跳过或吞断言。
- 变更没有修改生产协议、持久格式、生命周期、模块装配或构建输入，也没有删除旧测试。未发现适用的可维护性或范围问题。

Findings: []

## specification-output

Reviewer: native:/root/audit_browser  
Axis: specification  
Result: pass  
Input-SHA256: 8001d889372ba0bab66de33bcf909c7eafef66339013704e0d200c3290b0cde0

Observed:

- AC-001：生产 `src/app/manifests.ts` 包含 browser/versioning/archives；三份 manifest 均默认启用并 lazy load。真实 factory 的页面键分别为 browser、versioning/revision-review、archives；新增测试固定该共存合同。生产宿主仅有 `src/app/main.ts:79–80` 的 comments/navigator 注册和 `src/app/workbench/compose-workbench.ts:531` 的 workbench 注册，`scripts/verify-workbench-entry.mjs` 有三 View 的静态回归。没有引入第四 View。
- AC-002：`src/shared/storage/vault-layout.ts:42–47` 的 browser、materials、versioning recovery 根与夹具匹配。生产 `core/excludes.ts:17–19,27` 精确排除这些隐藏私有根；未排除可见 `huhu/档案`。新增正例覆盖个人资料、类型、关系和迁移资料，负例覆盖浏览器 Cookie、材料、恢复检查点及嵌套材料根。
- 真实生产消费者链为 `SyncService.ensureExcludes`（`services/sync-service.ts:263`）→ `desktopGitHost.protectRepository`（`platform/desktop/host.ts:32`）→ `protectRepository`（`:40–54` 更新 managed block 并枚举 tracked 私有项；`:56–80` 备份读回；`:84–123` index lock 下移除索引）。新增用例确实走这条链，且自动提交继续调用生产 commitStep。
- 既有生产代码已经满足本票所需排除与页面注册，不为满足 expected_changes 预测而强制修改 excludes.ts，符合最小充分改动合同。新增测试在本票 writable_paths 内，无无关重构或产品范围扩大。
- T-01 的停用重开、无悬挂宿主资源和真实工作台启停仍属人工验收；本次 pass 只针对已固定代码交付和上述可静态核实的合同，不替代这些结果，也不表示整个 change 完成。

Findings: []

## 实际验证与限制

本 reviewer 实际执行了源码/diff/生产消费者审查、冻结输入与来源摘要重验、公共 working-tree 范围工具重验、生产 excludes.ts 无差异检查。未复跑实施者已报告通过的 3 文件 56 测试、workbench-entry 3/3 或测试类型检查；这些结果须由 Lead 关联实施者原始回执，不由本报告冒充独立运行。

未运行或声称通过：真实 Obsidian 启用/停用/重启、浏览器原生进程释放、平台实机、人工视觉或性能验收；未构建插件。纯测试变更依据 dev/testing 不要求重建 main/styles。既有 PR head 可达性来自固定合并基线及先前整合证据，本 reviewer 未额外执行 ancestor 命令，不将其列为本轮新验证。

标准轴与规范轴分别 pass，无 request-changes finding。此报告交 Lead 核验真实原生派遣与本轮返回，再由 Lead 写正式 Evidence；本报告自身不推进 Ticket 或 Gate 状态。
