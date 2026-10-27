import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CircleAlert, LoaderCircle, Pin, RefreshCw, RotateCcw, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { Label } from '../../../../ui/components/label';
import { Textarea } from '../../../../ui/components/textarea';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import { registerMessages, t } from '../../../../shared/i18n';
import type { BotClient, CommandMeta, MemoryItem, MemoryNamespace, MemoryObject, MemoryPage, MemoryProposal } from '../../api';
import { memoryMessages } from '../../i18n/memory';

registerMessages(memoryMessages);

export interface MemoryWorkbenchHost {
  client: () => BotClient | undefined;
  namespace?: () => MemoryNamespace;
  namespaces?: readonly MemoryNamespace[];
  report?: (error: unknown) => void;
}

type LoadState = 'loading' | 'ready' | 'error';

function commandMeta(client: BotClient): CommandMeta {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return { commandId: id, idempotencyKey: id, profileId: client.hello.profile.profileId, commandEpoch: client.hello.profile.commandEpoch };
}

function namespaceKey(namespace: MemoryNamespace): string { return `${namespace.kind}:${namespace.id}`; }
function namespaceLabel(namespace: MemoryNamespace): string {
  if (namespace.kind === 'global') return t('huhubot.memory.globalScope');
  if (namespace.kind === 'temporary') return t('huhubot.memory.temporaryScope');
  return namespace.id ? `${t('huhubot.memory.agentScope')} · ${namespace.id}` : t('huhubot.memory.agentScope');
}
function itemText(item: MemoryItem): string { return item.state === 'active' ? item.body.text : t('huhubot.memory.forgotten'); }
function activeItem(object: MemoryObject): MemoryItem | undefined { return object.kind === 'item' && object.item.state === 'active' ? object.item : undefined; }

