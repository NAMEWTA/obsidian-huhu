import type { PageCreate } from '../../../app/contracts/workbench-host';
import { createElement } from 'react';
import { ReactSurface } from '../../../ui/react/surface';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { t } from '../../../shared/i18n';
import type { BotWorkbenchHost } from './BotWorkbenchPage';
import { BotWorkbenchPage } from './BotWorkbenchPage';

export class BotPresentation extends ReactSurface {
	constructor(
		context: NativeSurfaceContext,
		private readonly host: BotWorkbenchHost,
		private sessionId?: string,
	) {
		super(context);
	}
	getViewType(): string {
		return 'huhu-bot-chat';
	}
	getDisplayText(): string {
		return t('huhubot.chat.title');
	}
	getIcon(): string {
		return 'bot';
	}
	override onOpen(): Promise<void> {
		void super.onOpen();
		this.rerender();
		return Promise.resolve();
	}
	selectSession(id?: string): void {
		if (id !== this.sessionId) {
			this.sessionId = id;
			this.rerender();
		}
	}
	override getState(): Record<string, unknown> {
		return this.sessionId ? { sessionId: this.sessionId } : {};
	}
	protected renderContent() {
		return createElement(BotWorkbenchPage, {
			key: this.sessionId ?? 'none',
			host: this.host,
			selectedSessionId: this.sessionId,
			onSessionChanged: (id) => {
				this.sessionId = id;
				this.context.changed?.();
			},
		});
	}
}

export const createBotPage =
	(host: BotWorkbenchHost): PageCreate =>
	async (context, target, state, signal) => {
		if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
		const surface = new BotPresentation(
			context,
			host,
			target.resourceId ?? (typeof state.sessionId === 'string' ? state.sessionId : undefined),
		);
		return {
			surface,
			getTarget: () => target,
			getState: () => surface.getState(),
			navigate: async (next) => {
				if (next.resourceId) surface.selectSession(next.resourceId);
			},
		};
	};

/** Stable page-loader name used by the workbench contribution. */
export const createChatPage = createBotPage;
