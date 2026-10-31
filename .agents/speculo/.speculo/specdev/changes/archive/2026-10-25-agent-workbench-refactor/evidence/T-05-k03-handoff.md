# T-05 K03 首步交接

SOURCE STOPPED。仅完成 Root 授权的当前版本复现与相邻测试，不是 T05 屏幕/背压验收，不冻结 DTO/profile。工作区、base/branch 沿原 Packet；未执行 Git。

## 结果与建议

**当前 @xterm/headless 6.0.0 对人为缺行前置状态确实敏感；本轮自然 TerminalSession 场景未复现该缺行。暂不升级、pin/patch、fill 缺行或 reset。**

[官方 Issue #6063](https://github.com/xtermjs/xterm.js/issues/6063) 的精确 probe 先把 logical lines.length 人为缩短；它本身没有给出自然 headless 触发路径。本轮第一实际测试按该条件：39×18、base5/cursor13/length23 → 人为 length18 → resize37×23，得到 base0/cursor18/length18，健康不变量断言失败。经生产 TerminalSession.resize 的同一人为输入也失败。两次均在继续 parse 前检查，未主动制造不可控异步 TypeError，不能据此宣称 HUHU 用户自然路径已报该异常。

自然前置不做 length 写入时，相同 scrollback 与 cursor/resize 输入得到 base5/cursor13/length28，所有 viewport 行存在，底部 erase+print 和尺寸回复可继续。保留测试覆盖 scrollback=100、当前默认5000、上限10000；另有 alternate→normal、60轮串行输出/缩小增高、30轮 UTF-8/ANSI 分片+pending resize、已满 retention 的增高。最终两授权文件 **16 passed / 0 skipped / exit0**（7个新自然用例、9个既有用例）。

最小兼容候选：继续复用当前6.0.0及已选单 headless/集中投影路线；新事务/resize 接缝保留 live-line 不变量观测。若以后从真实自然输入观察缺行，保留 source 操作序列/代次/水位并准确显示屏幕故障；在无无损证明前不补空行、重置 authority 或伪报完整。仅 target 投影失同步且 source 有效时才从 source resync。现证据不支持预设引擎升级/回填补丁；真实 browser fit/K03自然触发和五平台仍未验证。

## 实际改动与原件

仓库只新增 `src/modules/agent/services/terminal/session-resize.test.ts`；`session.test.ts` 字节未变。最终测试只有只读 model invariant instrumentation，无 private state mutation。强制状态两 probe 依 Root 明确要求撤出长期仓库验收门，原失败源字节保存在每次 `*-source/`，另留 `/tmp/huhu-t05-k03-forced-probes-with-adjacent.test.ts`，没有以 test.fails/skip 或补生产实现制造绿色。

每次运行前都复制当时实际测试源、Session/Sessions、Vitest配置、package/lock、headless package+bundle，并保存 input JSON；检查 JSON 包含真实 argv/cwd/UTC/exit/logSHA。首次自然测试曾把 viewport row 当绝对 row，报 line-18 与 bottom-18 不等；这是 fixture 坐标错误，不是缺 BufferLine。原件保留，仅改为 baseY+row 后通过；没有生产红→绿修复可宣称。

| 执行 | 真实退出码 | 结果 | 原始日志 SHA256 |
|---|---:|---|---|
| `exact-first` | 126 | 0 pass / 1 fail / 0 名称过滤 | `cf182a9015127ebeb762d82b13d1367c18992de63a691ca0ed7e4fae05963914` |
| `forced-production` | 126 | 0 pass / 1 fail / 6 名称过滤 | `d5cedad3e47f3a28f67b7751977019fa7efb186640a2c32f7c0b36e038aaf9d8` |
| `natural-first` | 126 | 4 pass / 1 fail / 2 名称过滤 | `37d83da64ab1c94ff0e25f0b752152c2e63f8323cf88566b43e2a6d56f6c660b` |
| `natural-corrected` | 0 | 5 pass / 0 fail / 2 名称过滤 | `b31b614472fa31f8ed5df38b927acb1abd397187dc266ab5ba2ff8c32de035f3` |
| `final-regression` | 0 | 16 pass / 0 fail / 0 名称过滤 | `58e786cd1748a63c71bd9c5706a4e780c2142f7b0c36f8864d4fc2e0bdc1b5de` |

前两次目标断言红的真实外层进程退出码是126，未改写成1。名称过滤仅用于分离强制 probe/自然场景，最终无 skip。

| 最终源 | SHA256 |
|---|---|
| `src/modules/agent/services/terminal/session.test.ts` | `eaa3321c19ee9477cc2b2e595551403f22a7b74e0d49b2cc13506e60ad98e22d` |
| `src/modules/agent/services/terminal/session-resize.test.ts` | `1b4b8244e9f5283b34ed5f6250ef9bc41389aba1816f9c5e86459a71dc118d18` |

完整源清单：`/tmp/huhu-t05-k03-source.json`，SHA256 `58e2f8e694898c1fc3a34de2b0344f2925bd0a6e0e3faea3afb811812e894f3a`。

完整检查索引：`/tmp/huhu-t05-k03-checks.json`，SHA256 `06d562597daf57c0b884c9551a7cf0a40f5856d5e6ebcfb63913ec225da7f19d`。

## 授权/Skill 与未验证边界

已按 workspace/catalog→权威 I→当前 Map/项目 dev/ui→Ticket/本 Packet 复核；dev 的真实测试、许可与原件要求已应用。ui 入口已读，本阶段没有界面/DOM/布局/样式变更，未产生视觉验收声明。25项输入除 Goal 外均匹配；Goal prepared a813…→current e71a… 是 Root 在实际派遣后补 Current Status，Root已明确确认合同/写集/行为未变，观察原件保留两值。dispatch prepared cfcc… 与含派遣回执后实际9eea…均不相互覆盖。

没有写生产代码、依赖/lock/node_modules、native/target、main/styles、正式 Evidence/Goal/Ticket；没有 helper/Provider/Obsidian 进程、cargo、build、全局检查或类型/lint检查；未提交、推送、发布或归档。最终源码保持 STOPPED，等待 Root 下一实际 Packet 才实施。
