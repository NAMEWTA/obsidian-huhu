import './i18n';
// Interaction adapted from yeshimei/bz d76a0870329403247917a00c43019e203a2560a4 (MIT): src/password-vault/quick-pick.ts and render.ts.
// Copyright (c) 2026 叫我包仔
// Changes: React/HUHU controls, per-account results, no secret/notes search, existing safe session and picker cancellation.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { publishFeedback } from '../../../host/obsidian/feedback';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Label } from '../../../ui/components/label';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { DesignScope } from '../../../ui/react/design-scope';
import { useOwnerWindow, useT } from '../../../ui/react/hooks';
import { SecretInput, SafeErrorMessage, safeErrorKey } from './SafeDialogs';
import type { SafeService } from '../services/safe-service';

/** The caller owns the modal. Closing cancels only this picker's operations, not other unlocked surfaces. */
export function QuickPick({
	service,
	onClose,
	signal,
}: {
	service: SafeService;
	onClose: () => void;
	signal?: AbortSignal;
}) {
	const t = useT();
	const win = useOwnerWindow();
	const state = useStore(service.store);
	const id = useId();
	const [query, setQuery] = useState('');
	const [master, setMaster] = useState('');
	const [generated, setGenerated] = useState('');
	const [showGenerated, setShowGenerated] = useState(false);
	const [dismissed, setDismissed] = useState(false);
	const [selected, setSelected] = useState('');
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [busy, setBusy] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	const attachInput = useCallback((node: HTMLInputElement | null) => {
		const previous = input.current;
		if (previous && previous !== node) {
			previous.value = '';
			previous.removeAttribute('value');
		}
		input.current = node;
	}, []);
	const epoch = useRef(state.generation);
	const alive = useRef(true);
	const closed = useRef(false);
	const working = useRef(false);
	const cancellation = useRef(new AbortController());
	const latestOnClose = useRef(onClose);
	latestOnClose.current = onClose;
	const current = () =>
		alive.current &&
		!closed.current &&
		!win.closed &&
		!cancellation.current.signal.aborted &&
		epoch.current === service.store.getState().generation;
	const close = useCallback(() => {
		if (closed.current) return;
		closed.current = true;
		cancellation.current.abort();
		if (input.current) input.current.value = '';
		setQuery('');
		setMaster('');
		setGenerated('');
		setDismissed(true);
		latestOnClose.current();
	}, []);
	useEffect(() => {
		alive.current = true;
		if (cancellation.current.signal.aborted) cancellation.current = new AbortController();
		const unsubscribe = service.store.subscribe((next) => {
			if (next.generation !== epoch.current) close();
		});
		win.addEventListener('unload', close);
		signal?.addEventListener('abort', close, { once: true });
		if (signal?.aborted) close();
		const search = input.current;
		return () => {
			alive.current = false;
			unsubscribe();
			win.removeEventListener('unload', close);
			signal?.removeEventListener('abort', close);
			cancellation.current.abort();
			if (search) search.value = '';
		};
	}, [service, win, close, signal]);

	const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const rows = state.entries
		.filter((entry) => entry.deletedAt === null)
		.flatMap((entry) =>
			entry.credentials.map((account) => ({
				entryId: entry.id,
				credentialId: account.id,
				key: `${entry.id}/${account.id}`,
				title: entry.title,
				url: entry.url,
				username: account.username,
			})),
		)
		.filter((row) => terms.every((term) => `${row.title} ${row.url} ${row.username}`.toLowerCase().includes(term)));
	const active = rows.find((row) => row.key === selected) ?? rows[0];
	const activeIndex = active ? rows.indexOf(active) : -1;
	useEffect(() => {
		if (activeIndex >= 0)
			win.document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
	}, [active?.key, activeIndex, id, win]);
	const run = async (operation: () => Promise<void>, success?: string) => {
		if (working.current || !current()) return;
		working.current = true;
		setBusy(true);
		setError('');
		setNotice('');
		try {
			await operation();
			if (current() && success) {
				setNotice(success);
				publishFeedback(win, {
					operationId: crypto.randomUUID(),
					source: 'safe',
					message: { key: success },
					outcome: 'success',
					receipt: { committed: true },
				});
			}
		} catch (cause) {
			if (current()) setError(safeErrorKey(cause));
		} finally {
			working.current = false;
			if (current()) setBusy(false);
		}
	};
	const copy = (kind: 'password' | 'username') => {
		if (!active || !service.checkDeadline()) return;
		const entry = service.store
			.getState()
			.entries.find((item) => item.id === active.entryId && item.deletedAt === null);
		const account = entry?.credentials.find((item) => item.id === active.credentialId);
		if (!account) {
			setError('safe.error.stale-entry');
			return;
		}
		if (kind === 'password' && !account.password) {
			setError('safe.quick.noPassword');
			return;
		}
		void run(
			() => service.copy(account[kind], win, cancellation.current.signal),
			kind === 'password' ? 'safe.quick.copiedPassword' : 'safe.copied',
		);
	};
	if (dismissed || closed.current || state.generation !== epoch.current) return null;
	return (
		<DesignScope
			className="grid min-w-0 grid-cols-1 gap-3"
			data-safe-quick
			onPointerDownCapture={() => service.touch()}
			onKeyDown={(event) => {
				service.touch();
				// Input owns composition and the shared WebKit 229 fallback before events reach this handler.
				if (event.nativeEvent.isComposing) return;
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					close();
					return;
				}
				if (state.status !== 'unlocked' || busy) return;
				if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
					event.preventDefault();
					if (rows.length) {
						const index = rows.findIndex((row) => row === active);
						const next = (index + (event.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
						setSelected(rows[next]!.key);
						if ((event.target as HTMLElement).getAttribute('role') === 'option')
							win.document.getElementById(`${id}-option-${next}`)?.focus();
					}
				}
				if (
					event.key === 'Enter' &&
					(event.target === input.current || (event.target as HTMLElement).getAttribute('role') === 'option')
				) {
					event.preventDefault();
					copy(event.shiftKey ? 'username' : 'password');
				}
			}}
		>
			{state.status === 'unlocked' ? (
				<>
					<div className="grid gap-1.5">
						<Label htmlFor={id}>{t('safe.quick.search')}</Label>
						<Input
							id={id}
							ref={attachInput}
							autoFocus
							role="combobox"
							aria-autocomplete="list"
							aria-controls={`${id}-results`}
							aria-expanded={rows.length > 0}
							aria-activedescendant={active ? `${id}-option-${rows.indexOf(active)}` : undefined}
							autoComplete="off"
							spellCheck={false}
							value={query}
							disabled={busy}
							onChange={(event) => {
								setQuery(event.currentTarget.value);
								setSelected('');
								setError('');
								setNotice('');
								setGenerated('');
								setShowGenerated(false);
							}}
						/>
					</div>
					<div
						id={`${id}-results`}
						role="listbox"
						aria-label={t('safe.quick.results')}
						aria-busy={busy}
						className="grid max-h-72 min-w-0 max-w-full auto-rows-min grid-cols-1 gap-2 overflow-y-auto scrollbar-sleek"
					>
						{rows.map((row, index) => (
							<Button
								key={row.key}
								id={`${id}-option-${index}`}
								role="option"
								aria-selected={row === active}
								disabled={busy}
								tabIndex={row === active ? 0 : -1}
								variant={row === active ? 'secondary' : 'ghost'}
								className="h-auto min-h-11 w-full min-w-0 max-w-full justify-start whitespace-normal text-left"
								onFocus={() => setSelected(row.key)}
								onClick={() => setSelected(row.key)}
							>
								<span className="grid min-w-0 max-w-full flex-1 grid-cols-1 gap-1 [overflow-wrap:anywhere]">
									<strong className="font-medium">{row.title || t('safe.unnamedEntry')}</strong>
									<span className="font-mono text-sm text-muted-foreground">
										{row.username || t('safe.unnamedAccount')}
									</span>
								</span>
							</Button>
						))}
					</div>
					{rows.length === 0 && (
						<EmptyState
							title={t('safe.quick.noResults')}
							description={t('safe.quick.noResultsDescription')}
							action={
								<Button
									disabled={busy}
									onClick={() => {
										if (!current() || !service.checkDeadline()) return;
										try {
											setGenerated(service.generatePassword());
											setShowGenerated(false);
											setError('');
										} catch (cause) {
											setError(safeErrorKey(cause));
										}
									}}
								>
									{t('safe.quick.generate')}
								</Button>
							}
						/>
					)}
					{generated && (
						<div className="grid min-w-0 gap-2 rounded-xl border border-border bg-card p-4">
							<Label htmlFor={`${id}-generated`}>{t('safe.quick.generated')}</Label>
							<SecretInput
								id={`${id}-generated`}
								readOnly
								value={generated}
								type={showGenerated ? 'text' : 'password'}
							/>
							<p className="m-0 text-xs text-muted-foreground">{t('safe.quick.generatedHint')}</p>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="secondary"
									disabled={busy}
									onClick={() => setShowGenerated((value) => !value)}
								>
									{t(showGenerated ? 'safe.quick.hideGenerated' : 'safe.quick.showGenerated')}
								</Button>
								<Button
									disabled={busy}
									onClick={() => {
										void run(
											() => service.copy(generated, win, cancellation.current.signal),
											'safe.quick.copiedPassword',
										);
									}}
								>
									{t('safe.copyPassword')}
								</Button>
							</div>
						</div>
					)}
					<p className="m-0 text-xs text-muted-foreground">{t('safe.quick.hint')}</p>
					{active && (
						<div className="flex flex-wrap gap-2">
							<Button disabled={busy} onClick={() => copy('password')}>
								{t('safe.copyPassword')}
							</Button>
							<Button variant="secondary" disabled={busy} onClick={() => copy('username')}>
								{t('safe.copyUsername')}
							</Button>
						</div>
					)}
				</>
			) : state.status === 'loading' ? (
				<p role="status">{t('safe.loading')}</p>
			) : state.status === 'absent' ? (
				<EmptyState
					title={t('safe.quick.notConfigured')}
					description={t('safe.quick.notConfiguredDescription')}
				/>
			) : state.status === 'error' ? (
				<>
					<SafeErrorMessage error={safeErrorKey(state.error)} />
					<Button
						disabled={busy}
						onClick={() => {
							void run(() => {
								epoch.current = service.store.getState().generation + 1;
								return service.probe();
							});
						}}
					>
						{t('safe.retry')}
					</Button>
				</>
			) : (
				<form
					className="grid gap-3"
					aria-busy={busy}
					onSubmit={(event) => {
						event.preventDefault();
						void run(() => {
							epoch.current = service.store.getState().generation + 1;
							let secret = master;
							setMaster('');
							const opening = service.unlock(secret, cancellation.current.signal);
							secret = '';
							return opening;
						});
					}}
				>
					<p className="m-0 text-sm">{t('safe.lockedDescription')}</p>
					<div className="grid gap-1.5">
						<Label htmlFor={`${id}-master`}>{t('safe.masterPassword')}</Label>
						<SecretInput
							id={`${id}-master`}
							value={master}
							onChange={(event) => setMaster(event.currentTarget.value)}
							autoFocus
							required
							disabled={busy}
						/>
					</div>
					<Button type="submit" disabled={busy || !master}>
						{t(busy ? 'safe.busy' : 'safe.unlock')}
					</Button>
				</form>
			)}
			<SafeErrorMessage error={error} />
			{notice && (
				<p role="status" className="m-0 text-sm">
					{t(notice)}
				</p>
			)}
			<Button variant="secondary" className="justify-self-end" onClick={close}>
				{t('safe.close')}
			</Button>
		</DesignScope>
	);
}
