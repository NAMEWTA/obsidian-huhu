# T32 联合构建边界预查

2026-10-27，Lead 只读核对 `package.json`、`scripts/bundle-budget.json`、`scripts/check-bundle.mjs` 与 T32 写集。未运行构建、包体测量或生成产物；当前还有多票未实施，不把局部状态作为最终构建证据。

## 生成链与验证

build 执行生产/test/worker 类型检查，生成 browser runtime/CLI、Tailwind 与 styles 检查，最后 esbuild。沿现 T32 归属串行维护 main.js/styles.css、worker/CLI及摘要、worker-digest.generated.json/main-source.generated.json；作者分片不写这些产物。

`check:bundle` 是内存 write:false 构建，统计启动静态闭包、模块激活与延后页面，同时与现有 styles.css 文件尺寸比较。它不能代替最终浏览器/CLI产物摘要闭包，也不能以旧styles通过声称新样式通过。

当前 budget 的 outputBytes=6407168、eagerBytes=128000、stylesBytes=1423360，分别紧贴合并基线实测6406487、127265、1423188；各模块激活单独限额，禁止eager依赖清单独立存在。新功能最终需要测量真实闭包并核对是否不必要提前载入，不能为通过而无理由扩大限额。预算规则允许有记录理由的调整，但 **T32 当前写集没有 scripts/bundle-budget.json**；若最终实测确认必要，先按实际范围合同补该确切路径并记录功能增量/闭包证据，不现在猜数或提前提高阈值。不能在其他票冻结审查期间改Map来源。

## 执行边界

最终按真实改动运行 build/lint/架构/i18n/包体/许可/文档等必需检查。测试配置含 native-integration 的真实 Chrome 用例；用户明确真实Chrome/helper集成/Obsidian/平台/视觉/性能验收由其执行，不能不加选择地运行会启动这些程序的总入口。纯逻辑、DOM、临时文件、合成IPC和临时Git仍可运行。各最终证据绑定同一源码与产物摘要，旧联合构建和宿主25场景仅为历史，不冒用。
