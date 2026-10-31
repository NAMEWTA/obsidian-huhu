import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { ArrowUpRight, X } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Textarea } from '../../../../ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/components/select';
import { useT } from '../../../../ui/react/hooks';
import type {
	ControlInputReceipt,
	ControlJson,
	ControlRequest,
	ControlWaitState,
} from '../../../../shared/native/control-wire';
import { CONTROL_WAIT_STATES } from '../../../../shared/native/control-wire';
import type { ManagedRuntimeRef } from '../../core/workspace/managed-runtime';
import type { ActivityWaitBaseline } from '../../core/control/terminal-coordination';
import type { AgentController } from '../../services/controller';
import type { ConfirmFn } from '../../services/workspace-service';

type LocalResult = Awaited<ReturnType<AgentController['terminalControl']>>;
type Selection = Readonly<{
	target: ManagedRuntimeRef;
	title: string;
	spaceName: string;
	provider?: string;
	source?: { bindingId: string; programEpoch: string };
}>;
const key = (ref: ManagedRuntimeRef) => JSON.stringify([ref.spaceId, ref.sessionId, ref.runtimeId]);
const object = (value?: ControlJson): Readonly<Record<string, ControlJson>> | undefined =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Readonly<Record<string, ControlJson>>)
		: undefined;

