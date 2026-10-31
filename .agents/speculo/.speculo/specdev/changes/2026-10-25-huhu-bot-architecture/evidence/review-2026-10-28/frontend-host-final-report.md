# HUHU Bot 最终真实宿主回执（实施 worker）

角色：`/root/review_frontend` 已参与实现，因此不是最终独立 reviewer。本回执只证明下列 Linux Obsidian/Runner/UI 范围。

实际命令（无凭据、无模型发送）：

```sh
xvfb-run -a env HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_BOT_BINARY=/home/wta/orca/workspaces/obsidian-huhu/bot/native/huhubot/dist/huhu-bot-linux-x64 node scripts/obsidian-acceptance/huhu-bot.mjs /tmp/huhu-bot-host-20261028-final-reviewed
```

工作目录为本仓库；完整命令实际 exit **0**。日志 `/tmp/huhu-bot-review-20261028/host-probe-final-reviewed.log`。

实际复制产物匹配 Lead ready：

- main.js：`44c4daa30901a8fd7dda12d58764bda0c5049d7213c4842e054ddfa7a99c3216`
- styles.css：`7e2852172ffb40ea2d59ce25bb6a2f4fe39ab65d3a2f880033a7428c6e2e3355`
- Linux Runner：`4702fe5b8b9bbe75bd856f804d34f153ed034d94412cb53eec71be387a5db7e6`

真实流程：设置页在未启动 Runner 时可达且不启动；从真实设备设置输入 Runner 路径；真实 handshake/Host 连接；经 UI 持久创建两个 Bot 与双成员群；直聊草稿 A/B 切换保留；真实 Obsidian Source.md picker 选择与 attachment chip；Manage→Memory→返回；旧 client 关闭后经设置真实重连，新 Agent/Group 页面可操作；global/private Memory 及合法成员 session context 请求均通过。没有发送模型。

## 60 张实际截图及读图结论

8 个业务页 × 1440/800/390 × light/dark = **48**；另 Bot settings 顶部 **6**、budget 控件滚入视口 **6**。本 worker 用 view_image 分六批逐张读完全部 **60** 张原图，不只看自动计数。另有 before-start 设置截图，不混入60。

在这些记录的界面中：Agent/Group 窄行标签与控件无覆盖；Chat 草稿提示完整；Memory 名称、空态及已选 scope 可读；Data 标题说明不再挤成长窄列；Group 成员/Access 操作/Data 选择与Settings预算复选框均可见；Group 历史 none/range 有明确选中背景。长表单的正常垂直滚动、原生文本输入框内部水平滚动允许，不冒充全部内容同时置于一屏。Tasks/Approvals 为真实空状态，未渲染活动任务或审批预览，因此不把这些截图称为活动模型/审批视觉验收。

自动记录：60/60 外层 overflow=0、内层内容 overflow=0、错误 alert=0、未注册词典=0；108 次复选框观察均至少16×16、border1；18次checked均有SVG勾；12次radio观察、6次selected均有可见背景；Runtime和console/unhandled hook错误均空。

证据：

- `/tmp/huhu-bot-host-20261028-final-reviewed/evidence/huhu-bot-integration.json`，SHA256 `880935fe725a49937c8c26eca5e93b34a1fb868a6518fb6ae8510549bc662d88`
- 同目录全部 `bot-*.png`；60图哈希/页面/尺寸人工读图清单 `/tmp/huhu-bot-review-20261028/frontend-host-screenshot-manifest.json`，SHA256 `a417fdd62755fdb2759bc4c753d84bffaee421f1e9c9e46be620b8d14df01736`
- 统计 `/tmp/huhu-bot-review-20261028/frontend-host-final-summary.json`
- Probe脚本SHA256 `c62e28bef934500f124e3cf02531298ecc5d69a98926df7d016bd11d626f4682`；最后业务visual清单SHA256 `9205248cd7e989e91c2808b4928e2f78b5b227acc024435983482a58d30f9f8f`。

## 退出与边界

fresh-vault 在 finally 请求 app.quit，等待退出，必要时只终止自身 fixture 子进程。本次命令整体正常exit0；随后 /proc 核对无此 fixture 的 Obsidian/Runner 进程，CDP 9300 无监听。新Vault、HOME/XDG/OS本机目录均一次性隔离，未操作用户真实Profile；源码之后只读。

未验证：真实 Provider 调用/流式生成、真实凭据可用性、OS 导入导出文件选择器、用户笔记的完整模型→写预览→审批→未知效果恢复链、其他OS真机、真实mobile。不能从此结果宣称这些后验已完成。Lead 将把最终 JSON/图复制到 change 正式 evidence；本 worker 未提交/推送/归档。
