import { useId, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, KeyRound, UserRound } from 'lucide-react';
import { Button } from '../../../ui/components/button';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { ConfirmDialog } from '../../../ui/components/huhu/ConfirmDialog';
import { cn } from '../../../ui/lib/utils';
import { useT } from '../../../ui/react/hooks';
import { credentialLabel, entryLabel, type SafeCredential, type SafeEntry } from '../core/model';
import { EntryIcon } from './EntryIcon';
import { safeErrorKey } from './SafeDialogs';

export interface EntryActions {
	busy: boolean;
	open(entry: SafeEntry): void;
	copy(value: string, kind: 'username' | 'password'): void;
	openUrl(url: string): void;
}

/** A website as shown in a row: no scheme, no `www.`, no trailing slash. */
export function displayUrl(url: string): string {
	return url.trim().replace(/^[a-z][a-z0-9+.-]*:\/\/(www\.)?/i, '').replace(/\/+$/, '');
}

const hoverActions = 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100';

function CopyButtons({ credential, actions, className }: { credential: SafeCredential; actions: EntryActions; className?: string }) {
	const t = useT();
	return <div className={cn('flex shrink-0 items-center', className)}>
		<ActionButton type="button" size="icon-sm" label={t('safe.copyUsername')} disabled={actions.busy || !credential.username} onClick={() => actions.copy(credential.username, 'username')}><UserRound /></ActionButton>
		<ActionButton type="button" size="icon-sm" label={t('safe.copyPassword')} disabled={actions.busy || !credential.password} onClick={() => actions.copy(credential.password, 'password')}><KeyRound /></ActionButton>
	</div>;
}

function AccountRow({ credential, actions }: { credential: SafeCredential; actions: EntryActions }) {
	const t = useT();
	return <li className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 border-t border-border/50 py-1.5">
		<div className="grid min-w-0 gap-x-3 gap-y-0.5 @lg:grid-cols-2">
			<span className="min-w-0 break-words text-[13px]">{credentialLabel(credential) || t('safe.unnamedAccount')}</span>
			<span className="min-w-0 break-words text-xs text-muted-foreground">{[credential.phone, credential.email].filter(Boolean).join(' · ')}</span>
			{credential.notes && <p className="m-0 whitespace-pre-wrap break-words text-xs text-muted-foreground @lg:col-span-2">{credential.notes}</p>}
			{credential.relations.length > 0 && <span className="text-xs text-muted-foreground">{t('safe.relationCount', { count: credential.relations.length })}</span>}
		</div>
		<CopyButtons credential={credential} actions={actions} />
	</li>;
}

function OpenUrlButton({ entry, actions }: { entry: SafeEntry; actions: EntryActions }) {
	const t = useT();
	return entry.url ? <ActionButton type="button" size="icon-sm" label={t('safe.openWebsite')} disabled={actions.busy} onClick={() => actions.openUrl(entry.url)}><ExternalLink /></ActionButton> : null;
}

function AccountCount({ count }: { count: number }) {
	const t = useT();
	return <>{t('safe.accountCount', { count })}</>;
}

/** Every entry has the same disclosure, including single and planned accounts. Columns share fixed proportions. */
function EntryRow({ entry, actions }: { entry: SafeEntry; actions: EntryActions }) {
	const t = useT();
	const [expanded, setExpanded] = useState(false);
	const accountsId = useId();
	const first = entry.credentials[0]!;
	const label = entryLabel(entry) || t('safe.unnamedEntry');
	return <li className="min-w-0 rounded-md border-b border-border/50 hover:bg-accent/50 focus-within:bg-accent/50">
		<div className="group flex min-w-0 items-center gap-1 pr-1">
			<button type="button" className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 @lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]" onClick={() => actions.open(entry)} disabled={actions.busy}>
				<EntryIcon entry={entry} size="sm" />
				<span className="min-w-0">
					<span className="block truncate text-[13px] leading-tight font-medium" title={label}>{label}</span>
					{entry.url && entry.title && <span className="block truncate text-xs leading-tight text-muted-foreground" title={entry.url}>{displayUrl(entry.url)}</span>}
				</span>
				<span className="col-start-2 min-w-0 text-xs text-muted-foreground @lg:col-start-auto">
					<span className="block truncate" title={credentialLabel(first)}>{credentialLabel(first) || t('safe.unnamedAccount')}</span>
					<span className="block truncate" title={entry.notes || first.notes}>{[...entry.tags, entry.notes || first.notes].filter(Boolean).join(' · ')}</span>
				</span>
			</button>
			<Button type="button" variant="ghost" size="sm" className="shrink-0 text-muted-foreground" disabled={actions.busy} aria-expanded={expanded} aria-controls={accountsId} aria-label={t(expanded ? 'safe.collapseAccounts' : 'safe.expandAccounts', { title: label })} onClick={() => setExpanded(value => !value)}>
				{expanded ? <ChevronDown /> : <ChevronRight />}<AccountCount count={entry.credentials.length} />
			</Button>
			<span className={cn('flex w-8 shrink-0', hoverActions)}><OpenUrlButton entry={entry} actions={actions} /></span>
		</div>
		{expanded && <ul id={accountsId} className="m-0 mb-1 grid list-none gap-0 py-0 pr-2 pl-4 @md:pl-11">
			{entry.credentials.map(credential => <AccountRow key={credential.id} credential={credential} actions={actions} />)}
		</ul>}
	</li>;
}

