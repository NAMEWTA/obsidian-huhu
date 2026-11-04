import { t } from '../../../shared/i18n';
import { openReactDialog } from '../../../ui/react/dialog';
import type { SafeService } from '../services/safe-service';
import { QuickPick } from './QuickPick';

/** One command-owned modal in the initiating Document; disposal cancels work before deferred React unmount. */
export function openQuickPick(owner: HTMLElement, service: SafeService, signal?: AbortSignal): () => void {
	if (signal?.aborted || owner.ownerDocument.defaultView?.closed || !owner.isConnected) return () => {};
	const cancellation = new AbortController();
	const modal = openReactDialog(owner, {
		title: t('safe.quick.title'),
		description: t('safe.quick.description'),
		className: 'max-h-[85vh] overflow-y-auto sm:max-w-xl',
		canClose: () => { cancellation.abort(); return true; },
		onClose: () => { cancellation.abort(); signal?.removeEventListener('abort', close); },
		content: close => <QuickPick service={service} signal={cancellation.signal} onClose={() => { cancellation.abort(); close(); }} />,
	});
	const close = () => { cancellation.abort(); modal.close(); };
	signal?.addEventListener('abort', close, { once: true });
	return close;
}
