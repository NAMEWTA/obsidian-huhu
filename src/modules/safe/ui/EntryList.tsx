import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, KeyRound, UserRound } from 'lucide-react';
import { Button } from '../../../ui/components/button';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { ConfirmDialog } from '../../../ui/components/huhu/ConfirmDialog';
import { cn } from '../../../ui/lib/utils';
import { useT } from '../../../ui/react/hooks';
import { entryLabel, type SafeCredential, type SafeEntry } from '../core/model';
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
		<ActionButton type="button" size="icon-sm" label={t('safe.copyUsername')} disabled={actions.busy} onClick={() => actions.copy(credential.username, 'username')}><UserRound /></ActionButton>
		<ActionButton type="button" size="icon-sm" label={t('safe.copyPassword')} disabled={actions.busy} onClick={() => actions.copy(credential.password, 'password')}><KeyRound /></ActionButton>
	</div>;
}

function AccountRow({ credential, actions }: { credential: SafeCredential; actions: EntryActions }) {
	return <li className="flex min-w-0 items-center gap-2 rounded-md py-0.5 pl-2">
		<span className="min-w-0 flex-1 truncate text-[13px]" title={credential.username}>{credential.username}</span>
		{credential.notes && <span className="hidden max-w-[40%] shrink truncate text-xs text-muted-foreground @md:inline" title={credential.notes}>{credential.notes.split('\n')[0]}</span>}
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

/** Dense one-line rows: icon, title and website, then the username or the number of accounts. */
function EntryRow({ entry, actions }: { entry: SafeEntry; actions: EntryActions }) {
	const t = useT();
	const [expanded, setExpanded] = useState(false);
	const multiple = entry.credentials.length > 1;
	const first = entry.credentials[0]!;
	const label = entryLabel(entry);
	return <li className="min-w-0 rounded-md hover:bg-accent/50 focus-within:bg-accent/50">
		<div className="group flex items-center gap-1 pr-1">
			<button type="button" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => actions.open(entry)} disabled={actions.busy}>
				<EntryIcon entry={entry} size="sm" />
				<span className="min-w-0 flex-1">
					<span className="block truncate text-[13px] leading-tight font-medium" title={label}>{label}</span>
					{entry.url && entry.title && <span className="block truncate text-xs leading-tight text-muted-foreground" title={entry.url}>{displayUrl(entry.url)}</span>}
				</span>
				{!multiple && <span className="hidden max-w-[40%] shrink truncate text-xs text-muted-foreground @md:block" title={first.username}>{first.username}</span>}
			</button>
			{multiple
				? <Button type="button" variant="ghost" size="xs" className="shrink-0 text-muted-foreground" aria-expanded={expanded} aria-label={t(expanded ? 'safe.collapseAccounts' : 'safe.expandAccounts', { title: label })} onClick={() => setExpanded(value => !value)}>
					{expanded ? <ChevronDown /> : <ChevronRight />}<AccountCount count={entry.credentials.length} />
				</Button>
				: <CopyButtons credential={first} actions={actions} className={hoverActions} />}
			<span className={cn('flex shrink-0', hoverActions)}><OpenUrlButton entry={entry} actions={actions} /></span>
		</div>
		{multiple && expanded && <ul className="m-0 mb-1 grid list-none gap-0 py-0 pr-1 pl-10">
			{entry.credentials.map(credential => <AccountRow key={credential.id} credential={credential} actions={actions} />)}
		</ul>}
	</li>;
}

/** Tiles in a responsive grid: the first accounts are listed with their copy buttons. */
function EntryCard({ entry, actions }: { entry: SafeEntry; actions: EntryActions }) {
	const t = useT();
	const label = entryLabel(entry);
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
		<ul className="m-0 grid list-none gap-0 p-0">
			{shown.map(credential => <li key={credential.id} className="flex min-w-0 items-center gap-1">
				<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={credential.username}>{credential.username}</span>
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
