import type { ContactsFiles, ContactsFile } from './files';
import type { ArchiveDiagnostic } from './schema';
import type { MigrationPlan } from './migration-model';
import { migrationPaths } from './migration-model';
import { archiveFrontmatter } from './persist/v2/markdown';
import { readRelationDeletions } from './relation-deletion';
import { textHash } from '../../../shared/storage/text-edits';
import { canonicalRelation, relationId, sameRelationValue } from './relation-model';
import { ContactsError } from './model';
import { archiveLocation } from './resources';
export interface MigrationAuthority {
    root: string;
    plans: MigrationPlan[];
    states: Map<string, 'active' | 'staged' | 'retired' | 'conflict' | 'rollback-pending'>;
    activations: Map<string, boolean>;
    diagnostics: ArchiveDiagnostic[];
    proofs: Array<{
        file: ContactsFile;
        path: string;
        raw: string;
        mtime: number;
        size: number;
    }>;
}
export const planContent = (plan: MigrationPlan): string => { const { hash: _hash, ...content } = plan; return canonicalRelation(content); };
export const ownerSwitched = (owner: Record<string, unknown> | undefined, plan: MigrationPlan): boolean => owner?.['huhu-type'] === 'archive-record' && owner['huhu-format-version'] === 2 && owner['huhu-id'] === plan.ownerId && owner['huhu-migration-id'] === plan.migrationId && sameRelationValue(owner['huhu-migration-relations'], plan.relations.map(row => row.id));
export interface RollbackActivation { sourcePhase: 'active' | 'staged'; ownerId: string; migrationId: string; relationIds: string[]; ownerHash: string }
export function rollbackActivation(data: Record<string, unknown>, plan: MigrationPlan): RollbackActivation {
    const activation = data['huhu-activation'] as RollbackActivation | undefined;
    if (!activation || !['active', 'staged'].includes(activation.sourcePhase) || activation.ownerId !== plan.ownerId || activation.migrationId !== plan.migrationId || !sameRelationValue(activation.relationIds, plan.relations.map(row => row.id)) || activation.ownerHash !== (activation.sourcePhase === 'active' ? plan.owner.hash : plan.sourceHash)) throw new ContactsError('migrationInvalid');
    return activation;
}
/** A legacy projection may display raw conflict material, but may never reactivate its embedded relationships. */
export function legacyMigrationState(authority: MigrationAuthority, path: string, id: string, allowActive = false): { code?: string; hideInline: boolean } {
    const plans = authority.plans.filter(plan => plan.ownerPath === path || plan.ownerId === id);
    for (const plan of plans) {
        const state = authority.states.get(plan.migrationId);
        if (plan.ownerPath !== path || plan.ownerId !== id) return { code: 'migrationConflict', hideInline: true };
        if (state === 'staged' || state === 'retired' || allowActive && state === 'active') continue;
        return { code: state === 'rollback-pending' ? 'migrationRollbackPending' : state === 'conflict' ? 'migrationConflict' : 'migrationInvalid', hideInline: state !== 'rollback-pending' || authority.activations.get(plan.migrationId) !== false };
    }
    const ownDiagnostic = authority.diagnostics.find(item => item.entityId === id || item.path === path);
    if (ownDiagnostic) return { code: ownDiagnostic.code, hideInline: true };
    const unknown = authority.diagnostics.find(item => item.path.startsWith(authority.root + '/迁移记录/') && !authority.plans.some(plan => plan.ownerPath !== path && [migrationPaths(authority.root, plan.migrationId).plan, migrationPaths(authority.root, plan.migrationId).complete, migrationPaths(authority.root, plan.migrationId).rollback, migrationPaths(authority.root, plan.migrationId).rollbackIntent].includes(item.path)));
    return unknown ? { code: unknown.code, hideInline: true } : { hideInline: false };
}
/** Visible owner switch facts activate staged relations even when the final receipt has not arrived. */
export async function migrationAuthority(files: ContactsFiles, root: string, scanOwners = true): Promise<MigrationAuthority> {
    const deletions = await readRelationDeletions(files,root);
    const result: MigrationAuthority = { root, plans: [], states: new Map(), activations: new Map(), diagnostics: [], proofs: [...deletions.proofs] };
    const read = async (path: string) => { const file = files.getFileByPath(path); if (!file)
        return undefined; const proof = { file, path, mtime: file.stat.mtime, size: file.stat.size, raw: await files.read(file) }; result.proofs.push(proof); return proof.raw; };
    for (const file of files.getMarkdownFiles().filter(file => file.path.startsWith(root + '/迁移记录/'))) {
        let planned: MigrationPlan | undefined;
        try {
            const raw = await read(file.path), data = archiveFrontmatter(raw!);
            if (data['huhu-type'] !== 'archive-migration')
                continue;
            const plan = data.plan as MigrationPlan;
            if (data['huhu-format-version'] !== 2 || !plan || !relationId(plan.migrationId) || plan.root !== root || plan.ownerId === undefined || file.path !== migrationPaths(root, plan.migrationId).plan || !Array.isArray(plan.relations) || !Array.isArray(plan.dependencies) || plan.hash !== await textHash(planContent(plan)) || plan.owner.path !== plan.ownerPath || plan.owner.hash !== await textHash(plan.owner.raw) || new Set(plan.relations.map(row => row.id)).size !== plan.relations.length)
                throw new ContactsError('migrationInvalid');
            planned = plan; result.plans.push(plan);
            const paths = migrationPaths(root, plan.migrationId);
            const completed = await read(paths.complete), rolled = await read(paths.rollback), intentRaw = await read(paths.rollbackIntent);
            const intent = intentRaw ? archiveFrontmatter(intentRaw) : undefined;
            if (intent && (intent['huhu-type'] !== 'archive-migration-rollback-intent' || intent['huhu-format-version'] !== 2 || intent['huhu-plan-hash'] !== plan.hash)) throw new ContactsError('migrationInvalid');
            const activation = intent ? rollbackActivation(intent, plan) : undefined;
            if (activation) result.activations.set(plan.migrationId, activation.sourcePhase === 'active');
            for (const [receipt, expectedType] of [[completed, 'archive-migration-complete'], [rolled, 'archive-migration-rollback']] as const) {
                if (receipt === undefined) continue;
                const values = archiveFrontmatter(receipt);
                if (values['huhu-format-version'] !== 2 || values['huhu-plan-hash'] !== plan.hash || values['huhu-type'] !== expectedType || values['huhu-migration-id'] !== plan.migrationId) throw new ContactsError('migrationInvalid');
            }
            const ownerRaw = await read(plan.ownerPath), owner = ownerRaw ? archiveFrontmatter(ownerRaw) : undefined;
            const switched = ownerSwitched(owner, plan);
            let state: 'active' | 'staged' | 'retired' | 'conflict' | 'rollback-pending';
            if (rolled)
                state = switched ? 'conflict' : 'retired';
            else if (activation)
                state = 'rollback-pending';
            else if (switched)
                state = 'active';
            else if (completed)
                state = ownerRaw ? 'conflict' : 'active';
            else if (owner?.['huhu-type'] === 'archive-record' && owner['huhu-id'] === plan.ownerId && relationId(owner['huhu-migration-id'])) {
                const replacementRaw = await read(migrationPaths(root, owner['huhu-migration-id']).plan);
                const replacement = replacementRaw ? archiveFrontmatter(replacementRaw).plan as MigrationPlan : undefined;
                state = replacement && replacement.ownerId === plan.ownerId && replacement.ownerPath === plan.ownerPath && replacement.hash === await textHash(planContent(replacement)) && replacement.supersedes?.includes(plan.migrationId) && owner['huhu-migration-id'] === replacement.migrationId && sameRelationValue(owner['huhu-migration-supersedes'], replacement.supersedes) ? 'retired' : 'conflict';
            }
            else
                state = owner?.['huhu-type'] === plan.kind && owner['huhu-id'] === plan.ownerId ? 'staged' : 'conflict';
            result.states.set(plan.migrationId, state);
            if (state === 'conflict' || state === 'rollback-pending')
                result.diagnostics.push({ path: plan.ownerPath, entityId: plan.ownerId, code: state === 'rollback-pending' ? 'migrationRollbackPending' : 'migrationConflict' });
            if (state === 'active' || state === 'rollback-pending' && activation?.sourcePhase === 'active')
                for (const row of plan.relations) {
                    const raw = await read(row.path);
                    if (!raw && deletions.facts.some(fact=>fact.relationId===row.id&&fact.migrationId===plan.migrationId&&fact.sourceId===row.row.sourceId&&fact.targetId===row.row.targetId&&!deletions.blockedIds.has(row.id))) continue;
                    if (!raw) {
                        result.diagnostics.push({ path: row.path, entityId: plan.ownerId, code: 'migrationIncomplete' });
                        continue;
                    }
                    const data = archiveFrontmatter(raw);
                    if (data['huhu-id'] !== row.id || data['huhu-migration-id'] !== plan.migrationId)
                        result.diagnostics.push({ path: row.path, entityId: plan.ownerId, code: 'migrationInvalid' });
                }
        }
        catch (error) {
            if (planned) result.states.set(planned.migrationId, 'conflict');
            result.diagnostics.push({ path: file.path, entityId: planned?.ownerId, code: error instanceof ContactsError ? error.code : 'migrationInvalid' });
        }
    }
    for (const file of scanOwners ? files.getMarkdownFiles().filter(file => archiveLocation(root, file.path)) : []) {
        try {
            const raw = await read(file.path), data = archiveFrontmatter(raw!);
            if (data['huhu-type'] !== 'archive-record' || data['huhu-migration-id'] === undefined)
                continue;
            const plan = result.plans.find(plan => plan.migrationId === data['huhu-migration-id'] && plan.ownerPath === file.path && plan.ownerId === data['huhu-id']);
            if (!plan)
                result.diagnostics.push({ path: file.path, entityId: typeof data['huhu-id'] === 'string' ? data['huhu-id'] : undefined, code: 'migrationIncomplete' });
        }
        catch { /* Entity parsing reports ordinary malformed owners; a plan already reports its missing/corrupt owner. */ }
    }
    return result;
}
