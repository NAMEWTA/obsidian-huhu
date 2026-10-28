import { createElement } from 'react';
import type { PageCreate } from '../../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { ReactSurface } from '../../../../ui/react/surface';
import { t } from '../../../../shared/i18n';
import type { BotDataHost } from './DataPage';
import { DataPage } from './DataPage';

class DataSurface extends ReactSurface {
	constructor(
		context: NativeSurfaceContext,
		private readonly host: BotDataHost,
	) {
		super(context);
	}
	getViewType(): string {
		return 'huhu-bot-data';
	}
	getDisplayText(): string {
		return t('huhubot.data.title');
	}
	getIcon(): string {
		return 'database';
	}
	override onOpen(): Promise<void> {
		void super.onOpen();
		this.rerender();
		return Promise.resolve();
	}
	protected renderContent() {
		return createElement(DataPage, { host: this.host });
	}
}

export const createDataPage =
	(host: BotDataHost): PageCreate =>
	async (context, target, _state, signal) => {
		if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
		const surface = new DataSurface(context, host);
		return { surface, getTarget: () => target, navigate: async () => {} };
	};