/** One visible tool instance. Closing it ends this observation, never the original runtime. */
export function TerminalControlPanel({
	controller,
	close,
	confirm,
	compact = false,
}: {
	controller: AgentController;
	close: () => void;
	confirm: ConfirmFn;
	compact?: boolean;
}) {
	const t = useT();
	const id = useId();
	const spaces = useStore(controller.spaces.store);
	const snapshot = useSyncExternalStore(
		controller.workspace.subscribeManaged,
		controller.workspace.getManagedSnapshot,
	);
	const [allSpaces, setAllSpaces] = useState(false);
	const [selected, setSelected] = useState<Selection>();
	const [mode, setMode] = useState<'agent.prompt' | 'terminal.send-text' | 'terminal.send-keys'>('agent.prompt');
	const [body, setBody] = useState('');
	const [condition, setCondition] = useState<ControlWaitState>('done');
	const [seconds, setSeconds] = useState('30');
	const [busy, setBusy] = useState<'sending' | 'waiting' | 'reading' | 'stopping'>();
	const [result, setResult] = useState<LocalResult>();
	const [lastInput, setLastInput] = useState<ControlInputReceipt>();
	const [initialWorking, setInitialWorking] = useState(false);
	const [continuation, setContinuation] = useState<Readonly<ActivityWaitBaseline>>();
	const [resumeCondition, setResumeCondition] = useState<ControlWaitState>('done');
	const [canContinue, setCanContinue] = useState(false);
	const [read, setRead] = useState<Readonly<Record<string, ControlJson>>>();
	const [error, setError] = useState('');
	const alive = useRef(true),
		epoch = useRef({ value: 0 }),
		active = useRef<AbortController | undefined>(undefined);
	const rows = snapshot.sessions.filter(
		(row) => !row.archived && (allSpaces || row.spaceId === spaces.records.selectedSpaceId),
	);
	const row =
		selected &&
		rows.find(
			(value) =>
				value.sessionId === selected.target.sessionId &&
				value.spaceId === selected.target.spaceId &&
				value.runtime?.runtimeId === selected.target.runtimeId,
		);
	const runtime = row?.runtime;
	const sameSource =
		!selected?.source ||
		(runtime?.activityDetail?.source.health === 'current' &&
			runtime.activityDetail.source.bindingId === selected.source.bindingId &&
			runtime.activityDetail.sources.filter((value) => value.health === 'current').length === 1 &&
			runtime.activityDetail.sources.some(
				(value) =>
					value.bindingId === selected.source!.bindingId &&
					value.programEpoch === selected.source!.programEpoch &&
					value.health === 'current',
			));
	const valid = !!row && runtime?.phase === 'connected' && sameSource && !spaces.loading && !spaces.error;
	const session = valid && selected ? controller.sessions.get(selected.target.runtimeId) : undefined;
	const editor = session?.getEditorReadiness();
	const promptAllowed = valid && row?.kind === 'agent' && editor?.status === 'ready';
	const inputAllowed = mode === 'agent.prompt' ? promptAllowed : valid;
	const timeout = Number(seconds) * 1000;
	const timeoutValid = Number.isSafeInteger(timeout) && timeout >= 1000 && timeout <= 86_400_000;
	const hit = compact ? 'min-h-11 min-w-11' : 'min-h-8';
	const invalidateOperation = () => {
		++epoch.current.value;
		active.current?.abort();
		active.current = undefined;
		setBusy(undefined);
	};
	const reset = () => {
		invalidateOperation();
		setResult(undefined);
		setLastInput(undefined);
		setInitialWorking(false);
		setContinuation(undefined);
		setCanContinue(false);
		setRead(undefined);
		setError('');
	};
	useEffect(() => {
		alive.current = true;
		const generation = epoch.current;
		return () => {
			alive.current = false;
			++generation.value;
			active.current?.abort();
		};
	}, []);
	useEffect(() => {
		if (!valid) {
			++epoch.current.value;
			active.current?.abort();
			active.current = undefined;
			setBusy(undefined);
		}
	}, [valid]);

	async function run(
		operation: ControlRequest['operation'],
		params: ControlRequest['params'] = {},
		after?: Readonly<ActivityWaitBaseline>,
	) {
		if (!selected || !valid || !timeoutValid) return;
		const target = Object.freeze({ ...selected.target });
		const sequence = ++epoch.current.value;
		active.current?.abort();
		const abort = new AbortController();
		active.current = abort;
		setError('');
		if (['agent.prompt', 'terminal.send-text', 'terminal.send-keys'].includes(operation)) {
			setLastInput(undefined);
			setResult(undefined);
			setContinuation(undefined);
			setCanContinue(false);
			setInitialWorking(false);
		}
		setBusy(
			operation === 'terminal.read'
				? 'reading'
				: operation === 'terminal.stop'
					? 'stopping'
					: operation === 'agent.wait'
						? 'waiting'
						: 'sending',
		);
		try {
			const next = await controller.terminalControl(
				{ protocolVersion: 1, requestId: crypto.randomUUID(), operation, target, params, timeoutMs: timeout },
				{
					signal: abort.signal,
					after,
					progress: (value) => {
						if (!alive.current || sequence !== epoch.current.value) return;
						const receipt = object(object(value.data)?.receipt);
						if (
							value.phase === 'input-submitted' &&
							value.effect === 'completed' &&
							receipt &&
							(receipt.kind === 'pty-written' || receipt.kind === 'adapter-applied') &&
							typeof receipt.op === 'number'
						) {
							setLastInput({ kind: receipt.kind, op: receipt.op });
							setInitialWorking(object(value.data)?.initialWorking === true);
							if (params?.wait) setBusy('waiting');
						}
					},
				},
			);
			if (!alive.current || sequence !== epoch.current.value) return;
			setResult(next);
			if (next.receipt) setLastInput(next.receipt);
			if (next.observation) setInitialWorking(next.observation.baseline.initialWorking);
			if (operation === 'agent.wait' || params?.wait) {
				setContinuation(next.continuation);
				setResumeCondition((params?.state ?? params?.wait) as ControlWaitState);
				setCanContinue(next.error?.code === 'WAIT_TIMEOUT' || next.error?.code === 'WAIT_CANCELLED');
			}
			if (operation === 'terminal.read') setRead(object(next.data));
			if (next.error) setError(next.error.message + ' (' + next.error.code + ')');
		} catch (cause) {
			if (alive.current && sequence === epoch.current.value)
				setError(cause instanceof Error ? cause.message.slice(0, 2000) : t('agent.control.failed'));
		} finally {
			if (alive.current && sequence === epoch.current.value) {
				active.current = undefined;
				setBusy(undefined);
			}
		}
	}
	const select = (value: string) => {
		reset();
		const next = rows.find(
			(candidate) =>
				candidate.runtime &&
				key({
					spaceId: candidate.spaceId,
					sessionId: candidate.sessionId,
					runtimeId: candidate.runtime.runtimeId,
				}) === value,
		);
		if (!next?.runtime) {
			setSelected(undefined);
			return;
		}
		const detail = next.runtime.activityDetail;
		const source = detail?.sources.find(
			(candidate) => candidate.bindingId === detail.source.bindingId && candidate.health === 'current',
		);
		setSelected({
			target: Object.freeze({
				spaceId: next.spaceId,
				sessionId: next.sessionId,
				runtimeId: next.runtime.runtimeId,
			}),
			title: next.title,
			spaceName: spaces.records.spaces[next.spaceId]?.name ?? next.spaceId,
			provider: next.agentId,
			...(source ? { source: { bindingId: source.bindingId, programEpoch: source.programEpoch } } : {}),
		});
	};
	const selectedLabel = selected
		? t('agent.coordination.targetLabel', {
				title: selected.title,
				space: selected.spaceName,
				provider: selected.provider ?? t('agent.shell'),
				id: selected.target.sessionId,
			})
		: undefined;
	const stop = async () => {
		if (!selected || !valid) return;
		const sequence = epoch.current.value;
		if (
			(await confirm(
				t('agent.coordination.stopConfirm', {
					title: selected.title,
					space: spaces.records.spaces[selected.target.spaceId]?.name ?? selected.target.spaceId,
					id: selected.target.sessionId,
				}),
				{ title: t('agent.coordination.stop'), action: t('agent.coordination.stop') },
			)) &&
			sequence === epoch.current.value &&
			alive.current
		)
			await run('terminal.stop');
	};
	const readRange = object(read?.range);
	const nextCursor = read?.nextCursor;
	return (
		<section
			className="flex h-full min-h-0 min-w-0 flex-col bg-card text-foreground"
			aria-label={t('agent.coordination.title')}
			data-terminal-control=""
		>
			<header className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
				<h2 className="min-w-0 truncate text-sm font-medium">{t('agent.coordination.title')}</h2>
				<Button
					variant="ghost"
					size="icon-sm"
					className={hit}
					aria-label={t('agent.coordination.close')}
					onClick={close}
				>
					<X className="size-4" />
				</Button>
			</header>
			<div className="scrollbar-sleek flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 text-xs">
				<p className="text-muted-foreground">{t('agent.coordination.sameVault')}</p>
				<p className="text-muted-foreground">{t('agent.coordination.supportLimit')}</p>
				<label htmlFor={id + '-scope'}>{t('agent.coordination.scope')}</label>
				<Select
					value={allSpaces ? 'all' : 'current'}
					onValueChange={(value) => {
						reset();
						setSelected(undefined);
						setAllSpaces(value === 'all');
					}}
				>
					<SelectTrigger id={id + '-scope'} className={'w-full min-w-0 ' + hit}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="current" className={hit}>
							{t('agent.coordination.currentSpace')}
						</SelectItem>
						<SelectItem value="all" className={hit}>
							{t('agent.coordination.allSpaces')}
						</SelectItem>
					</SelectContent>
				</Select>
				{spaces.loading ? (
					<p role="status">{t('agent.coordination.loading')}</p>
				) : spaces.error ? (
					<p role="alert">{t('agent.control.failed')}</p>
				) : !spaces.records.selectedSpaceId && !allSpaces ? (
					<p>{t('agent.coordination.noSpace')}</p>
				) : null}
				<label htmlFor={id + '-target'}>{t('agent.coordination.target')}</label>
				<Select
					value={selected ? key(selected.target) : ''}
					onValueChange={select}
					disabled={spaces.loading || !!spaces.error}
				>
					<SelectTrigger id={id + '-target'} className={'w-full min-w-0 ' + hit}>
						<SelectValue placeholder={t('agent.coordination.chooseTarget')}>{selectedLabel}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{selected && !row && (
							<SelectItem
								value={key(selected.target)}
								disabled
								className={'whitespace-normal break-words ' + hit}
							>
								{selectedLabel}
							</SelectItem>
						)}
						{rows.map(
							(candidate) =>
								candidate.runtime && (
									<SelectItem
										key={key({
											spaceId: candidate.spaceId,
											sessionId: candidate.sessionId,
											runtimeId: candidate.runtime.runtimeId,
										})}
										value={key({
											spaceId: candidate.spaceId,
											sessionId: candidate.sessionId,
											runtimeId: candidate.runtime.runtimeId,
										})}
										disabled={candidate.runtime.phase !== 'connected'}
										className={'whitespace-normal break-words ' + hit}
									>
										{t('agent.coordination.targetLabel', {
											title: candidate.title,
											space: spaces.records.spaces[candidate.spaceId]?.name ?? candidate.spaceId,
											provider: candidate.agentId ?? t('agent.shell'),
											id: candidate.sessionId,
										})}
									</SelectItem>
								),
						)}
					</SelectContent>
				</Select>
				{!spaces.loading && !rows.length && <p>{t('agent.coordination.empty')}</p>}
				{selected && (
					<div className="space-y-1 rounded-md border border-border bg-background p-2">
						<p className="break-words font-medium">{selected.title}</p>
						<p className="break-words">
							{spaces.records.spaces[selected.target.spaceId]?.name ?? selected.spaceName} ·{' '}
							{selected.provider ?? t('agent.shell')}
						</p>
						<p className="break-all font-mono text-muted-foreground">
							{selected.target.sessionId}
							<br />
							{selected.target.runtimeId}
						</p>
						{!valid ? (
							<p role="alert">{t('agent.coordination.stale')}</p>
						) : (
							<>
								<p>
									{t('agent.coordination.activity', {
										state: t(`agent.coordination.state.${runtime?.activity ?? 'unknown'}`),
									})}
								</p>
								<p>
									{runtime?.activityDetail?.blocking.state === 'blocked'
										? t('agent.coordination.blocked')
										: runtime?.activityDetail?.blocking.state === 'clear'
											? t('agent.coordination.blockingClear')
											: t('agent.coordination.blockingUnknown')}
								</p>
							</>
						)}
					</div>
				)}
				<label htmlFor={id + '-mode'}>{t('agent.coordination.mode')}</label>
				<Select value={mode} onValueChange={(value) => setMode(value as typeof mode)} disabled={!!busy}>
					<SelectTrigger id={id + '-mode'} className={'w-full ' + hit}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="agent.prompt" className={hit}>
							{t('agent.coordination.promptMode')}
						</SelectItem>
						<SelectItem value="terminal.send-text" className={hit}>
							{t('agent.coordination.textMode')}
						</SelectItem>
						<SelectItem value="terminal.send-keys" className={hit}>
							{t('agent.coordination.keysMode')}
						</SelectItem>
					</SelectContent>
				</Select>
				<p className="text-muted-foreground">
					{mode === 'agent.prompt'
						? editor?.status === 'ready'
							? t('agent.coordination.finalGate')
							: t('agent.coordination.unsupported')
						: mode === 'terminal.send-text'
							? t('agent.coordination.pasteOnly')
							: t('agent.coordination.keysHelp')}
				</p>
				<label htmlFor={id + '-body'}>{t('agent.coordination.input')}</label>
				<Textarea
					id={id + '-body'}
					value={body}
					onChange={(event) => setBody(event.target.value)}
					maxLength={32768}
					rows={5}
					disabled={!!busy}
					className="min-h-28 resize-y text-sm"
				/>
				<label htmlFor={id + '-condition'}>{t('agent.coordination.condition')}</label>
				<Select
					value={condition}
					onValueChange={(value) => setCondition(value as ControlWaitState)}
					disabled={!!busy}
				>
					<SelectTrigger id={id + '-condition'} className={'w-full ' + hit}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{CONTROL_WAIT_STATES.map((state) => (
							<SelectItem key={state} value={state} className={hit}>
								{t(`agent.coordination.state.${state}`)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-muted-foreground">{t('agent.coordination.doneMeaning')}</p>
				<label htmlFor={id + '-timeout'}>{t('agent.coordination.timeout')}</label>
				<Input
					id={id + '-timeout'}
					type="number"
					min={1}
					max={86400}
					step={1}
					value={seconds}
					onChange={(event) => setSeconds(event.target.value)}
					disabled={!!busy}
					className={hit}
				/>
				<div className="flex flex-wrap gap-2">
					<Button
						size="sm"
						className={hit}
						disabled={!inputAllowed || !body || !!busy || !timeoutValid}
						onClick={() => void run(mode, mode === 'terminal.send-keys' ? { keys: body } : { text: body })}
					>
						{t('agent.coordination.send')}
					</Button>
					<Button
						size="sm"
						variant="secondary"
						className={hit}
						disabled={mode !== 'agent.prompt' || !promptAllowed || !body || !!busy || !timeoutValid}
						onClick={() => void run('agent.prompt', { text: body, wait: condition })}
					>
						{t('agent.coordination.sendWait')}
					</Button>
				</div>
				{busy === 'waiting' && (
					<Button variant="outline" size="sm" className={hit} onClick={() => active.current?.abort()}>
						{t('agent.coordination.cancelWait')}
					</Button>
				)}
				{continuation && canContinue && (
					<Button
						variant="outline"
						size="sm"
						className={hit}
						disabled={!valid || !!busy || !timeoutValid}
						onClick={() => void run('agent.wait', { state: resumeCondition }, continuation)}
					>
						{t('agent.coordination.continueWait')}
					</Button>
				)}
				<div role="status" aria-live="polite" className="space-y-1 break-words">
					{busy && <p>{t(`agent.coordination.${busy}`)}</p>}
					{lastInput && <p>{t('agent.coordination.submitted')}</p>}
					{initialWorking && <p>{t('agent.coordination.initialWorking')}</p>}
					{result?.observation?.status === 'matched' && <p>{t('agent.coordination.matched')}</p>}
				</div>
				{error && (
					<p role="alert" className="break-words text-destructive">
						{error}
					</p>
				)}
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						size="sm"
						className={hit}
						disabled={!valid || !!busy}
						onClick={() => void run('terminal.read', { limit: 80, maxBytes: 8192 })}
					>
						{t('agent.coordination.read')}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className={hit}
						disabled={!selected}
						onClick={() => selected && controller.show(selected.target.runtimeId)}
					>
						<ArrowUpRight className="size-3.5" />
						{t('agent.coordination.locate')}
					</Button>
					<Button
						variant="outline"
						size="sm"
						className={hit}
						disabled={!valid || !!busy}
						onClick={() => void stop()}
					>
						{t('agent.coordination.stop')}
					</Button>
				</div>
				{read && (
					<div className="space-y-2 border-t border-border pt-2">
						<p>{t('agent.coordination.screenOnly')}</p>
						<p className="break-all font-mono">{selected?.target.runtimeId}</p>
						<p>
							{t('agent.coordination.range', {
								start: typeof readRange?.startRow === 'number' ? readRange.startRow : 0,
								end: typeof readRange?.endRow === 'number' ? readRange.endRow : 0,
							})}{' '}
							·{' '}
							{read.truncated === true
								? t('agent.coordination.truncated')
								: t('agent.coordination.completeRange')}
						</p>
						<pre className="scrollbar-sleek max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-background p-2 font-mono text-xs">
							{typeof read.text === 'string' ? read.text : ''}
						</pre>
						{typeof nextCursor === 'string' && (
							<Button
								variant="outline"
								size="sm"
								className={hit}
								disabled={!valid || !!busy}
								onClick={() =>
									void run('terminal.read', { cursor: nextCursor, limit: 80, maxBytes: 8192 })
								}
							>
								{t('agent.coordination.readMore')}
							</Button>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
