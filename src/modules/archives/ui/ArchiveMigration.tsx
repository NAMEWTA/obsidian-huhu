import { useEffect, useState } from 'react';
import { Button } from '../../../ui/components/button';
import { Choice } from '../../../ui/components/huhu/Choice';
import type { ArchiveEntity, MigrationPreflight, MigrationReceipt } from '../api';
import type { ArchiveUiServices } from './ArchiveWorkspace';
import { ArchiveDraftOwner } from '../services/form-drafts';
import { useArchiveDraft } from './use-archive-draft';
import { errorText } from './forms';
import { ct } from './labels';
import { archiveDisplayValue } from './field-renderers';
/** PAGE-002: preflight has no writes. Confirmation/resume consumes the visible plan, never an inferred in-memory success. */
export function ArchiveMigration({ services, entities, entity, drafts, scope, onBusy, onChanged, blocked = false }: {
    services: ArchiveUiServices;
    entities: ArchiveEntity[];
    entity?: ArchiveEntity;
    drafts: ArchiveDraftOwner;
    scope: string;
    blocked?: boolean;
    onBusy?: (busy: boolean) => void;
    onChanged?: (receipt: MigrationReceipt) => void;
}) {
    const [path, setPath] = useArchiveDraft(drafts, scope + '/path', () => entity?.path ?? ''), [preflight, setPreflight] = useArchiveDraft<MigrationPreflight | undefined>(drafts, scope + '/preflight', () => undefined), [operation, setOperation] = useArchiveDraft(drafts, scope + '/operation', () => ''), [busy, setBusy] = useArchiveDraft(drafts, scope + '/busy', () => false), [error, setError] = useArchiveDraft(drafts, scope + '/error', () => ''), [result, setResult] = useArchiveDraft<MigrationReceipt | undefined>(drafts, scope + '/result', () => undefined), [confirmRollback, setConfirmRollback] = useState(''), [receipts, setReceipts] = useState<MigrationReceipt[]>([]);
    useEffect(() => { onBusy?.(busy); }, [busy, onBusy]);
    useEffect(() => { let active = true, request = 0; const load = async () => { const token = ++request; try {
        const next = await services.query.migrations();
        if (active && token === request)
            setReceipts(next);
    }
    catch (failure) {
        if (active && token === request)
            setError(errorText(failure));
    } }; void load(); const off = services.query.subscribe(() => void load()); return () => { active = false; request++; off(); }; }, [services, setError, result]);
    const act = async (action: () => Promise<MigrationReceipt | MigrationPreflight>) => { setBusy(true); setError(''); try {
        const next = await action();
        if ('phase' in next) {
            setResult(next);
            if (next.phase === 'complete' || next.phase === 'rolled-back') {
                setPreflight(undefined);
                onChanged?.(next);
            }
        }
        else {
            setPreflight(next);
            setOperation(crypto.randomUUID());
            setResult(undefined);
        }
    }
    catch (failure) {
        setError(errorText(failure));
    }
    finally {
        setBusy(false);
    } };
    const rows = entity ? receipts.filter(row => row.ownerPath === entity.path) : receipts;
    return <section aria-label={ct('legacyMigration')} className="space-y-4 rounded-md border border-border p-4">
  <h2 className="text-lg font-semibold">{ct('legacyMigration')}</h2>{blocked && <p role="status" className="text-sm text-muted-foreground">{ct('migrationFormDraft')}</p>}<p className="text-sm text-muted-foreground">{ct('migrationExplanation')}</p>
  {!entity && <Choice label={ct('migrationOwner')} value={path} options={[["", ct('choose')], ...entities.filter(entity => entity.formatVersion === 1).map(entity => [entity.path, archiveDisplayValue(entity.values.name ?? entity.id)] as const)]} disabled={busy || blocked} onChange={next => { setPath(next); setPreflight(undefined); setResult(undefined); }}/>}
  {(!entity || entity.formatVersion === 1) && <Button className="min-h-11" variant="outline" disabled={busy || blocked || !path} onClick={() => void act(() => services.commands.preflightMigration(path))}>{ct('migrationPreflight')}</Button>}
  {busy && <p role="status">{ct('migrationChecking')}</p>}
  {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><p>{ct('migrationPartialKept')}</p></div>}
  {preflight && <div className="space-y-3"><h3 className="font-medium">{ct('migrationPreflight')}</h3><p className="break-words text-sm">{preflight.path}</p>
   <dl className="grid grid-cols-2 gap-3 text-sm">{Object.entries(preflight.counts).map(([key, value]) => <div key={key}><dt>{ct('migrationCount' + key)}</dt><dd>{value}</dd></div>)}</dl>
   <p className="text-sm">{ct('migrationTarget')}: type-{preflight.kind}</p><p className="break-words text-sm">{ct('migrationBackup')}: {preflight.backupDirectory}{operation}/</p><p className="text-sm">{ct('migrationNewFiles')}: {preflight.newFiles}</p>
   <details><summary className="cursor-pointer">{ct('migrationMapping')}</summary><ul className="space-y-2 text-sm">{preflight.rows.map(row => <li className="break-words" key={row.section + row.position}>{row.section} / {row.rowId} → {row.relationTypeId} · {row.sourceId} → {row.targetId}</li>)}</ul></details>
   {!!preflight.supersedes.length && <p className="text-sm">{ct('migrationSupersedes')}: {preflight.supersedes.join(', ')}</p>}
   {preflight.diagnostics.map((item, index) => <p role="alert" className="break-words text-sm" key={index}>{item.path} · {ct(item.code)} {item.detail}</p>)}
   <div className="flex flex-wrap gap-2"><Button className="min-h-11" disabled={busy || blocked || !preflight.canMigrate} onClick={() => void act(() => services.commands.migrate({ preflight, operationId: operation }))}>{ct('migrationConfirm')}</Button><Button className="min-h-11" variant="outline" disabled={busy || blocked} onClick={() => setPreflight(undefined)}>{ct('cancel')}</Button></div>
  </div>}
  {result && <p role="status">{ct('migrationPhase' + result.phase)} · {result.verified}/{result.total}</p>}
  <div className="space-y-3">{rows.map(receipt => <article key={receipt.migrationId} className="space-y-2 rounded-md border border-border p-3"><p className="break-words text-sm">{receipt.ownerPath} · {ct('migrationPhase' + receipt.phase)} · {receipt.verified}/{receipt.total}</p><p className="break-words text-xs text-muted-foreground">{receipt.migrationId}</p>
   {receipt.diagnostics.map((item, index) => <p role="alert" key={index}>{ct(item.code)}</p>)}
   <div className="flex flex-wrap gap-2">{!['rolled-back', 'rollback-pending', 'superseded', 'conflict'].includes(receipt.phase) && <Button className="min-h-11" variant="outline" disabled={busy || blocked || receipt.diagnostics.some(item => item.code !== 'migrationRollbackPending')} onClick={() => void act(() => services.commands.resumeMigration(receipt.migrationId))}>{ct('migrationResume')}</Button>}
   {!['rolled-back', 'superseded', 'conflict'].includes(receipt.phase) && <Button className="min-h-11" variant="outline" disabled={busy || blocked || receipt.diagnostics.some(item => item.code !== 'migrationRollbackPending')} onClick={() => setConfirmRollback(receipt.migrationId)}>{ct('migrationRollback')}</Button>}</div>
   {confirmRollback === receipt.migrationId && <div role="alert" className="space-y-3"><p>{ct('migrationRollbackExplanation')}</p><Button className="min-h-11" disabled={busy || blocked} onClick={() => { setConfirmRollback(''); void act(() => services.commands.rollbackMigration(receipt.migrationId)); }}>{ct('migrationRollbackConfirm')}</Button><Button className="min-h-11" variant="outline" disabled={busy || blocked} onClick={() => setConfirmRollback('')}>{ct('cancel')}</Button></div>}
  </article>)}</div>
 </section>;
}
