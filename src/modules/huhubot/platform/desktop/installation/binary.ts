import { createHash } from 'node:crypto';
import { lstat, readFile, rename, rm, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';
import { requestUrl } from 'obsidian';
import { absoluteHuhuPath } from '../../../../../host/desktop/huhu-paths';
import { secureOwnedDirectory } from '../../../../../host/desktop/owned-permissions';
import type { ProtectedReceipt } from '../../../../../host/desktop/protected-receipt';

const RELEASE_BASE = 'https://github.com/NAMEWTA/obsidian-huhu/releases/download';
const MAX_BINARY_BYTES = 256 * 1024 * 1024;
interface Metadata {
	formatVersion: number; asset: string; platform: string; arch: string; version: string;
	protocolVersion: string; schemaVersion: number; sha256: string; sourceRevision: string; sourceTreeHash: string;
}
export interface BotBinaryOptions {
	vaultRoot: string; deviceId: string; version: string; override?: string;
	platform?: string; arch?: string; receipt?: ProtectedReceipt;
	fetch?: (url: string, limit: number) => Promise<Uint8Array>;
}
const installations = new Map<string, Promise<string>>();
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export function botAssetName(platform: string, arch: string): string {
	if ((platform === 'linux' || platform === 'darwin') && (arch === 'x64' || arch === 'arm64')) return `huhu-bot-${platform}-${arch}`;
	if (platform === 'win32' && arch === 'x64') return 'huhu-bot-win32-x64.exe';
	throw new Error('HUHUBOT_PLATFORM_UNSUPPORTED');
}
export function validateBotMetadata(value: unknown, asset: string, platform: string, arch: string, version: string): Metadata {
	const metadata = value as Partial<Metadata> | null;
	if (!metadata || metadata.formatVersion !== 1 || metadata.asset !== asset || metadata.platform !== platform || metadata.arch !== arch ||
		metadata.version !== version || metadata.protocolVersion !== '0.1' || metadata.schemaVersion !== 1 ||
		!/^([a-f0-9]{64})$/.test(metadata.sha256 ?? '') || !/^[a-f0-9]{40}$/.test(metadata.sourceRevision ?? '') ||
		!/^[a-f0-9]{64}$/.test(metadata.sourceTreeHash ?? '')) throw new Error('HUHUBOT_BINARY_INCOMPATIBLE');
	return metadata as Metadata;
}
async function boundedFile(file: string, limit: number): Promise<Buffer> {
	const info = await lstat(file);
	if (!info.isFile() || info.size < 1 || info.size > limit) throw new Error('HUHUBOT_ASSET_INVALID');
	const bytes = await readFile(file);
	if (bytes.length > limit) throw new Error('HUHUBOT_ASSET_INVALID');
	return bytes;
}
async function download(url: string, limit: number): Promise<Uint8Array> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const response = await Promise.race([
			requestUrl({ url, throw: false, headers: { 'User-Agent': 'HUHU' } }),
			new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('HUHUBOT_DOWNLOAD_TIMEOUT')), 60_000); }),
		]);
		if (response.status !== 200 || response.arrayBuffer.byteLength > limit || !response.arrayBuffer.byteLength) throw new Error('HUHUBOT_DOWNLOAD_FAILED');
		return new Uint8Array(response.arrayBuffer);
	} finally { if (timer) clearTimeout(timer); }
}

/** Installs only versioned assets with matching HAP metadata and SHA-256. A protected
 * local receipt permits offline reuse; otherwise the release digest is checked again.
 * Explicit development overrides require their adjacent build manifest and checksum.
 */
