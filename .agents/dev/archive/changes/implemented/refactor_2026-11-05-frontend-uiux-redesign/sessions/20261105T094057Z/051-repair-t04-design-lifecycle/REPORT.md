# 任务回报

Session: 20261105T094057Z
Task: 051-repair-t04-design-lifecycle
Status: completed

## 聚焦交接

051 修复候选完成，等待独立 high/Lead 全矩阵接受，不代表 T-04 或 Goal 完成。读取 TASK051、完整 REPORT050、041 基线及 DESIGN3/UI-002 对应 Rail 规则；继续使用 dev/ui/I/TDD。041/050 报告、原失败 Root66 和既有证明均未改写。

**全部 5 个授权源码/测试/fixture 路径已最终冻结，writer 停止代码写入：**
- src/app/intro-modal.ts
- src/app/intro-modal.dom.test.tsx
- src/shell/rail/Rail.tsx
- scripts/ui-review/fixtures/frontend-redesign/T-04/index.tsx
- scripts/ui-review/fixtures/frontend-redesign/T-04/index.mjs

与 041 冻结基线逐项比较，只有上述 5 个路径变化，其余 48 个路径不变。没有委派、共享源/资产/依赖/词典/配置/Git/正式状态/Evidence 写入；CSS 由 Lead 重建。

逐项闭环：
- **S-01：Intro 失败关闭误记已读。** onClose 在 dispose 前检查当前打开周期是否存在成功挂载的 disposer 以及真实已提交的 .huhu-design 内容树；加载中/失败重试 UI 不确认。不是只凭导入成功或保存了 handler，也不新增 observer/timer/接口。onOpen 原有清空/代次和 cancel 路径继续隔离每次呈现。
- **P-01：当前 Rail 仍为旧 soft 平面态。** 当前项改用 raised/accent、语义 card shadow 加 line rim、3px 强调条（上下 9px、右侧圆角），当前 hover 保持 raised。36×36、radius8、44/32 命中间隔、键盘、上下文菜单所有权不改。只改所要求的当前项样式，不新增颜色 token。
- **V-01：正式 fixture 缺 owner 负向浏览器配对。** 持久纳入 050 私有 native paired protocol 的生产组件控制：同 owner 41>40 的真实 item 点击/回执/精确 source 与 Escape；ownerless 31<Sheet40；低物理 owner 41<后开独立 Dialog50。后二者验证实际 elementFromPoint 不能命中低层 item，不把程序性背景打开当作可信点击证明。所有控制仅 fixture 有界 React roots，使用公开组件 API、正常 ownerDocument/Portal/stack，无源变换或另建焦点引擎。
- **Root66 矩形误差：** 读取前等待实际有限 WebAnimations.finished，精确断言 computed CSS width 360/580；仅 rendered DOMRect 使用严格小于 0.01 CSS px 的误差。原 1440≠580 缺陷仍会同时被 CSS 精确值及矩形差值拒绝，没有放宽真实布局阈值或移除其他断言。

## 产物与验证

### 红绿、代码与类型

- Intro 实际 Modal red：/tmp/huhu-t04-repair/intro-red.log，2 失败/4 通过，失败分别为未呈现即关闭和加载错误关闭 seen1≠0。
- 最小修复后 intro-green.log：6/6，退出 0。覆盖实际失败 UI、用户 close 不确认、失败重试到真实内容后确认一次、成功后重新打开失败不追加确认，以及 failed owner cancel/既有 mounted/late-import 取消清理。没有 mock 内部 onClose；native Modal DOM/close/createEl 是宿主端口。
- 冻结后 changed Intro + ShellRoot：dom-final.log，2 文件 27/27，退出 0。
- scoped tsc：types-final.log，退出 0；使用 041 的实际源码/测试/fixture 配置与传递依赖，包含本次全部改动。不是全项目类型/build 通过。
- 生产两文件 ESLint max-warnings0：lint-final.log，退出 0。
- 5 路径 Prettier check：format-final.log，退出 0。
- 原正式 runner 全 66 计划的 --check：original66-final-preflight/result.json，preflight、66 planned、退出 0；未冒称执行完整 66。
- 041 unit43/DOM59、lifecycle10、architecture1364/i18n33词典5481，以及 Root049 共享接缝证明均按未变范围复用；本轮未为无新风险范围重跑全套。

初版沿用 050 私有 protocol 的 onEntryFocus 被真实组件类型拒绝（DropdownMenuContent 公共 API 刻意省略该 prop），types-first.log 保留。删除该非公开 callback、保留公开 controlled open/onCloseAutoFocus 后类型归零，并重新执行最终 320/390。没有 cast any、suppression 或修改组件公共类型。native-320fine-first 只作为早期过程材料，最终证明是下列当前公共 API 版本。

### 实际原生浏览器证明

当前两个 canonical 计划样本均 passed、errors[]：
- /tmp/huhu-t04-repair/native-320fine-public-api/result.json
- /tmp/huhu-t04-repair/native-390coarse-final/result.json

