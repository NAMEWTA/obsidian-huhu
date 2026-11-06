# 116 私有集成测试迁移候选（dispatch0 / return0）

## 交接

已形成六路径最小候选，真实仓库六源全部与 before 字节/模式一致；只写本 REPORT 与 /tmp/huhu-integration-tests-proposal。未写源码、index、state、Evidence、产物或 node_modules。候选冻结，Root 单写合入并安排 high 审查；不将私有候选运行冒充真实 workspace 通过。Map43 / T16 / Spec 的既有 Pierre、唯一 UI schema 与外观合同保持；dev/ui、测试参考与 SpecDev I 方法复用本会话已读版本。

候选在 /tmp/huhu-integration-tests-proposal/proposed/；完整可审统一 diff 为 /tmp/huhu-integration-tests-proposal/proposal.patch。before/、before.json、proposed.json 保留真实基线、SHA-256、文件模式。

## 产物与验证

逐项旧风险迁移：

- safe-contribution：旧 target/lastTargets 改为实际 huhu-workbench-ui/1 schema、route/navigation.lastRoutes；仍断言 safe 路由丢弃 resourceId/focusId，保留直接 cleanPageState 及激活/禁用/移动端测试，新增 pageViews 中 safe 草稿完全清除断言。
- records：只移除 RoleOptions 不支持的 exact；保留 `name: option` 字符串精确 accessible name 查询。检查安装版 Testing Library role.js：使用 matches(computeAccessibleName(...), name)，没有改为模糊或 regex 选择。
- foundation：icon-xs 改实际 icon-sm，原跨 Document 往返、StrictMode、ref、受控/非受控草稿与生命周期断言全部保留；补 data-size 和 data-hit-control 断言。原 foundation 没有像素断言，T02 fixture 的实际 fine32/coarse44 严格命中断言完全未修改，tokens/base 生产规则未动；本次 DOM 不声称证明真实尺寸。
- git-hunk-newlines：删除 calculateDiff 旧 import，改真实 parseDiffFromFile + displayText + hunkProof。context:2 与生产解析一致，保留原10行未变上下文使首/末改动为两个独立库 hunk，保留精确最小 selected ID 断言；没有自造 diff、恢复 CM 或删危险案例。最小 cross-boundary CR/LF 拒绝与零写入、5种 prefix × first/last/both 的 BOM/CRLF/blankline/原生转换、拒绝分支原文/无checkpoint/无annotation事件、成功分支 receipt.selectedHunks/beforeObject/事件顺序/undo、whole restore 与 copy 原始文本风险均原样保留。
- appearance：采用合法 system/source=huhu/accent=plum/density=comfortable/uiSize=15/motion=reduce 输入，保留 editor=claude-code、headings/emphasis、custom完整双模式颜色、所有字体字段、18px/1.9精度、Home装饰字段。显式断言 dashboardFile 不入外观样本。仅指定 appearance-settings.json 通过真实 homeSettings.normalize 定向生成；未运行 -u，未改变其他黄金样本。

真实命令及边界：

1. 原 workspace `pnpm exec vitest run --project unit test/sync/git-hunk-newlines.test.ts`：观察退出126，Cannot find module diff-model，未收集测试。原日志 /tmp/huhu-newlines-original-red.log。
2. `node /tmp/huhu-integration-tests-proposal/harness.mjs` 与生成的 normalize.mjs：退出0，生产 normalizer 仅输出指定外观候选 JSON。
3. `pnpm exec vitest run --config /tmp/huhu-integration-tests-proposal/vitest.private.config.mjs src/app/workbench/safe-contribution.test.ts src/modules/home/ui/expense/records.dom.test.tsx src/ui/react/foundation.dom.test.tsx test/sync/git-hunk-newlines.test.ts test/golden/user-formats.test.ts`：退出0，5文件44测试。私有Vite load插件只用五候选测试替换真实路径的内存内容；唯一appearance快照断言在内存中重定向到候选JSON，其余黄金样本读真实workspace原文件。没有修改任何测试断言以求绿。
4. 最终 foundation 补两个命中元数据断言后，仅重跑该候选文件：退出0，11测试；其余四文件输入未变，复用上步结果。日志 private-tests-final.log / private-foundation-final.log。
5. `node /tmp/huhu-integration-tests-proposal/typecheck-private.mjs`：退出0，Private CompilerHost candidate diagnostics:0。使用真实 tsconfig.test、skipLibCheck/noEmit，只替换五候选测试 sourcefile；此检查发生在 foundation 两条元数据断言加入前，之后未重新跑全类型。没有生成产物。
6. `git apply --check /tmp/huhu-integration-tests-proposal/proposal.patch`：退出0；最终回读六真实workspace SHA/模式仍等于 before，候选 SHA 仍等于 proposed.json。

六路径 SHA-256 before → proposed，模式均保持 0664：

- `src/app/workbench/safe-contribution.test.ts`
  - before `44ea9eee72a05a05781696c26af3d96cc01bf2aa1400a97bb10c0aa781a5cdd9`
  - proposed `7105aeb2c12a7423428723d7f20695970678f9bf7d6fa892ae95de20a6a0064f`
- `src/modules/home/ui/expense/records.dom.test.tsx`
  - before `9cda237a5e44cf548a543ef5ca722d53ea8746aaed0580b2d05949bdd17fe865`
  - proposed `7c5e5eddf789e7875954a4dac7b47706710b7321676ed410584cd2fff8815410`
- `src/ui/react/foundation.dom.test.tsx`
  - before `3950559c4435cd7649288b1a7434b834b75fe85ac9016b9bf74cf180b9e24472`
  - proposed `806589d7ce0b7e9a57223f6335d221b848c5966198bb91f253f8c2c9b7b71cd5`
- `test/sync/git-hunk-newlines.test.ts`
  - before `4ff574d507720ca1b7cb228f5b73d8ae08b7f7fd1f84b7c4b2aabc1c5ed80b79`
  - proposed `2786673de4d37f3bccf41ea1f0994cf3006c6a4262c041c0d0bd88360440e375`
- `test/golden/user-formats.test.ts`
  - before `88e260dd8d6aa0fcf3d05dc8780bd137b5f799a8c1623d100c641edc8cc6803b`
  - proposed `919d17b3c93de34d2c4b082eb9db35bf8259a09bd9518d4bcf9ccdca2fd8cc69`
- `test/golden/__snapshots__/appearance-settings.json`
  - before `a20841533ef62500e34ea46c584dd1a75534452b6b04f62377cd520b0da970e4`
  - proposed `1809b15de52988c909fe82ba67c1f60e24b461142b66528c65361c5bb4639f33`

## 问题与下一步

未发现候选测试失败。Root 合入前按 before 哈希核对无并行漂移，单写应用完整 patch；合入后运行真实生产/测试 types 与适用集成检查，high 审查固定候选。没有执行真实宿主、Chrome像素探针或完整插件构建；既有32/44实际命中门沿原T02生产fixture证据，不被happy-dom替代。

执行者 return0，自此停止写入，释放实现槽。
