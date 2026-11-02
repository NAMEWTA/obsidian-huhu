import type { NoteWriteBinding } from '../../../api';
import type { TextStorage } from '../../../../../shared/storage/ports';
import { HUHUBOT_RUNTIME_ROOT } from '../../../../../shared/storage/vault-layout';
import { ensureDirectory } from '../../../../../shared/storage/durable-state';
import { ReceiptAuthority } from './receipt-authority';
import { digest, exactKeys, noteFault, record, sameJson, utf8 } from './primitives';

const MAX_RECEIPTS = 1024;
const MAX_RECEIPT_BYTES = 16_384;
const MAX_INDEX_BYTES = 131_072;
const validHash = (value: unknown): value is string => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
export interface NoteLocator { path: string; operation: 'create' | 'update'; baseHash: string; contentHash: string }
export interface ReceiptClaim { effectId: string; fingerprint: string; binding: NoteWriteBinding }
export interface LocalNoteReceipt extends ReceiptClaim {
	type: 'receipt'; version: 1; profileId: string; deviceId: string; commandEpoch: string;
	locator: NoteLocator; receiptId: string; receivedAt: string;
	phase: 'received' | 'completed' | 'failed_no_effect'; completedAt?: string; postHash?: string; reason?: string;
}
interface ReceiptIndex { type: 'index'; version: 1; profileId: string; deviceId: string; effects: string[] }
export interface ReceiptStoreIdentity { profileId: string; deviceId: string; profileKey: string; deviceKey: string }
export interface ReceiptStorage extends TextStorage { size(path: string): Promise<number | undefined> }
export type ReceiptObservation = { state: 'missing' | 'invalid' | 'reserved' } | { state: 'verified'; receipt: LocalNoteReceipt };
export type ReceiptAdmission = { fresh: true; receipt: LocalNoteReceipt } | { fresh: false; observation: ReceiptObservation };

