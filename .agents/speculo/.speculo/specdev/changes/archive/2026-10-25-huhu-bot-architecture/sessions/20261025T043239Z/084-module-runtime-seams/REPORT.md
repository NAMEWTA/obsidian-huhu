# T20 只读组合准备

Session: 20261025T043239Z
Task: 084-module-runtime-seams
Status: completed

## 聚焦交接

已沿当前实际模块注册表、受管 transport、Host 工厂与三个客户端整理未来 T20 最小装配和退出清单；没有激活 T20、写生产/测试或运行产品。当前仅有 BOT_CLIENT 键声明，Bot manifest/module/安装器/Profile 选择和服务发布均未装配。群显示流由 GroupClient 私有 EventClient 持有，RecoveryClient 尚不能经公开入口重锚它；已列原 T13 owner 的目标公开转发与共享实例注入两种局部选择及生命周期影响。未来模块必须分别持有同 Profile/epoch 的 uncertain 原 controller、Host 真 Promise drain、Go 停受理/排空和实际 child.exited，不将页面关闭、shutdown ACK 或本地 closed 当作全部结束。本任务只交准备事实，不宣称 T16/T20、AC 或 Goal 完成。

## 产物与验证

- [interfaces-and-owners.md](interfaces-and-owners.md)：实际文件/函数/行段、现有输入输出、T01/T02/T05/T07/T13/T16/T17–20/T27 owner 边界、最小实施序列和未来可证伪反例。明确冷启动只加载清单/类型/键，Node/Go/UI 延后；移动端不可用；不导入 Agent/PTY 私有安装器或进程，失败不牵连其他模块。
- [source-manifest.json](source-manifest.json)：65个只读来源逐 SHA，排序 `path + NUL + sha + LF` 摘要为 `156ac1c7ec387754a1bb22c4a64a852abd452268ca24dd753b462b9506e24ba0`；另逐一对照082九个源码/测试，漂移 `[]`。HEAD/base仍 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- [observations.json](observations.json)：实际只读命令类别（cat/rg/nl/sed、JSON读取、存在性与SHA计算）、缺文件的真实观察、预留方法implemented=false和not-run边界。读取不存在的 module/manifest 等只证明尚无实物；旧T20预期不能冒充当前已装配。
- 当前接口输入：API `ff921139bdd82f2c6e2b83892fc499489ccef93183e7f827fe6709ec4697a401`，schema `a4daa358204d607614ddd15f62aeede4f0e161fe31498cee55c43dc7540de534`。Go080/081仍收尾；source-manifest为此刻静态来源，不冒充联合输入冻结或产品通过。
- 原082 REPORT `39be2985e7a68cb83f06477850a7591c4777428b5717170792ac3128aa4b8e6b`、Root `evidence/082-lead-return.json`已只读复用，原报告没有回写。081的06日志确有实际 TS/Go恢复单项10观察绿并Wait，但同命令另Source fixture失败；084没有重跑，不将该单项或消息升格为T16总接纳。
- 视觉仍沿已批准唯一final方向。006/repair-2的技术源码摘要与原批准摘要不同，旧check-ready/preview诊断不改写、不冒用为新批准；本轮未做页面、截图或宿主验收，也不要求用户再次选方案。
- 未跑产品、测试、构建、编译、网络、真实Provider/keyring/Obsidian/目标OS；没有派遣Agent、提交、推送、发布，没有改永久知识、正式状态、旧报告或082任何文件。所有只读命令已结束，无自有产品/检查进程。

## 问题与下一步

本次只读交付无阻塞。Root后续正式T20窗口需先校准公共MODULE_IDS/BOT_CLIENT重连发布及原T13群目标重锚接缝；安装/资产信任/Profile选择与T17–19真实能力分别由对应owner提供，不以schema占位或第二manager绕过。Host现有5分钟租约无独立renew API，新attach使旧来源proof失效，未来模块不能本地延长expiresAt或静默复制Grant；具体生命周期组合列在清单中。

页面只释放本地订阅；原Run恢复controller跨同Profile/epoch重连必须保留，uncertain只显式retry原命令。正常停用可await模块dispose；宿主onunload不等待async，必须在首个await前同步停准入/重连并建立既有close后备。Host不可取消Promise、Go实际drain、child.exited分别等待或明确unknown，不能用kill推断外部效果消失。

亲自return结构校验与最后来源复核见return-validation.json/final-recheck.json；正式状态与后续授权仍由Root维护。本任务产物完成后停写，不启动所列后续工作。
