import type { App, Component } from 'obsidian';
import type { BotClient, BotHost } from '../../api';
import type { ProtocolTimers } from '../../core/protocol/connection';
import { deviceId } from '../../../../host/obsidian/storage/device-id';
import { privateVaultStorage } from '../../../../host/obsidian/storage/private-storage';
import { ObsidianSources } from '../../platform/obsidian/sources/sources';
import { ObsidianNoteEffects } from '../../platform/obsidian/note-effects/note-effects';
import { ReceiptAuthority } from '../../platform/obsidian/note-effects/receipt-authority';
import { HostReceiptStore, type ReceiptStorage } from '../../platform/obsidian/note-effects/receipt-store';
import { digest, noteFault } from '../../platform/obsidian/note-effects/primitives';
import { HostReadService } from '../host-read/host-read';
import { HostWriteService } from './host-write';

export interface ObsidianNoteHostOptions {
	workspaceId: string; originClientId: string; timers: ProtocolTimers; lifetime: Pick<Component, 'registerEvent'>; signal?: AbortSignal;
}

/** The module owns one BotHost/one source registry. No module activation or second process manager lives here. */
export async function registerObsidianNoteHost(app: App, client: BotClient, options: ObsidianNoteHostOptions) {
	if (options.signal?.aborted) throw noteFault('HOST_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
	const device = deviceId(app), profile = client.hello.profile;
	const [deviceHash, profileHash] = await Promise.all([digest(device), digest(profile.profileId)]);
	if (options.signal?.aborted) throw noteFault('HOST_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
	const inner = privateVaultStorage(app);
	const storage: ReceiptStorage = { exists: path => inner.exists(path), read: path => inner.read(path), write: (path, text) => inner.write(path, text),
		mkdir: path => inner.mkdir(path), size: async path => (await app.vault.adapter.stat(path))?.size };
	const authority = new ReceiptAuthority({ owner: app, load: key => app.loadLocalStorage(key) as unknown, save: (key, value) => { app.saveLocalStorage(key, value); } }, deviceHash.slice(7), profileHash.slice(7));
	const receipts = new HostReceiptStore(storage, authority, { profileId: profile.profileId, deviceId: device, deviceKey: deviceHash.slice(7), profileKey: profileHash.slice(7) });
	const sources = new ObsidianSources(app, options);
	const reads = new HostReadService(sources, options.timers);
	const effects = new ObsidianNoteEffects(app, sources, receipts, { profileId: profile.profileId, commandEpoch: profile.commandEpoch,
		deviceId: device, workspaceId: options.workspaceId, lifetime: options.lifetime });
	const writes = new HostWriteService(effects, options.timers, app);
	const host: BotHost = { prepareWrite: writes.prepareWrite, checkWrite: writes.checkWrite, invoke: writes.invoke, queryReceipt: writes.queryReceipt,
		read: reads.read, search: reads.search, leaseChanged: lease => { reads.setLease(lease); writes.setLease(lease); },
		profileChanged: next => { if (next.profileId !== profile.profileId) throw noteFault('NOTE_PROFILE_MISMATCH'); effects.setCommandEpoch(next.commandEpoch); } };
	try { client.setHost(host); }
	catch (error) { writes.dispose(); reads.dispose(); sources.dispose(); throw error; }
	let disposed = false;
	return { host, sources, effects, writes, dispose: () => {
		if (disposed) return;
		disposed = true; client.setHost(undefined); writes.dispose(); reads.dispose(); sources.dispose();
	} };
}
