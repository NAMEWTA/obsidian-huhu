import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronRight, Copy } from 'lucide-react';
import type { TerminationEvidence } from '../../../../shared/native/host';
import { redactDiagnosticText } from '../../../../shared/diagnostics/redact';
import { Button } from '../../../../ui/components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../../ui/components/collapsible';
import { useOwnerWindow, useT } from '../../../../ui/react/hooks';
import type { ArchiveResult, ArchiveScope, ManagedRuntimeRef, ManagedSessionSummary, StopResult } from '../../core/workspace/managed-runtime';
import type { ConfirmFn, WorkspaceService } from '../../services/workspace-service';
import { SpaceError } from '../../core/space/errors';
import { spaceErrorMessage } from '../create/space-errors';

type LifecycleResponse = { kind: 'stop'; result: StopResult } | { kind: 'archive'; result: ArchiveResult };
const identity = (target: { spaceId: string; sessionId: string; runtimeId?: string }) =>
	[target.spaceId, target.sessionId, target.runtimeId].filter(Boolean).join(' · ');

/** UI lifetime only: cancellation before confirmation never admits a business operation. */
export function useLifecycleAction(workspace: WorkspaceService | undefined, confirm: ConfirmFn | undefined) {
	const t = useT();
	const [busy, setBusy] = useState(false), [response, setResponse] = useState<LifecycleResponse>(),
		[error, setError] = useState<{ message: string; cause: unknown }>();
	const current = useRef<AbortController | undefined>(undefined), locked = useRef(false), mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; current.current?.abort(); };
	}, []);
	const run = async (action: (signal: AbortSignal, valid: () => boolean, submitted: () => void) => Promise<LifecycleResponse | undefined>) => {
		if (locked.current || !workspace || !mounted.current) return;
		locked.current = true;
		const lifetime = new AbortController();
		current.current = lifetime;
		const valid = () => mounted.current && current.current === lifetime && !lifetime.signal.aborted;
		setError(undefined);
		try {
			const result = await action(lifetime.signal, valid, () => { if (valid()) setBusy(true); });
			if (valid() && result) setResponse(result);
		} catch (cause) {
			if (valid()) setError({ message: cause instanceof SpaceError ? spaceErrorMessage(cause) : t('agent.managed.unavailable'), cause });
		} finally {
			if (current.current === lifetime) {
				current.current = undefined; locked.current = false;
				if (mounted.current) setBusy(false);
			}
		}
	};
	return {
		busy, response, error,
		stop: (ref: ManagedRuntimeRef, title: string, force = false) => {
			const target = Object.freeze({ ...ref });
			return run(async (signal, valid, submitted) => {
				if (!confirm || !(await confirm(`${t('agent.managed.stopConfirm', { title })}\n${identity(target)}`, {
					title: t(force ? 'agent.managed.forceStop' : 'agent.managed.stop'), action: t(force ? 'agent.managed.forceStop' : 'agent.managed.stop'),
				})) || !valid()) return;
				submitted();
				return { kind: 'stop', result: await workspace!.stopManaged(target, { force, signal }) };
			});
		},
		check: (ref: ManagedRuntimeRef) => {
			const target = Object.freeze({ ...ref });
			return run(async (signal, _valid, submitted) => { submitted(); return { kind: 'stop', result: await workspace!.waitManagedStop(target, { signal }) }; });
		},
		archive: (scope: ArchiveScope, title: string) => {
			const target = Object.freeze({ ...scope });
			return run(async (signal, valid, submitted) => {
				const plan = await workspace!.previewArchive(target);
				if (!valid() || !confirm || !(await confirm([
					t('agent.managed.archiveConfirm', { title, count: plan.members.length }),
					target.spaceId,
					...plan.members.map(member => {
						const session = workspace!.getManagedSnapshot().sessions.find(item => item.spaceId === member.spaceId && item.sessionId === member.sessionId);
						return [session?.title, session?.agentId, identity(member)].filter(Boolean).join(' · ');
					}),
				].join('\n'), { title: t(scope.kind === 'space' ? 'agent.managed.archiveSpace' : 'agent.managed.archive'), action: t(scope.kind === 'space' ? 'agent.managed.archiveSpace' : 'agent.managed.archive') })) || !valid()) return;
				submitted();
				return { kind: 'archive', result: await workspace!.archiveManaged(plan, { signal }) };
			});
		},
	};
}

/**
 * Technical fields (root, cleanup, output, identifiers) stay behind an expander so a healthy terminal shows only its
 * plain-language state. The text is redacted for display and copying; expanding never touches the terminal pane.
 */
