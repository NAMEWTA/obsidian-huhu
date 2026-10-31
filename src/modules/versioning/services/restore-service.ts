import {
	sameDocumentSnapshot,
	type DocumentChangeParticipant,
	type DocumentSnapshot,
} from '../../../shared/storage/document-mutation';
import { textEdits, textHash } from '../../../shared/storage/text-edits';
import { huhuName } from '../../../shared/storage/vault-layout';
import { WriteQueue } from '../../../shared/storage/write-queue';
import { applySelectedHunks } from '../core/hunk-restore';
import {
	RestoreError,
	type PrepareRestore,
	type PreparedRestoreState,
	type RestoreDependencies,
	type RestorePlan,
	type RestoreReceipt,
	type RestoreCheckpointPort,
} from '../core/restore';

const MAX_BYTES = 5 * 1024 * 1024;
const isPending = (receipt: RestoreReceipt) =>
	receipt.stage !== 'verified' && receipt.stage !== 'aborted' && receipt.acknowledgedAt === undefined;
const errorCode = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** A restore is a new note edit. This service never invokes checkout, reset, stage, commit or push. */
export class RestoreService {
	private readonly plans = new Map<string, PreparedRestoreState>();
	private readonly listeners = new Set<() => void>();
	private readonly running = new Map<string, Promise<RestoreReceipt>>();
	private readonly metadata = new WriteQueue();
	private readonly now: () => number;
	private closed = false;
	constructor(private readonly deps: RestoreDependencies) {
		this.now = deps.now ?? (() => Date.now());
	}
	initialize(): Promise<void> {
		return this.deps.checkpoints.load();
	}
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
	receipts(): readonly RestoreReceipt[] {
		return this.deps.checkpoints.receipts();
	}
	pending(): readonly RestoreReceipt[] {
		return this.receipts().filter(isPending);
	}
	cancel(planId: string): void {
		if (!this.running.has(planId)) this.plans.delete(planId);
	}
	readSnapshot(hash: string): Promise<string> {
		this.assertOpen();
		return this.deps.checkpoints.readObject(hash);
	}
	private emit(): void {
		for (const listener of this.listeners) listener();
	}
	private assertOpen(): void {
		if (this.closed) throw new RestoreError('closed');
	}
	private bounded(text: string | null): void {
		if (text !== null && new TextEncoder().encode(text).byteLength > MAX_BYTES) throw new RestoreError('too-large');
	}
	private dirty(document: DocumentSnapshot): boolean {
		return (
			document.text !==
			(document.diskText === null ? null : this.deps.documents.editableText(document.diskText, document))
		);
	}
	/** Read-only identity/generation baseline for a fixed review buffer; it grants no write permission. */
	async captureTarget(path: string, originLeafId: string): Promise<DocumentSnapshot> {
		this.assertOpen();
		return this.deps.documents.capture(path, originLeafId);
	}

