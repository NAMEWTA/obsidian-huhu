import { registerMessages } from '../../../shared/i18n';

export const messages = {
	en: {
		'navigator.setting.profilesTitle': 'Vault profiles',
		'navigator.setting.profilesHint': 'Keep several views of the vault apart',
		'navigator.setting.profilesDesc':
			'Each profile has its own hiding rules, shortcuts, recent notes (per device) and banner. Switching changes what the navigator shows.',
		'navigator.setting.profileName': 'Name',
		'navigator.setting.profileBanner': 'Banner image',
		'navigator.setting.profileBannerDesc': 'Vault path of an image shown above the navigation pane.',
		'navigator.setting.profileUse': 'Use',
	},
	zh: {
		'navigator.setting.profilesTitle': '库配置档',
		'navigator.setting.profilesHint': '把库的多种视图分开保存',
		'navigator.setting.profilesDesc':
			'每个配置档有自己的隐藏规则、快捷方式、最近笔记（按设备）和横幅。切换后导航器显示的内容随之改变。',
		'navigator.setting.profileName': '名称',
		'navigator.setting.profileBanner': '横幅图片',
		'navigator.setting.profileBannerDesc': '显示在导航栏上方的图片，填库内路径。',
		'navigator.setting.profileUse': '切换到此',
	},
};

registerMessages(messages);
