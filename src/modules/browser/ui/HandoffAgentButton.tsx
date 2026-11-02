import { useEffect, useId, useRef, useState } from 'react';
import type { BrowserHandoffRequest, BrowserWorkspace } from '../api';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/components/dialog';
import { useT } from '../../../ui/react/hooks';
import { BrowserActionError, actionError } from './BrowserActionError';

/** A trusted, explicit user authorization. Identity text is not a model tool or a Bot task. */
export function HandoffAgentButton({ api, spaceId, pageId, disabled }: { api: BrowserWorkspace; spaceId: string; pageId: string; disabled?: boolean }) {
	const t = useT(), id = useId(), mounted = useRef(true), busy = useRef(false);
	const [request, setRequest] = useState<BrowserHandoffRequest>();
	const [pending, setPending] = useState(false), [error, setError] = useState('');
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
	const open = () => {
		const space = api.getState().spaces.find(item => item.id === spaceId), lease = space?.control.lease;
		if (!space?.runtimeId || space.kind !== 'task' || space.control.mode !== 'agent' || !lease) return;
		setError('');
		setRequest({ spaceId, pageId, runtimeId: space.runtimeId, fromRunId: lease.controllerId, expectedEpoch: lease.epoch, target: { consumerId: 'cli', agentId: '', externalRunId: '', attemptId: '1' } });
	};
	const submit = async () => {
		if (!request || busy.current) return;
		busy.current = true; setPending(true); setError('');
		try { await api.handoffAgent(request); if (mounted.current) setRequest(undefined); }
		catch (reason) { if (mounted.current) setError(actionError(reason)); }
		finally { busy.current = false; if (mounted.current) setPending(false); }
	};
	return <>
		<Button size="sm" variant="outline" disabled={disabled} onClick={open}>{t('browser.v2.handoff')}</Button>
		<Dialog open={!!request} onOpenChange={open => { if (!open && !busy.current) setRequest(undefined); }}>
			<DialogContent>
				<DialogHeader><DialogTitle>{t('browser.v2.handoffTitle')}</DialogTitle><DialogDescription>{t('browser.v2.handoffDescription')}</DialogDescription></DialogHeader>
				<form aria-busy={pending} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} onSubmit={event => { event.preventDefault(); void submit(); }} className="flex min-w-0 flex-col gap-3">
					{(['agentId', 'externalRunId', 'attemptId'] as const).map(field => <label key={field} htmlFor={`${id}-${field}`} className="flex min-w-0 flex-col gap-1 text-sm">
						{t(`browser.v2.handoff.${field}`)}
						<Input aria-describedby={`${id}-connection`} id={`${id}-${field}`} value={request?.target[field] ?? ''} maxLength={128} required disabled={pending} autoComplete="off" onChange={event => { const value = event.target.value; setRequest(current => current ? { ...current, target: { ...current.target, [field]: value } } : current); }} />
					</label>)}
					<p id={`${id}-connection`} className="text-xs text-muted-foreground">{t('browser.v2.handoffConnection')}</p>
					<BrowserActionError code={error} />
					<DialogFooter>
						<Button type="button" variant="outline" disabled={pending} onClick={() => setRequest(undefined)}>{t('browser.v2.cancel')}</Button>
						<Button type="submit" disabled={pending || !request?.target.agentId.trim() || !request.target.externalRunId.trim() || !request.target.attemptId.trim()}>{t('browser.v2.handoffConfirm')}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	</>;
}