export function TechnicalDetails({ lines }: { lines: readonly string[] }) {
	const t = useT(), win = useOwnerWindow(), id = useId();
	const [open, setOpen] = useState(false), [copied, setCopied] = useState<'ok' | 'failed'>();
	const text = lines.map(redactDiagnosticText);
	useEffect(() => { if (!copied) return; const timer = win.setTimeout(() => setCopied(undefined), 2000); return () => win.clearTimeout(timer); }, [copied, win]);
	return <Collapsible open={open} onOpenChange={setOpen} className="min-w-0" data-technical-details="">
		<div className="flex flex-wrap items-center gap-1">
			<CollapsibleTrigger asChild>
				<Button variant="ghost" size="sm" className="pointer-coarse:min-h-11" aria-controls={id}>
					<ChevronRight className={open ? 'rotate-90' : undefined} aria-hidden="true" />
					{t(open ? 'agent.managed.detailsHide' : 'agent.managed.details')}
				</Button>
			</CollapsibleTrigger>
			{open && <Button variant="ghost" size="sm" className="pointer-coarse:min-h-11" onClick={() => {
				void win.navigator.clipboard.writeText(text.join('\n')).then(() => setCopied('ok'), () => setCopied('failed'));
			}}>
				{copied === 'ok' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
				{t('agent.managed.detailsCopy')}
			</Button>}
			<span role="status" className="text-xs text-muted-foreground">{copied === 'ok' ? t('agent.managed.detailsCopied') : ''}</span>
			{copied === 'failed' && <span role="alert" className="text-xs text-destructive">{t('agent.managed.detailsCopyFailed')}</span>}
		</div>
		<CollapsibleContent id={id} className="space-y-0.5">
			{text.map((line, index) => <p key={index} className="m-0 break-all text-xs text-muted-foreground">{line}</p>)}
		</CollapsibleContent>
	</Collapsible>;
}

export function TerminationDetails({ evidence, target }: { evidence: TerminationEvidence; target?: { spaceId: string; sessionId: string; runtimeId?: string } }) {
	const t = useT();
	const root = { running: 'rootRunning', exited: 'rootExited', unknown: 'rootUnknown', 'not-started': 'rootNotStarted' } as const;
	const cleanup = { pending: 'cleanupPending', confirmed: 'cleanupConfirmed', partial: 'cleanupPartial', unknown: 'cleanupUnknown' } as const;
	const output = { drained: 'outputDrained', truncated: 'outputTruncated', unknown: 'outputUnknown' } as const;
	return <TechnicalDetails lines={[t('agent.managed.stopDetails', {
		root: t(`agent.managed.${root[evidence.root.state]}`), cleanup: t(`agent.managed.${cleanup[evidence.cleanup.state]}`), output: t(`agent.managed.${output[evidence.output]}`),
	}), ...(target ? [identity(target)] : [])]} />;
}

/** Cleanup that is not confirmed is not success: it stays visible as an alert until a later check or retry settles it. */
export function isCleanupUncertain(runtime: ManagedSessionSummary['runtime']): boolean {
	return runtime?.termination?.cleanup.state === 'partial' || runtime?.termination?.cleanup.state === 'unknown'
		|| runtime?.stop?.outcome === 'partial' || runtime?.stop?.outcome === 'unknown';
}

export function ManagedLifecycleStatus({ session }: { session: ManagedSessionSummary }) {
	const t = useT(), runtime = session.runtime;
	const stopKey = runtime?.stop?.phase === 'stop-requested' ? 'stopRequested'
		: runtime?.stop?.outcome === 'confirmed' ? 'stopConfirmed'
		: runtime?.termination?.cleanup.state === 'partial' || runtime?.stop?.outcome === 'partial' ? 'stopPartial'
		: runtime?.termination?.cleanup.state === 'unknown' || runtime?.stop?.outcome === 'unknown' ? 'stopUnknown' : undefined;
	const uncertain = isCleanupUncertain(runtime) && runtime?.stop?.outcome !== 'confirmed' && stopKey !== 'stopRequested';
	return <div className="space-y-1" data-lifecycle-session={session.sessionId}>
		{session.archived && <p className="m-0 text-xs text-muted-foreground">{t('agent.managed.archived')}</p>}
		{stopKey && <div role={uncertain ? 'alert' : 'status'} className={uncertain ? 'space-y-0.5 border-l-2 border-destructive pl-2' : 'space-y-0.5'} data-lifecycle-state={stopKey}>
			<p className={uncertain ? 'm-0 break-words text-xs font-medium text-foreground' : 'm-0 break-words text-xs text-muted-foreground'}>{t(`agent.managed.${stopKey}`)}</p>
			{uncertain && <p className="m-0 break-words text-xs text-muted-foreground">{t('agent.managed.stopUncertainHint')}</p>}
		</div>}
		{runtime?.termination && <TerminationDetails evidence={runtime.termination} target={runtime.runtimeId ? { spaceId: session.spaceId, sessionId: session.sessionId, runtimeId: runtime.runtimeId } : undefined} />}
		{session.restore && <p role="status" className="m-0 text-xs text-muted-foreground">{t(session.restore.state === 'unconfirmed' ? 'agent.managed.recoveryUnconfirmed' : 'agent.managed.recoveryEnded')}</p>}
	</div>;
}

export function LifecycleFeedback({ action }: { action: ReturnType<typeof useLifecycleAction> }) {
	const t = useT(), response = action.response;
	return <div className="min-w-0 space-y-1" aria-live="polite">
		{action.error && <p role="alert" className="m-0 break-words text-xs text-destructive">{action.error.message}</p>}
		{response?.kind === 'stop' && <div data-stop-result={response.result.target.runtimeId}>
			<p role="status" className="m-0 text-xs">{t(response.result.status === 'stopped' && response.result.persisted ? 'agent.managed.stopConfirmed' : !response.result.persisted && response.result.termination.cleanup.state === 'confirmed' ? 'agent.spaces.error.save' : response.result.termination.cleanup.state === 'partial' ? 'agent.managed.stopPartial' : response.result.status === 'pending' ? 'agent.managed.stopRequested' : 'agent.managed.stopUnknown')}</p>
			<TerminationDetails evidence={response.result.termination} target={response.result.target} />
			{response.result.error && <p role="alert" className="m-0 text-xs text-destructive">{t(response.result.error.messageKey)}</p>}
		</div>}
		{response?.kind === 'archive' && <div data-archive-result={response.result.scope.spaceId}>
			<p role="status" className="m-0 text-xs">{t(response.result.status === 'archived' ? 'agent.managed.archived' : 'agent.managed.archiveIncomplete')}</p>
			{response.result.error && <p role="alert" className="m-0 text-xs text-destructive">{t(response.result.error.reason === 'archive-changed' ? 'agent.managed.archiveChanged' : response.result.error.messageKey)}</p>}
			{response.result.rows.map(row => <div className="space-y-1" key={identity(row.target)}>
				<p className="m-0 text-xs text-muted-foreground">{t(row.status === 'not-running' ? 'agent.managed.notRunning' : row.status === 'stopped' && row.persisted ? 'agent.managed.stopConfirmed' : row.status === 'incomplete' ? 'agent.managed.stopPartial' : 'agent.managed.stopUnknown')}</p>
				{row.termination && <TerminationDetails evidence={row.termination} target={row.target} />}
				{row.error && <p role="alert" className="m-0 text-xs text-destructive">{t(row.error.messageKey)}</p>}
			</div>)}
		</div>}
	</div>;
}

/** Keeps a long status from squeezing the terminal: it scrolls inside its own named, focusable region. */
export function ManagedStatusRegion({ children }: { children: ReactNode }) {
	const t = useT();
	return <div role="group" tabIndex={0} aria-label={t('agent.managed.statusRegion')} data-managed-status=""
		className="max-h-[40%] min-h-0 shrink-0 space-y-1 overflow-y-auto px-2 py-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{children}</div>;
}

/** The pane's lifecycle block: plain-language state, runtime error, the actions that apply, and the last action's result. */
export function ManagedLifecyclePanel({ session, lifecycle }: { session: ManagedSessionSummary; lifecycle: ReturnType<typeof useLifecycleAction> }) {
	const t = useT(), runtime = session.runtime;
	const ref = runtime && { spaceId: session.spaceId, sessionId: session.sessionId, runtimeId: runtime.runtimeId };
	return <>
		<ManagedLifecycleStatus session={session} />
		{runtime?.error && <p role="alert" className="m-0 break-words text-xs text-destructive">{t(runtime.error.messageKey)}</p>}
		{ref && (runtime.stop || runtime.phase === 'disconnected' || runtime.termination) && <Button variant="ghost" size="sm" className="pointer-coarse:min-h-11" aria-disabled={lifecycle.busy || undefined}
			onClick={() => { void lifecycle.check(ref); }}>{t('agent.managed.checkStop')}</Button>}
		{ref && isCleanupUncertain(runtime) && runtime.stop?.phase !== 'stop-requested' && <Button variant="ghost" size="sm" className="pointer-coarse:min-h-11" aria-disabled={lifecycle.busy || undefined}
			onClick={() => { void lifecycle.stop(ref, session.title, true); }}>{t('agent.managed.retryCleanup')}</Button>}
		<LifecycleFeedback action={lifecycle} />
	</>;
}
