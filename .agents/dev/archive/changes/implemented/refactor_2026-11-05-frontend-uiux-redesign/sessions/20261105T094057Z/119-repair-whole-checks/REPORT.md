# 119 全仓失败收口私有候选（dispatch0 / return0）

## 交接

仓库源码全部只读；本次只写本 REPORT 和 /tmp/huhu-whole-checks-repair。候选 patch 实际修改四路径：src/app/main.ts、test/agent-backup/failure.test.ts、test/host/computed-surface.test.ts、src/shared/file-type-icons.test.ts。反馈原测试和图标生产源均保留字节不变，纳入六路径基线回读。没有写 index、产物、state、Evidence 或 node_modules。

Root 本轮消息明确追加私有候选范围 test/host/computed-surface.test.ts、src/shared/file-type-icons.ts、src/shared/file-type-icons.test.ts，并指定 native 二进制构建及 control generator 由 Root 独立负责；本回执按该新增授权执行。119 TASK 的 Map44 导航与实际文件 revision43 差异不改写；实施范围沿明确 TASK/Lead 消息，无新增领域权限。

候选：/tmp/huhu-whole-checks-repair/proposed/；统一可审补丁：/tmp/huhu-whole-checks-repair/proposal.patch。before/、before.json、proposed.json 保存字节、SHA-256 和模式。Root 按 before 校验后单写应用，high 审查固定输入。下面的测试结果均为私有内存替换候选，不表示真实 workspace 已合入或全仓验收通过。

## 产物与验证

真实症状与最小修复：

- **反馈：生产接缝缺陷。** main 的真实 mountFeedbackRenderer 只供 PortalContainerContext；Toaster→useToastLayer→useOwnerDocument 严格要求 OwnerDocumentContext，因此真实反馈入口可达失败。候选在现有 lazy contexts import 中取 OwnerDocumentContext，外层传 container.ownerDocument，内层保留现 Portal 与唯一 Toaster。没有导入完整 Providers、重复安装 Toaster、修改严格 hook 或增加全局 document fallback；lazy import 集合未变。原测试的主/第二 Document、100更新只一个toast、隔离、卸载、关闭最后工作台转Notice、晚加载不复活、失败Notice fallback原样保留。
- **backup：过时默认值 fixture。** 当前 DEFAULT_TERMINAL_SETTINGS.fontSize=13，freshTarget 未设置字号，却期望14；并非 skip-settings 改写设备偏好。候选调用原 settledTarget（显式持久化14），保存整段 agent before，再断言跳过导入后字号14/quickCommands空及 agent 全对象等于 before。未改生产默认值、导入逻辑、来源17或风险断言。
- **图标：过时包内布局假设。** 安装版 Lucide 实测 BookOpen/ContactRound/FileCode 顶层导出存在，book-open.js 等旧名文件不再存在；Building2 则是顶层 alias 而不在 icons canonical map。候选测试将每个实际 defaultIconNames 的 kebab名称映射PascalCase，核对真实 lucide-react 顶层命名空间导出，继续验证所有名称及 Obsidian前缀和颜色。生产 file-type-icons.ts 没有发现对应坏图标证据，保持不变，不能因旧包内部文件布局改产品图标。
- **字体：旧fixture未调用新真实UI入口。** 候选在Chrome内打包调用实际 applyInterfaceTheme/themeSettings，验证Geist/Geist Mono默认、显式Inter、自定义Lora/Georgia；原native override优先风险分别在host内容元素核对Arial/Courier，自定义mono Fira Code和native missing fallback继续核对。新增UI在host overrides变更时不被意外覆盖的断言；没有删除字体测试。native模拟CSS变量补明缺失override fallback，避免 initial 使整个模拟字体属性失效；不修改生产fonts/tokens。
- **档案配色：旧fixture仍用删除的pearl类。** 改实际.huhu-ui data-theme=paper/ink；仍保留亮暗文字与背景不同及两种模式间均不同的全部断言。
- **Pipeline：旧SSR假设失效。** 先补真实Owner后暴露新Select包含Portal、不受server renderer支持；最终候选在真实Chrome客户端挂载实际PipelineConfig，以实际document+独立.huhu-ui portal提供两个context。SkillList null 接缝与原测试相同（bundler精确匹配同源），Obsidian仅沿现脚本stub；不改生产Select。原3个stack、scope垂直4px、footer flex/wrap/gap8/separation8、无legacy类断言全保留，选择器更新至实际fieldset中的select-trigger。其余Chrome iframe realm、288列、冲突控件、档案网格、SuliWorld>200样本4.5对比度测试全保留。

真实命令/退出：

