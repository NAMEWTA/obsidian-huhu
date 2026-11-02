import { randomBytes } from 'node:crypto';
import type { Readable, Writable } from 'node:stream';
import { clearTimeout, setTimeout } from 'node:timers';
import type { CredentialStatus } from '../../../api';
import {
	CredentialReceiptDecoder, encodeCredentialRequest,
	type CredentialMetadata, type CredentialOperation, type CredentialReceipt,
} from './protocol';

export interface CredentialResult extends CredentialStatus { credentialRef: string }
interface Pending {
	metadata: CredentialMetadata;
	operation: CredentialOperation;
	resolve(result: CredentialResult): void;
	reject(error: Error): void;
	timer: ReturnType<typeof setTimeout>;
}
interface Write { bytes: Uint8Array; requestId: string }

/** Desktop-only, write-only secret registration. The parent has no secret resolution operation. */
export class DesktopCredentialClient {
	private readonly decoder = new CredentialReceiptDecoder();
	private readonly pending = new Map<string, Pending>();
	private readonly queue: Write[] = [];
	private active?: Write;
	private profileId?: string;
	private ready = false;
	private ended?: Error;
	private partialTimer?: ReturnType<typeof setTimeout>;

	constructor(
		private readonly output: Writable,
		private readonly input: Readable,
		private readonly stopRunner: (reason: Error) => void,
	) {
		input.on('data', this.read);
		input.on('end', this.eof);
		input.on('error', this.streamError);
		output.on('error', this.streamError);
	}

	async connect(profileId: string): Promise<void> {
		if (this.profileId) throw new Error('CREDENTIAL_ALREADY_ATTACHED');
		this.profileId = profileId;
		try { await this.request(0); this.ready = true; }
		catch (error) {
			this.fail(error instanceof Error ? error : new Error('CREDENTIAL_HANDSHAKE_FAILED'));
			throw error;
		}
	}

	/** Consumes and clears the caller's mutable buffer before returning, including invalid input.
	 * Copies retained for a pending write are cleared on write completion or channel termination.
	 * This cannot erase earlier UI strings or runtime/OS copies; callers should avoid creating them.
	 */
	async register(secret: Uint8Array, storagePreference: 'protected' | 'session-memory'): Promise<CredentialResult> {
		try {
			this.assertReady();
			const credentialRef = `credential:${randomBytes(16).toString('hex')}`;
			return this.request(1, credentialRef, storagePreference, secret);
		} finally { secret.fill(0); }
	}
	async status(credentialRef: string): Promise<CredentialResult> {
		this.assertReady(); return this.request(3, credentialRef);
	}
	async delete(credentialRef: string): Promise<CredentialResult> {
		this.assertReady(); return this.request(2, credentialRef);
	}
	private assertReady(): void {
		if (this.ended) throw this.ended;
		if (!this.ready) throw new Error('CREDENTIAL_HANDSHAKE_REQUIRED');
	}
	private request(
		operation: CredentialOperation,
		credentialRef?: string,
		storagePreference?: 'protected' | 'session-memory',
		secret?: Uint8Array,
	): Promise<CredentialResult> {
		if (this.ended) return Promise.reject(this.ended);
		const writingSettledRequest = this.active && !this.pending.has(this.active.requestId) ? 1 : 0;
		if (this.pending.size + writingSettledRequest >= 8) {
			const error = new Error('CREDENTIAL_IN_FLIGHT_LIMIT');
			this.fail(error);
			return Promise.reject(error);
		}
		const metadata: CredentialMetadata = {
			requestId: `request:${randomBytes(16).toString('hex')}`, profileId: this.profileId ?? '',
			...(credentialRef === undefined ? {} : { credentialRef }),
			...(storagePreference === undefined ? {} : { storagePreference }),
		};
		let bytes: Uint8Array;
		try { bytes = encodeCredentialRequest(operation, metadata, secret); }
		catch { return Promise.reject(new Error('INVALID_CREDENTIAL_REQUEST')); }
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => this.fail(new Error('CREDENTIAL_TIMEOUT')), 3000);
			this.pending.set(metadata.requestId, { operation, metadata, resolve, reject, timer });
			this.queue.push({ bytes, requestId: metadata.requestId });
			this.flush();
		});
	}
	private flush(): void {
		if (this.active || this.ended) return;
		const write = this.queue.shift();
		if (!write) return;
		this.active = write;
		this.output.write(write.bytes, (error?: Error | null) => {
			write.bytes.fill(0);
			if (this.active !== write) return;
			this.active = undefined;
			if (error) this.fail(new Error('CREDENTIAL_WRITE_FAILED'));
			else this.flush();
		});
	}
	private readonly read = (bytes: Uint8Array): void => {
		if (this.ended) return;
		try {
			for (const receipt of this.decoder.push(bytes)) this.accept(receipt);
			if (!this.decoder.partial && this.partialTimer) {
				clearTimeout(this.partialTimer); this.partialTimer = undefined;
			} else if (this.decoder.partial && !this.partialTimer) {
				this.partialTimer = setTimeout(() => this.fail(new Error('CREDENTIAL_PARTIAL_FRAME')), 3000);
			}
		} catch { this.fail(new Error('INVALID_CREDENTIAL_RECEIPT')); }
	};
	private accept(receipt: CredentialReceipt): void {
		const pending = this.pending.get(receipt.requestId);
		if (!pending || receipt.profileId !== pending.metadata.profileId ||
			receipt.credentialRef !== (pending.metadata.credentialRef ?? '') ||
			(pending.operation === 1 && receipt.mode !== pending.metadata.storagePreference) ||
			(pending.operation === 0 && (receipt.mode !== 'none' || receipt.state !== 'available' || receipt.reason !== undefined))
		) throw new Error('INVALID_CREDENTIAL_RECEIPT');
		clearTimeout(pending.timer);
		this.pending.delete(receipt.requestId);
		pending.resolve({ credentialRef: receipt.credentialRef, mode: receipt.mode, state: receipt.state,
			...(receipt.reason === undefined ? {} : { reason: receipt.reason }) });
	}
	private readonly eof = (): void => {
		try { this.decoder.finish(); this.fail(new Error('CREDENTIAL_EOF')); }
		catch { this.fail(new Error('CREDENTIAL_PARTIAL_FRAME')); }
	};
	private readonly streamError = (): void => this.fail(new Error('CREDENTIAL_PIPE_FAILED'));
	private fail(error: Error): void {
		if (this.ended) return;
		this.ended = error;
		if (this.partialTimer) clearTimeout(this.partialTimer);
		for (const pending of this.pending.values()) {
			clearTimeout(pending.timer);
			if (pending.operation === 0) pending.reject(error);
			else pending.resolve({ credentialRef: pending.metadata.credentialRef ?? '',
				mode: pending.metadata.storagePreference ?? 'none', state: 'unknown',
				reason: error.message === 'CREDENTIAL_TIMEOUT' ? 'OPERATION_TIMEOUT' : 'SESSION_CLOSED' });
		}
		this.pending.clear();
		this.active?.bytes.fill(0);
		this.active = undefined;
		for (const write of this.queue.splice(0)) write.bytes.fill(0);
		this.input.off('data', this.read);
		this.input.off('end', this.eof);
		this.input.destroy();
		this.output.destroy();
		this.stopRunner(error);
	}
	close(): void { this.fail(new Error('CREDENTIAL_CHANNEL_CLOSED')); }
}
