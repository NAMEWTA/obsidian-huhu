import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { ArrowLeft, Download, FileInput, KeyRound, LayoutGrid, List, LockKeyhole, MoreHorizontal, Plus, Search, Trash2, Vault } from 'lucide-react';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Label } from '../../../ui/components/label';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { SegmentedControl } from '../../../ui/components/huhu/SegmentedControl';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../../ui/components/dropdown-menu';
import { useOwnerWindow, useT } from '../../../ui/react/hooks';
import { useVisible } from '../../../ui/react/contexts';
import { collectTags, searchEntries, validateMasterPassword, type SafeEntry } from '../core/model';
import type { MergeSummary } from '../core/merge';
import type { LockPolicy } from '../core/policy';
import type { SafePreferences } from '../services/preferences';
import type { SafeService, SafeState } from '../services/safe-service';
import { ImportDialog, RestoreDialog } from './BackupDialogs';
import { TagManager } from './EntryTags';
import { EntryDialog } from './EntryDialog';
import { EntryCards, EntryRows, TrashRows, type EntryActions } from './EntryList';
import { ChangePasswordDialog, SafeErrorMessage, SecretInput, safeErrorKey, useSafeAction } from './SafeDialogs';
import { lockRuleLines } from './lock-rules';

function useLockPolicy(service: SafeService): LockPolicy {
	return useSyncExternalStore(listener => service.subscribePolicy(listener), () => service.lockPolicy());
}

/** No route, title or workbench state contains record data. The complete subtree belongs to one epoch. */
export function SafePage({ service, preferences }: { service: SafeService; preferences: SafePreferences }) {
	const state = useStore(service.store);
	const win = useOwnerWindow();
	const visible = useVisible();
	useEffect(() => {
		if (!visible) service.leave('switch');
	}, [service, visible]);
	useEffect(() => {
		const doc = win.document;
		const focus = () => { service.checkDeadline(); };
		const visibility = () => {
			if (doc.visibilityState === 'hidden') service.leave('switch');
			else service.checkDeadline();
		};
		win.addEventListener('focus', focus);
		doc.addEventListener('visibilitychange', visibility);
		visibility();
		return () => {
			win.removeEventListener('focus', focus);
			doc.removeEventListener('visibilitychange', visibility);
		};
	}, [service, win]);
	// Discard forms and decrypted DOM on a page switch without treating it as a page close.
	if (!visible) return null;
	return state.status === 'unlocked'
		? <UnlockedSafe key={state.generation} service={service} state={state} preferences={preferences} />
		: <LockedSafe key={state.generation} service={service} state={state} />;
}

function LockedSafe({ service, state }: { service: SafeService; state: SafeState }) {
	const t = useT();
	const id = useId();
	const policy = useLockPolicy(service);
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [restore, setRestore] = useState(false);
	const action = useSafeAction(service);
	const creating = state.status === 'absent';
	const busy = state.busy || action.busy;
	const submit = () => {
		if (creating && password !== confirmation) { action.setError('safe.passwordMismatch'); return; }
		void action.run(async () => {
			if (creating) validateMasterPassword(password);
			const secret = password;
			setPassword('');
			setConfirmation('');
			if (creating) await service.create(secret);
			else await service.unlock(secret);
		});
	};
	return <section className="flex h-full min-h-0 flex-col overflow-y-auto scrollbar-sleek p-4" aria-label={t('safe.title')}>
		<div className="m-auto flex w-full max-w-xs flex-col gap-3 py-6">
			<div className="flex flex-col items-center gap-1.5 text-center">
				<Vault className="size-8 text-muted-foreground" aria-hidden />
				<h2 className="m-0 text-base font-semibold text-foreground">{t(state.status === 'error' ? 'safe.readErrorTitle' : creating ? 'safe.createTitle' : 'safe.lockedTitle')}</h2>
				{state.status !== 'error' && <p className="m-0 text-xs text-muted-foreground">{t(creating ? 'safe.createDescription' : 'safe.lockedDescription')}</p>}
			</div>
			{state.status === 'loading' ? <p role="status" className="m-0 text-center text-sm text-muted-foreground">{t('safe.loading')}</p> : state.status === 'error' ? <>
				<SafeErrorMessage error={safeErrorKey(state.error)} />
				<Button size="sm" disabled={busy} onClick={() => { void action.run(() => service.probe()); }}>{t('safe.retry')}</Button>
			</> : <form className="grid gap-2.5" onSubmit={event => { event.preventDefault(); submit(); }} aria-busy={busy}>
				<div className="grid gap-1.5">
					<Label htmlFor={`${id}-master`}>{t('safe.masterPassword')}</Label>
					<SecretInput id={`${id}-master`} className="h-8" value={password} onChange={event => setPassword(event.currentTarget.value)} disabled={busy} required autoFocus aria-describedby={creating ? `${id}-hint` : undefined} />
				</div>
				{creating && <>
					<div className="grid gap-1.5"><Label htmlFor={`${id}-confirm`}>{t('safe.confirmPassword')}</Label><SecretInput id={`${id}-confirm`} className="h-8" value={confirmation} onChange={event => setConfirmation(event.currentTarget.value)} required disabled={busy} /></div>
					<p id={`${id}-hint`} className="m-0 text-xs text-muted-foreground">{t('safe.masterHint')} {t('safe.noRecovery')}</p>
				</>}
				<SafeErrorMessage error={action.error || (state.error ? safeErrorKey(state.error) : '')} />
				<Button type="submit" size="sm" disabled={busy || !password}>{t(busy ? 'safe.busy' : creating ? 'safe.create' : 'safe.unlock')}</Button>
			</form>}
			{state.status !== 'loading' && <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={busy} onClick={() => setRestore(true)}>{t('safe.restore')}</Button>}
			<ul className="m-0 grid list-none gap-0.5 p-0 text-center text-xs text-muted-foreground" aria-label={t('safe.rules')}>
				{lockRuleLines(t, policy).map(line => <li key={line}>{line}</li>)}
			</ul>
		</div>
		{restore && <RestoreDialog service={service} onClose={() => setRestore(false)} />}
	</section>;
}