	async prepare(request: PrepareRestore): Promise<RestorePlan> {
		this.assertOpen();
		await this.initialize();
		this.bounded(request.source.text);
		if (request.hunks && (request.mode !== 'replace-current' || request.hunks.target.path !== request.targetPath
			|| request.hunks.target.originLeafId !== request.originLeafId || !request.originLeafId
			|| !request.hunks.target.exists || !request.hunks.target.buffers.length || request.hunks.target.text === null
			|| request.hunks.origin.path !== request.targetPath || request.hunks.origin.leafId !== request.originLeafId)) throw new RestoreError('changed');
		if (request.hunks) {
			if (!this.deps.assertHunkOrigin) throw new Error('versioning.restore.hunks-unavailable');
			this.deps.assertHunkOrigin(request.hunks.origin);
		}
		const id = crypto.randomUUID(),
			time = this.now();
		let path = request.targetPath;
		if (request.mode === 'create-copy') {
			const slash = path.lastIndexOf('/'),
				parent = slash < 0 ? '' : path.slice(0, slash + 1),
				name = path.slice(slash + 1).replace(/\.md$/i, '');
			path =
				request.copyPath ??
				`${parent}${huhuName(`${name}-恢复-${new Date(time).toISOString().slice(0, 19).replace(/[-:T]/g, '')}-${id.slice(0, 6)}`)}.md`;
		}
		const document = request.hunks ? await this.revalidate(request.hunks.target) : await this.deps.documents.capture(
			path,
			request.mode === 'create-copy' ? undefined : request.originLeafId,
		);
		if (request.mode === 'create-copy' && document.exists) throw new RestoreError('changed');
		this.bounded(document.text);
		this.bounded(document.diskText);
		const repositoryBaseline = await this.deps.gate.capture();
		this.assertOpen();
		const plan: RestorePlan = {
			id,
			path,
			sourceId: request.source.id,
			sourceLabel: request.source.label ?? request.source.id,
			mode: request.mode,
			beforeText: document.text,
			afterText: request.hunks
				? applySelectedHunks(request.source.text, document.text ?? '', request.hunks.diff, request.hunks.selected,
					text => this.deps.documents.editableText(text, document))
				: this.deps.documents.editableText(request.source.text, document),
			dirty: this.dirty(document),
			createdAt: time,
			...(request.hunks ? { selectedHunks: [...request.hunks.selected] } : {}),
		};
		this.plans.set(id, { plan, document, repositoryBaseline, ...(request.hunks ? { hunkOrigin: { ...request.hunks.origin } } : {}) });
		if (this.plans.size > 64) this.plans.delete(this.plans.keys().next().value!);
		return structuredClone(plan);
	}

	/** An autosave of the exact captured buffer is harmless; any new text, identity or editor generation is not. */
	private async revalidate(expected: DocumentSnapshot): Promise<DocumentSnapshot> {
		const current = await this.deps.documents.capture(expected.path, expected.originLeafId);
		if (sameDocumentSnapshot(expected, current)) return current;
		if (
			current.diskText !== null &&
			this.deps.documents.editableText(current.diskText, expected) === expected.text &&
			sameDocumentSnapshot({ ...expected, diskText: current.diskText }, current)
		)
			return current;
		throw new RestoreError('changed');
	}
	private async repositoryUnchanged(baseline: string): Promise<void> {
		if ((await this.deps.gate.capture()) !== baseline) throw new RestoreError('repository-changed');
	}
	private checkpointLease<T>(work: (checkpoints: RestoreCheckpointPort) => Promise<T>): Promise<T> {
		const checkpoints = this.deps.checkpoints;
		return checkpoints.transaction ? checkpoints.transaction(work) : work(checkpoints);
	}

