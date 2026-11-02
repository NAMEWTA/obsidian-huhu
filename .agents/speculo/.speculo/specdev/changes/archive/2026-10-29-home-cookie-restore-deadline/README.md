# 首页启动不再等待永不返回的音乐 Cookie

Outcome: active

开启首页模块时，网易云音乐账号恢复会读取本机 Cookie。这台环境的系统凭据服务不应答时，这次读取一直不返回，首页停在 activating，工作台对象也就不会被赋上。本 change 记录这次诊断、启动时限和回归测试。

## 范围与权威

- 诊断：[diagnosis.md](diagnosis.md)
- 外部行为：[spec.md](spec.md)
- 决定：[ADR.md](ADR.md)
- 过程：[LOG.md](LOG.md)

## 验证

回归测试在 `src/modules/home/platform/desktop/session-lifetime.test.ts`。真实 Obsidian 点测记在 `docs/e2e/README.md` 的第二轮复测。

## 下一步

保持首页在启动路径上最多等待有限时间；不要把超时再改回无限等待，也不要为了超时向用户弹通知。
