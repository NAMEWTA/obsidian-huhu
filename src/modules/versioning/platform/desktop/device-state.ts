import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { JsonStore } from '../../../../shared/json-store';
import { huhuPath } from '../../../../shared/storage/huhu-paths';
import type { TextStorage } from '../../../../shared/storage/ports';
import { storageWriteQueue } from '../../../../shared/storage/write-queue';
import { EMPTY_DEVICE_STATE, type DeviceSyncState } from '../../core/ports';

export function syncStatePath(vaultRoot: string, cwd: string, device: string): string {
	const relative = path.relative(vaultRoot, cwd).replaceAll('\\', '/') || '.';
	if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) throw new Error('huhu-storage.invalid-repository');
	const repository = createHash('sha256').update(relative).digest('hex');
	return huhuPath('sync', device, repository + '.json');
}
function validState(value: unknown): value is DeviceSyncState {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const record = value as Record<string, unknown>;
	return ['lastCommit', 'lastPull', 'lastPush', 'failures'].every(key => typeof record[key] === 'number' && Number.isFinite(record[key]))
		&& ['', 'manual', 'failures'].includes(String(record.paused)) && Number.isInteger(record.failures) && Number(record.failures) >= 0
		&& (record.restoreHold === undefined || typeof record.restoreHold === 'string' && record.restoreHold.length > 0 && record.restoreHold.length <= 256 && !/[\0\r\n]/.test(record.restoreHold));
}
export class SyncDeviceStore {
	private readonly stores = new Map<string, JsonStore<DeviceSyncState>>();
	constructor(private storage: TextStorage, private vaultRoot: string, private device: string) {}
	private async file(cwd: string): Promise<string> {
		const [root, repository] = await Promise.all([realpath(this.vaultRoot), realpath(cwd)]);
		return syncStatePath(root, repository, this.device);
	}
	private store(file: string): JsonStore<DeviceSyncState> {
		let store = this.stores.get(file);
		if (!store) { store = new JsonStore(this.storage, file, validState); this.stores.set(file, store); }
		return store;
	}
	async load(cwd: string): Promise<DeviceSyncState> {
		const file = await this.file(cwd);
		return storageWriteQueue(this.storage).run('sync-state:' + file, () => this.store(file).load(EMPTY_DEVICE_STATE));
	}
	async save(cwd: string, base: DeviceSyncState, value: DeviceSyncState): Promise<DeviceSyncState> {
		const file = await this.file(cwd);
		return storageWriteQueue(this.storage).run('sync-state:' + file, () => this.store(file).commit({ base, value }));
	}
}