	apply(planId: string): Promise<RestoreReceipt> {
		const running = this.running.get(planId);
		if (running) return running;
		const operation = this.applyOnce(planId);
		this.running.set(planId, operation);
		void operation.then(
			() => {
				this.running.delete(planId);
			},
			() => {
				this.running.delete(planId);
			},
		);
		return operation;
	}
	private async applyOnce(planId: string): Promise<RestoreReceipt> {
		this.assertOpen();
		await this.initialize();
		const previous = this.receipts().find((receipt) => receipt.id === planId);
		if (previous?.stage === 'verified') return previous;
		if (previous) throw new RestoreError('unverified');
		const prepared = this.plans.get(planId);
		if (!prepared) throw new RestoreError('plan-missing');
		return this.deps.gate.run(planId, () => this.checkpointLease(checkpoints =>
			this.deps.documents.exclusive(prepared.plan.path, async () => {
				this.assertOpen();
				if (prepared.hunkOrigin) this.deps.assertHunkOrigin!(prepared.hunkOrigin);
				let document = await this.revalidate(prepared.document);
				await this.repositoryUnchanged(prepared.repositoryBaseline);
				await this.deps.gate.hold(planId);
				await this.deps.gate.assertCheckpointProtection();
				const { plan } = prepared;
				let participant: DocumentChangeParticipant | undefined,
					annotationsBefore: unknown,
					admitted = false,
					receipt: RestoreReceipt | undefined;
				try {
					participant = this.deps.participant?.();
					if (participant && document.exists) {
						annotationsBefore = await participant.prepare(
							{
								operationId: planId,
								path: plan.path,
								kind: plan.afterText === null ? 'remove' : 'replace',
								before: document.text ?? '',
								after: plan.afterText ?? '',
								edits: textEdits(document.text ?? '', plan.afterText ?? ''),
							},
							prepared.annotationUndo,
						);
						admitted = true;
					}
					const beforeObject =
						document.text === null ? null : await checkpoints.putObject(document.text);
					let beforeDiskObject =
						document.diskText === null ? null : await checkpoints.putObject(document.diskText);
					const afterObject =
						plan.afterText === null ? null : await checkpoints.putObject(plan.afterText);
					receipt = {
						id: plan.id,
						path: plan.path,
						sourceId: plan.sourceId,
						sourceLabel: plan.sourceLabel,
						mode: plan.mode,
						stage: 'prepared',
						createdAt: plan.createdAt,
						updatedAt: this.now(),
						beforeObject,
						beforeDiskObject,
						afterObject,
						repositoryBaseline: prepared.repositoryBaseline,
						...(annotationsBefore === undefined ? {} : { annotationsBefore }),
						...(plan.undoOf ? { undoOf: plan.undoOf } : {}),
						...(plan.selectedHunks ? { selectedHunks: plan.selectedHunks } : {}),
					};
					await checkpoints.putReceipt(receipt);
					const current = await this.revalidate(document);
					if (current.diskText !== document.diskText)
						beforeDiskObject =
							current.diskText === null ? null : await checkpoints.putObject(current.diskText);
					document = current;
					await this.repositoryUnchanged(prepared.repositoryBaseline);
					this.assertOpen();
					if (participant && participant !== this.deps.participant?.()) throw new RestoreError('changed');
					receipt = { ...receipt, beforeDiskObject, stage: 'applying', updatedAt: this.now() };
					await checkpoints.putReceipt(receipt);
					// Once admitted, preserve and verify any completed write even when the module begins closing.
					this.assertOpen();
					if (prepared.hunkOrigin) this.deps.assertHunkOrigin!(prepared.hunkOrigin);
					const after = await this.deps.documents.apply(document, plan.afterText, plan.id);
					receipt = { ...receipt, stage: 'applied', updatedAt: this.now() };
					await checkpoints.putReceipt(receipt);
					let annotationsAfter: unknown;
					if (admitted && participant) {
						annotationsAfter = await participant.commit(plan.id, after.text ?? '');
						admitted = false;
					}
					await this.repositoryUnchanged(prepared.repositoryBaseline);
					const verified = await this.deps.documents.capture(
						plan.path,
						plan.afterText === null ? undefined : document.originLeafId,
					);
					if (!sameDocumentSnapshot(after, verified)) throw new RestoreError('unverified');
					const actualDiskObject =
						verified.diskText === null ? null : await checkpoints.putObject(verified.diskText);
					receipt = {
						...receipt,
						stage: 'verified',
						actualDiskObject,
						...(annotationsAfter === undefined ? {} : { annotationsAfter }),
						updatedAt: this.now(),
					};
					await checkpoints.putReceipt(receipt);
					if (plan.undoOf) {
						const original = this.receipts().find((item) => item.id === plan.undoOf);
						if (original)
							await checkpoints.putReceipt({
								...original,
								undoneBy: plan.id,
								updatedAt: this.now(),
							});
					}
					this.plans.delete(planId);
					this.emit();
					return structuredClone(receipt);
				} catch (error) {
					if (admitted && participant) {
						let actual: string | undefined;
						try {
							actual = (await this.deps.documents.capture(plan.path)).text ?? undefined;
						} catch {
							/* Unknown host state: release the guard without inventing a document. */
						}
						try {
							await participant.abort(planId, actual);
						} catch {
							/* The durable checkpoint remains available for explicit review. */
						}
					}
					if (receipt) {
						const next = {
							...receipt,
							stage: receipt.stage === 'prepared' ? ('aborted' as const) : ('needs-review' as const),
							error: errorCode(error),
							updatedAt: this.now(),
						};
						try {
							await checkpoints.putReceipt(next);
						} catch {
							/* A prior verified journal phase remains authoritative. Never replay the write. */
						}
					}
					this.plans.delete(planId);
					this.emit();
					throw error;
				}
			})),
		);
	}

