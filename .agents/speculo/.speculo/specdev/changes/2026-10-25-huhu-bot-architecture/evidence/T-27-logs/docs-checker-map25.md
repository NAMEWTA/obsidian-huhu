# Map25 / Goal24：T27文档检查最小维护

095的pnpm test:docs实际outer126/inner1保留。Root已回读原日志和源：六个标题都含U+3001顿号，原链接去掉顿号；当前githubSlug正则保留U+3001，导致六项误报。依据[GitHub官方章节链接规则](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links)（2026-10-26实际读取），标点应从自动锚点去除；精确修复此已证实差异，不修改原用户输入文档。第七项是新native测试夹具Markdown未分类。

T27原build_integration仅维护scripts/documentation-policy.mjs、scripts/verify-docs.mjs、test/release/documentation-checker.test.ts、test/release/documentation-policy.test.ts。以最小U+3001处理与明确native/huhubot测试夹具分类关闭现有红；不忽略specdev原始输入、无禁用链接/文档检查，不粗放豁免native产品资料，不新增依赖。保留非ASCII标题字符、既有hyphen/underscore及重复slug规则。真实checker隔离夹具覆盖成功锚点和仍拒绝坏链接/未知文档路径。其余原检查行为保持。

此维护独立于100/101，Go生产/锁/NOTICE/main/styles/永久规则不变；仅轻量Node定向测试与docs命令，执行前协调当前重检查，无Go命令或全仓build/lint。T27仍in_progress，任务仅局部候选，最终全部功能工程集成未完成。Map24的100/101 TASK不改、T08 attempts=1，全部28票55AC与DAG、用户现场后验边界不变。
