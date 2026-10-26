import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Copy, Eye, Hand, Pause, Play, RefreshCw, Search, Square } from 'lucide-react';
import type {
	BrowserWorkspace,
	BrowserFrame,
	BrowserCommand,
	FrameSubscription,
	HumanInput,
	HumanPageRequest,
} from '../api';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Textarea } from '../../../ui/components/textarea';
import { Checkbox } from '../../../ui/components/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/components/select';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { useOwnerDocument, useVisible } from '../../../ui/react/contexts';
import { useT } from '../../../ui/react/hooks';
import { BrowserActionError, actionError } from './BrowserActionError';
import { framePoint, latestFramePresenter, windowIdentity } from './viewer-geometry';
import { PendingRequestCard } from './PendingRequestCard';
import { CopySelectionButton } from './CopySelectionButton';
import { SendMaterialButton } from './SendMaterialButton';

async function paintFrame(canvas: HTMLCanvasElement, frame: BrowserFrame, signal: AbortSignal, current: () => boolean) {
	const win = canvas.ownerDocument.defaultView;
	if (!win || signal.aborted || !current()) return false;
	const url = win.URL.createObjectURL(new win.Blob([new Uint8Array(frame.data).buffer], { type: frame.mime }));
	const image = new win.Image();
	try {
		await new Promise<void>((resolve, reject) => {
			const abort = () => {
				image.src = '';
				reject(new Error('browser_viewer_closed'));
			};
			image.onload = () => {
				signal.removeEventListener('abort', abort);
				resolve();
			};
			image.onerror = () => {
				signal.removeEventListener('abort', abort);
				reject(new Error('browser_frame_decode_failed'));
			};
			signal.addEventListener('abort', abort, { once: true });
			image.src = url;
		});
		if (signal.aborted || !current()) return false;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('browser_frame_decode_failed');
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		context.drawImage(image, 0, 0);
		return true;
	} finally {
		image.onload = null;
		image.onerror = null;
		win.URL.revokeObjectURL(url);
	}
}

