import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { FileInput, ClipboardPaste } from 'lucide-react';
import type { BrowserWorkspaceApi, IdentityImportPreview } from '../api';
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
	api: BrowserWorkspaceApi;
	label: string;
	persist: boolean;
	disabled?: boolean;
	onImported(): void;
	report(reason: unknown): void;
	ref?: Ref<IdentityImportActionsHandle>;
}) {
	const t = useT();
	const [pasting, setPasting] = useState(false),
		[text, setText] = useState(''),
		[pending, setPending] = useState(false);
	const [review, setReview] = useState<{ preview: IdentityImportPreview; persist: boolean }>();
	const [domains, setDomains] = useState<string[]>([]),
		[filter, setFilter] = useState('');
	const plan = useRef<string | undefined>(undefined),
		mounted = useRef(false),
		generation = useRef(0);
	const discard = (id: string) => {
		void api.discardIdentityImport(id).catch(() => undefined);
	};
	useEffect(() => {
		mounted.current = true;
		generation.current++;
		return () => {
			mounted.current = false;
			if (plan.current) void api.discardIdentityImport(plan.current).catch(() => undefined);
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
	};
	useImperativeHandle(ref, () => ({ review: show }));
	const prepare = async (kind: 'text' | 'file') => {
		if (!label.trim() || pending) return;
		const current = generation.current,
			capturedPersist = persist;
		setPending(true);
		try {
			const preview =
				kind === 'text'
					? await api.prepareIdentityImport({ label: label.trim(), text })
					: await api.prepareIdentityFile({ label: label.trim() });
			if (!preview) return;
			if (!mounted.current || generation.current !== current) {
				discard(preview.planId);
				return;
			}
			show(preview, capturedPersist);
		} catch (reason) {
			if (mounted.current && generation.current === current) report(reason);
		} finally {
			if (mounted.current && generation.current === current) setPending(false);
		}
	};
	const close = () => {
		if (pending) return;
		generation.current++;
		if (plan.current) discard(plan.current);
		plan.current = undefined;
		setReview(undefined);
		setText('');
		setPasting(false);
		setDomains([]);
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
		const current = generation.current;
		setPending(true);
		try {
			await api.commitIdentityImport({ planId: review.preview.planId, persist: review.persist, domains });
			if (!mounted.current || generation.current !== current) return;
			plan.current = undefined;
			setReview(undefined);
			setDomains([]);
			onImported();
		} catch (reason) {
			if (mounted.current && generation.current === current) report(reason);
		} finally {
			if (mounted.current && generation.current === current) setPending(false);
		}
	};
	return (
		<>
			<Button
				variant="outline"
				disabled={disabled || pending || !label.trim()}
				onClick={() => void prepare('file')}
			>
				<FileInput />
				{t('browser.v2.chooseIdentityFile')}
			</Button>
			<Button
				variant="outline"
				disabled={disabled || pending || !label.trim()}
				onClick={() => {
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
				<DialogContent>
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
						<Button variant="outline" disabled={pending} onClick={close}>
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
				<DialogContent className="max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t('browser.v2.reviewTitle')}</DialogTitle>
						<DialogDescription>{t('browser.v2.reviewHelp')}</DialogDescription>
					</DialogHeader>
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
						<Button variant="outline" disabled={pending} onClick={close}>
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
