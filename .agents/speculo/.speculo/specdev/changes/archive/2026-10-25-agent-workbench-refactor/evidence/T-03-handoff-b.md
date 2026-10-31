# T-03 B GUI handoff

**SOURCE STOPPED。** 唯一写8个下表文件；未写services/core/i18n/shared/CSS/TabStrip/workspace fixture/docs/C/main/styles/budget/deps/Git。A活跃源未接管；没有commit/push/release。Root继续统一类型/build/full lint/产物/冻结/独立审查，B不标done。

- 全8文件最终manifest：`/tmp/huhu-t03-source-b.json`，SHA `fee7493c4fc64c061769ca8eb748f7f812308906fbdf94373787432270ea0d91`；v1保留 `/tmp/huhu-t03-source-b-v1.json`。
- 完整命令/真实child exit/cwd/原日志SHA、输入/视觉索引：`/tmp/huhu-t03-checks-b.json`，SHA `c2feafa4b5eaa4463514508d6e4b75d01fb7f260c0774f46531ff5d78ef73310`，共33条runner记录；失败、debug过滤skip及先前无效fixture探针全部保留。

| 实际写文件 | 最终SHA256 |
|---|---|
| `src/modules/agent/ui/create/NewTabMenu.dom.test.tsx` | `b4b5d608b80943e52b402a0d3b15e014bae9d7cc0a00b14f3bebd2e894ec2687` |
| `src/modules/agent/ui/create/NewTabMenu.tsx` | `c9805aa517ebdd1835f19f3021fc33235bde23cf0243dc948042167d3116ffb0` |
| `src/modules/agent/ui/create/Omnibox.dom.test.tsx` | `065f2d81a4a7110bb44dac70e2cd515fa4e57e1d419bde2e6760b86b5c874406` |
| `src/modules/agent/ui/create/Omnibox.tsx` | `a23321b680603e3efd0f6f75740fa28ed7b0e6ae6c89d7e6374568cb9b1bfba1` |
| `src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx` | `8b260226e290c7aa1bb973fa30a48a90ccf608d2616ed81aaf58e6c5cc798e4f` |
| `src/modules/agent/ui/sidebar/AgentSidebar.tsx` | `d8486da50c46e19a8ac6b6b8dcb8b5a02489ff2146042e62580fdeb761828f39` |
| `src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx` | `7a2302e35d414269bd1deaeb5d44fa7116fc0e764e132b048303027d95a3aef8` |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `fc530751695b834a3081aec8f3fcac12d17b0f387e96905813f9c9106d4e45a6` |

Omnibox保留六Provider/Shell、Browser/URL/搜索、quick commands、设置和切tab；可选名称/后台选择走冻结createManagedInteractive，点击时捕获明确Space/group，缺Space交服务picker。仅created关闭，取消保留输入，失败用messageKey，unknown不自动重试，pending防重复。NewTabMenu仅在原目标/document仍有效时回原trigger，不query终端；子input autoFocus按本弹层身份识别。卸载后的旧Omnibox结果/异常不更新UI、不onDone，不取消已提交runtime。

Sidebar直接useSyncExternalStore消费服务缓存snapshot；当前Space过滤，所有pane按当前runtime去重，无runtime恢复记录按稳定Space+Session去重，旧代次不隐藏新运行。补pending/background/detached/failed/cancelled/restored行；attach带冻结目标+expectedRuntimeId，pending无continuation、not-running不spawn。保留原SessionCard的rename/split/copy/material/真实end及browser/page导航。TerminalHost保留renderer/document/retention与原终端菜单；pending不构造交互renderer，inputReady=false不误作通用门禁；恢复普通打开零launch，明确继续/重启才启动；活跃运行显示view-only close/hint，真实end仍独立确认。

## 关键验证

- 最终范围DOM：`/tmp/huhu-t03-b-reopened-menu-green.log`，**5files/44tests/0skip、child exit0**，SHA `6153bceace8bb90309d7addd29adbb5c201976c57898862d43e8b7215badf4f1`。此前43tests通过仍保留；新增“旧pending→关闭→重开输入新草稿→旧created”正式红灯1failed/4pass在 `/tmp/huhu-t03-b-reopened-menu-red.log`（真实child126，SHA `737657450f157cafbd3a4b03a48df0ce2730099660a06d6767df4bc60627180b`），修后草稿及新菜单保留、service只调用一次。
- 最终生产scoped ESLint：`/tmp/huhu-t03-b-reopened-menu-lint.log`，child exit0/零警告，SHA `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`。测试按仓库默认ignore，由DOM验证；整库类型留Root统一，未伪称已跑。
- 实际Chrome局部：`/tmp/huhu-t03-b-visual-final.log`，child exit0，SHA `ebea3def7e6eb65d9dcc931639f47b79d354ad87955854c8ed89249a3d47e85b`；13组合/14截图位于 `/tmp/huhu-t03-b-visual/`，results.json/behaviors.json及每图SHA在checks。亮暗、en/zh、1200/960/800/480/320与320×360等效小视口，无横溢出，关键命中区域严格32/44px；减少动效分支已检查。有限入场动画结算后测量，没有降低尺寸阈值。
- Chrome实际操作：Name Enter不启动、Tab到后台、Escape回原trigger；后台晚结果保留外部焦点，另一个真实Chrome target造成window blur后不抢回；320×360 End使末项settings可见（top319/bottom351）；附加Agent菜单实际保留rename/split/copy/path/material/end/closeView。
- 本次最后仅生命周期guard变化，静态视觉矩阵未重复。当前源码补充Chrome `/tmp/huhu-t03-b-reopen-probe-green.log` child exit0，SHA `d35e7a1ae5e4bd70943d97eb07972e9efbe8be29c87bbd1128029c7fe85a24dc`，准确before=true/after=true。早期probe before=false属无效设置，不冒充有效红灯；正式DOM红灯才是修复前证据。

## Design Conformance / 边界

沿已批准A、DESIGN revision1 / PAGE-001 / digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`；T03局部AC-005/008/026/061贡献由上述真实组件与自动化定位。dev/ui按Map13绑定实际用于边界、组件、状态、键盘/焦点及局部检查，冻结DTO/keys摘要在checks.inputs。采用现有cmdk/Radix/Tailwind和现成服务合同，无依赖/外部代码/GPL引入，不提前T09侧栏改版。相对原型仅沿用生产菜单/分组/导航，不删原功能；新段落显式m-0避免宿主margin扩大行距。完整长名有title，身份/状态有文字，所属document Portal保留。

视觉是真生产React组件+真实主题CSS的隔离宿主：managed用例端口、terminal renderer屏幕与desktop file动作是明确fixture；不宣称真实Obsidian/Provider/native PTY/五平台E2E。静态画面已打开核对，行为由Chrome断言；真实Shell responsive外壳和实机E2E仍按用户分工由用户验收。未消除的本写集已知功能风险：无；整合类型/构建/独立review尚待Root，不作为已通过。
