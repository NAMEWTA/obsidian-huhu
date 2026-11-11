# T-16 实现候选交接

## 聚焦交接

- 已冻结本 worker 候选，等待独立 high review；本报告不宣布 T-16 正式完成，不修改 Evidence、状态、绑定或共享源。
- 实现按 DESIGN revision 3 / UI-002（digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）及 036 固定包预检落地。真实生产渲染器使用 @pierre/diffs 1.6.4 FileDiff、CodeView、UnresolvedFile，旧 CM merge 渲染链已移除；host conflict-extension 保留。
- 三组变更同时展示；保留原整文件、冲突显式标记已解决、提交、同步、设置、连接、克隆、远程、身份、暂停与 restore hold 命令。新增逐 hunk 暂存/取消暂存、proof 绑定恢复、checkpoint/receipt/条件撤销。没有自动 markResolved/merge continue。
- Git 历史保留 refs/图/合并父/根提交；固定任意 A/B、交换、B=工作区，MultiDiffView 展示真实文件及统计，含重命名和双向未跟踪文件。笔记历史固定 A 后连续设置 B 不漂移，pair restore 指向 A，原笔记保持打开。
- 公共呈现偏好覆盖 split/unified（左右/上下）、换行、词差、上下文、交换、导航、选行与复制；按所属 leaf 小于 600px 默认上下，shadow 使用 HU 令牌、22px 行高、12.5px 字号与 44/36px gutter。日期均为只读提交时间或格式字符串配置，没有新日期输入。

## 产物与验证

### 写集与隔离

- 初始源码 SHA/mode 与 dirty 状态分别保存在 /tmp/huhu-t16-implementation/baseline.json、baseline-status.txt。初始未单独保存 index 全字节散列；没有声称该项证明。本 worker 没有在工作区执行 Git 写操作，所有真实 Git 写测试只在 TEMP 仓库中进行。
- 完整候选清单（包括每文件 SHA、mode、初始值）保存在 /tmp/huhu-t16-implementation/candidate-manifest.json，共 67 个修改/新增/删除文件，摘要 05d5b60eb669ed7654418362137ea87fc56493b8db83495ddfa98102095cb411。src/modules/versioning/api.ts 与 core/hunk-restore.ts 的 SHA/mode 和初始值一致。
- 主要写集：versioning/ui、styles/diff.css；core/history.ts、repo.ts、restore.ts；services/history-query.ts、sync-service.ts、restore-service.ts 及邻近测试；module.ts 注入；desktop/revision-reader.ts、获准新增的 system-files.ts 及测试；scripts/diffs-languages.mjs 与测试、versioning-worker.mjs；virtual Worker 类型、T-16 生产组件 fixture、TEMP Git 测试。
- 删除：ui/diff-editors.ts、diff-model.ts、diff-model.test.ts、diff-worker.ts、diff-worker-factory.ts。新解析/Worker 测试替代旧引擎测试，原 raw hunk 测试改接真实库并扩充；readonly raw restore 引擎未改。
- package/lock、共享 i18n、esbuild/budget/notices、中央 adapter、runner、vitest 配置与生成产物均由 Root 写入；不在本 worker 写集。原 T04 sync-presentation 语义保留。过程材料全部留在 /tmp，没有写入 evidence。

### 关键行为与红绿证据

- endpoint 严格区分缺失 null 与内容为空的文件；cache 包含仓库、端点、路径、语言与内容身份。2MiB reader 上限保留，200k 展示阈值另行显式继续/取消。大文本经每计算独立可终止 parser Worker；正式 highlighter 使用 owner Window 的两个 Worker，URL 建立即撤销，卸载/pagehide 终止，不使用全局 pool。
- 语言白名单唯一 JSON 表：md/yaml/json/css/js/ts/html/shellscript，.sh/.bash→shellscript，其他 text。构建插件锁定六个 backend/theme 发布源 SHA；裁剪正常/hashed 入口，禁止 wasm/oniguruma、highlights、portable Worker、全主题目录及未知后端。真实主图和两个 Worker 图均经 guarded build 测试。
- 双 Document 原始真实 spike：未适配时 iframe shadow sheet 缺失；trusted pointer 在 iframe 把监听器注册到 main，拖动结束丢失。Root 接收私有失败衍生提案并实现两处 pinned-source adapter。适配后 FileDiff/CodeView/UnresolvedFile 首建、adopt、sheet 均通过；两个 Document trusted pointer 1→4 正确结束，拖动中 adopt/unmount 后两侧监听器为 0。分开的 negative/positive 原始材料：sheet-negative.json、sheet-positive.json、pointer-negative.json、pointer-positive.json，均在 /tmp/huhu-t16-implementation。iframe 不等同真实 Obsidian popout。
- 冲突曾以真实 DOM 暴露 beta hydration 后 resolveConflict 返回空内容的问题。最终采用公开 instance.render({file: immutableRawFile, preventEmit:true}) 再 resolveConflict；未使用 protected cache、私有属性、自写 conflict parser 或 raw-splice。仅剥离显示首 BOM 让库识别第一个 marker，再补回 BOM；15 个真实库 DOM 用例验证 current/incoming/both、LF/CRLF、首 BOM、多冲突、混合行尾及失败重试，未选区域保持字节。
- hunk 写入通过现有 queue 校验仓库/HEAD/index/worktree 身份与 raw 投影；index 写使用旧 blob OID CAS 的 Git binary patch，保留其他路径、未选择 hunk、模式与工作区。已覆盖 BOM/混合 EOL/emoji/EOF、新建/删除、可执行模式、Unicode/tab/newline 路径及 precheck→apply 竞态拒绝。
- conflict admission 限真实普通冲突文件、当前仓库/vault/源身份、允许的操作状态；普通 restoreGate 的 conflict/merge 拒绝不变。RestoreService 仍负责确认、checkpoint、receipt、条件撤销；恢复前 raw proof 与编辑目标再次校验。system opener 只接受真实现有工作区普通文件，并经仓库/vault/realpath/lstat/symlink 边界；测试注入 action，没有打开外部程序。

