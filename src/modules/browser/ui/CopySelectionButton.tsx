import { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import type { BrowserWorkspaceApi, HumanPageRequest } from '../api';
import { Button } from '../../../ui/components/button';
import { useT } from '../../../ui/react/hooks';
import { captureHumanPage, sameHumanPage } from './human-authority';

export function CopySelectionButton({
	api,
	authority,
	disabled,
	report,
}: {
	api: BrowserWorkspaceApi;
	authority(): HumanPageRequest | undefined;
	disabled: boolean;
	report(reason: unknown): void;
}) {
	const t = useT();
	const [pending, setPending] = useState(false);
	const [notice, setNotice] = useState<'empty' | 'copied' | 'truncated'>();
	const generation = useRef(0);
	useEffect(() => {
		generation.current++;
		return () => {
			generation.current++;
		};
	}, [authority]);
	return (
		<>
			<Button
				size="sm"
				variant="outline"
				disabled={disabled || pending}
				onClick={(event) => {
					const scope = authority();
					const page = scope && captureHumanPage(api, scope);
					const win = event.currentTarget.ownerDocument.defaultView;
					if (!scope || !page || !win) return;
					const current = generation.current;
					setPending(true);
					setNotice(undefined);
					void (async () => {
						try {
							const selected = await api.readSelection(scope);
							if (generation.current !== current || !sameHumanPage(api, scope, authority(), page))
								throw new Error('control_revoked');
							if (!selected.text) {
								setNotice('empty');
								return;
							}
							if (!win.navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
							await win.navigator.clipboard.writeText(selected.text);
							if (generation.current === current) setNotice(selected.truncated ? 'truncated' : 'copied');
						} catch (reason) {
							if (generation.current === current) report(reason);
						} finally {
							if (generation.current === current) setPending(false);
						}
					})();
				}}
			>
				<Copy />
				{t('browser.v2.copySelection')}
			</Button>
			{notice && (
				<span role="status" className="text-xs text-muted-foreground">
					{t(
						notice === 'empty'
							? 'browser.v2.selectionEmpty'
							: notice === 'copied'
								? 'browser.v2.selectionCopied'
								: 'browser.v2.selectionTruncated',
					)}
				</span>
			)}
		</>
	);
}
