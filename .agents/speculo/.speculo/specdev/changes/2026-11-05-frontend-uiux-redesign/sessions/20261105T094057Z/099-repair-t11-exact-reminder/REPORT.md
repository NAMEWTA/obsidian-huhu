# 099 T-11 精确重复正文窄修

## 交接

已按 dispatch0 完成本次最小修复并冻结，停止写入等待 high 审查。工作区 /home/wta/projects/obsidian-huhu，HEAD 37fcede4210a19bcc2a74809e7fdd301e5717957；沿用 change README 的 Execution Context、Map35、T-11、DESIGN revision 3 / UI-002。正式状态与 Evidence 留给 Root。

仅在 InboxPanel 列表预览中比较真实 notificationBody(record) 与 title 的精确字符串；完全相同才省略正文，不 trim。详情、搜索、每次渲染的语言映射、时间与投递不变。没有新依赖或新 UI 原语，因此无需扩大安全域或整页视觉复验。原44文件候选不增文件；只在已有相邻 DOM 文件中增加一项控制。Root fixture/quick-pick test IO 是明确的 Root 叠加，不属本 worker 写入。

## 产物与验证

本 worker 实际写集（模式均保持 664）：
- src/modules/notifications/ui/InboxPanel.tsx：baseline 03c139df84f57e6bcd905beba4d49631c488bc03f609ecb948ad08302615f97b → final d96e5078cc12577f0616106752ca5d3669fb2dac88ddbd6c7081ccfdf0e2e604。
- src/modules/notifications/ui/InboxPanel.dom.test.tsx：baseline 5a8145885f3d2975704d4d23b45872f9255da1fbe3d6bd429bd613f7b4cf9a12 → final 0f0fad71a5301c1b402c18aa0b101d1e689902f2ddead7c749012708bdae023c。

编辑前内容、日志和限定类型配置只留 /tmp/huhu-t11-exact-reminder。生产 diff 仅给原正文 span 加精确不等条件；测试检查 Exact reminder 仅出现一次，并直接检查 DOM span.textContent === 'Different '，避免测试框架规范化空白掩盖回归。

- 红：pnpm exec vitest run --project dom src/modules/notifications/ui/InboxPanel.dom.test.tsx；退出 126（运行器返回），4项中唯一新增控制失败，Exact reminder 实际出现两次（split 长度3，预期2）；dom-red.log。
- 绿：相同命令退出0，4/4；dom-green.log。
- pnpm exec tsc -p /tmp/huhu-t11-exact-reminder/tsconfig.json：退出0，涵盖两文件及真实依赖图，无桩替换；types-focused.log。
- pnpm exec eslint src/modules/notifications/ui/InboxPanel.tsx --max-warnings 0：退出0；lint-production.log。
- git diff --check -- 两个写入文件：退出0。
- repair_t07 原样组合：pnpm exec vitest run src/modules/automations --maxWorkers 2，退出0，23文件164/164。已回读 /tmp/huhu-t07-navigation-repair/module-combined.log；原真实 HuhuProviders、zh/en/zh、Exact reminder 次数1、Different尾空格、Open、投递及完整时间断言全部保留通过。其真实依赖限定 tsc 退出0，types-combined.log。

## 问题与下一步

本次目标原红终绿，无遗留本票失败。生产已冻结，已告知 repair_t07 组合重跑并得到终绿回执；由 Root 继续 high 审查、正式 Evidence 和统一产物处理。本 worker 未写 automation.test、词典、fixture、产物、状态或 Git index，未提交。

全仓 pnpm exec tsc -noEmit -skipLibCheck 退出126并记录72行其他模块错误（panel-host/comments/navigator/task 等迁移问题），没有 notifications 诊断；不扩大接管。全仓测试类型命令返回126但日志空白，不能声称通过，已用本票真实图限定类型通过补足本修复验证。首轮把 DOM 测试也传给 eslint，因仓库忽略测试文件产生1 warning并退出126；随后仅生产文件命令零警告通过。未运行全量 build/lint、原生或安全域重验，产物由 Root 独占。
