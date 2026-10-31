import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { registerMessages } from '../../../../shared/i18n/index';
import { Button } from '../../../../ui/components/button';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { useT } from '../../../../ui/react/hooks';
import {
	BackupError,
	type ImportOptions,
	type ImportReport,
	type PackageView,
	type PlanView,
} from '../../core/backup/model';
import type { BackupActions } from '../../services/backup/actions';
import { messages } from '../../../../shared/i18n/lazy/backup';

registerMessages(messages);

type Translate = ReturnType<typeof useT>;
type Failure = { error: unknown; retry: () => void };

function describeError(t: Translate, error: unknown): { message: string; code: string } {
	if (!(error instanceof BackupError)) return { message: t('agent.backup.error.unexpected'), code: 'unexpected' };
	const d = error.detail;
	const text = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
	if (error.code === 'package-invalid')
		return {
			message: t(`agent.backup.package.${text(d.packageCode)}`, {
				version: text(d.version),
				field: text(d.field),
			}),
			code: `package-invalid:${text(d.packageCode)}`,
		};
	return {
		message: t(`agent.backup.error.${error.code}`, {
			busy: Array.isArray(d.busy) ? d.busy.join(', ') : '',
			owner: text(d.owner),
			section: text(d.section),
			done: text(d.done),
			total: text(d.total),
		}),
		code: error.code === 'partial-import' ? `partial-import:${text(d.failure)}` : error.code,
	};
}

function Alert({ children }: { children: ReactNode }) {
	return (
		<div role="alert" className="space-y-1 rounded-md border border-destructive/50 p-3 text-sm">
			{children}
		</div>
	);
}