export function MemoryWorkbenchPage({ host }: { host: MemoryWorkbenchHost }) {
  const translate = useT();
  const client = host.client();
  const choices = useMemo(() => host.namespaces?.length ? [...host.namespaces] : host.namespace ? [host.namespace()] : [], [host]);
  const [selectedKey, setSelectedKey] = useState(() => choices[0] ? namespaceKey(choices[0]) : '');
  const selectedNamespace = choices.find(namespace => namespaceKey(namespace) === selectedKey) ?? choices[0];
  const [page, setPage] = useState<MemoryPage>();
  const [loadState, setLoadState] = useState<LoadState>(client && selectedNamespace ? 'loading' : 'error');
  const [error, setError] = useState<string>();
  const [correction, setCorrection] = useState<{ id: string; text: string }>();
  const [proposalText, setProposalText] = useState('');
  const [proposal, setProposal] = useState<MemoryProposal>();
  const [working, setWorking] = useState<string>();

  const load = useCallback(async (namespace = selectedNamespace) => {
    const current = host.client();
    if (!current || !namespace) { setLoadState('error'); return; }
    setLoadState('loading');
    setError(undefined);
    try {
      const result = await current.memory.list({ profileId: current.hello.profile.profileId, namespace, kind: 'item', limit: 100 });
      setPage(result);
      setLoadState('ready');
    } catch (cause) {
      setLoadState('error');
      setError(translate('huhubot.memory.error'));
      host.report?.(cause);
    }
  }, [host, selectedNamespace, translate]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!client) return;
    return client.onClose(() => setLoadState('error'));
  }, [client]);

  const objects = useMemo(() => page?.items ?? [], [page]);
  const items = useMemo(() => objects.map(activeItem).filter((item): item is MemoryItem => !!item), [objects]);
  const settings = page?.settings;
  const pendingObjects = objects.filter(object => object.kind === 'proposal' || object.kind === 'candidate' || object.kind === 'job');

  const run = async (key: string, action: () => Promise<void>) => {
    setWorking(key); setError(undefined);
    try { await action(); }
    catch (cause) { setError(translate('huhubot.memory.error')); host.report?.(cause); }
    finally { setWorking(undefined); }
  };
  const pin = (item: MemoryItem) => run(`pin:${item.id}`, async () => {
    const current = host.client();
    if (!current || !selectedNamespace || item.state !== 'active') return;
    await current.memory.pin({ ...commandMeta(current), expectedRevision: item.revision, namespace: selectedNamespace, id: item.id, pinned: !item.pinned });
    await load();
  });
  const forget = (item: MemoryItem) => run(`forget:${item.id}`, async () => {
    const current = host.client();
    if (!current || !selectedNamespace) return;
    await current.memory.forget({ ...commandMeta(current), expectedRevision: item.revision, namespace: selectedNamespace, id: item.id });
    await load();
  });
  const saveCorrection = (item: MemoryItem) => run(`correct:${item.id}`, async () => {
    const current = host.client();
    if (!current || !selectedNamespace || item.state !== 'active' || !correction?.text.trim()) return;
    await current.memory.correct({ ...commandMeta(current), expectedRevision: item.revision, namespace: selectedNamespace, action: 'correct', id: item.id, text: correction.text.trim() });
    setCorrection(undefined);
    await load();
  });
  const toggleAutomatic = () => run('auto', async () => {
    const current = host.client();
    if (!current || !selectedNamespace || !page) return;
    await current.memory.setAutoMaintenance({ ...commandMeta(current), expectedRevision: page.namespaceRevision, namespace: selectedNamespace, enabled: !(settings?.enabled ?? false) });
    await load();
  });
  const proposeGlobal = () => run('proposal', async () => {
    const current = host.client();
    if (!current || !proposalText.trim()) return;
    const result = await current.memory.proposeGlobal({ ...commandMeta(current), expectedRevision: page?.namespaceRevision ?? '0', scope: { kind: 'profile' }, operation: 'create', text: proposalText.trim(), sources: [] });
    setProposal(result);
    setProposalText('');
  });
  const resolveProposal = (decision: 'approve' | 'reject') => run(`proposal:${decision}`, async () => {
    const current = host.client();
    if (!current || !proposal) return;
    await current.memory.resolveGlobal({ ...commandMeta(current), expectedRevision: proposal.revision, id: proposal.id, decision, previewHash: proposal.previewHash });
    setProposal(undefined);
    await load();
  });

  if (loadState === 'loading') return <div className="flex h-full min-h-0 items-center justify-center p-6"><EmptyState icon={<LoaderCircle className="animate-spin" />} title={translate('huhubot.memory.title')} description={translate('huhubot.memory.loading')} /></div>;
  if (loadState === 'error' && !client) return <div className="flex h-full min-h-0 items-center justify-center p-6"><EmptyState icon={<CircleAlert />} title={translate('huhubot.memory.title')} description={translate('huhubot.memory.offline')} /></div>;

  return <section className="flex h-full min-h-0 flex-col overflow-hidden @container" aria-label={translate('huhubot.memory.title')}>
    <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-5">
      <div className="min-w-0 flex-1"><h1 className="m-0 truncate text-sm font-semibold">{translate('huhubot.memory.title')}</h1><p className="m-0 truncate text-xs text-muted-foreground">{selectedNamespace ? namespaceLabel(selectedNamespace) : translate('huhubot.memory.offline')}</p></div>
      {choices.length > 1 && <div className="flex flex-wrap gap-1" role="tablist" aria-label={translate('huhubot.memory.scope')}>{choices.map(namespace => <Button key={namespaceKey(namespace)} size="sm" variant={namespaceKey(namespace) === namespaceKey(selectedNamespace ?? namespace) ? 'secondary' : 'ghost'} role="tab" aria-selected={namespaceKey(namespace) === namespaceKey(selectedNamespace ?? namespace)} onClick={() => { setSelectedKey(namespaceKey(namespace)); setProposal(undefined); }}>{namespaceLabel(namespace)}</Button>)}</div>}
      <Button size="icon-sm" variant="outline" aria-label={translate('huhubot.memory.refresh')} title={translate('huhubot.memory.refresh')} onClick={() => void load()} disabled={!!working}><RefreshCw aria-hidden /></Button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
      {error && <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive" role="alert"><CircleAlert className="size-4" aria-hidden /><span className="min-w-0 flex-1">{error}</span><Button size="sm" variant="link" onClick={() => void load()}>{translate('huhubot.memory.retry')}</Button></div>}
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        <section className="rounded-lg border border-border bg-card p-4" aria-label={translate('huhubot.memory.automatic')}>
          <div className="flex flex-wrap items-center gap-2"><ShieldCheck className="size-4" aria-hidden /><h2 className="m-0 text-sm font-semibold">{settings?.enabled ? translate('huhubot.memory.autoOn') : translate('huhubot.memory.autoOff')}</h2><Badge variant={settings?.eligible ? 'outline' : 'secondary'}>{settings?.eligible ? translate('huhubot.memory.active') : translate('huhubot.memory.manual')}</Badge><Button className="ml-auto" size="sm" variant="outline" onClick={() => void toggleAutomatic()} disabled={!settings || !!working}>{settings?.enabled ? translate('huhubot.memory.cancel') : translate('huhubot.memory.automatic')}</Button></div>
          {settings?.reason && <p className="mb-0 mt-2 text-xs text-muted-foreground">{translate('huhubot.memory.pauseReason', { reason: settings.reason })}</p>}
        </section>
        <section className="grid gap-3" aria-label={translate('huhubot.memory.title')}>
          {items.length === 0 && pendingObjects.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8"><EmptyState icon={<RotateCcw />} title={translate('huhubot.memory.empty')} description={selectedNamespace ? namespaceLabel(selectedNamespace) : undefined} /></div> : items.map(item => <MemoryCard key={item.id} item={item} busy={working?.endsWith(item.id) ?? false} correction={correction?.id === item.id ? correction.text : undefined} onCorrection={text => setCorrection({ id: item.id, text })} onSaveCorrection={() => void saveCorrection(item)} onCancelCorrection={() => setCorrection(undefined)} onPin={() => void pin(item)} onForget={() => void forget(item)} />)}
          {pendingObjects.length > 0 && <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground"><Badge variant="secondary">{translate('huhubot.memory.pending')}</Badge><span className="ml-2">{pendingObjects.length} {translate('huhubot.memory.pending').toLocaleLowerCase()}</span></div>}
        </section>
        {selectedNamespace?.kind === 'global' || selectedNamespace?.kind === 'agent' ? <section className="rounded-lg border border-border bg-card p-4" aria-label={translate('huhubot.memory.propose')}><div className="mb-2 flex items-center gap-2"><Save className="size-4" aria-hidden /><h2 className="m-0 text-sm font-semibold">{translate('huhubot.memory.propose')}</h2></div><Label htmlFor="huhubot-memory-proposal" className="sr-only">{translate('huhubot.memory.proposalPlaceholder')}</Label><Textarea id="huhubot-memory-proposal" value={proposalText} onChange={event => setProposalText(event.currentTarget.value)} placeholder={translate('huhubot.memory.proposalPlaceholder')} className="min-h-20 resize-y" disabled={!!proposal || !!working} /><Button className="mt-2" size="sm" onClick={() => void proposeGlobal()} disabled={!proposalText.trim() || !!proposal || !!working}>{translate('huhubot.memory.propose')}</Button></section> : null}
        {proposal && <ProposalCard proposal={proposal} busy={!!working} onResolve={decision => void resolveProposal(decision)} />}
      </div>
    </div>
  </section>;
}

function MemoryCard({ item, busy, correction, onCorrection, onSaveCorrection, onCancelCorrection, onPin, onForget }: { item: MemoryItem; busy: boolean; correction?: string; onCorrection: (text: string) => void; onSaveCorrection: () => void; onCancelCorrection: () => void; onPin: () => void; onForget: () => void }) {
  const translate = useT();
  const body = item.state === 'active' ? item.body : undefined;
  return <article className="rounded-lg border border-border bg-card p-4" aria-label={itemText(item)}><div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><p className="m-0 whitespace-pre-wrap break-words text-sm">{itemText(item)}</p><div className="mt-2 flex flex-wrap gap-1"><Badge variant="outline">{translate('huhubot.memory.revision', { revision: item.revision })}</Badge><Badge variant="outline">{item.pinned ? translate('huhubot.memory.pinned') : translate('huhubot.memory.active')}</Badge>{body && <Badge variant="secondary">{translate('huhubot.memory.provenance', { value: body.provenance })}</Badge>}</div></div><div className="flex shrink-0 gap-1"><Button size="icon-sm" variant={item.pinned ? 'secondary' : 'outline'} aria-label={item.pinned ? translate('huhubot.memory.unpin') : translate('huhubot.memory.pin')} title={item.pinned ? translate('huhubot.memory.unpin') : translate('huhubot.memory.pin')} onClick={onPin} disabled={busy}><Pin aria-hidden /></Button><Button size="icon-sm" variant="outline" aria-label={translate('huhubot.memory.correct')} title={translate('huhubot.memory.correct')} onClick={() => onCorrection(body?.text ?? '')} disabled={busy || !body}><RotateCcw aria-hidden /></Button><Button size="icon-sm" variant="ghost" aria-label={translate('huhubot.memory.forget')} title={translate('huhubot.memory.forget')} onClick={onForget} disabled={busy}><Trash2 aria-hidden /></Button></div></div>{body && <div className="mt-3 border-t border-border pt-3"><p className="m-0 text-xs text-muted-foreground">{translate('huhubot.memory.createdBy', { creator: body.creatorKind })}</p><div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground"><span>{translate('huhubot.memory.source')}:</span>{body.sourceRefs.length ? body.sourceRefs.map(source => <Badge key={`${source.resourceId}:${source.revision ?? ''}`} variant="outline" title={source.resourceId}>{source.title ?? source.resourceId}</Badge>) : <span>{translate('huhubot.memory.sourceNone')}</span>}</div></div>}{correction !== undefined && <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3"><Label htmlFor={`huhubot-memory-correction-${item.id}`}>{translate('huhubot.memory.correct')}</Label><Textarea id={`huhubot-memory-correction-${item.id}`} value={correction} onChange={event => onCorrection(event.currentTarget.value)} className="min-h-20 resize-y" /><div className="flex flex-wrap gap-2"><Button size="sm" onClick={onSaveCorrection} disabled={!correction.trim() || busy}><Check aria-hidden />{translate('huhubot.memory.saveCorrection')}</Button><Button size="sm" variant="ghost" onClick={onCancelCorrection} disabled={busy}><X aria-hidden />{translate('huhubot.memory.cancel')}</Button></div></div>}</article>;
}

function ProposalCard({ proposal, busy, onResolve }: { proposal: MemoryProposal; busy: boolean; onResolve: (decision: 'approve' | 'reject') => void }) {
  const translate = useT();
  return <section className="rounded-lg border border-status-warning/50 bg-status-warning/5 p-4" aria-label={translate('huhubot.memory.proposalPreview')}><div className="flex items-center gap-2"><ShieldCheck className="size-4" aria-hidden /><h2 className="m-0 text-sm font-semibold">{translate('huhubot.memory.proposalPreview')}</h2><Badge variant="secondary">{translate('huhubot.memory.pending')}</Badge></div><p className="mt-2 whitespace-pre-wrap break-words text-sm">{proposal.body?.text ?? translate('huhubot.memory.proposalWarning')}</p><p className="text-xs text-muted-foreground">{translate('huhubot.memory.proposalWarning')} · {translate('huhubot.memory.revision', { revision: proposal.revision })}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => onResolve('approve')} disabled={busy}><Check aria-hidden />{translate('huhubot.memory.confirm')}</Button><Button size="sm" variant="outline" onClick={() => onResolve('reject')} disabled={busy}><X aria-hidden />{translate('huhubot.memory.reject')}</Button></div></section>;
}