type Notice = { key: string; params?: Record<string, string | number> };

function importNotice(summary: MergeSummary): Notice {
	return { key: 'safe.import.notice', params: { added: summary.addedEntries, merged: summary.mergedEntries, skipped: summary.skippedEntries } };
}

function UnlockedSafe({ service, state, preferences }: { service: SafeService; state: SafeState; preferences: SafePreferences }) {
	const t = useT();
	const win = useOwnerWindow();
	const id = useId();
	const policy = useLockPolicy(service);
	const mode = useSyncExternalStore(listener => preferences.subscribe(listener), () => preferences.viewMode());
	const [query, setQuery] = useState('');
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [trash, setTrash] = useState(false);
	const [editing, setEditing] = useState<{ entry?: SafeEntry } | null>(null);
	const [dialog, setDialog] = useState<'password' | 'import' | 'replace' | 'tags' | null>(null);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [upgradeDismissed, setUpgradeDismissed] = useState(false);
	const action = useSafeAction(service);
	const entries = searchEntries(state.entries, query, trash, selectedTags);
	const busy = state.busy || action.busy;
	const openEntry = (entry?: SafeEntry) => {
		if (!service.checkDeadline()) return;
		setEditing({ entry });
	};
	const toggleTrash = () => { setTrash(value => !value); setQuery(''); setNotice(null); };
	const actions: EntryActions = {
		busy,
		open: openEntry,
		copy: (value, kind) => { void action.run(() => service.copy(value, win), () => setNotice({ key: kind === 'username' ? 'safe.copiedUsername' : 'safe.copiedPassword' })); },
		openUrl: url => { void action.run(() => service.openUrl(url, win)); },
	};
	const showUpgrade = state.upgraded && !upgradeDismissed;
	return <section className="flex h-full min-h-0 flex-col gap-2 p-3 @container" aria-label={t('safe.title')} onPointerDownCapture={() => service.touch()} onKeyDownCapture={() => service.touch()} onWheelCapture={() => service.touch()}>
		<div className="flex flex-wrap items-center gap-2">
			{trash && <>
				<Button size="sm" variant="outline" onClick={toggleTrash}><ArrowLeft />{t('safe.backToRecords')}</Button>
				<h2 className="m-0 text-sm font-medium text-foreground">{t('safe.trash')}</h2>
			</>}
			<div className="relative min-w-[min(100%,10rem)] flex-1">
				<Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
				<Input id={`${id}-search`} type="search" aria-label={t('safe.search')} title={t(trash ? 'safe.trashHint' : 'safe.searchHint')} className="h-8 pl-8 text-[13px] md:text-[13px]" value={query} onChange={event => { if (service.checkDeadline()) setQuery(event.currentTarget.value); }} placeholder={t('safe.searchPlaceholder')} autoComplete="off" spellCheck={false} />
			</div>
			{!trash && <SegmentedControl<'list' | 'cards'> size="sm" ariaLabel={t('safe.view')} value={mode} onChange={value => preferences.setViewMode(value)} options={[
				{ value: 'list', label: <List className="size-3.5" />, ariaLabel: t('safe.viewList'), tooltip: t('safe.viewList') },
				{ value: 'cards', label: <LayoutGrid className="size-3.5" />, ariaLabel: t('safe.viewCards'), tooltip: t('safe.viewCards') },
			]} />}
			{!trash && <Button size="sm" onClick={() => openEntry()} disabled={busy}><Plus />{t('safe.addEntry')}</Button>}
			<Button size="sm" variant="outline" onClick={() => service.lock()}><LockKeyhole />{t('safe.lock')}</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild><ActionButton size="icon-sm" label={t('safe.menu')} disabled={busy}><MoreHorizontal /></ActionButton></DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={() => setDialog('tags')}>{t('safe.manageTags')}</DropdownMenuItem>
					<DropdownMenuItem onSelect={toggleTrash}><Trash2 />{t(trash ? 'safe.backToRecords' : 'safe.trash')}</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => { void action.run(async () => {
						const exported = await service.exportBackup(win);
						if (exported && action.current()) setNotice({ key: 'safe.exported' });
					}); }}><Download />{t('safe.export')}</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setDialog('import')}><FileInput />{t('safe.import.menu')}</DropdownMenuItem>
					<DropdownMenuItem variant="destructive" onSelect={() => setDialog('replace')}>{t('safe.replaceMenu')}</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => setDialog('password')}><KeyRound />{t('safe.changePassword')}</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
		<div className="flex max-h-28 shrink-0 flex-wrap gap-1 overflow-y-auto scrollbar-sleek" role="group" aria-label={t('safe.filterTags')}>
			{collectTags(state.entries).map(tag => <Button key={tag} size="sm" variant={selectedTags.includes(tag) ? 'secondary' : 'ghost'} aria-pressed={selectedTags.includes(tag)} onClick={() => setSelectedTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])}>{tag}</Button>)}
			{selectedTags.length > 0 && <Button size="sm" variant="outline" onClick={() => setSelectedTags([])}>{t('safe.clearTags')}</Button>}
		</div>
		{(action.error || state.error) && <div className="flex flex-wrap items-center gap-2" role="status"><SafeErrorMessage error={action.error || safeErrorKey(state.error)} /><Button size="xs" variant="ghost" onClick={() => { action.setError(''); service.clearError(); }}>{t('safe.dismissError')}</Button></div>}
		{showUpgrade && !trash && <p role="status" className="m-0 flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
			<span className="min-w-0 flex-1">{t('safe.upgradeNotice')}</span>
			<Button size="xs" variant="ghost" onClick={() => setUpgradeDismissed(true)}>{t('safe.dismissError')}</Button>
		</p>}
		<div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-sleek">
			{entries.length === 0 ? <EmptyState icon={trash ? <Trash2 /> : <Vault />} title={t(query.trim() || selectedTags.length ? 'safe.noResults' : trash ? 'safe.emptyTrash' : 'safe.emptyTitle')} description={!trash && !query.trim() && !selectedTags.length ? t('safe.emptyDescription') : trash && !query.trim() && !selectedTags.length ? t('safe.trashHint') : undefined} />
				: trash ? <TrashRows entries={entries} busy={busy} onRestore={entry => { void action.run(() => service.restoreEntry(entry)); }} onDelete={entry => service.deleteEntry(entry)} />
				: mode === 'cards' ? <EntryCards entries={entries} actions={actions} /> : <EntryRows entries={entries} actions={actions} />}
		</div>
		<div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
			<span role={notice ? 'status' : undefined}>{notice ? t(notice.key, notice.params) : t('safe.recordCount', { count: entries.length })}</span>
			<span className="min-w-0 truncate" title={lockRuleLines(t, policy).join(' ')}>{policy.idleMs === null ? t('safe.rule.idleNever') : t('safe.rule.idle', { minutes: Math.round(policy.idleMs / 60_000) })}</span>
		</div>
		{editing && <EntryDialog service={service} entry={editing.entry} onClose={() => setEditing(null)} />}
		{dialog === 'tags' && <TagManager service={service} onClose={() => setDialog(null)} changed={() => setSelectedTags([])} />}
		{dialog === 'password' && <ChangePasswordDialog service={service} onClose={() => setDialog(null)} />}
		{dialog === 'import' && <ImportDialog service={service} onClose={() => setDialog(null)} onImported={summary => setNotice(importNotice(summary))} />}
		{dialog === 'replace' && <RestoreDialog service={service} onClose={() => setDialog(null)} />}
	</section>;
}
