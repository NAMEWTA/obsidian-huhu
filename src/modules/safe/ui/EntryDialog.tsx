import { useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, ExternalLink, Eye, EyeOff, ImagePlus, ImageOff, LockKeyhole, Plus, Trash2, UserRound } from 'lucide-react';
import { useStore } from 'zustand';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Textarea } from '../../../ui/components/textarea';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/components/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../../ui/components/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../ui/components/dropdown-menu';
import { useOwnerWindow, useT } from '../../../ui/react/hooks';
import { MAX_CREDENTIALS, validateEntryInput, type CredentialInput, type EntryInput, type SafeEntry } from '../core/model';
import type { SafeService } from '../services/safe-service';
import { EntryIcon } from './EntryIcon';
import { DIALOG_TITLE_CLASS, SafeErrorMessage, SecretInput, useSafeAction } from './SafeDialogs';
import { canvasDecoder, imageToIcon } from './icon-file';

const newCredential = (): CredentialInput => ({ id: crypto.randomUUID(), username: '', password: '', notes: '' });

export function draftOf(entry?: SafeEntry): EntryInput {
	if (!entry) return { title: '', url: '', notes: '', icon: null, credentials: [newCredential()] };
	return {
		title: entry.title, url: entry.url, notes: entry.notes, icon: entry.icon,
		credentials: entry.credentials.map(({ id, username, password, notes }) => ({ id, username, password, notes })),
	};
}

const sameDraft = (a: EntryInput, b: EntryInput) => JSON.stringify(a) === JSON.stringify(b);
const compactInput = 'h-8 text-[13px] md:text-[13px]';

/**
 * Edit one entry: title, website, icon and note, then its accounts as compact blocks (username, password, note) that
 * can be added, removed and reordered. Everything is a draft in memory until Save.
 */
