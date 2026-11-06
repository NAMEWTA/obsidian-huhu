---
schema_version: 2
session: "20261105T094057Z"
task: "147-repair-terminal-reveal"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-09"
---
## Goal
sol medium精确诊断并最小私有修真正PTY从Home重显引起renderer卡住，Root单写，不能凭猜根因。
## Inputs
AGENTS/dev/ui/testing、Map54/Goal/Spec/T09/DESIGN3/UI002。T14 medium144 native_final已用冻结main/styles在新Xvfb/vault/privateHOME重复3次：本地huhu-pty两个nonce shell、两会话/关闭重开/主题tokens都过，task/home截图完成，回terminal后rendererCPU132% helper38%、CDP evaluate/后启Debugger均不响应。/tmp/huhu-native-final-proposal/diag-terminal-02/evidence/hang.json（及03/相关目录可找），私有候选terminal-merge.mjs精确步骤；source脚本原实际getNativeSurfaces/controller/session model缓冲读取。不涉及真实账户/远端/Git。144正做预启Debugger/Profiler再取栈，会由Root转你，不重复其驱动工作。原630/4800 fullVitest及受控T09 66是历史，不证明真实PTY重显。native helper源码/OOS不改。
## Workspace and Scope
repo只读，仅本REPORT与/tmp/huhu-terminal-native-repair过程/候选。候选先限T09既有writable src/modules/agent/ui/**、styles/**与本票fixture必要真实回归；共享/renderer/service若确需改，先给具体路径/调用/反例Root补权限，不能擅越。Root单写应用/build/状态/Evidence/index；146另medium只修共享focus CSS，144只native probes，两者不碰agent生产源。不得用户库/账号/桌面clipboard/外部消息/原transcript/委派；不得改Rust/协议/领域/计时/预算或造另一终端引擎。
## Acceptance
先读真实隐藏/恢复/fit/renderer/WorkspaceView生命周期调用，列最小调用链与可验证假设，不在无栈前盲改。结合144实际栈或原renderer控制精确构造旧红/新绿；至少分新建/重开、Task和Home往返、1/2session、显示隐藏/维度/所属owner恢复这几个相关轴，保原输出/选择/滚动/输入焦点与进程状态；不把CSSmedia/driverclick误当产品问题。优先复用xterm/AddonFit既有可见性/度量接缝，避免同步反馈/重复订阅或0尺寸fit循环；不能循环重试/加sleep/扩大timeout/禁renderer换绿。Root可提供冻结plugin /tmp/huhu-t14-final-artifacts/plugin；真实诊断若需要只用新Xvfb/root/HOME/local helper，并先与Root协调避免与144重复；私有候选build若需则只/tmp实际编译，不能写正式main/styles。提出before/afterSHA/mode与固定ready.patch/manifest，必要DOM/真实PTY回归，不能只用mock替代旧红。
## Return
不可覆盖三节REPORT，真实复现/调用栈/源和命令退出、根因与边界；return0停止读写释放。若只完成诊断如实说明，Root继续必要修复，不假闭T09/T14。

## 精确共享生产者授权（Map56）

Root已基于真实闭包和control=false单变量绿对照，授权仅DetailPane.tsx及其DOM测试两源的私有候选，由Root作为T02共享生产者批次单写；T09页面/服务/xterm/Rust无需改。target ref只搬host/scroll，inline恢复沿React passive effect在旧trap cleanup后，不加timer/retry；Sheet仍原onOpenAutoFocus。146另三路径完全不重叠。此为真实用户整体UI重构授权内的必要缺陷修复，无需新用户确认。
