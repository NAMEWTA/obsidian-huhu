import type { PageCreate } from '../../../app/contracts/workbench-host';
import { createElement } from 'react';
import { ReactSurface } from '../../../ui/react/surface';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { t } from '../../../shared/i18n';
import type { BotWorkbenchHost } from './BotWorkbenchPage';
import { BotWorkbenchPage } from './BotWorkbenchPage';

export class BotPresentation extends ReactSurface {
	constructor(context: NativeSurfaceContext, private readonly host: BotWorkbenchHost) { super(context); }
	getViewType(): string { return 'huhu-bot-chat'; }
	getDisplayText(): string { return t('huhubot.chat.title'); }
	getIcon(): string { return 'bot'; }
	override onOpen(): Promise<void> {
		void super.onOpen();
		this.rerender();
		return Promise.resolve();
	}
	protected renderContent() { return createElement(BotWorkbenchPage, { host: this.host }); }
}

export const createBotPage = (host: BotWorkbenchHost): PageCreate => async (context, target, _state, signal) => {
	if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
	const surface = new BotPresentation(context, host);
	return {
		surface,
		getTarget: () => target,
		navigate: async () => { /* UI state stays in the surface; navigation never starts a run. */ },
	};
};

/** Stable page-loader name used by the workbench contribution. */
export const createChatPage = createBotPage;
