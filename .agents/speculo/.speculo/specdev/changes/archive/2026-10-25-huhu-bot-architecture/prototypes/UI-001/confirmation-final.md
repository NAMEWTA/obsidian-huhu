# UI-001 final 设计确认快照

记录时间：2026-10-25T03:27:53.383Z（确认来源为本轮用户消息，消息未提供独立时间戳）。
来源：当前会话用户直接确认；LOG-040 保存导航。本文件落盘后不追加或改写，后续修改另建回执。

## 用户原文

> 我已经确认了我所需要的就是 /home/wta/projects/obsidian-huhu/.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final 请你帮我落盘，只要这一套的元素，完善并修正相关的这些文档。

## 确认范围

- 用户确认的唯一界面是 UI-001/final，稳定标识 candidate-a；确认不再停留在推荐或待选择状态。
- 同一指令授权只保留该套元素并修正文档，因此本次删除未选候选及其专用分支，更新旧比较入口标签与文档绑定。final 的产品任务区静态 HTML 与清理前逐字一致；保留全部原有功能，不增加新的视觉方向。
- comparison 仅为旧链接导航与同源生成投影，不是另一套设计；不单独维护样式或交互。
- 已发布 DESIGN-0001 的共享规则与所选界面兼容，本次只读引用正式快照并移除未发布同名候选；未授权或执行永久知识覆盖、产品实现、Git 提交或发布。
- 用户接受设计；没有把该消息推断成所有视口/键盘/设备测试通过。浏览器可复核技术证据仍单列，不重开本次设计选择。

## 固化内容绑定

| 对象 | 内容摘要 |
| --- | --- |
| Change | 2026-10-25-huhu-bot-architecture |
| DESIGN revision 2 / designDigest | aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e |
| 正式基线 DESIGN-0001 / designDigest | ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331 |
| 正式基线完整字节 SHA-256 | 50f0d924ee393fddca02d4765bd2d7bb49ba70f5e9f3bbf08ac20456b1cd651f |
| UI-001 prototype digest（含旧地址投影） | 3c93a0c085cf3458148befdeb29ff445fe444601861c3bacb8dc9e421706444b |
| 用户选中的清理前 final 目录摘要 | 203e43cd5b7f6b0277ebd47598bcc8a934c8bd1b9d7f5b605a58495e34f34ddd |
| 依授权清理后的 final 目录摘要 | 3e9bd4c227d74c226fbc9ee0ef1f8757685358c6e5ca7e64d9a7beaa806b8e49 |
| 清理后 final/index.html SHA-256 | 0f2ec5ff05dd613dc9f435728d0d9166b03e9f3ad4c6909895ac9f14793a7a45 |

final 目录摘要算法为：每个相对路径对应文件 SHA-256，按路径字典序排列为二维数组，对其 JSON UTF-8 字节再取 SHA-256。原型摘要由 design-artifacts.mjs 的 prototypeDigest 生成。

## 原始所选内容与固化结果

| final 相对文件 | 选择时 SHA-256 | 固化后 SHA-256 |
| --- | --- | --- |
| app.js | 1603a29e6fc7a8221818de47d9685412bbb2ecad7e4f2b616be7cf8b042f2ee7 | 618c7aa000362c056883b06955ffe3a7ed1d3728b5531d0d01774d98d765e587 |
| assets/Geist-Variable.woff2 | a369fcf5628ea2aa4e1b9e2ec6a5b3624e365bda588e1f0f2f12b564f728fbb8 | a369fcf5628ea2aa4e1b9e2ec6a5b3624e365bda588e1f0f2f12b564f728fbb8 |
| assets/GeistMono-Variable.woff2 | fba8f577f38a2bbcbe818efa6348dd58f36303a10b8737c42fefad275be563ab | fba8f577f38a2bbcbe818efa6348dd58f36303a10b8737c42fefad275be563ab |
| assets/LICENSE.txt | 930853ee1daa68554d9e35c8a9175affb74f699fad9a5da6ee5ebe76379d9137 | 930853ee1daa68554d9e35c8a9175affb74f699fad9a5da6ee5ebe76379d9137 |
| index.html | 577dba41861f260cc0e69870bccb325852a20b36769250907bccfd6ba878eeac | 0f2ec5ff05dd613dc9f435728d0d9166b03e9f3ad4c6909895ac9f14793a7a45 |
| styles.css | 8c723943230ebf59e1d5b583e21fea9fbae88beb399d4fdeb19817d9982dd098 | fcc91215a6eb8e58351dcdb3790ef2fb1a4aeb8adfb21e263157ca9cd69d28b9 |

变化限于：移除仅供其他候选的 JS/CSS 分支；移除“三个方案”导航并标记已确认方案。字体与许可保持逐字一致；主任务 DOM 保持逐字一致。无浏览器执行或运行截图声明。
