# 任务回报

Session: 20261026T045732Z
Task: 010-t08-chrome-measurement
Status: completed

## 聚焦交接

仅修 Chrome 验收脚本的盒边界测量、动画稳定观察、原始截图采集与资源收束，未改生产组件或样式。最终脚本 SHA256 `91cf2578ddc588c530ff7866b835d5b395ffe75e5eaf7dc43b5b29a3d12db05b`，已 SOURCE STOPPED。最终实际 Chrome 15/15、exit 0、drift[]；原 14 项均保留，另加旧裁切图的负向校准。Root 可用本候选进入整票冻结与独立审查，本回报不推进 Ticket/Goal。

## 产物与验证

- 固定输入 `T-08-chrome-repair-input.json` SHA `d70d23cfd2f19614af1807632c180de4b27abafa2fa8b09d5a757ccdbdc19c8e` 的 28 原件均逐项核对。实际 TASK SHA `d9a56702af631e92febdd0551b79009fa4a265a2dcd83d40de5d2d692e5ca9ce`。继续使用已读 I/dev/ui，回读适用 code-review 与 test-reliability 规则；未派遣或自称独立审查。
- 唯一脚本 before SHA `6e8f32a220621cf89ac6ea6cc6cedd6cdefda3e1fd2d7edaa11fa759af603cc0` → after `91cf2578ddc588c530ff7866b835d5b395ffe75e5eaf7dc43b5b29a3d12db05b`。原字节、最终字节、精确 diff 在 `/tmp/huhu-t08-a-chrome-repair-20261026T093756Z/{objects,script-stopped.json,script.patch}`；patch SHA `73716c45ef66ff8100c8b9cc8d2341ecc9525375b1b853252bbdba22f07a54e8`。`protected-source.json` 证明其余 A31 与 styles 保持原 SHA；styles 仍为 `3d4fa2753b0a899dc74d520029929d1de4c11ea2de023d750433e7f934df2e4d`。
- 008 REPORT 仅将 Status 一行改为精确 completed，正文未动。SHA `2c79f85bcccc41da29d342e2ae428c2da3d90b0f8a66444a0c23060f39202e23` → `08f1aa99f991c4f1ce8cf941083cc3b091a3903bff93723afeed8cba65183bb4`；前后 CAS/单行 diff 在 `008-administrative-fix.json`。008 return 结构检查实际 exit 0、errors[]、warnings[]。

测量问题已由实测确认：宽屏外 aside 是 border-box 312px、clientWidth 311px、左 border 1px，内 section 为 311px。新断言测设计拥有的外 aside，并同时验证内层加真实 border/padding 等于外层，没有下调 312 期望。窄屏初测关闭按钮为 42.0456px，此时真实 CSS enter 动画仍 running、currentTime≈16.576ms、duration150ms；等待原 Web Animations.finished 后，再取无运行动画的连续稳定 RAF 样本，得到精确44×44。最终稳定观察耗时195ms；3秒期限只限制观察，不关闭动画、不用固定 sleep 充当完成条件。原43.9容差门保持，原失败原件在 Root 输入目录未动。

截图改用 `fromSurface:true, captureBeyondViewport:false` 的真实 CDP 采集。每张图记录 CSS viewport、DPR、CDP layout metrics、原 PNG 尺寸、scroll/focus 前后状态；以临时固定左右边界标记的实际截图解码核对两端像素，再移除标记，用相同参数保存原始无标记 PNG。解码仅用于校准，最终图片是未缩放、未拼接、未重绘的 CDP 原字节。200%仍为真实 browser zoom，CSS viewport600×428.5、DPR2，PNG1200×857；宽屏1200×857、窄屏480×900。旧 Root600×857原 PNG 经相同尺寸校准明确拒绝，完整左右边界均已目视核对。

最终运行目录 `/tmp/huhu-t08-a-chrome-repair-c2` 包含：

- `source.json`（完整真实编译输入/字节CAS/metafile；SHA `cd0b2df016e9e721f6c470deb83ff3c450dc197b66de6e1c40ced1add673a1df`）与 `source-after.json`，drift[]。
- `summary.json`：15/15，exit0，SHA `593be12baf139bbaacf5b0030286503fcc7f8d00a298e84676e68b1e8bf38253`。
- `wide-geometry.json`、`narrow-stability.json`、`narrow-geometry.json`、`zoom-stability.json`、`zoom-metrics.json`，保留边界盒及动画前后样本。
- `screenshot-calibration.json` SHA `3123ad725facca991607e850d9835082cacfbfdf0acaaccb169c730c11d55fcf`：10张最终原 PNG 均尺寸/左右边界通过，每张拍摄前后 viewport/scroll/focus不变；`*.calibration.png` 明示为带边界标记的校准原图。
- `wide-{light,dark}.png`、`narrow-{light,dark}.png`、`zoom-200-{light,dark}.png` 及 `zoom-200-{light,dark}-{top,bottom}.png`。后两组记录各自滚动位置与保持的读屏按钮焦点，详见 `zoom-form-views.json`；这些是各滚动段的 viewport 图，不冒称单图覆盖完整表单或完整键盘可达性。
- `cropped-reference.json` SHA `d09923b38576a4802ca16165f4676aacb70b7c8bba95697f8c73db6c408ff1cd`，保留旧图 SHA、实际600宽与应有1200宽的拒绝事实。
- `cleanup.json` SHA `66ee52cc28a36844d837e973e1f19d2fd8233d6edad776f9c04fe2c6d617ad42`：两个独立 Chrome 的 close 均已观察，exit0；serverClosed=true、errors[]；独立 profile/HOME/XDG/cache/tmp 已删除，初始机制与最终 Preferences 原件另存。早期本任务尝试的临时目录也在确认无对应 Chrome 后清理，见 `prior-attempt-cleanup.json`；未删除旧008或Root失败原件。

本任务证据根 `/tmp/huhu-t08-a-chrome-repair-20261026T093756Z` 的各编号命令目录保存完整 argv/cwd/UTC/exit/raw.log 以及前后源 SHA/CAS。主要命令：

| 记录 | 观察 |
| --- | --- |
| 001/005 | node --check，exit0 |
| 002 | 首次用深层证据目录启动，Chrome因SingletonSocket路径过长退出，未进入页面；不是产品 red |
| 003 | 只改为短的新独立临时根，实际全流程15/15、exit0 |
| 004 | 仅格式化唯一解锁脚本 |
| 006 | 最终脚本完整实跑，09:51:12.328449Z–09:51:18.685595Z，15/15、exit0 |
| 007 | 008 return，exit0、errors[]、warnings[] |

最终实跑原命令为 `/home/wta/.volta/tools/image/node/26.11.1/bin/node scripts/obsidian-acceptance/agent-workbench-coordination.mjs /tmp/huhu-t08-a-chrome-repair-c2 --cropped-reference=/tmp/huhu-t08-root-chrome-20261026T092450Z/zoom-200-light.png`。全部2378份实际c2工件路径/大小/SHA在 `chrome-artifacts.json`。Root另已通知其对同一91cf脚本实际复验 `/tmp/huhu-t08-root-ui-r2` 也15/15、exit0、无drift/清理错误，该通知与本任务自有运行分别记录，不混作同一次命令。

## 问题与下一步

本范围无剩余修改。未重跑不受脚本影响的284/33业务回归、native、build或全局lint；其证据由Root复用。当前证据仅是明确受控宿主边界下的真实本地Chrome测量与截图，不替代真实Obsidian/Provider/OS IME/五平台验收。010报告落盘后运行同目录return结构校验，原输出留证据根；Root继续整票独立审查。

SOURCE STOPPED
