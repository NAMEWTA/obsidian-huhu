import { registerMessages } from '../../../shared/i18n';

export const messages = {
	en: {
		"health.page.selectRepair": "Select repair",
		"health.page.planInvalid": "This repair plan has expired or the data changed. Generate a new plan, or rescan if needed.",
		"health.page.selectedRepairs": "{count} selected",
	},
	zh: {
		"health.page.selectRepair": "选择修复",
		"health.page.planInvalid": "修复计划已过期或数据已变化。请重新生成计划，必要时重新扫描。",
		"health.page.selectedRepairs": "已选择 {count} 项",
	},
};

registerMessages(messages);