/** A presentation only. Unmount releases its lease; the independent Space/Page remain browser-owned. */
export function SpaceViewer({ api, spaceId, pageId }: { api: BrowserWorkspace; spaceId: string; pageId: string }) {
	const t = useT(),
		ownerDocument = useOwnerDocument(),
		visible = useVisible();
	const viewer = useMemo(
		() => ({ id: crypto.randomUUID(), windowId: windowIdentity(ownerDocument), spaceId, pageId }),
		[ownerDocument, spaceId, pageId],
	);
	const state = useSyncExternalStore(
		useCallback((listener) => api.subscribe(listener), [api]),
		useCallback(() => api.getState(), [api]),
	);
	const space = state.spaces.find((item) => item.id === spaceId),
		page = space?.pages.find((item) => item.id === pageId);
	const lease = space?.control.lease;
	const ownsControl =
		visible &&
		space?.control.mode === 'human' &&
		(lease?.viewerId ?? lease?.controllerId) === viewer.id &&
		lease?.windowId === viewer.windowId;
	const canvas = useRef<HTMLCanvasElement>(null),
		textInput = useRef<HTMLTextAreaElement>(null);
	const lastFrame = useRef<BrowserFrame | undefined>(undefined);
	const invalidateFrame = useRef<(() => void) | undefined>(undefined);
	const inputSequence = useRef(0),
		busy = useRef(false);
	const [hasFrame, setHasFrame] = useState(false),
		[pending, setPending] = useState(false),
		[error, setError] = useState('');
	const [controlPending, setControlPending] = useState(false);
	const controlBusy = useRef(false);
	const [stopping, setStopping] = useState(false);
	const stopBusy = useRef(false);
	const [address, setAddress] = useState(page?.url ?? ''),
		[addressEdited, setAddressEdited] = useState(false);
	const [text, setText] = useState(''),
		[composing, setComposing] = useState(false);
	const [showFind, setShowFind] = useState(false),
		[findText, setFindText] = useState('');
	const [creationGrant, setCreationGrant] = useState<{ runtimeId: string; epoch: number; allowed: boolean }>();
	const allowTaskCreation =
		!!space?.runtimeId &&
		creationGrant?.runtimeId === space.runtimeId &&
		creationGrant.epoch === space.control.epoch &&
		creationGrant.allowed;
	const helpId = useId();
	const report = useCallback((reason: unknown) => setError(actionError(reason)), []);
	const run = useCallback(
		async (work: () => Promise<unknown>) => {
			if (busy.current) return;
			busy.current = true;
			setPending(true);
			setError('');
			try {
				await work();
			} catch (reason) {
				report(reason);
			} finally {
				busy.current = false;
				setPending(false);
			}
		},
		[report],
	);
	// Control changes and stopping a load stay available while a page action is waiting on a website.
	const changeControl = async (work: () => Promise<unknown>) => {
		if (controlBusy.current) return;
		controlBusy.current = true;
		setControlPending(true);
		setError('');
		try {
			await work();
		} catch (reason) {
			report(reason);
		} finally {
			controlBusy.current = false;
			setControlPending(false);
		}
	};
	const authority = useCallback((): HumanPageRequest | undefined => {
		const current = api.getState().spaces.find((item) => item.id === spaceId),
			currentLease = current?.control.lease;
		if (
			!visible ||
			current?.control.mode !== 'human' ||
			!currentLease ||
			(currentLease.viewerId ?? currentLease.controllerId) !== viewer.id ||
			currentLease.windowId !== viewer.windowId
		)
			return;
		return { spaceId, pageId, viewerId: viewer.id, leaseId: currentLease.leaseId, epoch: currentLease.epoch };
	}, [api, spaceId, pageId, viewer, visible]);
	const frameCurrent = useCallback(
		(frame: BrowserFrame) => {
			const current = api.getState().spaces.find((item) => item.id === spaceId);
			const currentPage = current?.pages.find((item) => item.id === pageId);
			return (
				current?.status === 'ready' &&
				current.runtimeId === frame.runtimeId &&
				current.control.epoch === frame.epoch &&
				currentPage?.documentId === frame.documentId &&
				currentPage.viewportVersion === frame.viewportVersion &&
				frame.pageId === pageId &&
				frame.spaceId === spaceId
			);
		},
		[api, spaceId, pageId],
	);
	useEffect(() => {
		if (!addressEdited) setAddress(page?.url ?? '');
	}, [page?.url, addressEdited]);
	useEffect(() => {
		lastFrame.current = undefined;
		setHasFrame(false);
		const element = canvas.current;
		if (!element || !visible || space?.status !== 'ready' || page?.status !== 'open') return;
		let subscription: FrameSubscription | undefined;
		const makePresenter = () =>
			latestFramePresenter<BrowserFrame>({
				present: async (frame, signal) => {
					if (
						await paintFrame(
							element,
							frame,
							signal,
							() => element.ownerDocument === ownerDocument && frameCurrent(frame),
						)
					) {
						lastFrame.current = frame;
						setHasFrame(true);
					}
				},
				ack: (frame) => subscription?.ack(frame.frameId),
				error: report,
			});
		let presenter = makePresenter();
		const invalidate = () => {
			presenter.dispose();
			presenter = makePresenter();
			lastFrame.current = undefined;
			setHasFrame(false);
			element.getContext('2d')?.clearRect(0, 0, element.width, element.height);
		};
		invalidateFrame.current = invalidate;
		try {
			subscription = api.subscribeFrames({ spaceId, pageId, viewerId: viewer.id }, (frame) =>
				presenter.enqueue(frame),
			);
		} catch (reason) {
			report(reason);
		}
		return () => {
			if (invalidateFrame.current === invalidate) invalidateFrame.current = undefined;
			presenter.dispose();
			subscription?.dispose();
			lastFrame.current = undefined;
		};
	}, [
		api,
		spaceId,
		pageId,
		viewer.id,
		visible,
		ownerDocument,
		frameCurrent,
		space?.status,
		space?.runtimeId,
		page?.status,
		report,
	]);
	// Epoch/document changes invalidate old pixels, not the subscription. Releasing the subscription
	// here could revoke the human lease that was just granted to this same viewer.
	useEffect(() => {
		if (lastFrame.current && frameCurrent(lastFrame.current)) return;
		lastFrame.current = undefined;
		setHasFrame(false);
		const element = canvas.current;
		if (element) element.getContext('2d')?.clearRect(0, 0, element.width, element.height);
	}, [space?.control.epoch, page?.documentId, page?.viewportVersion, frameCurrent]);
	useEffect(() => {
		if (!visible) void api.releaseViewer(spaceId, viewer.id).catch(report);
		const close = () => {
			void api.releaseViewer(spaceId, viewer.id).catch(() => undefined);
		};
		const win = ownerDocument.defaultView;
		win?.addEventListener('pagehide', close);
		return () => {
			win?.removeEventListener('pagehide', close);
			close();
		};
	}, [api, spaceId, viewer.id, ownerDocument, visible, report]);
	const send = useCallback(
		async (input: HumanInput): Promise<boolean> => {
			const scope = authority(),
				frame = lastFrame.current;
			if (busy.current || !scope || !frame || !frameCurrent(frame) || frame.epoch !== scope.epoch) return false;
			try {
				inputSequence.current = Math.max(inputSequence.current + 1, frame.inputSequence + 1);
				await api.humanInput({ ...scope, frameId: frame.frameId, inputSequence: inputSequence.current, input });
				return true;
			} catch (reason) {
				report(reason);
				return false;
			}
		},
		[api, authority, frameCurrent, report],
	);
	useEffect(() => {
		const element = canvas.current,
			win = ownerDocument.defaultView;
		if (!element || !win) return;
		const key = (event: KeyboardEvent) => {
			if (event.target !== element || !authority() || event.isComposing) return;
			if ((event.ctrlKey || event.metaKey) && event.key === 'Tab') return;
			if ((event.ctrlKey || event.metaKey) && ['c', 'x', 'v'].includes(event.key.toLowerCase())) {
				event.preventDefault();
				event.stopPropagation();
				textInput.current?.focus();
				return;
			}
			if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
			event.preventDefault();
			event.stopPropagation();
			const modifiers =
				(event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
			void send(
				event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
					? { kind: 'text', text: event.key }
					: { kind: 'key', key: event.key, modifiers },
			);
		};
		const wheel = (event: WheelEvent) => {
			const frame = lastFrame.current;
			if (!authority() || !frame) return;
			const point = framePoint(element.getBoundingClientRect(), frame, event.clientX, event.clientY);
			if (!point) return;
			event.preventDefault();
			event.stopPropagation();
			const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? frame.cssHeight : 1;
			void send({ kind: 'scroll', ...point, deltaX: event.deltaX * unit, deltaY: event.deltaY * unit });
		};
		win.addEventListener('keydown', key, true);
		element.addEventListener('wheel', wheel, { passive: false });
		return () => {
			win.removeEventListener('keydown', key, true);
			element.removeEventListener('wheel', wheel);
		};
	}, [ownerDocument, authority, send]);
	const pageAction = (command: BrowserCommand) => {
		const scope = authority();
		if (!scope) return;
		if (command.kind === 'stop') {
			if (stopBusy.current) return;
			stopBusy.current = true;
			setStopping(true);
			setError('');
			void api
				.pageAction({ ...scope, command })
				.catch(report)
				.finally(() => {
					stopBusy.current = false;
					setStopping(false);
				});
			return;
		}
		if (command.kind === 'zoom' || command.kind === 'viewport') invalidateFrame.current?.();
		void run(() => api.pageAction({ ...scope, command }));
	};
	const navigate = () => {
		const scope = authority();
		if (!scope) return;
		const url = api.resolveInput(address);
		if (!url) {
			report(new Error('unsupported_url'));
			return;
		}
		void run(async () => {
			await api.navigate({ ...scope, url });
			setAddressEdited(false);
		});
	};
	if (!space || !page || page.status === 'closed')
		return <EmptyState title={t('browser.v2.missingPage')} description={t('browser.v2.missingDescription')} />;
	const requests = state.requests.filter(
		(request) =>
			request.spaceId === spaceId &&
			request.pageId === pageId &&
			request.runtimeId === space.runtimeId &&
			request.documentId === page.documentId,
	);
	const controlDisabled =
		controlPending || state.readOnly || !ownsControl || space.status !== 'ready' || page.status !== 'open';
	const disabled = pending || controlDisabled;
	const actionKey = `${viewer.id}:${lease?.leaseId ?? ''}:${visible}`;
	return (
		<div className="huhu-browser-viewer flex h-full min-h-0 min-w-0 flex-col" data-page-id={pageId}>
			<div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
				<div
					role="status"
					className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-xs text-muted-foreground"
				>
					{ownsControl ? <Hand className="size-4 shrink-0" /> : <Eye className="size-4 shrink-0" />}
					<span>{t(ownsControl ? 'browser.v2.humanControl' : 'browser.v2.observing')}</span>
					<span className="rounded-sm border border-border px-1">
						{t(
							space.control.mode === 'agent'
								? 'browser.v2.agentControl'
								: `browser.v2.${space.control.mode}`,
						)}
					</span>
				</div>
				<div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
					{space.status === 'stopped' ? (
						<Button
							size="sm"
							disabled={pending || state.readOnly}
							onClick={() => void run(() => api.startSpace(spaceId))}
						>
							<Play />
							{t('browser.v2.start')}
						</Button>
					) : ownsControl ? (
						<Button
							size="sm"
							variant="outline"
							disabled={controlPending || state.readOnly}
							onClick={() => void changeControl(() => api.releaseViewer(spaceId, viewer.id))}
						>
							{t('browser.v2.release')}
						</Button>
					) : (
						<Button
							size="sm"
							disabled={controlPending || state.readOnly || space.status !== 'ready'}
							onClick={() =>
								void changeControl(() =>
									api.takeover({ spaceId, viewerId: viewer.id, windowId: viewer.windowId }),
								)
							}
						>
							<Hand />
							{t('browser.v2.takeover')}
						</Button>
					)}
					{space.control.mode === 'agent' && (
						<Button
							size="sm"
							variant="outline"
							disabled={controlPending || state.readOnly}
							onClick={() => void changeControl(() => api.pause(spaceId))}
						>
							<Pause />
							{t('browser.v2.pause')}
						</Button>
					)}
					{space.kind === 'task' && space.control.mode !== 'agent' && (
						<Button
							size="sm"
							variant="outline"
							disabled={controlPending || state.readOnly || space.status !== 'ready'}
							onClick={() => void changeControl(() => api.resumeAgent(spaceId))}
						>
							<Play />
							{t('browser.v2.resume')}
						</Button>
					)}
					{space.kind === 'task' && space.control.mode === 'agent' && (
						<label className="flex items-center gap-2 text-xs">
							<Checkbox
								checked={!!allowTaskCreation}
								disabled={pending}
								onCheckedChange={(checked) => {
									if (space.runtimeId)
										setCreationGrant({
											runtimeId: space.runtimeId,
											epoch: space.control.epoch,
											allowed: checked === true,
										});
								}}
							/>
							{t('browser.v2.allowTaskCreation')}
						</label>
					)}
					{space.kind === 'task' && space.control.mode === 'agent' && (
						<Button
							size="sm"
							variant="outline"
							disabled={pending}
							onClick={(event) => {
								const win = event.currentTarget.ownerDocument.defaultView;
								const before = api.getState().spaces.find((item) => item.id === spaceId);
								void run(async () => {
									if (!win?.navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
									const connection = await api.copyAgentConnection(spaceId, {
										allowTaskCreation: !!allowTaskCreation,
									});
									const after = api.getState().spaces.find((item) => item.id === spaceId);
									if (
										!before ||
										!after ||
										after.runtimeId !== before.runtimeId ||
										after.control.epoch !== before.control.epoch ||
										after.control.mode !== 'agent'
									)
										throw new Error('control_revoked');
									await win.navigator.clipboard.writeText(connection);
								});
							}}
						>
							<Copy />
							{t('browser.v2.copyConnection')}
						</Button>
					)}
					<SendMaterialButton
						key={`material:${actionKey}`}
						api={api}
						authority={authority}
						disabled={disabled}
						report={report}
					/>
					<CopySelectionButton
						key={`copy:${actionKey}`}
						api={api}
						authority={authority}
						disabled={disabled}
						report={report}
					/>
					<Select
						value={String(page.zoom)}
						disabled={disabled}
						onValueChange={(value) => pageAction({ kind: 'zoom', factor: Number(value) })}
					>
						<SelectTrigger className="w-24" aria-label={t('browser.v2.zoom')}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{[0.8, 1, 1.25, 1.5, 2].map((factor) => (
								<SelectItem key={factor} value={String(factor)}>
									{Math.round(factor * 100)}%
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{space.control.mode !== 'paused' && (
						<Button
							size="sm"
							variant="outline"
							disabled={pending || state.readOnly}
							onClick={() => void run(() => api.pause(spaceId))}
						>
							<Pause />
							{t('browser.v2.pause')}
						</Button>
					)}
				</div>
			</div>
			<BrowserActionError code={error || page.error || space.error} />
			<div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
				{(
					[
						{ kind: 'back', icon: ArrowLeft, label: 'back' },
						{ kind: 'forward', icon: ArrowRight, label: 'forward' },
						{ kind: 'reload', icon: RefreshCw, label: 'reload' },
						{ kind: 'stop', icon: Square, label: 'stopLoading' },
					] as const
				).map(({ kind, icon: Icon, label }) => (
					<Button
						key={kind}
						size="icon-sm"
						variant="ghost"
						title={t(`browser.v2.${label}`)}
						aria-label={t(`browser.v2.${label}`)}
						disabled={kind === 'stop' ? controlDisabled || stopping : disabled}
						onClick={() => pageAction({ kind })}
					>
						<Icon />
					</Button>
				))}
				<form
					className="flex min-w-0 flex-1 gap-1"
					onSubmit={(event) => {
						event.preventDefault();
						navigate();
					}}
				>
					<Input
						aria-label={t('browser.v2.address')}
						value={address}
						disabled={disabled}
						onChange={(event) => {
							setAddressEdited(true);
							setAddress(event.target.value);
						}}
						onKeyDown={(event) => {
							if (event.nativeEvent.isComposing && event.key === 'Enter') event.preventDefault();
						}}
					/>
				</form>
				<Button
					size="icon-sm"
					variant="ghost"
					title={t('browser.v2.find')}
					aria-label={t('browser.v2.find')}
					disabled={disabled}
					onClick={() => setShowFind(!showFind)}
				>
					<Search />
				</Button>
			</div>
			{showFind && (
				<form
					className="flex flex-wrap gap-2 border-b border-border p-2"
					onSubmit={(event) => {
						event.preventDefault();
						pageAction({ kind: 'find', text: findText, forward: true });
					}}
				>
					<Input
						className="min-w-0 flex-1"
						aria-label={t('browser.v2.find')}
						value={findText}
						disabled={disabled}
						onChange={(event) => setFindText(event.target.value)}
						onKeyDown={(event) => {
							if (event.nativeEvent.isComposing && event.key === 'Enter') event.preventDefault();
						}}
					/>
					<Button size="sm" disabled={disabled} type="submit">
						{t('browser.v2.findNext')}
					</Button>
				</form>
			)}
			{requests.map((request) => (
				<PendingRequestCard
					key={`${request.id}:${request.revision}:${request.epoch}`}
					api={api}
					request={request}
					authority={authority}
					report={report}
				/>
			))}
			<div className="relative min-h-32 min-w-0 flex-1 overflow-hidden bg-muted/20">
				<canvas
					ref={canvas}
					aria-label={t('browser.v2.canvas')}
					aria-describedby={helpId}
					tabIndex={ownsControl ? 0 : -1}
					className="h-full w-full object-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
					onClick={(event) => {
						const frame = lastFrame.current;
						if (!authority() || !frame) return;
						const point = framePoint(
							event.currentTarget.getBoundingClientRect(),
							frame,
							event.clientX,
							event.clientY,
						);
						if (!point) return;
						event.currentTarget.focus();
						void send({ kind: 'click', ...point, button: 'left', clickCount: event.detail > 1 ? 2 : 1 });
					}}
					onContextMenu={(event) => {
						const frame = lastFrame.current;
						if (!authority() || !frame) return;
						event.preventDefault();
						const point = framePoint(
							event.currentTarget.getBoundingClientRect(),
							frame,
							event.clientX,
							event.clientY,
						);
						if (point) void send({ kind: 'click', ...point, button: 'right', clickCount: 1 });
					}}
				/>
				{!hasFrame && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
						{t('browser.v2.waitingFrame')}
					</div>
				)}
			</div>
			{ownsControl ? (
				<div className="flex flex-wrap items-end gap-2 border-t border-border p-2">
					<div className="min-w-0 flex-1">
						<Textarea
							ref={textInput}
							className="min-h-10 resize-none"
							rows={1}
							aria-label={t('browser.v2.textInput')}
							placeholder={t('browser.v2.textInput')}
							value={text}
							maxLength={64 * 1024}
							onChange={(event) => setText(event.target.value)}
							onCompositionStart={() => setComposing(true)}
							onCompositionEnd={() => setComposing(false)}
						/>
						<p id={helpId} className="mt-1 text-xs text-muted-foreground">
							{t('browser.v2.inputHelp')}
						</p>
					</div>
					<Button
						size="sm"
						disabled={disabled || !hasFrame || !text || composing}
						onClick={() => {
							const draft = text;
							void send({ kind: 'text', text: draft }).then((sent) => {
								if (sent) setText((current) => (current === draft ? '' : current));
							});
						}}
					>
						{t('browser.v2.insertText')}
					</Button>
				</div>
			) : (
				<p id={helpId} className="border-t border-border p-2 text-xs text-muted-foreground">
					{t('browser.v2.observerHelp')}
				</p>
			)}
		</div>
	);
}