/** A bounded local evidence store, not an Approval/Run ledger. No backup rollback and no body/CP/secret storage. */
export class HostReceiptStore {
	readonly directory: string;
	constructor(private readonly storage: ReceiptStorage, private readonly authority: ReceiptAuthority, readonly identity: ReceiptStoreIdentity) {
		if (!/^[a-f0-9]{64}$/.test(identity.profileKey) || !/^[a-f0-9]{64}$/.test(identity.deviceKey)) throw noteFault('NOTE_PROFILE_MISMATCH');
		this.directory = `${HUHUBOT_RUNTIME_ROOT}/${identity.deviceKey}/host-receipts/${identity.profileKey}`;
	}
	private async file(effectId: string): Promise<string> { return `${this.directory}/${(await digest(effectId)).slice(7)}.json`; }
	private async read(path: string, maximum: number): Promise<unknown> {
		try {
			if (!await this.storage.exists(path)) return undefined;
			const size = await this.storage.size(path);
			if (size === undefined || size > maximum || size < 1) return null;
			const text = await this.storage.read(path);
			if (utf8.encode(text).length > maximum) return null;
			return JSON.parse(text) as unknown;
		} catch { return null; }
	}
	private owned(claim: ReceiptClaim): void {
		if (claim.binding.profileId !== this.identity.profileId || claim.binding.deviceId !== this.identity.deviceId)
			throw noteFault('NOTE_PROFILE_MISMATCH');
		if (!validHash(claim.fingerprint)) throw noteFault('EFFECT_FINGERPRINT_MISMATCH');
	}
	private async observation(claim: ReceiptClaim): Promise<ReceiptObservation> {
		this.owned(claim);
		const raw = await this.read(await this.file(claim.effectId), MAX_RECEIPT_BYTES);
		if (raw === undefined) return { state: 'missing' };
		const data = await this.authority.verify(raw);
		if (!record(data) || !exactKeys(data, ['type', 'version', 'profileId', 'deviceId', 'commandEpoch', 'effectId', 'fingerprint', 'binding', 'locator', 'receiptId', 'receivedAt', 'phase'],
			['completedAt', 'postHash', 'reason']) || data.type !== 'receipt' || data.version !== 1 ||
			data.profileId !== this.identity.profileId || data.deviceId !== this.identity.deviceId ||
			typeof data.fingerprint !== 'string' || !validHash(data.fingerprint) || data.effectId !== claim.effectId) return { state: 'invalid' };
		if (data.fingerprint !== claim.fingerprint) throw noteFault('EFFECT_FINGERPRINT_MISMATCH');
		if (data.commandEpoch !== claim.binding.commandEpoch || !sameJson(data.binding, claim.binding) ||
			typeof data.receiptId !== 'string' || !/^receipt:[a-f0-9]{32}$/.test(data.receiptId) ||
			typeof data.receivedAt !== 'string' || !Number.isFinite(Date.parse(data.receivedAt)) ||
			!record(data.locator) || !exactKeys(data.locator, ['path', 'operation', 'baseHash', 'contentHash']) ||
			typeof data.locator.path !== 'string' || !['create', 'update'].includes(String(data.locator.operation)) ||
			data.locator.baseHash !== claim.binding.baseHash || data.locator.contentHash !== claim.binding.contentHash ||
			!['received', 'completed', 'failed_no_effect'].includes(String(data.phase)) ||
			(data.phase === 'received' && ['completedAt', 'postHash', 'reason'].some(key => Object.hasOwn(data, key))) ||
			(data.phase === 'completed' && (data.postHash !== claim.binding.contentHash || typeof data.completedAt !== 'string' ||
				!Number.isFinite(Date.parse(data.completedAt)) || Object.hasOwn(data, 'reason'))) ||
			(data.phase === 'failed_no_effect' && (typeof data.reason !== 'string' || typeof data.completedAt !== 'string' ||
				!Number.isFinite(Date.parse(data.completedAt)) || Object.hasOwn(data, 'postHash')))) return { state: 'invalid' };
		return { state: 'verified', receipt: data as unknown as LocalNoteReceipt };
	}
	lookup(claim: ReceiptClaim): Promise<ReceiptObservation> {
		return this.authority.locked(async () => {
			const observed = await this.observation(claim);
			if (observed.state !== 'missing') return observed;
			const index = await this.index();
			if (index?.effects.includes((await digest(claim.effectId)).slice(7))) return { state: 'reserved' };
			return index === null ? { state: 'invalid' } : observed;
		});
	}
	private async index(): Promise<ReceiptIndex | null | undefined> {
		const raw = await this.read(`${this.directory}/index.json`, MAX_INDEX_BYTES);
		if (raw === undefined) return undefined;
		const data = await this.authority.verify(raw);
		if (!record(data) || !exactKeys(data, ['type', 'version', 'profileId', 'deviceId', 'effects']) || data.type !== 'index' || data.version !== 1 ||
			data.profileId !== this.identity.profileId || data.deviceId !== this.identity.deviceId || !Array.isArray(data.effects) || data.effects.length > MAX_RECEIPTS ||
			!data.effects.every(effect => typeof effect === 'string' && /^[a-f0-9]{64}$/.test(effect)) || new Set(data.effects).size !== data.effects.length) return null;
		return data as unknown as ReceiptIndex;
	}
	private async save(path: string, data: LocalNoteReceipt | ReceiptIndex, maximum: number): Promise<void> {
		try {
			const { envelope } = await this.authority.seal(data);
			const text = JSON.stringify(envelope);
			if (utf8.encode(text).length > maximum) throw noteFault('NOTE_SIZE_LIMIT', 'RESOURCE_LIMIT');
			await ensureDirectory(this.storage, this.directory);
			await this.storage.write(path, text);
			// A dropped write is a failure too. No backup or merging can manufacture completion evidence.
			if (await this.storage.read(path) !== text) throw noteFault('RECEIPT_WRITE_FAILED', 'CONFLICT');
		} catch { throw noteFault('RECEIPT_WRITE_FAILED', 'CONFLICT'); }
	}
	begin(receipt: LocalNoteReceipt): Promise<ReceiptAdmission> {
		return this.authority.locked(async () => {
			const observed = await this.observation(receipt);
			if (observed.state !== 'missing') return { fresh: false, observation: observed };
			let index = await this.index();
			if (index === null) return { fresh: false, observation: { state: 'invalid' } };
			if (!index) {
				const initial: ReceiptIndex = { type: 'index', version: 1, profileId: this.identity.profileId, deviceId: this.identity.deviceId, effects: [] };
				const { created } = await this.authority.seal(initial, true);
				// A missing index with an old key is lost evidence, never a fresh store that may execute again.
				if (!created) return { fresh: false, observation: { state: 'invalid' } };
				index = initial;
			}
			const key = (await digest(receipt.effectId)).slice(7);
			if (index.effects.includes(key)) return { fresh: false, observation: { state: 'reserved' } };
			if (index.effects.length >= MAX_RECEIPTS) throw noteFault('NOTE_TASK_LIMIT', 'RESOURCE_LIMIT');
			await this.save(`${this.directory}/index.json`, { ...index, effects: [...index.effects, key] }, MAX_INDEX_BYTES);
			await this.save(await this.file(receipt.effectId), receipt, MAX_RECEIPT_BYTES);
			return { fresh: true, receipt };
		});
	}
	finish(received: LocalNoteReceipt, outcome: { phase: 'completed'; postHash: string } | { phase: 'failed_no_effect'; reason: string }): Promise<void> {
		return this.authority.locked(async () => {
			const current = await this.observation(received);
			if (current.state !== 'verified' || current.receipt.receiptId !== received.receiptId) throw noteFault('NOTE_RECEIPT_INVALID');
			if (current.receipt.phase !== 'received') return;
			await this.save(await this.file(received.effectId), { ...current.receipt, ...outcome, completedAt: new Date().toISOString() }, MAX_RECEIPT_BYTES);
		});
	}
}