Google Chrome 153.0.8010.47；320/en/paper/fine（原 Root 首失败样本）与 390/zh/paper/coarse/mobile；每个都在 main/second 两个真实 Document 执行 normal 与 UI reduce 原有深层检查。共享 CSS 新鲜边界由 Lead 提供，worker 未构建/修改资产。

双文档实际结果：
- active Rail computed 为 raised rgb(255,255,255)、accent rgb(44,102,105)、36×36、radius8；非透明 card shadow 和 line rim 精确匹配同主题语义参照，marker width3/accent。已目视两文档 t04-rail-* 截图；不是仅检查 className。
- same-owner menu41/Sheet40：可信 CDP 点击真实 item，实际 selections 恰增1并回到精确 custom trigger；重新打开后可信 Escape 等真实 FocusScope unmount 和精确 source，第二次 Escape 精确回到原 header opener。
- ownerless menu31/Sheet40、lower-owner menu41/upper50：各自 computed 精确值及 itemHit=false；上层真实 Dialog 已持有焦点，有限动画完成后量测。保留 t04-owner-layers-* 截图。控制使用生产 Dropdown/Dialog/Button 和 HuhuProviders，不靠测试样式抬层或 untrusted click。
- 两文档原有 599/600/959/960、52/272/36、32/44 separator、native drag preview/commit/reset、1324/main1000 与1323/main999、620/main568/360、580/full580、精确 input/draft/selection/scroll、dirty Keep editing/Discard/source、设备选择/创建/cancel、mobile status、F6、严格 Rail 内点 mouse/touch、adoption trusted wheel/current-window、visibility 输入等门全部保留并通过。
- 最终 exercise 真正关闭控制 root 与 Surface/Intro：两文档各 layer roots mounted3/unmounted3、页面 mounts3/unmounts3、controller aborted=true、无 Portal/modal/pointer/scroll lock/errors。fixture 没有增加全局监听/焦点框架。
- 1440 CSS-pixel 有界 viewport 仍只用于明确的叶阈值/宽度探针，然后恢复样本 viewport，不声称 1324px 叶子实际位于 320px 屏幕内。

### 冻结输入

/tmp/huhu-t04-repair/frozen 保存合并后的 53 路径；原 041 frozen 完整保留。
- frozen-delta-sha256.json（正好 5 路径）文件 SHA：8f883ddcb20ce7a419a1181bf70b71585eaa33642c2bb1417793ec987bdc1ac7
- frozen-sha256.json（合并 53 路径）文件 SHA：fcb7cfb28e110fb5a7cd8f1ecbc833eb1c84ddce8afca1078b1018e2a36b9974
- 原 041 baseline SHA：1ada99df4469eba18bfbf02319a17a52dbba86499aec365fa0b294dce5414ebe
- 两个最终样本 inputDigest 一致：621e0f8bbfa16988d03f8f78d893e20b52702d34c1ce4eaaa9be88278ebef3cd
- 2251 输入冻结时逐项校验当前 drift[]；frozen-inputs、frozen-native-inputs.json 保存字节和清单，包含从 ASAR header/offset 抽出的 host/app.css。
- CSS 1284419 bytes：a4d860fcaa6dcc07fbdbff6dddb3f5b86021a5adfe06b39838ecb7bdd4b527a1
- Intro：c437b59e77b58a0f93146c93e9a9662005870bb0b99a1f84ad70a2e8da26ab1d
- Rail：00e8bf417961c4203033bd18c863bdc157088c19a3ac42693b9f88edc5737ee9
- 实际私有 fine driver SHA：06dd05d2340af452eb13032e2c919fb6fbe1222a01014fdd238ed60ae862aac8
- 实际私有 coarse driver SHA：6678700e000c447a0f096e430b01daf4556c0fc616d17f155543f1888782b3b0

两个 driver 只沿已批准原 runner 副本的绝对路径/单个标准计划样本过滤，不更改生产图、严格 adapter 守卫、指标或真正的 fixture；冻结副本为 frozen-driver-320fine.mjs / frozen-driver-390coarse.mjs。freeze-receipt.json 保存冻结回执。没有把原 runner 文件 hash 冒充实际 driver hash。日志/截图/构建/输入材料均仅在上述 /tmp，不写入 evidence。

## 问题与下一步

已向 Lead 显式交付最终 5 路径 freeze，允许独立 053 和新输出目录下的完整 66 并行执行。报告保持不可变，未经新失败/任务释放不再修改源码/测试/fixture。T-04 接受、正式状态和 Goal 仍归 Lead。

本轮没有重建 main.js，没有安装依赖/写共享资产/提交/推送/发布，也没有声称所有业务消费者、全局编译、预算/notices 或真实 Obsidian 主窗/popout/移动端通过。第二 Document 是 iframe；宿主、vault、主窗原生 status 和最终集成继续按原 T13–T14/Lead 门处理。原 041/050 与 Root66 的 579.9999389648438 失败材料继续保留，不覆盖旧输出。