function Manifest({ view }: { view: PackageView }) {
	const t = useT();
	const definitions = view.manifest.entries.filter((e) => e.section === 'automation-definition');
	const rows = view.manifest.entries.filter((e) => e.section !== 'automation-definition');
	const countText = (count?: number) =>
		count === undefined ? t('agent.backup.manifest.noCount') : t('agent.backup.manifest.items', { count });
	return (
		<div className="space-y-2 text-sm">
			<h4 className="font-medium">{t('agent.backup.manifest.title')}</h4>
			<p className="text-xs text-muted-foreground">
				{t('agent.backup.manifest.created', {
					date: new Date(view.createdAt).toLocaleString(),
					vault: view.vaultName,
					device: view.sourceDevice,
				})}
			</p>
			<ul className="list-disc space-y-1 pl-5">
				{rows.map((entry) => (
					<li key={entry.id}>
						{t('agent.backup.manifest.row', {
							section: t(`agent.backup.section.${entry.section}`),
							device: entry.device ?? t('agent.backup.manifest.shared'),
							count: countText(entry.count),
							via: t(`agent.backup.via.${entry.via}`),
						})}
					</li>
				))}
				{definitions.length > 0 && (
					<li>
						{t('agent.backup.manifest.row', {
							section: t('agent.backup.section.automation-definition'),
							device: t('agent.backup.manifest.shared'),
							count: countText(definitions.length),
							via: t(`agent.backup.via.${definitions[0]!.via}`),
						})}
					</li>
				)}
			</ul>
			<h4 className="font-medium">{t('agent.backup.exclusions.title')}</h4>
			<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
				{view.manifest.exclusions.map((category) => (
					<li key={category}>{t(`agent.backup.exclusion.${category}`)}</li>
				))}
			</ul>
			{view.manifest.notes.length > 0 && (
				<>
					<h4 className="font-medium">{t('agent.backup.notes.title')}</h4>
					<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
						{view.manifest.notes.map((note, index) => (
							<li key={index}>
								{t(`agent.backup.note.${note.code}`, {
									count: note.count ?? 0,
									section: note.section ? t(`agent.backup.section.${note.section}`) : '',
								})}
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}

function Plan({ plan }: { plan: PlanView }) {
	const t = useT();
	return (
		<div className="space-y-2 text-sm">
			{plan.problems.length > 0 && (
				<Alert>
					<ul className="list-disc space-y-1 pl-5">
						{plan.problems.map((problem, index) => (
							<li key={index}>
								{t(`agent.backup.problem.${problem.code}`, {
									device: problem.device ?? '',
									subject: problem.subject ?? '',
									section: problem.section ? t(`agent.backup.section.${problem.section}`) : '',
								})}
							</li>
						))}
					</ul>
				</Alert>
			)}
			{plan.warnings.length > 0 && (
				<ul className="list-disc space-y-1 pl-5">
					{plan.warnings.map((warning, index) => (
						<li key={index}>
							{t(`agent.backup.warning.${warning.code}`, {
								count: warning.count ?? 0,
								subject: warning.subject ?? '',
							})}
						</li>
					))}
				</ul>
			)}
			{plan.outcomes.length > 0 && (
				<>
					<h4 className="font-medium">{t('agent.backup.import.plan')}</h4>
					<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
						{summarize(plan).map(([key, section, action, count]) => (
							<li key={key}>
								{t('agent.backup.outcome', {
									section: `${t(`agent.backup.section.${section}`)}${count > 1 ? ` ×${count}` : ''}`,
									action: t(`agent.backup.action.${action}`),
								})}
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}

/** One line per section and outcome; hundreds of definition documents are one line, not hundreds. */
function summarize(
	plan: PlanView,
): Array<[string, PlanView['outcomes'][number]['section'], PlanView['outcomes'][number]['action'], number]> {
	const lines = new Map<
		string,
		[string, PlanView['outcomes'][number]['section'], PlanView['outcomes'][number]['action'], number]
	>();
	for (const outcome of plan.outcomes) {
		const key = `${outcome.section}|${outcome.device ?? ''}|${outcome.action}`;
		const line = lines.get(key);
		if (line) line[3]++;
		else lines.set(key, [key, outcome.section, outcome.action, 1]);
	}
	return [...lines.values()];
}

function Report({ report }: { report: ImportReport | undefined }) {
	const t = useT();
	if (!report) return <p className="text-sm text-muted-foreground">{t('agent.backup.report.none')}</p>;
	const done = report.batches.filter((b) => b.status === 'done').length;
	return (
		<div className="space-y-2 text-sm">
			<p>
				{t(`agent.backup.report.status.${report.status}`, { code: report.errorCode ?? '' })}{' '}
				{report.batches.length > 1 && t('agent.backup.import.steps', { done, total: report.batches.length })}
			</p>
			{report.disabledAutomations.length > 0 && (
				<>
					<p>{t('agent.backup.report.disabled')}</p>
					<ul className="list-disc pl-5">
						{report.disabledAutomations.map((item) => (
							<li key={item.id}>{item.name}</li>
						))}
					</ul>
				</>
			)}
			{report.reauthorize.length > 0 && (
				<>
					<p>{t('agent.backup.report.reauthorize')}</p>
					<ul className="list-disc pl-5">
						{report.reauthorize.map((item) => (
							<li key={item.spaceId}>
								{item.name} — {item.path}
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}

type Loaded =
	| { kind: 'loading' }
	| { kind: 'unavailable' }
	| { kind: 'error'; message: string }
	| { kind: 'ready'; actions: BackupActions };

/**
 * Settings tab: export a package, see the real manifest (collections and omissions), check an import before anything
 * is changed, run it, and keep the failure entry (reason, retry, where the recovery copies are) on screen.
 */
export function BackupSection({ load }: { load: () => Promise<BackupActions | undefined> }) {
	const t = useT();
	const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });
	useEffect(() => {
		let live = true;
		load().then(
			(actions) => live && setLoaded(actions ? { kind: 'ready', actions } : { kind: 'unavailable' }),
			(error: unknown) =>
				live && setLoaded({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
		);
		return () => {
			live = false;
		};
	}, [load]);
	return (
		<SettingsSection title={t('agent.backup.heading')} description={t('agent.backup.intro')}>
			<div aria-live="polite" className="space-y-4">
				{loaded.kind === 'loading' && <p role="status">{t('agent.backup.loading')}</p>}
				{loaded.kind === 'unavailable' && <p>{t('agent.backup.unavailable')}</p>}
				{loaded.kind === 'error' && (
					<p role="alert">{t('agent.backup.loadFailed', { message: loaded.message })}</p>
				)}
				{loaded.kind === 'ready' && <Ready actions={loaded.actions} />}
			</div>
		</SettingsSection>
	);
}

function Ready({ actions }: { actions: BackupActions }) {
	const t = useT();
	const ids = { file: useId(), adopt: useId(), archives: useId(), missing: useId() };
	const active = useRef<AbortController | undefined>(undefined);
	const [busy, setBusy] = useState<'export' | 'read' | 'check' | 'import' | undefined>();
	const [exported, setExported] = useState<{ path: string; view: PackageView }>();
	const [pkg, setPkg] = useState<{ text: string; view: PackageView }>();
	const [adopt, setAdopt] = useState('');
	const [archives, setArchives] = useState(false);
	const [archiveMissing, setArchiveMissing] = useState(false);
	const [plan, setPlan] = useState<PlanView>();
	const [done, setDone] = useState<{ status: 'done' | 'unchanged'; changed: number }>();
	const [failure, setFailure] = useState<Failure>();
	const [report, setReport] = useState<ImportReport>();

	const refreshReport = useCallback(() => {
		actions.lastReport().then(setReport, () => setReport(undefined));
	}, [actions]);
	useEffect(refreshReport, [refreshReport]);

	const options = (view = pkg?.view): ImportOptions => ({
		...(adopt ? { adoptDevice: adopt } : {}),
		...(archives && view ? { includeDevices: view.devices.filter((device) => device !== adopt) } : {}),
		archiveMissingDirectories: archiveMissing,
	});
	const run = async <T,>(
		what: NonNullable<typeof busy>,
		work: (signal: AbortSignal) => Promise<T>,
		retry: () => void,
	): Promise<T | undefined> => {
		const controller = new AbortController();
		active.current = controller;
		setBusy(what);
		setFailure(undefined);
		try {
			return await work(controller.signal);
		} catch (error) {
			setFailure({ error, retry });
			return undefined;
		} finally {
			active.current = undefined;
			setBusy(undefined);
		}
	};

	const doExport = () => {
		setDone(undefined);
		void run('export', (signal) => actions.exportPackage(signal), doExport).then((result) => result && setExported(result));
	};
	const doCheck = (next = options()) =>
		void run(
			'check',
			() => actions.preflight(pkg!.text, next),
			() => doCheck(next),
		).then((result) => result && setPlan(result));
	const doImport = () => {
		void run('import', (signal) => actions.runImport(pkg!.text, options(), signal), doImport).then((result) => {
			if (result) setDone({ status: result.status, changed: result.changed });
			refreshReport();
		});
		// A failed or partial attempt also changes the report the page shows.
	};
	const onFile = (file: File | undefined) => {
		setPkg(undefined);
		setPlan(undefined);
		setDone(undefined);
		setFailure(undefined);
		if (!file) return;
		void run(
			'read',
			async () => {
				const text = await file.text();
				return { text, view: await actions.inspect(text) };
			},
			() => onFile(file),
		).then((result) => {
			if (!result) return;
			setPkg(result);
			setAdopt(
				result.view.devices.includes(actions.device)
					? actions.device
					: result.view.devices.length === 1
						? result.view.devices[0]!
						: '',
			);
			setArchives(false);
		});
	};
	const change = (apply: () => void) => {
		apply();
		setPlan(undefined);
		setDone(undefined);
	};
	const described = failure && describeError(t, failure.error);
	const ready = !!plan && plan.problems.length === 0;

	return (
		<>
			{(busy === 'export' || busy === 'import') && (
				<Button size="sm" variant="outline" onClick={() => active.current?.abort()}>
					{t('agent.backup.cancel')}
				</Button>
			)}
			<div className="space-y-2">
				<h3 className="text-sm font-medium">{t('agent.backup.export.title')}</h3>
				<Button size="sm" variant="outline" disabled={!!busy} onClick={doExport}>
					{busy === 'export' ? t('agent.backup.export.running') : t('agent.backup.export.button')}
				</Button>
				{exported && (
					<div className="space-y-2">
						<p role="status" className="text-sm">
							{t('agent.backup.export.done', { path: exported.path })}
						</p>
						<Manifest view={exported.view} />
					</div>
				)}
				<p className="text-xs text-muted-foreground">{t('agent.backup.export.hint')}</p>
			</div>

			<div className="space-y-3">
				<h3 className="text-sm font-medium">{t('agent.backup.import.title')}</h3>
				<div className="space-y-1">
					<label htmlFor={ids.file} className="text-sm">
						{t('agent.backup.import.pick')}
					</label>
					<input
						id={ids.file}
						type="file"
						accept=".json,application/json"
						disabled={!!busy}
						className="block w-full text-sm"
						onChange={(event) => onFile(event.target.files?.[0])}
					/>
					{busy === 'read' && <p role="status">{t('agent.backup.import.reading')}</p>}
				</div>

				{pkg && (
					<>
						<Manifest view={pkg.view} />
						<div className="space-y-2 text-sm">
							<div className="flex flex-wrap items-center gap-2">
								<label htmlFor={ids.adopt}>{t('agent.backup.import.adopt')}</label>
								<select
									id={ids.adopt}
									value={adopt}
									disabled={!!busy}
									className="h-8 rounded-md border border-border bg-background px-2 text-sm"
									onChange={(event) => change(() => setAdopt(event.target.value))}
								>
									<option value="">{t('agent.backup.import.adoptChoose')}</option>
									{pkg.view.devices.map((device) => (
										<option key={device} value={device}>
											{device}
										</option>
									))}
								</select>
							</div>
							<p className="text-xs text-muted-foreground">{t('agent.backup.import.adoptHint')}</p>
							{pkg.view.devices.length > 1 && (
								<label htmlFor={ids.archives} className="flex items-center gap-2">
									<input
										id={ids.archives}
										type="checkbox"
										checked={archives}
										disabled={!!busy}
										onChange={(event) => change(() => setArchives(event.target.checked))}
									/>
									{t('agent.backup.import.archives')}
								</label>
							)}
							<label htmlFor={ids.missing} className="flex items-center gap-2">
								<input
									id={ids.missing}
									type="checkbox"
									checked={archiveMissing}
									disabled={!!busy}
									onChange={(event) => change(() => setArchiveMissing(event.target.checked))}
								/>
								{t('agent.backup.import.archiveMissing')}
							</label>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button size="sm" variant="outline" disabled={!!busy} onClick={() => doCheck()}>
								{busy === 'check' ? t('agent.backup.import.checking') : t('agent.backup.import.check')}
							</Button>
							<Button
								size="sm"
								disabled={!!busy || !ready || plan.unchanged || !!done}
								onClick={doImport}
							>
								{busy === 'import' ? t('agent.backup.import.running') : t('agent.backup.import.run')}
							</Button>
						</div>
						{plan && <Plan plan={plan} />}
						{ready && plan.unchanged && <p role="status">{t('agent.backup.import.unchanged')}</p>}
						{ready && !plan.unchanged && !done && <p role="status">{t('agent.backup.import.ready')}</p>}
					</>
				)}
				{done && (
					<p role="status" className="text-sm">
						{done.status === 'unchanged'
							? t('agent.backup.import.unchanged')
							: t('agent.backup.import.done', { count: done.changed })}
					</p>
				)}
				{failure && described && (
					<Alert>
						<p className="font-medium">{t('agent.backup.failure.title')}</p>
						<p>{t('agent.backup.failure.code', described)}</p>
						{failure.error instanceof BackupError && failure.error.code === 'partial-import' && (
							<p>{t('agent.backup.failure.resume')}</p>
						)}
						<p className="text-xs text-muted-foreground">{t('agent.backup.failure.copies')}</p>
						<Button size="sm" variant="outline" disabled={!!busy} onClick={failure.retry}>
							{t('agent.backup.failure.retry')}
						</Button>
					</Alert>
				)}
			</div>

			<div className="space-y-2">
				<h3 className="text-sm font-medium">{t('agent.backup.report.title')}</h3>
				<Report report={report} />
			</div>
		</>
	);
}
