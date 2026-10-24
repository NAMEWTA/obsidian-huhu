/** Terminal URL clicks share this policy with the browser engine; file references stay local. */
export function terminalWebLinkAction(
	settings: {
		linkTarget: 'huhu' | 'system';
		reverseLinkModifier: boolean;
		terminalLinkMenu: boolean;
	},
	event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
	source: 'terminal' | 'note' = 'terminal',
): 'huhu' | 'system' | 'menu' {
	const modifier = event.ctrlKey || event.metaKey;
	if (source === 'terminal' && settings.terminalLinkMenu && !modifier) return 'menu';
	return settings.reverseLinkModifier && modifier && event.shiftKey
		? settings.linkTarget === 'huhu'
			? 'system'
			: 'huhu'
		: settings.linkTarget;
}
