import { JsonStore } from '../../../shared/json-store';
import type { TextStorage } from '../../../shared/storage/ports';
import { VERSIONING_RECOVERY_ROOT } from '../../../shared/storage/vault-layout';
import type { CaptureAllocation, RecoveryFile, RecoveryFiles, RetentionPolicy } from '../core/history-retention';
import { protectsRestoreObjects, receiptObjects } from '../core/history-retention';
import type { RestoreCheckpointPort } from '../core/restore';
import type { LocalHistoryStore } from './local-history-store';
import { readRecoveryCopies } from './recovery-metadata';

interface CollectionPlan {
	version: 1;
	id: string;
	stage: 'planned' | 'complete';
	createdAt: number;
	historySignature: string;
	journalSignature: string;
	entries: string[];
	receipts: string[];
	objects: RecoveryFile[];
}
const blankPlan = (): CollectionPlan => ({ version: 1, id: '', stage: 'complete', createdAt: 0, historySignature: '', journalSignature: '', entries: [], receipts: [], objects: [] });
const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const propertyBytes = (key: string, value: unknown) => jsonBytes(key) + 1 + jsonBytes(value);
function validPlan(value: unknown): value is CollectionPlan {
	if (!value || typeof value !== 'object') return false;
	const plan = value as Partial<CollectionPlan>;
	return plan.version === 1 && typeof plan.id === 'string' && (plan.stage === 'planned' || plan.stage === 'complete')
		&& typeof plan.createdAt === 'number' && Number.isFinite(plan.createdAt)
		&& typeof plan.historySignature === 'string' && typeof plan.journalSignature === 'string'
		&& Array.isArray(plan.entries) && plan.entries.every(id => typeof id === 'string')
		&& Array.isArray(plan.receipts) && plan.receipts.every(id => typeof id === 'string')
		&& Array.isArray(plan.objects) && plan.objects.every(file => file && typeof file.path === 'string'
			&& typeof file.hash === 'string' && /^[a-f0-9]{64}$/.test(file.hash)
			&& typeof file.stamp === 'string' && Number.isSafeInteger(file.byteLength) && file.byteLength >= 0);
}

