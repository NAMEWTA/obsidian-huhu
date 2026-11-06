# 通知二级栏局部修正候选

Session: 20261105T094057Z
Task: 156-repair-notification-panel
Status: completed

## 聚焦交接

实施者native:/root/cleanup_final；按156、当前Root单写与DESIGN通知无二级栏合同，未委派。只在/tmp/huhu-notification-panel改候选；正式仓库仅本不可覆盖REPORT，不写源/产物/状态/Evidence/index/原报告，无提交、用户库/账号/剪贴板或真实宿主操作。

精确候选只有src/app/workbench/compose-workbench.ts及compose-workbench.test.ts。删除notifications显式panel（重复Unread/All列表）；保navigation.children中的快速导航元数据与all/unread section路由、主toolbar过滤、轨道badge、statusSegments、来源与计数。未改InboxPanel或领域服务，未全局禁panel。

## 产物与验证

沿真实调用核对：当前WorkbenchSurface.panelModel只在contribution.panel存在时调用，否则返回undefined；children只在pageTitle参与分区标题。ShellRoot.hasPanel只读panel/navigationContext，当前没有children自动生成panel的fallback，通知也无navigationContext，因此只删除显式panel不会再产生272栏。保children避免失去现有快速路由/标题元数据。InboxPanel原SegmentedControl承接all/unread与筛选，未删除控制。相邻content/settings/contacts显式panel保留。

相邻既有compose测试使用真实composeWorkbench构造host；新增有界合同回归检查notifications无panel/navigationContext、保bottom rail/badge/all/unread实际normalizeTarget结果及相邻三个panel端口。没有复制导航引擎。已有真实WorkbenchSurface与通知UI回归同时执行。

独占冻结包：

- /tmp/huhu-notification-panel/ready.patch SHA256 08abac78f14e910f67d869115765bee7552a2d1522264f15cd5a6afb25201144。
- /tmp/huhu-notification-panel/ready-manifest.json SHA256 72ebaad1a85ea1792a952ddb8c58a97930133ab205eb818189883700fb1ad5f6；两文件before/after SHA256/mode，source_root为当前正式根，candidate_root为私有tree；冻结时源before匹配。

候选树实际检查：

- node node_modules/vitest/vitest.mjs run src/app/workbench/compose-workbench.test.ts src/shell/host/workbench-surface.dom.test.tsx src/modules/notifications/ui：0，3文件13项，tests.log。
- node node_modules/typescript/bin/tsc -noEmit -skipLibCheck：0，types.log。
- node node_modules/eslint/bin/eslint.js src/app/workbench/compose-workbench.ts --max-warnings 0：0，lint.log；测试按仓库默认eslint忽略规则，未冒称测试lint。
- 正式根git apply --check --whitespace=error /tmp/huhu-notification-panel/ready.patch：0，未应用。

## 问题与下一步

交Root批量应用，按要求在最终生产nativeRoot87/专图重跑；此处未构建/生成正式样式、未执行正式66/858或真实Obsidian/popout，不以DOM/协议测试称最终视觉或T14通过。没有新增产品决策。return0；return校验后停止156读写，保留冻结包，继续157。
