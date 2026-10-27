import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, RotateCcw, Square } from 'lucide-react';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import { registerMessages } from '../../../../shared/i18n';
import type { BotClient, CommandMeta, Delegation, RecoveryStatus, Run } from '../../api';
import { taskMessages } from '../../i18n/tasks';

registerMessages(taskMessages);

export interface BotTaskHost { client: () => BotClient | undefined; report?: (error: unknown) => void; }

function meta(client: BotClient): CommandMeta {
  const id = crypto.randomUUID();
  return { commandId: id, idempotencyKey: id, profileId: client.hello.profile.profileId, commandEpoch: client.hello.profile.commandEpoch };
}
function tone(status: Run['status']): 'default' | 'secondary' | 'destructive' {
  if (status === 'failed' || status === 'blocked') return 'destructive';
  if (status === 'succeeded') return 'secondary';
  return 'default';
}
function usageText(run: Run): string {
  const usage = run.usage;
  if (!usage) return '—';
  const input = usage.inputTokens ?? '?';
  const output = usage.outputTokens ?? '?';
  return `${input} / ${output}${usage.estimated ? ' (estimate)' : ''}`;
}

export function TasksPage({ host, runId }: { host: BotTaskHost; runId?: string }) {
  const t = useT();
  const client = host.client();
  const [run, setRun] = useState<Run>();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [recovery, setRecovery] = useState<RecoveryStatus>();
  const [loading, setLoading] = useState(!!runId);
  const [action, setAction] = useState<'idle' | 'canceling' | 'checking' | 'resuming'>('idle');
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const current = host.client();
    if (!current || !runId) { setLoading(false); return; }
    setLoading(true); setError(undefined);
    try {
      const currentRun = await current.runs.get({ profileId: current.hello.profile.profileId, id: runId });
      setRun(currentRun);
      const [children, status] = await Promise.all([
        current.collaboration.list({ profileId: current.hello.profile.profileId, runId, limit: 100 }),
        current.runs.recovery({ profileId: current.hello.profile.profileId, id: runId }),
      ]);
      setDelegations(children.items); setRecovery(status);
    } catch (cause) { setError(t('huhubot.tasks.error')); host.report?.(cause); }
    finally { setLoading(false); }
  }, [host, runId, t]);
  useEffect(() => { void load(); }, [load]);

  const cancel = async () => {
    if (!client || !run || action !== 'idle') return;
    setAction('canceling'); setError(undefined);
    try {
      const receipt = await client.runs.cancel({ ...meta(client), id: run.id, expectedRevision: run.revision });
      setRun(previous => previous ? { ...previous, status: receipt.status, revision: receipt.revision } : previous);
    } catch (cause) { setError(t('huhubot.tasks.error')); host.report?.(cause); }
    finally { setAction('idle'); }
  };
  const recover = async () => {
    if (!client || !run || action !== 'idle') return;
    setAction('checking'); setError(undefined);
    try {
      const checked = await client.runs.recovery({ profileId: client.hello.profile.profileId, id: run.id });
      setRecovery(checked);
      if (checked.state !== 'ready') return;
      setAction('resuming');
      const receipt = await client.runs.resume({ ...meta(client), id: run.id, expectedRevision: run.revision, recoveryGeneration: checked.generation });
      setRun(previous => previous ? { ...previous, status: receipt.status, revision: receipt.revision, recovery: checked } : previous);
    } catch (cause) { setError(t('huhubot.tasks.error')); host.report?.(cause); }
    finally { setAction('idle'); }
  };

  if (!runId) return <EmptyState icon={<RotateCcw />} title={t('huhubot.tasks.title')} description={t('huhubot.tasks.select')} />;
  if (loading) return <div className="flex h-full items-center justify-center"><EmptyState icon={<LoaderCircle className="animate-spin" />} title={t('huhubot.tasks.title')} description={t('huhubot.tasks.loading')} /></div>;
  if (!run) return <div className="flex h-full items-center justify-center"><EmptyState icon={<CircleAlert />} title={t('huhubot.tasks.title')} description={error ?? t('huhubot.tasks.error')} action={<Button onClick={() => void load()}>{t('huhubot.tasks.retry')}</Button>} /></div>;
  const busy = action !== 'idle';
  return <section className="huhu-bot-tasks flex h-full min-h-0 flex-col gap-3 overflow-auto p-4" aria-label={t('huhubot.tasks.title')}>
    <header className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="m-0 text-base font-semibold">{t('huhubot.tasks.title')}</h1><p className="m-0 text-xs text-muted-foreground">{t('huhubot.tasks.run')} · {run.id}</p></div><div className="flex gap-2"><Badge variant={tone(run.status)}>{run.status}</Badge>{run.effectsUnresolved && <Badge variant="destructive">{t('huhubot.tasks.unknown')}</Badge>}</div></header>
    <div className="grid gap-3 @3xl:grid-cols-2">
      <article className="rounded-lg border border-border p-3"><h2 className="m-0 text-sm font-semibold">{t('huhubot.tasks.status')}</h2><dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs"><dt className="text-muted-foreground">Run</dt><dd className="m-0 break-all">{run.id}</dd><dt className="text-muted-foreground">Agent</dt><dd className="m-0 break-all">{run.agentId}</dd><dt className="text-muted-foreground">{t('huhubot.tasks.usage')}</dt><dd className="m-0">{usageText(run)}</dd><dt className="text-muted-foreground">Revision</dt><dd className="m-0">{run.revision}</dd></dl></article>
      <article className="rounded-lg border border-border p-3"><h2 className="m-0 text-sm font-semibold">{t('huhubot.tasks.recovery')}</h2><p className="mt-2 text-xs text-muted-foreground">{recovery?.reason ?? recovery?.state ?? '—'}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy || !['running', 'preparing', 'waiting_children', 'waiting_approval', 'accepted'].includes(run.status)} onClick={() => void cancel()} data-action-state={action}>{action === 'canceling' ? <LoaderCircle className="animate-spin" /> : <Square />}{action === 'canceling' ? t('huhubot.tasks.canceling') : t('huhubot.tasks.cancel')}</Button><Button size="sm" variant="outline" disabled={busy || recovery?.state !== 'ready' || run.status !== 'recovering'} onClick={() => void recover()} data-action-state={action}>{action === 'checking' || action === 'resuming' ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}{action === 'checking' ? t('huhubot.tasks.checking') : action === 'resuming' ? t('huhubot.tasks.canceling') : t('huhubot.tasks.resume')}</Button></div></article>
    </div>
    <article className="min-h-0 rounded-lg border border-border p-3"><h2 className="m-0 text-sm font-semibold">{t('huhubot.tasks.delegations')}</h2>{delegations.length === 0 ? <p className="text-xs text-muted-foreground">{t('huhubot.tasks.noDelegations')}</p> : <ul className="m-0 mt-2 grid list-none gap-2 p-0">{delegations.map(item => <li key={item.id} className="rounded-md border border-border/70 p-2 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{item.id}</span><Badge variant={tone(item.status)}>{item.status}</Badge></div><dl className="mt-1 grid grid-cols-[auto,1fr] gap-x-3"><dt className="text-muted-foreground">Parent</dt><dd className="m-0 break-all">{item.parentRunId}</dd><dt className="text-muted-foreground">Child</dt><dd className="m-0 break-all">{item.childRunId}</dd>{item.result && <><dt className="text-muted-foreground">Result</dt><dd className="m-0">{item.result.partial ? 'partial' : item.result.status} · {item.result.usage?.knowledge ?? 'unknown'}</dd></>}</dl></li>)}</ul>}</article>
    {error && <p role="alert" className="m-0 rounded border border-destructive/40 p-2 text-xs text-destructive">{error} <Button variant="link" size="sm" className="h-auto p-0" onClick={() => void load()}>{t('huhubot.tasks.retry')}</Button></p>}
  </section>;
}
