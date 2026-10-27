import { useCallback, useEffect, useState } from 'react';
import { Check, CircleAlert, LoaderCircle, X } from 'lucide-react';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import { registerMessages } from '../../../../shared/i18n';
import type { Approval, BotClient, CommandMeta } from '../../api';
import { taskMessages } from '../../i18n/tasks';
registerMessages(taskMessages);

export interface BotApprovalHost { client: () => BotClient | undefined; report?: (error: unknown) => void; }
function meta(client: BotClient): CommandMeta { const id = crypto.randomUUID(); return { commandId: id, idempotencyKey: id, profileId: client.hello.profile.profileId, commandEpoch: client.hello.profile.commandEpoch }; }

export function ApprovalsPage({ host }: { host: BotApprovalHost }) {
  const t = useT();
  const [items, setItems] = useState<Approval[]>([]);
  const [selected, setSelected] = useState<Approval>();
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    const client = host.client(); if (!client) { setLoading(false); return; }
    setLoading(true); setError(undefined);
    try { const page = await client.approvals.list({ profileId: client.hello.profile.profileId, limit: 100 }); setItems(page.items); setSelected(current => current ? page.items.find(item => item.id === current.id) : page.items[0]); }
    catch (cause) { setError(t('huhubot.tasks.error')); host.report?.(cause); } finally { setLoading(false); }
  }, [host, t]);
  useEffect(() => { void load(); }, [load]);
  const resolve = async (decision: 'approve' | 'reject') => {
    const client = host.client(); if (!client || !selected || action !== 'idle') return;
    setAction(decision === 'approve' ? 'approving' : 'rejecting'); setError(undefined);
    try { const next = await client.approvals.resolve({ ...meta(client), id: selected.id, effectId: selected.effectId, expectedRevision: selected.revision, decision, previewHash: selected.preview.previewHash }); setItems(previous => previous.map(item => item.id === next.id ? next : item)); setSelected(next); }
    catch (cause) { setError(t('huhubot.access.error')); host.report?.(cause); } finally { setAction('idle'); }
  };
  if (loading) return <div className="flex h-full items-center justify-center"><EmptyState icon={<LoaderCircle className="animate-spin" />} title={t('huhubot.access.title')} description={t('huhubot.tasks.loading')} /></div>;
  if (items.length === 0) return <EmptyState icon={<Check />} title={t('huhubot.access.title')} description={t('huhubot.access.empty')} />;
  const busy = action !== 'idle';
  return <section className="huhu-bot-tasks grid h-full min-h-0 gap-3 overflow-auto p-4 @3xl:grid-cols-[16rem,minmax(0,1fr)]" aria-label={t('huhubot.access.title')}>
    <aside className="min-h-0 overflow-y-auto rounded-lg border border-border p-2"><h1 className="m-1 text-base font-semibold">{t('huhubot.access.title')}</h1><ul className="m-0 grid list-none gap-1 p-0">{items.map(item => <li key={item.id}><button type="button" className="w-full rounded-md p-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" aria-current={selected?.id === item.id ? 'true' : undefined} onClick={() => setSelected(item)}><span className="block truncate text-xs font-medium">{item.preview.target.resourceId}</span><span className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground"><span>{item.status}</span><span>{item.expiresAt}</span></span></button></li>)}</ul></aside>
    {selected && <main className="min-w-0 rounded-lg border border-border p-4"><header className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="m-0 text-sm font-semibold">{selected.preview.target.resourceId}</h2><p className="m-0 text-xs text-muted-foreground">{selected.preview.target.operation} · {selected.preview.tool.name}</p></div><Badge variant={selected.status === 'pending' ? 'default' : selected.status === 'approved' ? 'secondary' : 'destructive'}>{selected.status}</Badge></header><dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs"><dt className="text-muted-foreground">Effect</dt><dd className="m-0 break-all">{selected.effectId}</dd><dt className="text-muted-foreground">Revision</dt><dd className="m-0">{selected.revision}</dd><dt className="text-muted-foreground">Expires</dt><dd className="m-0">{selected.expiresAt}</dd><dt className="text-muted-foreground">Preview</dt><dd className="m-0 break-all">{selected.preview.previewHash}</dd></dl><h3 className="mt-4 text-xs font-semibold">Diff</h3><pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{selected.preview.diff}</pre><h3 className="mt-4 text-xs font-semibold">Sources</h3><ul className="m-0 mt-1 list-disc pl-5 text-xs">{selected.preview.sourceRefs.length ? selected.preview.sourceRefs.map(source => <li key={`${source.resourceId}:${source.revision ?? ''}`}>{source.title ?? source.resourceId} · {source.revision ?? 'unknown'}</li>) : <li>—</li>}</ul>{selected.status === 'pending' && <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={() => void resolve('approve')}>{action === 'approving' ? <LoaderCircle className="animate-spin" /> : <Check />}{action === 'approving' ? t('huhubot.tasks.canceling') : t('huhubot.tasks.approve')}</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void resolve('reject')}>{action === 'rejecting' ? <LoaderCircle className="animate-spin" /> : <X />}{action === 'rejecting' ? t('huhubot.tasks.canceling') : t('huhubot.tasks.reject')}</Button></div>}{error && <p role="alert" className="mt-3 rounded border border-destructive/40 p-2 text-xs text-destructive"><CircleAlert className="mr-1 inline size-3" />{error}<Button variant="link" size="sm" className="h-auto p-0" onClick={() => void load()}>{t('huhubot.tasks.retry')}</Button></p>}</main>}
  </section>;
}