export async function ensureBotBinary(options: BotBinaryOptions): Promise<string> {
	const key = JSON.stringify([options.vaultRoot, options.deviceId, options.version, options.override, options.platform, options.arch]);
	const pending = installations.get(key);
	if (pending) return pending;
	const operation = install(options);
	installations.set(key, operation);
	try { return await operation; } finally { if (installations.get(key) === operation) installations.delete(key); }
}
async function install(options: BotBinaryOptions): Promise<string> {
	if (!/^\d+\.\d+\.\d+(?:-[a-z\d.-]+)?$/i.test(options.version) || !/^[a-zA-Z0-9_-]+$/.test(options.deviceId)) throw new Error('HUHUBOT_INSTALL_ID_INVALID');
	const platform = options.platform ?? process.platform, arch = options.arch ?? process.arch;
	const asset = botAssetName(platform, arch);
	const relative = `.huhu/helpers/${options.deviceId}/${platform}-${arch}/${options.version}/huhubot`;
	await secureOwnedDirectory(options.vaultRoot, relative);
	const directory = await absoluteHuhuPath(options.vaultRoot, relative);
	const binary = await absoluteHuhuPath(options.vaultRoot, `${relative}/${asset}`);
	const receiptFile = await absoluteHuhuPath(options.vaultRoot, `${relative}/receipt.json`);
	const ready = async () => { if (process.platform !== 'win32') await chmod(binary, 0o700); return binary; };
	if (!options.override && options.receipt) {
		try {
			const envelope = JSON.parse((await boundedFile(receiptFile, 16_384)).toString('utf8')) as { proof: string };
			const record = JSON.parse(options.receipt.open(envelope.proof)) as { directory: string; metadata: unknown };
			const metadata = validateBotMetadata(record.metadata, asset, platform, arch, options.version);
			if (record.directory === directory && sha256(await boundedFile(binary, MAX_BINARY_BYTES)) === metadata.sha256) return ready();
		} catch { /* A synchronized or unavailable receipt never establishes execution trust. */ }
	}
	const fetch = options.fetch ?? download;
	const base = `${RELEASE_BASE}/${encodeURIComponent(options.version)}/${asset}`;
	const local = options.override;
	if (local && (!path.isAbsolute(local) || path.basename(local) !== asset)) throw new Error('HUHUBOT_BINARY_PATH_INVALID');
	const metadataBytes = local ? await boundedFile(`${local}.json`, 16_384) : await fetch(`${base}.json`, 16_384);
	const metadata = validateBotMetadata(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes)), asset, platform, arch, options.version);
	const checksumBytes = local ? await boundedFile(`${local}.sha256`, 4096) : await fetch(`${base}.sha256`, 4096);
	if (new TextDecoder('utf-8', { fatal: true }).decode(checksumBytes).trim() !== `${metadata.sha256}  ${asset}`) throw new Error('HUHUBOT_CHECKSUM_INVALID');
	let bytes: Uint8Array | undefined;
	if (local) bytes = await boundedFile(local, MAX_BINARY_BYTES);
	else {
		try { const cached = await boundedFile(binary, MAX_BINARY_BYTES); if (sha256(cached) === metadata.sha256) bytes = cached; } catch { /* Fetch a missing cache only after obtaining official metadata. */ }
		bytes ??= await fetch(base, MAX_BINARY_BYTES);
	}
	if (!bytes.length || bytes.length > MAX_BINARY_BYTES || sha256(bytes) !== metadata.sha256) throw new Error('HUHUBOT_CHECKSUM_MISMATCH');
	const temporary = `${binary}.download-${crypto.randomUUID()}`;
	await absoluteHuhuPath(options.vaultRoot, `${relative}/${path.basename(temporary)}`);
	await writeFile(temporary, bytes, { mode: 0o700, flag: 'wx' });
	try {
		await absoluteHuhuPath(options.vaultRoot, `${relative}/${asset}`);
		await rename(temporary, binary);
	} finally { await rm(temporary, { force: true }); }
	if (options.receipt && !local) {
		const proof = options.receipt.seal(JSON.stringify({ directory, metadata }));
		await absoluteHuhuPath(options.vaultRoot, `${relative}/receipt.json`);
		await writeFile(receiptFile, JSON.stringify({ proof }), { mode: 0o600 });
	}
	return ready();
}
