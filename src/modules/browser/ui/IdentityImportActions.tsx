import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { FileInput, ClipboardPaste } from 'lucide-react';
import type { BrowserWorkspace, IdentityImportPreview } from '../api';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Textarea } from '../../../ui/components/textarea';
import { Checkbox } from '../../../ui/components/checkbox';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '../../../ui/components/dialog';
import { useT } from '../../../ui/react/hooks';

export interface IdentityImportActionsHandle {
	review(preview: IdentityImportPreview, persist: boolean): void;
}

/** The only commit surface for text, file and browser-source identity imports. */
export function IdentityImportActions({
	api,
	label,
	persist,
	disabled,
	onImported,
	report,
	ref,
}: {
	api: BrowserWorkspace;
	label: string;
	persist: boolean;
	disabled?: boolean;
	onImported: () => void;
	report: (reason: unknown) => void;
	ref?: Ref<IdentityImportActionsHandle>;
}) {
	const t = useT();
	const [pasting, setPasting] = useState(false),
		[text, setText] = useState(''),
		[pending, setPending] = useState(false);
	const [review, setReview] = useState<{ preview: IdentityImportPreview; persist: boolean }>();
	const [domains, setDomains] = useState<string[]>([]),
		[filter, setFilter] = useState('');
	const [cancelling, setCancelling] = useState(false),
		[outcome, setOutcome] = useState<{ kind: 'saved' | 'savedAfterCancel' | 'cancelled'; count: number }>();
	const plan = useRef<string | undefined>(undefined),
		mounted = useRef(false),
		generation = useRef(0);
	const preflight = useRef<AbortController | undefined>(undefined),
		committing = useRef(false),
		cancelRequested = useRef(false);
	const fileTrigger = useRef<HTMLButtonElement | null>(null),
		returnFocus = useRef<HTMLButtonElement | null>(null);
	const restoreFocus = (event: Event) => {
		event.preventDefault();
		if (mounted.current && !review && !pasting)
			(returnFocus.current?.isConnected ? returnFocus.current : fileTrigger.current)?.focus();
	};
	const discard = (id: string) => {
		api.discardIdentityImport(id);
	};
	useEffect(() => {
		mounted.current = true;
		generation.current++;
		return () => {
			mounted.current = false;
			preflight.current?.abort();
			if (plan.current) api.discardIdentityImport(plan.current);
			plan.current = undefined;
		};
	}, [api]);
	const show = (preview: IdentityImportPreview, capturedPersist: boolean) => {
		if (!mounted.current) {
			discard(preview.planId);
			return;
		}
		if (plan.current && plan.current !== preview.planId) discard(plan.current);
		plan.current = preview.planId;
		setReview({ preview, persist: capturedPersist });
		setDomains(preview.domains.map((item) => item.domain));
		setFilter('');
		setText('');
		setPasting(false);
		setOutcome(undefined);
	};
	useImperativeHandle(ref, () => ({
		review: (preview, capturedPersist) => {
			if (committing.current || preflight.current) discard(preview.planId);
			else show(preview, capturedPersist);
		},
	}));
	const prepare = async (kind: 'text' | 'file') => {
		if (!label.trim() || pending) return;
		const current = ++generation.current,
			capturedPersist = persist;
		const controller = new AbortController();
		preflight.current = controller;
		setOutcome(undefined);
		setPending(true);
		try {
			const preview =
				kind === 'text'
					? await api.prepareIdentityImport({ label: label.trim(), text, signal: controller.signal })
					: await api.prepareIdentityFile({ label: label.trim(), signal: controller.signal });
			if (!preview) return;
			if (!mounted.current || generation.current !== current || controller.signal.aborted) {
				discard(preview.planId);
				return;
			}
			show(preview, capturedPersist);
		} catch (reason) {
			if (mounted.current && generation.current === current && !controller.signal.aborted) report(reason);
		} finally {
			if (preflight.current === controller) preflight.current = undefined;
			if (mounted.current && generation.current === current) setPending(false);
		}
	};
	const close = () => {
		if (committing.current) {
			if (plan.current) discard(plan.current);
			cancelRequested.current = true;
			setCancelling(true);
			return;
		}
		preflight.current?.abort();
		preflight.current = undefined;
		generation.current++;
		if (plan.current) discard(plan.current);
		plan.current = undefined;
		setReview(undefined);
		setText('');
		setPasting(false);
		setDomains([]);
		setPending(false);
		setOutcome({ kind: 'cancelled', count: 0 });
	};
	const preview = review?.preview;
	const blocked =
		!!preview &&
		(preview.counts.invalid > 0 ||
			preview.counts.unsupported > 0 ||
			preview.issues.length > 0 ||
			preview.originCount > 0);
	const filtered =
		preview?.domains.filter((item) => item.domain.toLowerCase().includes(filter.trim().toLowerCase())) ?? [];
	const commit = async () => {
		if (!review || blocked || !domains.length || pending) return;
		const current = ++generation.current;
		committing.current = true;
		cancelRequested.current = false;
		setOutcome(undefined);
		setPending(true);
		try {
			const saved = await api.commitIdentityImport({
				planId: review.preview.planId,
				persist: review.persist,
				domains,
			});
			if (!mounted.current || generation.current !== current) return;
			plan.current = undefined;
			setReview(undefined);
			setDomains([]);
			setOutcome({ kind: cancelRequested.current ? 'savedAfterCancel' : 'saved', count: saved.cookieCount });
			onImported();
		} catch (reason) {
			if (mounted.current && generation.current === current) {
				if (reason instanceof Error && reason.message === 'cancelled') {
					plan.current = undefined;
					setReview(undefined);
					setDomains([]);
					setOutcome({ kind: 'cancelled', count: 0 });
				} else {
					report(reason);
					if (cancelRequested.current) {
						plan.current = undefined;
						setReview(undefined);
					}
				}
			}
		} finally {
			committing.current = false;
			if (mounted.current && generation.current === current) {
				setPending(false);
				setCancelling(false);
			}
		}
	};
	return (
		<>
			<Button
				ref={fileTrigger}
				variant="outline"
				disabled={disabled || pending || !label.trim()}
				onClick={(event) => {
					returnFocus.current = event.currentTarget;
					void prepare('file');
				}}
			>
				<FileInput />
				{t('browser.v2.chooseIdentityFile')}
			</Button>
			{outcome && (
				<p role="status" className="text-sm text-muted-foreground">
					{t(
						`browser.v2.identity${outcome.kind === 'saved' ? 'Saved' : outcome.kind === 'savedAfterCancel' ? 'SavedAfterCancel' : 'Cancelled'}`,
						{ count: outcome.count },
					)}
				</p>
			)}
			{pending && !pasting && !review && (
				<>
					<p role="status" className="text-sm">
						{t('browser.v2.identityReading')}
					</p>
					<Button variant="outline" onClick={close}>
						{t('browser.v2.cancel')}
					</Button>
				</>
			)}
			<Button
				variant="outline"
				disabled={disabled || pending || !label.trim()}
				onClick={(event) => {
					returnFocus.current = event.currentTarget;
					setOutcome(undefined);
					setText('');
					setPasting(true);
				}}
			>
				<ClipboardPaste />
				{t('browser.v2.pasteIdentity')}
			</Button>
			<Dialog
				open={pasting}
				onOpenChange={(open) => {
					if (!open) close();
				}}
			>
				<DialogContent onCloseAutoFocus={restoreFocus}>
					<DialogHeader>
						<DialogTitle>{t('browser.v2.pasteIdentity')}</DialogTitle>
						<DialogDescription>{t('browser.v2.identityText')}</DialogDescription>
					</DialogHeader>
					<Textarea
						aria-label={t('browser.v2.identityText')}
						value={text}
						maxLength={4 * 1024 * 1024}
						rows={12}
						disabled={pending}
						onChange={(event) => setText(event.target.value)}
					/>
					<DialogFooter>
						<Button variant="outline" onClick={close}>
							{t('browser.v2.cancel')}
						</Button>
						<Button disabled={pending || !text.trim()} onClick={() => void prepare('text')}>
							{t('browser.v2.reviewImport')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog
				open={!!review}
				onOpenChange={(open) => {
					if (!open) close();
				}}
			>
				<DialogContent className="max-h-[85vh] overflow-y-auto" onCloseAutoFocus={restoreFocus}>
					<DialogHeader>
						<DialogTitle>{t('browser.v2.reviewTitle')}</DialogTitle>
						<DialogDescription>{t('browser.v2.reviewHelp')}</DialogDescription>
					</DialogHeader>
					{pending && (
						<p role="status" className="text-sm">
							{t(cancelling ? 'browser.v2.identityCancelling' : 'browser.v2.identitySaving')}
						</p>
					)}
					{preview && (
						<>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
								{(['accepted', 'expired', 'duplicate', 'invalid', 'unsupported'] as const).map(
									(key) => (
										<div key={key} className="rounded-md border border-border p-2">
											<p className="text-xs text-muted-foreground">{t(`browser.v2.${key}`)}</p>
											<p className="tabular-nums">{preview.counts[key]}</p>
										</div>
									),
								)}
								<div className="rounded-md border border-border p-2">
									<p className="text-xs text-muted-foreground">{t('browser.v2.origins')}</p>
									<p>{preview.originCount}</p>
								</div>
							</div>
							{blocked && (
								<p role="alert" className="text-sm text-destructive">
									{t(
										preview.originCount > 0
											? 'browser.v2.originsUnsupported'
											: 'browser.v2.importBlocked',
									)}
								</p>
							)}
							{preview.issues.length > 0 && (
								<ul className="max-h-28 overflow-auto text-xs text-muted-foreground">
									{preview.issues.slice(0, 30).map((issue, index) => (
										<li key={index}>
											{issue.index}: {issue.code}
										</li>
									))}
								</ul>
							)}
							<div>
								<p className="text-sm">{t('browser.v2.selectedDomains', { count: domains.length })}</p>
								<p className="text-xs text-muted-foreground">{t('browser.v2.domainHelp')}</p>
							</div>
							<Input
								aria-label={t('browser.v2.filterDomains')}
								placeholder={t('browser.v2.filterDomains')}
								value={filter}
								onChange={(event) => setFilter(event.target.value)}
							/>
							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									variant="outline"
									disabled={pending}
									onClick={() => setDomains(preview.domains.map((item) => item.domain))}
								>
									{t('browser.v2.selectAll')}
								</Button>
								<Button size="sm" variant="outline" disabled={pending} onClick={() => setDomains([])}>
									{t('browser.v2.clearSelection')}
								</Button>
							</div>
							<div className="max-h-48 space-y-1 overflow-auto">
								{filtered.slice(0, 100).map((item) => (
									<label
										key={item.domain}
										className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm"
									>
										<Checkbox
											checked={domains.includes(item.domain)}
											disabled={pending}
											onCheckedChange={(checked) =>
												setDomains((current) =>
													checked
														? [...new Set([...current, item.domain])]
														: current.filter((domain) => domain !== item.domain),
												)
											}
										/>
										<span className="break-all">
											{item.domain} · {item.count}
										</span>
									</label>
								))}
							</div>
							{filtered.length > 100 && (
								<p className="text-xs text-muted-foreground">{t('browser.v2.domainLimit')}</p>
							)}
							<p className="text-sm text-muted-foreground">
								{t(review.persist ? 'browser.v2.persistIdentity' : 'browser.v2.sessionOnly')}
							</p>
						</>
					)}
					<DialogFooter>
						<Button variant="outline" disabled={cancelling} onClick={close}>
							{t('browser.v2.cancel')}
						</Button>
						<Button disabled={pending || blocked || !domains.length} onClick={() => void commit()}>
							{t('browser.v2.commitIdentity')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
