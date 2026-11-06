# T-13 最终清理候选

Session: 20261105T094057Z
Task: 136-implement-cleanup-final
Status: completed

## 聚焦交接

实施者 native:/root/cleanup_final；遵循136 TASK、Map当前T13权限和124影响清单。正式source/assets/state/Evidence/index只读；唯一仓库写入是本不可覆盖REPORT，未提交/推送、未触碰用户vault/账号、未读取原Claude transcript。没有委派。本回执不是独立review，不给予T14或全仓通过结论。

52路径清理候选已冻结：2生产路由源、navigation-state.test、1新增AST守卫、base/scroll-area两文件、T-34/T-35两fixture、35份精确probe、7份中文文档、inventory/coverage两投影。没有改modules/**、UI技能、DESIGN、原型或永久知识；hunk-restore注释由T16持有，未重复改。准确全路径与前后SHA/mode见manifest。Root为唯一正式应用者。

删除旧icons工作台路由、iconSettingsTarget和无消费者NavigationItem.aliases；保留真实icons模块、ICONS_SERVICE与settings/iconic及resourceId/focusId。hit生产/消费原子迁移到hu-hit，coarse值仍由tokens生产，保留HU字体派生桥和合法time原生适配。35probe逐处更改模块seed、版本设置namespace、旧feature/category/selector；未按sync字面全局替换，保留内部huhu-sync-page及状态segment语义。T34注入所属窗口的内存EditorContextAccess与显式visible，T34/T35持有并dispose真实handle。

AST守卫识别原生input、从真实components/input导入的Input及其命名别名，date/datetime-local字符串及JSX表达式；动态type和spread先进入诊断，只有四个既有转发适配器按路径、Input形状与现有DateField分支/文本密码语义允许。包含原生/别名红灯、合法time/TextField/domain对象、未知动态/spread及已审适配正负控制；没有用源码指纹锁住排版。这里不证明任意运行时属性的数据流，守卫边界写在源码。

## 产物与验证

真实输入：/home/wta/projects/obsidian-huhu当前工作副本；私有候选树 /tmp/huhu-cleanup-final/tree，原字节副本 /tmp/huhu-cleanup-final/before。依赖解析复用已安装node_modules，未安装依赖；正式源码没有软链回写。所有候选变更仅在私有树。冻结前逐文件源before匹配，冻结后候选after/mode drift=[]。

- /tmp/huhu-cleanup-final/ready.patch，52路径、1199572 bytes，SHA256 6567e7d90f5b669db45f556513a33971d03afa6d66498edbf986d354caeb0841。
- /tmp/huhu-cleanup-final/ready-manifest.json，SHA256 9dc4b7b2c4569153c3c68cc5a480f254eaf0949826780320859b7b2930645a03；包含每文件before/after SHA256、mode与字节数。两冻结文件以独占创建写入并设只读，不覆盖。
- 原staged88 raw SHA4258d835a7e5cf5c845a981d441a37baa14fb4c834097f83aedeb34e0fb653ec仅继承任务绑定，本执行者未写index，未把当前HEAD冒作原dirty起点。

实际命令均在候选树执行（apply --check在正式根，仅检查）：

| 命令 | 实际结果与本地日志 |
|---|---|
| node node_modules/vitest/vitest.mjs run test/guards/frontend-cleanup.test.ts src/shell/navigation-state.test.ts src/app/contracts/workbench-state.test.ts src/app/workbench/compose-workbench.test.ts src/app/settings/nav.test.ts src/app/settings/react/icons-settings.dom.test.tsx | 0；6文件35测试，directed-frozen.log |
| node node_modules/typescript/bin/tsc -noEmit -skipLibCheck | 0；types-frozen.log，无诊断 |
| node node_modules/typescript/bin/tsc -skipLibCheck -p tsconfig.test.json | 0；test-types-frozen.log，无诊断 |
| node node_modules/eslint/bin/eslint.js src/app/contracts/workbench.ts src/app/workbench/compose-workbench.ts src/ui/components/scroll-area.tsx --max-warnings 0 | 0；lint-final.log，无警告 |
| 35路径逐一 node --check | 每条0；probes-check.json记录逐文件退出与输出 |
| GIT_DIR=/home/wta/projects/obsidian-huhu/.git GIT_WORK_TREE=/tmp/huhu-cleanup-final/tree node scripts/verify-docs.mjs | 0；docs-final.log，1922 Markdown/1604本地链接；Git仅提供只读忽略规则，读候选文档内容 |
| node scripts/verify-architecture.mjs | 0；architecture.log，1403模块，无边界/循环违规 |
| node scripts/ui-review/run.mjs --suite legacy --ticket T-34 --matrix standard --out /tmp/huhu-cleanup-final/fixture-34 --check | 0；fixture-34.log，preflight，0矩阵 |
| 同命令T-35及fixture-35输出目录 | 0；fixture-35.log，preflight，0矩阵 |
| git apply --check /tmp/huhu-cleanup-final/ready.patch | 0，正式源与补丁匹配；未应用 |

过程失败如实保留：第一次pnpm exec因私有树依赖状态检查触发交互安装而退出126，未执行安装；改直调现有工具。首次lint显式传入默认忽略的测试文件产生2 warning，退出126；按真实eslint覆盖只检查3个生产源后0。守卫最初正确拦住动态转发，先有2处动态再有4处动态/spread诊断（directed.log/guard-initial.log）；按真实调用方增加有界适配和负控制后35项0。首次docs因私有树无.git退出126；提供只读Git目录/候选worktree后0。未改变正式配置消除失败。

逐路径投影保留618原清单，当前671有效路径+7删除，共678行；346修改、265字节未改、60新增、7删除。每条绑定owner、分类、清理前/候选SHA、mode、真实最终报告路径、正式Evidence与fixture，7删除保留后继及原删除回执。265字节未改明示只是差异分类，非逐行独立审查；报告完整审查与修复窄审各自边界保留，不将历史request-changes改写为pass。未把此投影称为本执行者已对678源逐行独立复审。

coverage补全32registry→真实renderer→T08逐状态表（18widget/14section，12公共/配置+32registry=44状态），每项列生产入口与原能力；正式66/字体12组合引用真实evidence/T-08.md与104/113/126/131界限。设置列General/Appearance/About/可选gallery与9个PRODUCT_MODULES实际settings入口、字段搜索链、所属票据；task/health/notifications开关不伪作缺失settingsPage。13个workbench contribution、3个宿主view与COMMENTS_PANEL/NOTE_HISTORY_PANEL/NAVIGATOR_PANEL独立装配分别绑定所属票据Evidence/fixture。清单规则外必要API/registry/worker/词典上下文另列，不混入671数量。

## 问题与下一步

候选可交Root应用并独立审查，return0。本执行者没有运行统一样式生成、lint:css、test:styles、正式build、全仓测试、原66矩阵、fine/coarse真实命中或真正Obsidian/popout；T34/T35仅预检不称浏览器通过，35probe语法检查不称宿主流程通过。上述由Root/T14在正式应用与生成产物后统一验收。没有发现需要越界产品重构的新缺口。

本REPORT保存后停止所有读写并释放；候选和正式覆盖投影待Root核对应用，不推进Ticket/Evidence/index。