1. 全仓原日志 /tmp/huhu-whole-current-vitest.log 已结束：631文件（7失败/621通过/3跳过），4830测试（14失败/4775通过/41跳过），234.63s；本次未重跑全仓或修改跳过/超时策略。
2. 原workspace `pnpm exec vitest run src/host/obsidian/feedback.dom.test.tsx test/agent-backup/failure.test.ts`：观察退出126，反馈2失败+backup1失败，63通过。证据 original-red.log。
3. 私有首次候选在4文件中反馈5+backup61均通过；扩展测试继续暴露SSR Portal、native模拟字体initial及Lucide alias canonical差异。保留 private-tests.log；据真实错误收敛，不扩大生产修复。
4. 最终 `pnpm exec vitest run --config /tmp/huhu-whole-checks-repair/vitest.private.config.mjs src/host/obsidian/feedback.dom.test.tsx test/agent-backup/failure.test.ts src/shared/file-type-icons.test.ts test/host/computed-surface.test.ts`：退出0，4文件78测试通过。配置只将授权六路径候选在Vite load内存中替换，其余真实workspace输入不变；Chrome读取真实styles.css。证据 private-final.log。
5. `node /tmp/huhu-whole-checks-repair/typecheck-private.mjs`：最终退出0，基于真实tsconfig.test、skipLibCheck/noEmit的CompilerHost只替换六候选路径，preEmitDiagnostics=0。证据 private-types-final.log。
6. `pnpm exec eslint --stdin --stdin-filename src/app/main.ts --max-warnings 0 < /tmp/huhu-whole-checks-repair/proposed/src/app/main.ts`：退出0。证据 private-main-lint.log。
7. `git apply --check /tmp/huhu-whole-checks-repair/proposal.patch`：退出0。最终回读真实六文件SHA/模式等于before，候选SHA等于proposed.json。未构建main.js/styles.css，归Root实际合入后处理。

六路径 before → proposed SHA-256，模式均0664；其中反馈测试和图标生产源相同哈希表示未改：

- `src/app/main.ts`
  - before `e4f6cff3e846c6bcaeff850d5e19d0d4c9dfdbf0a5c5ea81a70cec24976896e0`
  - proposed `f104ded5223811fc2845d293cfa1c40a5fe9c14867aba0e2754427f8ef5b7604`
- `src/host/obsidian/feedback.dom.test.tsx`
  - before `98422d07986dac53b6e93773d9e9911027c4deeec55703de29daef514b47125f`
  - proposed `98422d07986dac53b6e93773d9e9911027c4deeec55703de29daef514b47125f`
- `test/agent-backup/failure.test.ts`
  - before `2f2bdda403f35f42f59653ab3c8c98dc5f6cf426aa396b89012a054144f20c2e`
  - proposed `94de275580c1b915e3c1e9d5d4b14e18f42bf5111d33099d61a42364b19f74dd`
- `test/host/computed-surface.test.ts`
  - before `0746b3f36518b2adbe8686d261a6f1ced8ad8e809c0e350d6145aa19adaceb1e`
  - proposed `c02ae2fb62c6d78289838ec31b3f5fd5ac8f4197bc8ee304ad929a79ee2f83f6`
- `src/shared/file-type-icons.ts`
  - before `d8fe40b6b16e57cf050265c1232638bacc13954916e66709f1b80e52e46355a4`
  - proposed `d8fe40b6b16e57cf050265c1232638bacc13954916e66709f1b80e52e46355a4`
- `src/shared/file-type-icons.test.ts`
  - before `f11badaadc43e230ba807d57a57c5bb7347bb0f8d2528d452f73ee81d42e13c7`
  - proposed `7cc9d9fe3d84a6adf9040efbb0f9ff805bedaebef2e24204fda895a039435a66`

## 问题与下一步

剩余原始失败已精确报Root：

- native host-editor 5用例与host-control 1用例：所有堆栈停止在 requireControlTestBinaries，HUHU_TEST_PTY_BINARY缺绝对路径，尚未运行实际helper；环境入口同时要求HUHU_TEST_CONTROL_BINARY。已有debug/huhu-pty和debug/huhu存在，不代表与当前源一致。Root明确接管构建冻结及带两绝对变量复验；本执行者未运行旧二进制、未构建Rust、未改源/超时，不将环境修复前状态称作产品通过。
- control-protocol 1用例：generate-control-protocol.mjs --check 报 control-wire-editor-codec.generated.ts 字节不匹配，Root独立读generator处理，本候选不接管。

上述7个测试与本候选覆盖的7个原始失败合计对应原全仓14失败。Root合入后再跑真实工作区定向tests/types/lint和必要整体门；high审查实际生产Owner/Portal、测试风险迁移与固定patch。本次happy-dom+Chrome结果不冒充Obsidian真实popout验收。

return0，候选冻结，执行者停止写入并释放实现槽。
