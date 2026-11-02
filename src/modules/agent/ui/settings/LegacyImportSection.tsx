import { useEffect, useState } from 'react';
import { registerMessages } from '../../../../shared/i18n/index';
import { messages } from '../../../../shared/i18n/lazy/migration';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { useT } from '../../../../ui/react/hooks';
import type { LegacyImportView } from '../../services/migrations/legacy-workbench';

registerMessages(messages);

type Loaded =
	{ kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; view: LegacyImportView | undefined };

/** Read-only report of the one-shot legacy import: counts, kept sources, unbound business and rollback guidance. */
export function LegacyImportSection({ load }: { load: () => Promise<LegacyImportView | undefined> }) {
	const t = useT();
	const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });
	useEffect(() => {
		let live = true;
		load().then(
			(view) => {
				if (live) setLoaded({ kind: 'ready', view });
			},
			(error: unknown) => {
				if (live) setLoaded({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
			},
		);
		return () => {
			live = false;
		};
	}, [load]);
	return (
		<SettingsSection title={t('agent.migration.heading')}>
			<div aria-live="polite" className="space-y-3 text-sm">
				{loaded.kind === 'loading' && <p role="status">{t('agent.migration.loading')}</p>}
				{loaded.kind === 'error' && (
					<p role="alert">{t('agent.migration.loadFailed', { message: loaded.message })}</p>
				)}
				{loaded.kind === 'ready' && !loaded.view && <p>{t('agent.migration.empty')}</p>}
				{loaded.kind === 'ready' && loaded.view?.problem && <Problem view={loaded.view} />}
				{loaded.kind === 'ready' && loaded.view?.state && !loaded.view.problem && <Report view={loaded.view} />}
			</div>
		</SettingsSection>
	);
}

function Problem({ view }: { view: LegacyImportView }) {
	const t = useT(),
		problem = view.problem!;
	const key =
		problem.kind === 'refused'
			? problem.reason === 'records-scope-mismatch'
				? 'scope'
				: 'records'
			: problem.kind === 'marker-unreadable'
				? 'marker'
				: problem.kind;
	return (
		<p role="alert">
			{t(`agent.migration.problem.${key}` as 'agent.migration.problem.scope', {
				code: problem.kind === 'failed' ? problem.code : '',
			})}
		</p>
	);
}

function Report({ view }: { view: LegacyImportView }) {
	const t = useT();
	const { layout, annotations, sources } = view.state!;
	const c = layout.counts;
	return (
		<>
			<p>
				{layout.spaceId
					? t('agent.migration.layout', {
							tabs: c.tabs,
							groups: c.groups,
							terminal: c.terminal,
							browser: c.browser,
							page: c.page,
						})
					: t('agent.migration.layoutKept', {
							status: t(`agent.migration.status.${layout.status}` as 'agent.migration.status.empty'),
						})}
			</p>
			{!layout.spaceId && layout.status !== 'empty' && <p>{t('agent.migration.reimport')}</p>}
			{view.sourceChanged && <p role="status">{t('agent.migration.sourceChanged')}</p>}
			{c.browser > 0 && layout.spaceId && <p>{t('agent.migration.browserNote')}</p>}
			{annotations.unattributable > 0 && <p>{t('agent.migration.annotations', { ...annotations })}</p>}
			{sources.accountIndex.state === 'present' && <p>{t('agent.migration.accountIndex')}</p>}
			<p>{t('agent.migration.unbound')}</p>
			<p className="text-xs text-muted-foreground">{t('agent.migration.rollback')}</p>
		</>
	);
}