export function EntryDialog({ service, entry, onClose }: { service: SafeService; entry?: SafeEntry; onClose: () => void }) {
	const t = useT();
	const win = useOwnerWindow();
	const id = useId();
	const [initial] = useState(() => draftOf(entry));
	const [draft, setDraft] = useState(initial);
	const [previewId] = useState(() => entry?.id ?? crypto.randomUUID());
	const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
	const [focusId, setFocusId] = useState<string | null>(null);
	const [closing, setClosing] = useState<'close' | 'lock' | null>(null);
	const [notice, setNotice] = useState('');
	const fileInput = useRef<HTMLInputElement>(null);
	const action = useSafeAction(service);
	const serviceBusy = useStore(service.store, state => state.busy);
	const busy = action.busy || serviceBusy;
	const dirty = !sameDraft(draft, initial);
	const finishClose = (reason: 'close' | 'lock') => {
		onClose();
		if (reason === 'lock') service.lock();
	};
	const close = (reason: 'close' | 'lock') => {
		if (busy) return;
		if (dirty) setClosing(reason);
		else finishClose(reason);
	};
	const save = (reason: 'close' | 'lock' = 'close') => action.run(async () => {
		const input = validateEntryInput(draft);
		await service.saveEntry(input, entry);
	}, () => finishClose(reason));
	const edit = (change: (current: EntryInput) => EntryInput) => {
		if (!service.checkDeadline()) return;
		service.touch();
		setDraft(change);
		setNotice('');
	};
	const setField = (key: 'title' | 'url' | 'notes', value: string) => edit(current => ({ ...current, [key]: value }));
	const setCredential = (credentialId: string, key: 'username' | 'password' | 'notes', value: string) => edit(current => ({
		...current, credentials: current.credentials.map(item => item.id === credentialId ? { ...item, [key]: value } : item),
	}));
	const add = () => {
		const created = newCredential();
		setFocusId(created.id);
		edit(current => current.credentials.length >= MAX_CREDENTIALS ? current : { ...current, credentials: [...current.credentials, created] });
	};
	const remove = (credentialId: string) => edit(current => current.credentials.length <= 1 ? current : { ...current, credentials: current.credentials.filter(item => item.id !== credentialId) });
	const move = (credentialId: string, delta: number) => edit(current => {
		const index = current.credentials.findIndex(item => item.id === credentialId);
		const target = index + delta;
		if (index < 0 || target < 0 || target >= current.credentials.length) return current;
		const credentials = [...current.credentials];
		[credentials[index], credentials[target]] = [credentials[target]!, credentials[index]!];
		return { ...current, credentials };
	});
	const toggleReveal = (credentialId: string) => setRevealed(current => {
		const next = new Set(current);
		if (!next.delete(credentialId)) next.add(credentialId);
		return next;
	});
	const copy = (value: string, noticeKey: string) => action.run(() => service.copy(value, win), () => setNotice(noticeKey));
	const chooseIcon = (file: File | undefined) => {
		if (!file) return;
		void action.run(async () => {
			const icon = await imageToIcon(file, canvasDecoder(win.document));
			if (!action.current()) return;
			if (icon === null) action.setError('safe.error.icon');
			else edit(current => ({ ...current, icon }));
		});
	};
	const preview = { id: previewId, icon: draft.icon, title: draft.title, url: draft.url, credentials: draft.credentials };
	return <>
		<Dialog open onOpenChange={open => { if (!open) close('close'); }}>
			<DialogContent className="max-h-[90dvh] gap-3 overflow-y-auto p-5 scrollbar-sleek sm:max-w-2xl" showCloseButton={!busy} onPointerDownCapture={() => service.touch()} onKeyDownCapture={() => service.touch()}>
				<DialogHeader className="gap-0.5">
					<DialogTitle className={DIALOG_TITLE_CLASS}>{t(entry ? 'safe.editEntry' : 'safe.newEntry')}</DialogTitle>
					<DialogDescription className="text-xs">{t('safe.draftWarning')}</DialogDescription>
				</DialogHeader>
				<form className="@container grid gap-3" onSubmit={event => { event.preventDefault(); void save(); }} aria-busy={busy}>
					<div className="flex items-start gap-2.5">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button type="button" variant="ghost" className="size-10 shrink-0 p-0" aria-label={t('safe.iconMenu')} disabled={busy}><EntryIcon entry={preview} size="lg" /></Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuItem onSelect={() => fileInput.current?.click()}><ImagePlus />{t('safe.iconUpload')}</DropdownMenuItem>
								<DropdownMenuItem disabled={!draft.icon} onSelect={() => edit(current => ({ ...current, icon: null }))}><ImageOff />{t('safe.iconRemove')}</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" aria-label={t('safe.iconUpload')} tabIndex={-1}
							onChange={event => { const input = event.currentTarget; const file = input.files?.[0]; input.value = ''; chooseIcon(file); }} />
						<div className="grid min-w-0 flex-1 gap-2 @lg:grid-cols-2">
							<Input id={`${id}-title`} aria-label={t('safe.titleField')} placeholder={t('safe.titleField')} className={compactInput} value={draft.title} onChange={event => setField('title', event.currentTarget.value)} disabled={busy} autoComplete="off" autoFocus={!entry} />
							<div className="flex items-center gap-1">
								<Input id={`${id}-url`} aria-label={t('safe.urlField')} placeholder={t('safe.urlField')} className={compactInput} value={draft.url} onChange={event => setField('url', event.currentTarget.value)} disabled={busy} autoComplete="off" autoCapitalize="off" spellCheck={false} />
								<ActionButton type="button" size="icon-sm" label={t('safe.openWebsite')} disabled={busy || !draft.url} onClick={() => { void action.run(() => service.openUrl(draft.url, win)); }}><ExternalLink /></ActionButton>
							</div>
						</div>
					</div>
					<Textarea id={`${id}-notes`} rows={1} aria-label={t('safe.entryNotesField')} placeholder={t('safe.entryNotesField')} className="min-h-8 resize-none px-3 py-1.5 text-[13px] md:text-[13px]" value={draft.notes} onChange={event => setField('notes', event.currentTarget.value)} disabled={busy} autoComplete="off" spellCheck={false} />
					<div className="flex items-center justify-between gap-2">
						<h3 className="m-0 text-sm font-medium text-foreground">{t('safe.accounts')} <span className="font-normal text-muted-foreground tabular-nums">{draft.credentials.length}</span></h3>
						<Button type="button" size="sm" variant="outline" disabled={busy || draft.credentials.length >= MAX_CREDENTIALS} onClick={add}><Plus />{t('safe.addAccount')}</Button>
					</div>
					<ul className="m-0 grid list-none gap-2 p-0">
						{draft.credentials.map((credential, index) => {
							const label = (field: string) => `${t(field)} ${index + 1}`;
							const shown = revealed.has(credential.id);
							return <li key={credential.id} role="group" aria-label={t('safe.accountN', { n: index + 1 })} className="grid gap-1.5 rounded-md border border-border bg-muted/30 p-2">
								<div className="grid gap-1.5 @lg:grid-cols-2">
									<div className="flex items-center gap-1">
										<Input aria-label={label('safe.usernameField')} placeholder={t('safe.usernameField')} className={compactInput} value={credential.username} onChange={event => setCredential(credential.id, 'username', event.currentTarget.value)} disabled={busy} autoComplete="off" autoCapitalize="off" spellCheck={false} autoFocus={focusId === credential.id} />
										<ActionButton type="button" size="icon-sm" label={label('safe.copyUsername')} disabled={busy || !credential.username} onClick={() => { void copy(credential.username, 'safe.copiedUsername'); }}><UserRound /></ActionButton>
									</div>
									<div className="flex items-center gap-1">
										<SecretInput aria-label={label('safe.passwordField')} placeholder={t('safe.passwordField')} className={compactInput} value={credential.password} type={shown ? 'text' : 'password'} onChange={event => setCredential(credential.id, 'password', event.currentTarget.value)} disabled={busy} />
										<ActionButton type="button" size="icon-sm" label={label(shown ? 'safe.hidePassword' : 'safe.showPassword')} disabled={busy} onClick={() => toggleReveal(credential.id)}>{shown ? <EyeOff /> : <Eye />}</ActionButton>
										<ActionButton type="button" size="icon-sm" label={label('safe.copyPassword')} disabled={busy || !credential.password} onClick={() => { void copy(credential.password, 'safe.copiedPassword'); }}><Copy /></ActionButton>
									</div>
								</div>
								<div className="flex items-start gap-1">
									<Textarea aria-label={label('safe.accountNotesField')} placeholder={t('safe.accountNotesField')} rows={1} className="min-h-8 flex-1 resize-none px-3 py-1.5 text-[13px] md:text-[13px]" value={credential.notes} onChange={event => setCredential(credential.id, 'notes', event.currentTarget.value)} disabled={busy} autoComplete="off" spellCheck={false} />
									<div className="flex shrink-0 items-center">
										<ActionButton type="button" size="icon-sm" label={label('safe.moveUp')} disabled={busy || index === 0} onClick={() => move(credential.id, -1)}><ArrowUp /></ActionButton>
										<ActionButton type="button" size="icon-sm" label={label('safe.moveDown')} disabled={busy || index === draft.credentials.length - 1} onClick={() => move(credential.id, 1)}><ArrowDown /></ActionButton>
										<ActionButton type="button" size="icon-sm" label={label('safe.removeAccount')} disabled={busy || draft.credentials.length <= 1} onClick={() => remove(credential.id)}><Trash2 /></ActionButton>
									</div>
								</div>
							</li>;
						})}
					</ul>
					<SafeErrorMessage error={action.error} />
					{notice && <p role="status" className="m-0 text-xs text-muted-foreground">{t(notice)}</p>}
					<DialogFooter className="flex-row flex-wrap items-center gap-2 sm:justify-between">
						<div className="flex items-center">
							{entry && <Button type="button" variant="ghost" size="sm" disabled={busy || dirty} onClick={() => { void action.run(() => service.trashEntry(entry), onClose); }}><Trash2 />{t('safe.moveToTrash')}</Button>}
						</div>
						<div className="ml-auto flex items-center gap-2">
							<ActionButton type="button" size="icon-sm" label={t('safe.lock')} disabled={busy} onClick={() => close('lock')}><LockKeyhole /></ActionButton>
							<Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => close('close')}>{t('safe.cancel')}</Button>
							<Button type="submit" size="sm" disabled={busy}>{t(busy ? 'safe.busy' : 'safe.save')}</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
		<AlertDialog open={closing !== null} onOpenChange={open => { if (!open && !busy) setClosing(null); }}>
			<AlertDialogContent>
				<AlertDialogHeader><AlertDialogTitle className={DIALOG_TITLE_CLASS}>{t('safe.unsavedTitle')}</AlertDialogTitle><AlertDialogDescription>{t('safe.unsavedDescription')}</AlertDialogDescription></AlertDialogHeader>
				<SafeErrorMessage error={action.error} />
				<AlertDialogFooter className="flex-wrap">
					<Button variant="outline" size="sm" disabled={busy} onClick={() => setClosing(null)}>{t('safe.keepEditing')}</Button>
					<Button variant="secondary" size="sm" disabled={busy} onClick={() => { if (closing) finishClose(closing); }}>{t('safe.discard')}</Button>
					<Button size="sm" disabled={busy} onClick={() => { if (closing) void save(closing); }}>{t('safe.saveAndClose')}</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</>;
}
