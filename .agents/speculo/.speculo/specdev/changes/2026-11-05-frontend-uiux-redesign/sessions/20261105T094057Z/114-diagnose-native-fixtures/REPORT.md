# 114 Root native fixture 诊断

## 交接

仓库源码、产物、state/index 均未修改；只新增本报告。可审候选与 before SHA256 在 /tmp/huhu-native-fixture-diagnosis/：t07-driver.patch、t07-before.sha256；t10-fixture.patch、t10-before.sha256；bounded-run.patch、run-before.sha256、bounded-startup.mjs、bounded-startup.test.mjs。由 Root 审合，不自动应用。

事实：T07 阻塞是 driver 未关闭前一文档的 modal Sheet 就切到 iframe。完整原 exercise 的 390/main unsupported 实际已成功打开详情；随后 390/second 在 iframe 内 elementFromPoint=true，但该文档未收到新的 trusted pointer/mouse/click，未选择 script；顶层 main 详情仍打开。iframe 内命中不能证明顶层合成命中。正常/unsupported×1440/390×main/second 独立八点均成功，支持该结论。最小修复保留详情 disabled 断言及截图，再 Escape 并等详情关闭后切换文档；原完整 exercise 随即通过。

事实：T10 当前 fixture 的 COMMENTS_PANEL mount 返回旧函数，真实 panel-host 要求 dispose/setVisible；navigator-settings 真实 VaultPathField 要求 getAllLoadedFiles。补齐两端口后，host 场景进入重挂载循环；仅把 peek 每次创建的 panel 对象移到 peek 外保持快照引用，定向场景与 dispose 即通过。这与 panel-host useSyncExternalStore 的实际读取关系一致。

未知：Root 旧 0case startup renderer 100%CPU 的最初根因未捕获；以上 host 场景循环不能反推其原因，更未证明旧启动缺陷已修复。

## 产物与验证

全部浏览器使用独立临时 profile、真实生产 React/Radix/模块/样式与 ASAR app.css；memoryVault/服务端口属于明确内存边界，无真实 Obsidian/vault/账号/CLI/剪贴板操作。

- T07 红：timeout 45s node /tmp/huhu-native-fixture-diagnosis/t07-state-run.mjs --suite frontend-redesign --ticket T-07 --matrix redesign --out /tmp/huhu-native-fixture-diagnosis/t07-state-result。完成真实 unsupported timeout；工具返回126。result.json 的 failureState 保留 main 已打开详情、second 未选择；t07-full-trace.jsonl 最后 main/second 记录有 actual events 区分。
- T07 绿：同参数运行 t07-closed-run.mjs，输出 t07-closed-result；退出0，1 matrix + 未删减原完整 exercise passed，errors=[]。仅追加上述 modal 清理。
- T10 原端口红：t10-run.mjs 输出 t10-result，真实堆栈为 setVisible/dispose、getAllLoadedFiles TypeError；后续原完整 exercise 在 month 周期选择超时，不声称通过。
- T10 两端口补齐但 panel 快照不稳定：timeout 25s t10-fixed-run.mjs，已产1 matrix截图，卡 host；真实退出124。日志 t10-milestones.jsonl。外部 timeout 只用于止损，未当成功。
- T10 单变量固定 panel 引用：timeout 25s t10-stable-run.mjs，输出 t10-stable-result；退出0、1 matrix passed；host/navigator-settings/comments-settings/diary ×两文档与真实 uiReview.dispose 定向控制通过，errors=[]。原有 overflow、非原生日期、无嵌套button断言保留；此为端口/生命周期定向控制，不代替原完整 exercise。
- startup helper：node --test /tmp/huhu-native-fixture-diagnosis/bounded-startup.test.mjs，退出0、resolve/reject/never-resolve 3/3。真实 Chrome 注入 startup=new Promise(()=>{})，startup-never-run.mjs 在10000ms明确失败、0cases、写完 result 与 finishedAt，并走原 finally 清理；工具返回126。没有降低生产超时。
- bounded-run.patch 将整个 startup readiness+startup await 包在同一10000ms限时内；超时跳过可能同样挂死的截图，保留原 Browser.close/3s SIGTERM fallback 清理。最终扩大到 readiness 的补丁仅静态审查，真实 never-resolve 检验执行的是只包装 startup await 的前一版；helper未变。

## 问题与下一步

仅对已授权 Root 创建且 cmdline 匹配的 PID2928964、2928863、2928834 发 SIGTERM，记录 stop-root-t10.json。旧进程及本次 huhu-114-* / runners 均已退出；未碰用户其他 Chrome。临时诊断保留 /tmp，不入库。最终过程进程查询只剩查询命令本身。

Root 可审合两个 fixture 最小补丁，再执行正式 native 验收。T10 完整 exercise 的周期选择等后续断言仍待原 owner 验证；未跑66，未执行构建、lint或全测试。没有生产源码反例需要修复。中央 startup 补丁只处理挂起的可观测失败和清理，不宣称修复任何 renderer 根因。
