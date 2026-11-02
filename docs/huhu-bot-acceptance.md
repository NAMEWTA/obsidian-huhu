# HUHU Bot 产品验收

代码层检查：

```sh
node scripts/obsidian-acceptance/huhu-bot.mjs --check
```

真实验收必须使用一次性的新 Vault、Profile 和目标系统配置。先构建 Runner，并设置绝对路径的 `HUHU_BOT_BINARY`；再设置 `HUHU_OBSIDIAN_EXECUTABLE` 和可选的 `HUHU_PLUGIN_SOURCE`，运行：

```sh
node scripts/obsidian-acceptance/huhu-bot.mjs /absolute/new-huhu-bot-acceptance-root
```

脚本会通过现有 `fresh-vault.mjs` 创建临时 Vault、复制当前插件产物、记录证据并在结束时关闭它。Provider 的 endpoint、modelId 和安全凭证仍由验收者在本机配置；脚本不把凭证写入仓库，也不把未配置 Provider 的本地启动写成三协议通过。