/** Mark metadata, verify both recovery copies, then sweep unreferenced immutable bodies under the writers' lease. */
export class HistoryRetention {
	private readonly planPath: string;
	private readonly planStore: JsonStore<CollectionPlan>;
	constructor(private readonly storage: TextStorage, device: string, private readonly history: LocalHistoryStore,
		private readonly files: RecoveryFiles, private readonly policy: () => RetentionPolicy, private readonly now = () => Date.now()) {
		this.planPath = `${VERSIONING_RECOVERY_ROOT}/${device}/retention.json`;
		this.planStore = new JsonStore(storage, this.planPath, validPlan);
	}
	collect(signal?: AbortSignal): Promise<void> {
		return this.history.objects.transaction(checkpoints => this.admit(undefined, checkpoints, signal));
	}
	/** Called by LocalHistoryStore while its checkpoint transaction is already held. */
	async admit(incoming: CaptureAllocation | undefined, checkpoints: RestoreCheckpointPort, signal?: AbortSignal): Promise<void> {
		signal?.throwIfAborted();
		const policy = this.policy(), now = this.now();
		if (!(policy.days > 0) || !Number.isFinite(policy.days) || !(policy.quotaBytes > 0) || !Number.isSafeInteger(policy.quotaBytes))
			throw new Error('versioning.localHistory.retentionCorrupt');
		const priorPlan = await readRecoveryCopies(this.storage, this.planPath, validPlan, blankPlan());
		const [history, journal, inventory] = await Promise.all([
			this.history.retentionState(), this.history.objects.retentionState(), this.files.inventory(),
		]);
		const objects = inventory.filter(file => file.hash);
		const byHash = new Map(objects.map(file => [file.hash!, file]));
		const cutoff = now - policy.days * 86_400_000;
		const entries = new Set(history.entries.filter(entry => entry.createdAt < cutoff).map(entry => entry.id));
		const receipts = new Set(journal.receipts.filter(receipt => receipt.objectsReleasedAt === undefined
			&& !protectsRestoreObjects(receipt) && receipt.updatedAt < cutoff).map(receipt => receipt.id));
		const counts = new Map<string, number>();
		const add = (hash: string) => counts.set(hash, (counts.get(hash) ?? 0) + 1);
		for (const entry of history.entries) if (!entries.has(entry.id)) add(entry.hash);
		for (const receipt of journal.receipts) if (!receipts.has(receipt.id)) for (const hash of new Set(receiptObjects(receipt))) add(hash);
		if (incoming) add(incoming.hash);
		for (const hash of counts.keys()) if (!byHash.has(hash) && hash !== incoming?.hash)
			throw new Error('versioning.localHistory.retentionCorrupt');
		let bodyBytes = objects.reduce((sum, file) => sum + (counts.has(file.hash!) ? file.byteLength : 0), 0);
		if (incoming && !byHash.has(incoming.hash)) bodyBytes += incoming.byteLength;
		const metadataSize = (paths: readonly string[]) => inventory.filter(file => paths.includes(file.path)).reduce((sum, file) => sum + file.byteLength, 0);
		const historyDiskBytes = metadataSize(history.copies.map(copy => copy.path));
		const journalDiskBytes = metadataSize(journal.copies.map(copy => copy.path));
		const planDiskBytes = metadataSize([this.planPath, `${this.planPath}.backup`]);
		const otherMetadataBytes = inventory.filter(file => !file.hash).reduce((sum, file) => sum + file.byteLength, 0)
			- historyDiskBytes - journalDiskBytes - planDiskBytes;
		const retainedEntries = history.entries.filter(entry => !entries.has(entry.id));
		let entryCount = retainedEntries.length;
		let historyBytes = jsonBytes({ ...history.current, entries: Object.fromEntries(retainedEntries.map(entry => [entry.id, entry])) });
		let journalBytes = jsonBytes({ version: 1, receipts: Object.fromEntries(journal.receipts.map(receipt => [receipt.id,
			receipts.has(receipt.id) ? { ...receipt, objectsReleasedAt: now } : receipt])) });
		const rotateHistory = history.copies.some(copy => JSON.stringify(copy.value) !== JSON.stringify(history.current));
		const rotateJournal = journal.copies.some(copy => JSON.stringify(copy.value) !== JSON.stringify(journal.current));
		const compactPlan: CollectionPlan = { version: 1, id: crypto.randomUUID(), stage: 'complete', createdAt: now,
			historySignature: history.signature, journalSignature: journal.signature, entries: [], receipts: [], objects: [] };
		const alreadyCollecting = objects.some(file => !counts.has(file.hash!)) || priorPlan.current.stage === 'planned';
		// A capture adds one row and possibly a path mapping: two escaped paths plus bounded UUID/numeric fields.
		const allocationReserve = incoming ? 2 * jsonBytes(incoming) + 2048 : 0;
		const needed = () => {
			const collecting = entries.size > 0 || receipts.size > 0 || alreadyCollecting;
			// Capture rotates the current primary into backup even when collection did not rewrite the index.
			const historyCost = incoming || (collecting && (entries.size > 0 || rotateHistory)) ? 2 * historyBytes : historyDiskBytes;
			const journalCost = collecting && (receipts.size > 0 || rotateJournal) ? 2 * journalBytes : journalDiskBytes;
			return bodyBytes + otherMetadataBytes + historyCost + journalCost
				+ (collecting ? 2 * jsonBytes(compactPlan) : planDiskBytes) + allocationReserve;
		};
		const release = (hash: string) => {
			const count = counts.get(hash);
			if (count === 1) { counts.delete(hash); bodyBytes -= byHash.get(hash)?.byteLength ?? 0; }
			else if (count) counts.set(hash, count - 1);
		};
		const evictable = [
			...retainedEntries.map(entry => ({ kind: 'history' as const, id: entry.id, time: entry.createdAt, hashes: [entry.hash], metadataDelta: -propertyBytes(entry.id, entry) })),
			...journal.receipts.filter(receipt => receipt.objectsReleasedAt === undefined && !receipts.has(receipt.id) && !protectsRestoreObjects(receipt))
				.map(receipt => ({ kind: 'receipt' as const, id: receipt.id, time: receipt.updatedAt, hashes: [...new Set(receiptObjects(receipt))],
					metadataDelta: jsonBytes({ ...receipt, objectsReleasedAt: now }) - jsonBytes(receipt) })),
		].sort((a, b) => a.time - b.time);
		for (const candidate of evictable) {
			if (needed() <= policy.quotaBytes) break;
			if (candidate.kind === 'history') {
				entries.add(candidate.id);
				historyBytes += candidate.metadataDelta - (entryCount > 1 ? 1 : 0);
				entryCount--;
			} else { receipts.add(candidate.id); journalBytes += candidate.metadataDelta; }
			for (const hash of candidate.hashes) release(hash);
		}
		const candidates = objects.filter(file => !counts.has(file.hash!));
		if (entries.size || receipts.size || candidates.length || priorPlan.current.stage === 'planned') {
			let plan = await this.planStore.load(blankPlan());
			plan = await this.planStore.commit({ base: plan, value: { ...compactPlan, stage: 'planned',
				entries: [...entries], receipts: [...receipts], objects: candidates } });
			signal?.throwIfAborted();
			const [currentHistory, currentJournal] = await Promise.all([this.history.retentionState(), this.history.objects.retentionState()]);
			if (currentHistory.signature !== history.signature || currentJournal.signature !== journal.signature)
				throw new Error('versioning.localHistory.retentionChanged');
			await this.history.pruneEntries(entries, rotateHistory);
			await this.history.objects.releaseTerminalObjects(receipts, now, rotateJournal);
			for (const file of candidates) {
				signal?.throwIfAborted();
				await checkpoints.readObject(file.hash!);
				const [liveHistory, liveJournal] = await Promise.all([this.history.retentionState(), this.history.objects.retentionState()]);
				if (liveHistory.references.has(file.hash!) || liveJournal.references.has(file.hash!) || incoming?.hash === file.hash) continue;
				await this.files.remove(file);
			}
			// An interrupted sweep is reconciled from inventory and fresh references on the next run, never blindly replayed.
			for (let pass = 0; pass < 2; pass++) plan = await this.planStore.commit({ base: plan, value: {
				...plan, stage: 'complete', entries: [], receipts: [], objects: [],
			} });
		}
		signal?.throwIfAborted();
		let after = await this.files.inventory();
		if (incoming) {
			const current = await this.history.retentionState();
			const diskBytes = after.filter(file => current.copies.some(copy => copy.path === file.path)).reduce((sum, file) => sum + file.byteLength, 0);
			// A duplicate capture may never commit its index. Realize any projected shrink before trusting it for admission.
			if (2 * jsonBytes(current.current) < diskBytes) {
				await this.history.pruneEntries(new Set(), true);
				signal?.throwIfAborted();
				after = await this.files.inventory();
			}
		}
		const used = after.reduce((sum, file) => sum + file.byteLength, 0);
		const additional = incoming && !after.some(file => file.hash === incoming.hash) ? incoming.byteLength : 0;
		const currentHistory = incoming ? await this.history.retentionState() : undefined;
		const historyGrowth = currentHistory ? Math.max(0, 2 * jsonBytes(currentHistory.current)
			- after.filter(file => currentHistory.copies.some(copy => copy.path === file.path)).reduce((sum, file) => sum + file.byteLength, 0)) : 0;
		if (used + additional + historyGrowth + allocationReserve > policy.quotaBytes) throw new Error('versioning.localHistory.quota');
	}
}