### 检查结果

下列命令均在仓库根运行，日志在 /tmp/huhu-t16-implementation：

| 检查 | 结果 | 原始材料 |
| --- | --- | --- |
| scoped source/tests/fixture `tsc --noEmit --skipLibCheck -p /tmp/.../tsconfig*.json` | 退出 0；最后 tests config 含源及新增测试再次通过 | final-types-{source,tests,fixture}.log、last-types.log |
| `vitest run --project unit`，versioning core/services/ui + system-files | 13 文件、90 测试通过，退出 0 | final-unit.log |
| `vitest run --project dom src/modules/versioning` | 8 文件、55 测试通过，退出 0 | final-dom.log |
| `vitest run --project native-integration test/sync` | 5 文件、87 测试通过，退出 0 | final-native.log |
| 最后双向未跟踪回归：native-integration git-history.test.ts | 15 测试通过，退出 0 | last-native.log |
| `node --test scripts/diffs-languages.test.mjs` | 5 测试通过，退出 0 | final-scripts.log |
| scoped ESLint / diff.css stylelint | 零诊断，退出 0；末次修改再次 lint 通过 | final-lint.log、final-css.log、last-lint.log |
| 所有候选格式检查 | 退出 0 | last-format.log |
| 生产 fixture `--suite frontend-redesign --ticket T-16 --matrix redesign --check` | 退出 0，status=preflight | fixture-final-check/result.json |

- 首轮完整浏览器 run 的 66 个 1440/390、Paper/Ink 与风险矩阵布局 case 均通过，然后 exercise 在 fixture useSyncExternalStore 非缓存 snapshot 处失败；该 fixture 问题已修复。独立短跑实际渲染 24/24 状态、console errors=0：quick/results.json。此后候选修改的最终全矩阵未由本 worker 重跑，不将其写成最终浏览器通过。
- 第一轮全局 tsc 因其他 worker 修改中的 CalendarTile JSX 解析错误中止；后来未 skipLibCheck 的局部图还遇到现有 Obsidian SDK 声明错误。保留 tsc.log/types-scoped.log。Root 最后提供的 production build 状态为 5 个其他 T09/T12 消费者失败，原始 /tmp/huhu-t16-central-adapters.log；本报告不以 scoped 通过代替中央完整 build。

## 问题与下一步

1. 请 Root 按冻结清单安排独立 high review，再执行稳定候选最终 production build、bundle/notices/assets 与完整浏览器矩阵，正式 Evidence/状态由 Root 负责。最终 diff.css 可能晚于 Root 上次生成 styles.css，需要中央重建。
2. 明确领域边界供 review：stage/unstage 覆盖 missing/empty/new/deleted；checkpoint hunk restore 仅在两端均为 text 时显示。现有 RestoreService 为正文替换，未新增删除/创建文件的持久化 receipt schema。缺失端点仍保留既有显式整文件 discard 命令，不伪造空文件恢复。请审查此边界是否满足批准合同；本 worker 不把它隐瞒为所有 missing-endpoint hunk restore 已支持。
3. 历史端点原先有文件、现为未跟踪且发生改动时，列表统计允许 undefined，实际 CodeView 加载后使用真实 metadata 展示 body 统计；不伪造 +0/-0。二进制/reader 上限端点显示原能力原因，系统打开仅限当前工作区现存文件。
4. 最后审计命令曾试探 runner `--help`，因 CLI 不支持该参数退出 126；随后使用正式 --check 参数成功。该调用不是产品失败，原始 fixture-check.log 保留。

冻结时间：2026-11-05T20:42:03.022399+00:00。冻结后本 worker 不再修改候选，等待 review release。
