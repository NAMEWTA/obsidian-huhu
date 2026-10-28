# Map21 Python 协议验证器维护补充

Root 已完整回读 080 的 `logs/32-validator-proposed.patch` 和当前 `contracts/hap/v0.1/validate.py`。080 的全局 Python 缺少模块是环境失败；使用既有隔离环境后，正向样本构造把 `historyScope.kind=none` 与范围字段同时填入，违反现有条件合同。两个失败保留，不能记为协议通过。

在 080 原 T01 `contracts/hap/v0.1/**` 写集内，由原 owner `/root/foundation_go` 仅维护 `validate.py`：144 个方法形状采用唯一生成器已有的规范正向样本；验证无重复且精确覆盖所有 params/result 定义；25 个 decimal 负例从对应正向值深拷贝变异；全部 276 个共享正负样本仍交独立 Python JSON Schema 2020-12 验证。不得改 schema、生成器、固定样本、运行时或依赖锁来迎合检查。

采用已安装的 `/tmp/huhubot-contract-validator`，无需安装依赖。原 owner 先落地这一个文件，再记录精确前后 SHA 与联合输入差异并重跑 Python 验证、两项架构检查。已通过且输入不受影响的 Go vet、唯一生成器和包测试复用。所有进程实际 Wait 后更新最终报告与清单，再由 Root 回读接纳；此补充不扩大产品行为、票据数或依赖图。
