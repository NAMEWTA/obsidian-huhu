# T09–11 固定浏览器资产只读预查

2026-10-27，native:/root/implement_t01（gpt-6.1-sol/high）下载并读取，Lead实际回读index/方法说明与ABOUT、Widevine许可原文。未开始平台票，未运行、安装或修改程序。机器索引见[cft-assets-preflight-index.json](cft-assets-preflight-index.json)，原始SHA256 `d4eedc4356d62b88316f3deb2a4da702903a633265a5767b9b02a4ed53185a9c`。

[官方固定版本JSON](https://googlechromelabs.github.io/chrome-for-testing/156.0.8078.47.json)确认version156.0.8078.47/revision1706539。实际下载：

|平台|官方源|字节|SHA256|
|---|---|---:|---|
|win64|[chrome-win64.zip](https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.47/win64/chrome-win64.zip)|209154801|`a4e0d57245e167e98a9d465af1e3774d2b4ec9f04e483d19bcd97a6f63cf46dd`|
|mac-arm64|[chrome-mac-arm64.zip](https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.47/mac-arm64/chrome-mac-arm64.zip)|194932023|`ad7f2b49a4dc679af286b1b1b386670d93ca7868079f69012d21ba0ac8293df3`|
|mac-x64|[chrome-mac-x64.zip](https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.47/mac-x64/chrome-mac-x64.zip)|205405847|`5a38b8e3d621514fff0775dcae678a152ce378890188c88eef79fc97aa59fccd`|

Windows入口相对包根为chrome.exe，305文件，无symlink。两个mac包入口均为`Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`，各344文件/324目录/5链接，主程序0755。Framework中Versions/Current指向156.0.8078.47，Resources/Libraries/Helpers及Framework二进制通过Versions/Current间接解析；五链均解析到包内现有成员。未观察重复、逃逸、悬空、循环、加密或异常类型。

当前assemble-browser-runtime.mjs与runtime/assets.ts仅接受链接直指普通文件，会拒绝全部五条。后续需按有界内部链接图校验并保持.app布局，不能任意放开symlink。该结论只是当前策略与实际ZIP结构比较，不证明平台可运行。

临时目录`/tmp/huhu34-cft-assets-sYo25c`保留三ZIP、原始JSON、逐成员inventory/模式/解析链、方法脚本与许可副本，共582MiB（ZIP609492671字节）。后续作者可核SHA复用；不再需要时可整目录回收，本轮暂留。完整inventory摘要见机器索引；未复制二进制到仓库。

仅读central directory、symlink内容与识别出的ABOUT/LICENSE；程序资源正文未解压检查，CRC只覆盖已读条目。未验证真实架构、签名/notarization/quarantine、sandbox或平台运行，不能借下载/模式宣称实机支持。

## 原包许可待核点

三包ABOUT指向chrome://credits与chrome://terms，不能作为完整许可闭包。两mac包实际含WidevineCdm/LICENSE，原文注明非开源且使用/修改/分发需单独Google许可；Lead未据下载推断分发授权。原文在上述缓存的licenses/mac-arm64/000-LICENSE及mac-x64/000-LICENSE。后续平台打包需核官方分发契约与现有LICENSE/NOTICE闭包，不能仅保留一个LICENSE便称已获授权，也不能未经分析删除已签名.app组件并声称签名保持。尚无发行/发布动作。


## 官方许可与分发说明补核

2026-10-27，native:/root/implement_t01聚焦一手公开事实回执。未找到明确允许HUHU整包重分发CfT二进制的官方授权；这只是检索结论，不是最终法律判断，也不阻止继续平台适配代码。尚无打包发布或远程写入。

- 固定tag的[Widevine许可](https://chromium.googlesource.com/chromium/src/+/refs/tags/156.0.8078.47/third_party/widevine/LICENSE?format=TEXT)与mac包原文一致；[构建开关](https://chromium.googlesource.com/chromium/src/+/refs/tags/156.0.8078.47/third_party/widevine/cdm/widevine.gni?format=TEXT)说明CfT随包携带CDM。许可要求不能由工具仓库许可证替代。
- [Chrome附加条款](https://www.google.com/chrome/terms/)针对可执行版本并引用[Google总条款的软件章节](https://policies.google.com/terms?hl=en#toc-software)；其使用许可与开源组件例外应分别核对，不能外推全部Chrome/CDM可再分发。
- GoogleChromeLabs/CfT工具仓库固定commit60da088a25f7715c3bb5f8c1bb472dc4c35ff1da的[许可证为Apache-2.0](https://github.com/GoogleChromeLabs/chrome-for-testing/blob/60da088a25f7715c3bb5f8c1bb472dc4c35ff1da/LICENSE)，不是MIT，且不等于下载浏览器的二进制许可证。
- [官方固定版本下载方法](https://developer.chrome.com/docs/automation-and-testing/download-test-binaries)提供JSON和原包获取，也说明CfT面向测试而非日常浏览。用户侧从官方源安装可复用现下载/摘要机制，减少HUHU托管副本；不因此宣称CDM许可与使用条件均解决。
- 固定源码[Chromium BSD许可](https://chromium.googlesource.com/chromium/src/+/refs/tags/156.0.8078.47/LICENSE)及GN的enable_widevine=false/bundle_widevine_cdm=false是另一技术候选，但仍需第三方闭包。[官方Chromium快照](https://www.chromium.org/getting-involved/download-chromium/)为尽力提供的revision构建，本次未确认同版本三平台无CDM且签名许可完整的现成发行，不能直接替换当前固定CfT合同。
- [Apple TN2206](https://developer.apple.com/library/archive/technotes/tn2206/_index.html)说明现代签名封存bundle与嵌套代码；删CDM可能破坏签名，不能先删组件便宣称mac支持。未实际验证包签名或删件结果。

现assemble会完整复制输入CfT并放HUHU三份声明，install从Google下载校摘要；THIRD-PARTY-NOTICES的上游声明保留不等于分发许可证明。后续T09–11/T32须将本地安装/代码适配、构建许可材料、对外分发授权明确区分；当前未选新发行源或改产品范围，正式发布本来不在本轮授权内。若最终打包方案必须改变已确认完整包合同，应先形成具体方案再处理缺失决定，不隐瞒此事实也不提前扩大成全局代码阻塞。
