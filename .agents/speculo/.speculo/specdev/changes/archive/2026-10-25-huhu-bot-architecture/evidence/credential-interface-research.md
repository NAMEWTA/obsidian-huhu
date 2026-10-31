# 凭证通道预研（T-02 接缝输入）

Lead 2026-10-25 只读研究，尚不是实现/目标平台通过证据。用户 LOG-051 要求代码交付，真实操作自行验收。

- REF-09 固定提交的 macOS 实现已实际回读：`Set` 通过 `/usr/bin/security -i` 的 stdin 发送命令，秘密不在 argv；README 的交互 shell 示例不能当成当前 Go 实现。固定源码：https://github.com/zalando/go-keyring/blob/66b55cc0c51cd3d8dabc0ac70da30f058b2fe54a/keyring_darwin.go 。需检查长度上限前已启动子进程的退出清理，以及调用超时/错误脱敏，不能因无 argv 泄漏就假定全部安全。
- Node 官方 `stdio` 支持额外 parent-child pipe；`ipc` 则仅对 Node 子进程提供支持，Go 不应伪用 Node IPC。https://nodejs.org/download/release/v26.8.2/docs/api/child_process.html#optionsstdio 。Linux/macOS 可从固定额外 fd 接收专用凭证登记帧；不可把秘密塞进业务 HAP。
- Windows 的句柄不等于整数 fd3。Go 官方历史问题直接含 Node→Go 附加 fd 用例：https://github.com/golang/go/issues/21085 。当前 libuv 创建进程把额外 stdio 映射放入 STARTUPINFO cbReserved2/lpReserved2；仅 `os.NewFile(3)` 不足。若采用此通道，需固定本项目 Electron/libuv ABI 的解析及长度/句柄验证，并有目标平台自动化；或选择已有被验证的受管通道，不把未实现分支静默退回 argv/文件/HAP。公开来源：https://github.com/libuv/libuv/blob/v1.x/src/win/process.c （尚未固定此研究引用，不能直接复制实现）。

建议 T-02 先确定 dedicated channel + OS protected provider + 显式session-memory fallback，再通过固定哨兵测试检查所有业务HAP/日志/argv/环境/持久文件。不要自动使用已有CLI密钥。真实Keychain/SecretService不可用时须明确内存模式，而非伪造受保护持久化。
