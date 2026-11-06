# 体检恢复次按钮局部修正候选

Session: 20261105T094057Z
Task: 158-repair-health-primary
Status: completed

## 聚焦交接

实施者native:/root/cleanup_final；按158与Root精确补充的primary残余清理要求实施，无委派。正式仓库仅本REPORT，无源/样式/产物/状态/Evidence/index/原报告写入、无提交或用户vault/账号/剪贴板/真实宿主操作。候选唯一src/modules/health/ui/HealthPage.tsx；继续事务保主操作，恢复备份改次操作，原recover('resume'/'rollback')、确认/计划freshness/TTL及数据完全不改。

AlertDialogAction实际不接受variant，内部cn(buttonVariants(primary),className)。因此只在目标action的className使用现有buttonVariants(secondary)，并显式shadow-none/dark:shadow-none/hover:opacity-100覆盖primary独有残余；导入既有buttonVariants，不扩公共API，不换确认组件、不新增确认流程/文案/业务状态。

## 产物与验证

真实before来自正式当前单源，冻结时逐字匹配；私有tree只有目标生产源候选（临时driver与生成CSS不入patch）。独占冻结：

- /tmp/huhu-health-primary/ready.patch SHA256 1268c1da3f7f3eb3c0b33283618b5f4705868e9af4258be10711a6fcf47888b7。
- /tmp/huhu-health-primary/ready-manifest.json SHA256 a9aad1dad034ea5fc8060fdf228fa8f052dcfd88d8e6cde984dcbc14366138ac；before/after SHA256/mode及实际根完整记录。

实际候选检查：

- node node_modules/vitest/vitest.mjs run src/modules/health/ui/HealthPage.dom.test.tsx src/modules/health/ui/HealthPage.real.dom.test.tsx：0，2文件15项，tests.log；含真实恢复handler、取消、stale/外导航失效边界。
- node node_modules/eslint/bin/eslint.js src/modules/health/ui/HealthPage.tsx --max-warnings 0：0，lint.log。
- node scripts/build-tailwind.mjs；随后node scripts/build-styles.mjs --write：均0，仅写/tmp私有tree生成CSS，css.log；未生成正式产物。
- 私有node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-11 --matrix redesign --out /tmp/huhu-health-primary/render-hover：0。仅临时driver的纸/墨两代表组合，不是正式矩阵；真实HealthPage与原T11的真实scanner/repair fixture配对，依次计划→确认→部分结果→恢复dialog，测目标action与同组resume；完整编译图在result.inputs，不伪称正式66/858。
- 正式根git apply --check --whitespace=error /tmp/huhu-health-primary/ready.patch：0，未应用。

实际生成CSS/DOM合并：恢复按钮只保secondary的raised背景/fg/边线，原hover:opacity-90与primary有色shadow类已被cn合并消除，目标有显式shadow-none/dark:shadow-none/hover:opacity-100。纸/墨computed背景分别rgb(255,255,255)/rgb(37,35,31)，与resume的accent背景不同；阴影均为Tailwind五组透明零尺寸shadow（等价无可见阴影）。CDP mouseMoved后matches(:hover)=true且opacity=1、无可见阴影；环境matchMedia(hover:hover)=false，因此不把此结果当真实fine硬件完整hover媒体验收。实际生成的secondary/hover100/暗色shadow-none utility及最终合并类作为primary残余清理依据，Root最终硬件/矩阵仍持有适用范围。

首次临时Chrome断言误以无阴影必须序列化为字面none，实际透明零尺寸shadow导致126；只修临时断言接受等价透明零值后纸/墨两组0，未改产品掩盖失败。原render-final与render-hover回执均保留。低影响局部外观不加镜像单测；未运行全仓类型或正式bundle。

## 问题与下一步

交Root批量应用后统一截图/既定矩阵与产物。未改变领域风险/授权/确认边界，未做真实Obsidian/popout、正式66/858或全产品E2E，不是独立review，不裁定T11或T14通过。return0；return校验后停止158全部读写，按Root新160继续任务命中局部精修。
