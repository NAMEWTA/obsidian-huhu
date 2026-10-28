import { useEffect, useRef, useState } from 'react';
import type { TerminationEvidence } from '../../../../shared/native/host';
import { useT } from '../../../../ui/react/hooks';
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

export function TerminationDetails({ evidence }: { evidence: TerminationEvidence }) {
	const t = useT();
	const root = { running: 'rootRunning', exited: 'rootExited', unknown: 'rootUnknown', 'not-started': 'rootNotStarted' } as const;
	const cleanup = { pending: 'cleanupPending', confirmed: 'cleanupConfirmed', partial: 'cleanupPartial', unknown: 'cleanupUnknown' } as const;
	const output = { drained: 'outputDrained', truncated: 'outputTruncated', unknown: 'outputUnknown' } as const;
	return <p className="m-0 break-words text-xs text-muted-foreground">{t('agent.managed.stopDetails', {
		root: t(`agent.managed.${root[evidence.root.state]}`), cleanup: t(`agent.managed.${cleanup[evidence.cleanup.state]}`), output: t(`agent.managed.${output[evidence.output]}`),
	})}</p>;
}

export function ManagedLifecycleStatus({ session }: { session: ManagedSessionSummary }) {
	const t = useT(), runtime = session.runtime;
	const stopKey = runtime?.stop?.phase === 'stop-requested' ? 'stopRequested'
		: runtime?.stop?.outcome === 'confirmed' ? 'stopConfirmed'
		: runtime?.termination?.cleanup.state === 'partial' || runtime?.stop?.outcome === 'partial' ? 'stopPartial'
		: runtime?.termination?.cleanup.state === 'unknown' || runtime?.stop?.outcome === 'unknown' ? 'stopUnknown' : undefined;
	return <div className="space-y-1" data-lifecycle-session={session.sessionId}>
		{session.archived && <p className="m-0 text-xs text-muted-foreground">{t('agent.managed.archived')}</p>}
		{stopKey && <p role="status" className="m-0 text-xs text-muted-foreground">{t(`agent.managed.${stopKey}`)}</p>}
		{runtime?.termination && <TerminationDetails evidence={runtime.termination} />}
		{session.restore && <p role="status" className="m-0 text-xs text-muted-foreground">{t(session.restore.state === 'unconfirmed' ? 'agent.managed.recoveryUnconfirmed' : 'agent.managed.recoveryEnded')}</p>}
	</div>;
}

export function LifecycleFeedback({ action }: { action: ReturnType<typeof useLifecycleAction> }) {
	const t = useT(), response = action.response;
	return <div className="min-w-0 space-y-1" aria-live="polite">
		{action.error && <p role="alert" className="m-0 break-words text-xs text-destructive">{action.error.message}</p>}
		{response?.kind === 'stop' && <div data-stop-result={response.result.target.runtimeId}>
			<p role="status" className="m-0 text-xs">{t(response.result.status === 'stopped' && response.result.persisted ? 'agent.managed.stopConfirmed' : !response.result.persisted && response.result.termination.cleanup.state === 'confirmed' ? 'agent.spaces.error.save' : response.result.termination.cleanup.state === 'partial' ? 'agent.managed.stopPartial' : response.result.status === 'pending' ? 'agent.managed.stopRequested' : 'agent.managed.stopUnknown')}</p>
			<p className="m-0 break-all text-2xs text-muted-foreground">{identity(response.result.target)}</p>
			<TerminationDetails evidence={response.result.termination} />
			{response.result.error && <p role="alert" className="m-0 text-xs text-destructive">{t(response.result.error.messageKey)}</p>}
		</div>}
		{response?.kind === 'archive' && <div data-archive-result={response.result.scope.spaceId}>
			<p role="status" className="m-0 text-xs">{t(response.result.status === 'archived' ? 'agent.managed.archived' : 'agent.managed.archiveIncomplete')}</p>
			{response.result.error && <p role="alert" className="m-0 text-xs text-destructive">{t(response.result.error.reason === 'archive-changed' ? 'agent.managed.archiveChanged' : response.result.error.messageKey)}</p>}
			{response.result.rows.map(row => <div className="space-y-1" key={identity(row.target)}>
				<p className="m-0 break-all text-2xs text-muted-foreground">{identity(row.target)}</p>
				<p className="m-0 text-xs text-muted-foreground">{t(row.status === 'not-running' ? 'agent.managed.notRunning' : row.status === 'stopped' && row.persisted ? 'agent.managed.stopConfirmed' : row.status === 'incomplete' ? 'agent.managed.stopPartial' : 'agent.managed.stopUnknown')}</p>
				{row.termination && <TerminationDetails evidence={row.termination} />}
				{row.error && <p role="alert" className="m-0 text-xs text-destructive">{t(row.error.messageKey)}</p>}
			</div>)}
		</div>}
	</div>;
}