/** Tiles in a responsive grid: the first accounts are listed with their copy buttons. */
function EntryCard({ entry, actions }: { entry: SafeEntry; actions: EntryActions }) {
	const t = useT();
	const label = entryLabel(entry) || t('safe.unnamedEntry');
	const shown = entry.credentials.slice(0, 3);
	const more = entry.credentials.length - shown.length;
	return <li className="group/card flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5 text-card-foreground hover:border-muted-foreground/40">
		<div className="group flex items-center gap-1">
			<button type="button" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => actions.open(entry)} disabled={actions.busy}>
				<EntryIcon entry={entry} size="md" />
				<span className="min-w-0 flex-1">
					<span className="block truncate text-[13px] leading-tight font-medium" title={label}>{label}</span>
					{entry.url && entry.title && <span className="block truncate text-xs leading-tight text-muted-foreground" title={entry.url}>{displayUrl(entry.url)}</span>}
				</span>
			</button>
			<span className={cn('flex shrink-0', hoverActions)}><OpenUrlButton entry={entry} actions={actions} /></span>
		</div>
		{entry.tags.length > 0 && <p className="m-0 break-words text-xs text-muted-foreground">{entry.tags.join(' · ')}</p>}
		<ul className="m-0 grid list-none gap-0 p-0">
			{shown.map(credential => <li key={credential.id} className="flex min-w-0 items-center gap-1">
				<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={credentialLabel(credential)}>{credentialLabel(credential) || t('safe.unnamedAccount')}</span>
				<CopyButtons credential={credential} actions={actions} />
			</li>)}
		</ul>
		{more > 0 && <button type="button" className="self-start rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => actions.open(entry)} disabled={actions.busy}>{t('safe.moreAccounts', { count: more })}</button>}
	</li>;
}

export function EntryRows({ entries, actions }: { entries: SafeEntry[]; actions: EntryActions }) {
	const t = useT();
	return <ul className="@container m-0 flex list-none flex-col gap-0.5 p-0" aria-label={t('safe.records')}>
		{entries.map(entry => <EntryRow key={entry.id} entry={entry} actions={actions} />)}
	</ul>;
}

export function EntryCards({ entries, actions }: { entries: SafeEntry[]; actions: EntryActions }) {
	const t = useT();
	return <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(15rem,100%),1fr))] gap-2 p-0" aria-label={t('safe.records')}>
		{entries.map(entry => <EntryCard key={entry.id} entry={entry} actions={actions} />)}
	</ul>;
}

export function TrashRows({ entries, busy, onRestore, onDelete }: { entries: SafeEntry[]; busy: boolean; onRestore: (entry: SafeEntry) => void; onDelete: (entry: SafeEntry) => Promise<void> }) {
	const t = useT();
	return <ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-label={t('safe.trash')}>
		{entries.map(entry => <li key={entry.id} className="flex min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
			<EntryIcon entry={entry} size="sm" />
			<span className="min-w-0 flex-1">
				<span className="block truncate text-[13px] leading-tight font-medium" title={entryLabel(entry)}>{entryLabel(entry)}</span>
				<span className="block truncate text-xs leading-tight text-muted-foreground">{t('safe.accountCount', { count: entry.credentials.length })}</span>
			</span>
			<Button variant="outline" size="sm" disabled={busy} onClick={() => onRestore(entry)}>{t('safe.restoreEntry')}</Button>
			<ConfirmDialog title={t('safe.deleteTitle')} description={t('safe.deleteDescription')} destructive confirmLabel={t('safe.deleteEntry')} onConfirm={async () => {
				try { await onDelete(entry); } catch (cause) { throw new Error(t(safeErrorKey(cause))); }
			}}><Button variant="ghost" size="sm" disabled={busy}>{t('safe.deleteEntry')}</Button></ConfirmDialog>
		</li>)}
	</ul>;
}