	async undo(receiptId: string): Promise<RestoreReceipt> {
		this.assertOpen();
		await this.initialize();
		const receipt = this.receipts().find((item) => item.id === receiptId);
		if (!receipt || receipt.stage !== 'verified' || receipt.undoneBy || receipt.objectsReleasedAt !== undefined) throw new RestoreError('undo-unavailable');
		const document = await this.deps.documents.capture(receipt.path);
		const expectedText =
			receipt.afterObject === null ? null : await this.deps.checkpoints.readObject(receipt.afterObject);
		const actualDisk = document.diskText === null ? null : await textHash(document.diskText);
		// Native editors expose LF text; a closed note exposes the saved bytes. Opening or closing it is not a content edit.
		const expectedCurrent =
			document.buffers.length && expectedText !== null
				? this.deps.documents.editableText(expectedText, document)
				: document.diskText;
		if (document.text !== expectedCurrent || actualDisk !== receipt.actualDiskObject)
			throw new RestoreError('changed');
		const beforeText =
			receipt.beforeObject === null ? null : await this.deps.checkpoints.readObject(receipt.beforeObject);
		const id = crypto.randomUUID(),
			plan: RestorePlan = {
				id,
				path: receipt.path,
				sourceId: receiptId,
				sourceLabel: receipt.sourceLabel,
				mode: beforeText === null ? 'undo-copy' : 'undo',
				beforeText: document.text,
				afterText: beforeText === null ? null : this.deps.documents.editableText(beforeText, document),
				dirty: this.dirty(document),
				createdAt: this.now(),
				undoOf: receiptId,
			};
		const repositoryBaseline = await this.deps.gate.capture();
		this.plans.set(id, {
			plan,
			document,
			repositoryBaseline,
			...(receipt.annotationsBefore === undefined || receipt.annotationsAfter === undefined
				? {}
				: { annotationUndo: { before: receipt.annotationsBefore, expected: receipt.annotationsAfter } }),
		});
		return this.apply(id);
	}

	/** Called by the explicit review acknowledgement. Does not release the sync hold, acquire its queue, or edit a note. */
	async acknowledgePending(receiptId: string): Promise<RestoreReceipt> {
		this.assertOpen();
		await this.initialize();
		return this.metadata.run(receiptId, async () => {
			this.assertOpen();
			if (this.running.has(receiptId)) throw new RestoreError('changed');
			const receipt = this.receipts().find((item) => item.id === receiptId);
			if (!receipt) throw new RestoreError('plan-missing');
			if (!isPending(receipt)) return receipt;
			await this.deps.gate.assertCheckpointProtection();
			const acknowledged = { ...receipt, acknowledgedAt: this.now(), updatedAt: this.now() };
			await this.deps.checkpoints.putReceipt(acknowledged);
			this.emit();
			return acknowledged;
		});
	}

	/** Restart inspection classifies existing bytes; it never reapplies a partially completed restore. */
	async recoverPending(): Promise<readonly RestoreReceipt[]> {
		this.assertOpen();
		await this.initialize();
		for (const candidate of this.pending()) {
			await this.deps.gate.run(`recover-${candidate.id}`, () =>
				this.metadata.run(candidate.id, async () => {
					const receipt = this.receipts().find((item) => item.id === candidate.id);
					if (!receipt || !isPending(receipt)) return;
					await this.deps.gate.hold(receipt.id);
					await this.deps.gate.assertCheckpointProtection();
					let observation: RestoreReceipt['recoveryObservation'] = 'diverged';
					try {
						const current = await this.deps.documents.capture(receipt.path);
						const disk = current.diskText === null ? null : await textHash(current.diskText);
						if (disk === receipt.afterObject) observation = 'after';
						else if (disk === receipt.beforeDiskObject || disk === receipt.beforeObject)
							observation = 'before';
						else if (!current.exists) observation = 'missing';
					} catch {
						/* A conflicting editor or unreadable file must remain unresolved. */
					}
					await this.deps.checkpoints.putReceipt({
						...receipt,
						stage: 'needs-review',
						recoveryObservation: observation,
						updatedAt: this.now(),
					});
				}),
			);
		}
		this.emit();
		return this.pending();
	}
	async dispose(): Promise<void> {
		this.closed = true;
		this.plans.clear();
		this.listeners.clear();
		await Promise.allSettled(this.running.values());
	}
}
