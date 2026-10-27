import { storageWriteQueue } from '../../../../../shared/storage/write-queue';
import { canonical, exactKeys, hex, noteFault, record, sameJson, utf8 } from './primitives';

/** App local storage is vault-local; its key never enters Vault receipt files or HAP. */
export interface ReceiptKeyStorage {
	owner: object;
	load(key: string): unknown;
	save(key: string, value: unknown): void;
}
interface SavedKey { version: 1; algorithm: 'HMAC-SHA256'; key: string }
export interface ReceiptSeal { version: 1; algorithm: 'HMAC-SHA256'; data: unknown; seal: string }

export class ReceiptAuthority {
	private readonly keyName: string;
	constructor(private readonly storage: ReceiptKeyStorage, deviceKey: string, profileKey: string) {
		if (!/^[a-f0-9]{64}$/.test(deviceKey) || !/^[a-f0-9]{64}$/.test(profileKey)) throw noteFault('NOTE_PROFILE_MISMATCH');
		this.keyName = `huhu.huhubot.receipt-key.v1.${deviceKey}.${profileKey}`;
	}
	private async load(create: boolean): Promise<{ key?: CryptoKey; created: boolean }> {
		let saved: unknown;
		try { saved = this.storage.load(this.keyName); }
		catch { if (!create) return { created: false }; throw noteFault('RECEIPT_WRITE_FAILED', 'CONFLICT'); }
		let created = false;
		if (saved == null) {
			if (!create) return { created: false };
			const value: SavedKey = { version: 1, algorithm: 'HMAC-SHA256', key: hex(crypto.getRandomValues(new Uint8Array(32)).buffer) };
			try {
				this.storage.save(this.keyName, value);
				if (!sameJson(this.storage.load(this.keyName), value)) throw noteFault('RECEIPT_WRITE_FAILED', 'CONFLICT');
			} catch { throw noteFault('RECEIPT_WRITE_FAILED', 'CONFLICT'); }
			saved = value; created = true;
		}
		if (!record(saved) || !exactKeys(saved, ['version', 'algorithm', 'key']) || saved.version !== 1 ||
			saved.algorithm !== 'HMAC-SHA256' || typeof saved.key !== 'string' || !/^[a-f0-9]{64}$/.test(saved.key)) {
			if (!create) return { created: false };
			throw noteFault('NOTE_RECEIPT_INVALID'); // Never silently replace an existing bad key.
		}
		const raw = Uint8Array.from(saved.key.match(/../g)!, byte => parseInt(byte, 16));
		try { return { key: await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']), created }; }
		finally { raw.fill(0); }
	}
	/** Callers serialize their first receipt/index initialization with this same owner/key. */
	locked<T>(run: () => Promise<T>): Promise<T> {
		return storageWriteQueue(this.storage.owner).run(this.keyName, run, 'host-note-receipt');
	}
	async seal(data: unknown, create = false): Promise<{ envelope: ReceiptSeal; created: boolean }> {
		const loaded = await this.load(create);
		if (!loaded.key) throw noteFault('NOTE_RECEIPT_INVALID');
		const bytes = utf8.encode(canonical(['huhu-host-receipt-v1', data]));
		const seal = hex(await crypto.subtle.sign('HMAC', loaded.key, bytes));
		return { envelope: { version: 1, algorithm: 'HMAC-SHA256', data, seal }, created: loaded.created };
	}
	/** Queries cannot create/rotate keys or trust an unauthenticated locator. */
	async verify(value: unknown): Promise<unknown> {
		if (!record(value) || !exactKeys(value, ['version', 'algorithm', 'data', 'seal']) || value.version !== 1 ||
			value.algorithm !== 'HMAC-SHA256' || typeof value.seal !== 'string' || !/^[a-f0-9]{64}$/.test(value.seal)) return undefined;
		const loaded = await this.load(false);
		if (!loaded.key) return undefined;
		const signature = Uint8Array.from(value.seal.match(/../g)!, byte => parseInt(byte, 16));
		return await crypto.subtle.verify('HMAC', loaded.key, signature, utf8.encode(canonical(['huhu-host-receipt-v1', value.data]))) ? value.data : undefined;
	}
}
