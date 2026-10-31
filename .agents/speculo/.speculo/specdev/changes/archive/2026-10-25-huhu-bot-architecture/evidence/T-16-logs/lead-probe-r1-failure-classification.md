# Root 独立恢复探针首轮失败分类

r1 四个普通探针实际 exit1 / Wait8.205s；坏CP与持久Stop故障两例通过。原始输入、探针和日志保留在 lead-recovery-e2e-r1.json 指定的固定副本，没有改写。

1. 原回执输入变异实际正确返回 Kind=IDEMPOTENCY_CONFLICT、Reason=IDEMPOTENCY_INPUT_MISMATCH。Root误把Kind传入只比较Reason的测试helper，探针断言有误。r2同时精确断言实际公开Kind和Reason。
2. Root误把服务关闭后的interrupted Run视为终态，要求配置pin清零。仅添加SQL读回的外部overlay保留原断言并再次失败（lead-drain-diagnostic-r1.log，实际Wait3.670s）：真实known charge5=1、configPins=1、taskPins=0、interrupted=1、canceled=0、slots=0。Spec§9允许持久中断，恢复须保留原配置；实际ReleaseTerminalPinsInTx只清理succeeded/failed/canceled。因此这条保留是恢复合同，不能以清零迎合Root探针。r2断言实际结算、零预留/槽位、interrupted原配置保留，再通过公开CAS Cancel进入canceled并验证pin释放、原结算不变。

仅修改Root外部探针，无生产或永久测试修改，原四组场景与超时不减。r1失败和诊断保留，不记为产品修复；r2重新验证改正断言及首次执行的race/真实TS链。
