import { t as translate } from '../../../../shared/i18n';
import type { WorkspaceTab } from '../../core/workspace/model';

/**
 * What a tab is called. The fixed pages are named in the current language when they are drawn, so a language
 * switch renames them; a name the user typed always wins.
 */
export function tabTitle(tab: WorkspaceTab, t: typeof translate = translate): string {
	if (tab.customTitle) return tab.customTitle;
	if (tab.kind !== 'page') return tab.title;
	switch (tab.page) {
		case 'board':
			return t('agent.workspace.nav.board');
		case 'usage':
			return t('agent.workspace.nav.stats');
	}
}
