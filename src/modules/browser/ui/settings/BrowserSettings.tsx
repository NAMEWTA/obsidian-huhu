import { useCallback, useState, useSyncExternalStore } from 'react';
import type { BrowserWorkspaceApi } from '../../api';
import { Button } from '../../../../ui/components/button';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { useT } from '../../../../ui/react/hooks';
import { BrowserActionError, actionError } from '../BrowserActionError';
export function browserSettingsPage(api: BrowserWorkspaceApi, openWorkspace: () => Promise<void>) {
	return function Page() {
		return <BrowserSettings api={api} openWorkspace={openWorkspace} />;
	};
}
function BrowserSettings({ api, openWorkspace }: { api: BrowserWorkspaceApi; openWorkspace(): Promise<void> }) {
	const t = useT();
	const state = useSyncExternalStore(
		useCallback((listener) => api.subscribe(listener), [api]),
		useCallback(() => api.getState(), [api]),
	);
	const [pending, setPending] = useState(false),
		[error, setError] = useState('');
	const run = async (work: () => Promise<unknown>) => {
		setPending(true);
		setError('');
		try {
			await work();
		} catch (reason) {
			setError(actionError(reason));
		} finally {
			setPending(false);
		}
	};
	return (
		<SettingsSection title={t('browser.v2.runtime')}>
			<p className="text-sm text-muted-foreground">{t('browser.v2.runtimeDescription')}</p>
			<p role="status" className="text-sm">
				{state.availability.state === 'ready' ? state.availability.version : t('browser.v2.unavailable')}
			</p>
			{state.persistence === 'unavailable' && (
				<p className="text-sm text-muted-foreground">{t('browser.v2.ephemeralExplanation')}</p>
			)}
			{state.readOnly && (
				<p role="alert" className="text-sm text-destructive">
					{t('browser.v2.readOnly')}
				</p>
			)}
			<BrowserActionError code={error} />
			<div className="flex flex-wrap gap-2">
				<Button disabled={pending || state.readOnly} onClick={() => void run(() => api.installRuntimeBundle())}>
					{t('browser.v2.installRuntime')}
				</Button>
				<Button variant="outline" disabled={pending} onClick={() => void run(() => api.refreshRuntime())}>
					{t('browser.v2.refreshRuntime')}
				</Button>
				<Button variant="outline" disabled={pending} onClick={() => void run(openWorkspace)}>
					{t('browser.v2.openWorkspace')}
				</Button>
			</div>
			{state.cleanupPending > 0 && (
				<div className="flex flex-wrap items-center gap-2">
					<p className="text-sm">{t('browser.v2.cleanupPending', { count: state.cleanupPending })}</p>
					<Button
						variant="outline"
						disabled={pending}
						onClick={() => void run(() => api.retryPendingCleanup())}
					>
						{t('browser.v2.retryCleanup')}
					</Button>
				</div>
			)}
		</SettingsSection>
	);
}
