import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { setTimeout as scheduleTimeout, clearTimeout as cancelTimeout } from 'node:timers';
import { requestUrl, type RequestUrlResponse } from 'obsidian';
import * as path from 'node:path';
import { absoluteHuhuPath } from '../huhu-paths';
import { nativeVaultStorage } from '../vault-storage';
import { secureOwnedDirectory } from '../owned-permissions';
import type { ProtectedReceipt } from '../protected-receipt';

/** Release that publishes the native helper next to the plugin files. */
export const RELEASE_BASE = 'https://github.com/NAMEWTA/obsidian-huhu/releases/download';
const DIGEST_LIMIT = 4096;
const REQUEST_TIMEOUT = 60_000;
const STAMP = 'huhu-pty.json';
const installations = new Map<string, Promise<VerifiedAsset>>();

export type BinaryErrorCode = 'unsupported' | 'offlineMissing' | 'http' | 'network' | 'redirects' | 'timeout' | 'tooLarge' | 'checksumMissing' | 'checksumMismatch' | 'inUse' | 'incompatible' | 'compatMissing';

export class BinaryError extends Error {
	constructor(readonly code: BinaryErrorCode, message: string, readonly detail?: { status?: number; url?: string; version?: string }) {
		super(message);
	}
}

/** `huhu-pty-<platform>-<arch>[.exe]`, or null where no helper is published. */
export function assetName(platform: string, arch: string): string | null {
	if (platform === 'win32') return arch === 'x64' ? 'huhu-pty-win32-x64.exe' : null;
	if ((platform === 'darwin' || platform === 'linux') && (arch === 'x64' || arch === 'arm64')) return `huhu-pty-${platform}-${arch}`;
	return null;
}

/** The first token of a `.sha256` file must be a 64-digit hex digest. */
export function parseDigest(text: string): string | null {
	const token = text.trim().split(/\s+/)[0] ?? '';
	return /^[a-f0-9]{64}$/i.test(token) ? token.toLowerCase() : null;
}

function sha256(file: string): string {
	return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Use the host network stack, including its proxy handling. Never expose redirected URLs. */
export async function downloadHelperBytes(url: string, limit: number, timeout = REQUEST_TIMEOUT): Promise<Buffer> {
	const original = new URL(url);
	original.username = '';
	original.password = '';
	original.search = '';
	original.hash = '';
	const safeUrl = original.toString();
	const failure = (code: BinaryErrorCode, message: string, status?: number) =>
		new BinaryError(code, message + ': ' + safeUrl, { url: safeUrl, status });
	let timer: ReturnType<typeof scheduleTimeout> | undefined;
	try {
		const response = await Promise.race([
			requestUrl({ url, headers: { 'User-Agent': 'HUHU' }, throw: false }),
			new Promise<RequestUrlResponse>((_resolve, reject) => {
				timer = scheduleTimeout(() => reject(failure('timeout', 'Timed out downloading the terminal helper')), timeout);
			}),
		]);
		if (response.status !== 200) throw failure('http', 'HTTP ' + response.status, response.status);
		if (response.arrayBuffer.byteLength > limit) throw failure('tooLarge', 'The terminal helper download is too large');
		return Buffer.from(response.arrayBuffer);
	} catch (error) {
		if (error instanceof BinaryError) throw error;
		const message = error instanceof Error ? error.message : '';
		if (message.includes('ERR_TIMED_OUT')) throw failure('timeout', 'Timed out downloading the terminal helper');
		if (message.includes('ERR_TOO_MANY_REDIRECTS')) throw failure('redirects', 'Too many redirects downloading the terminal helper');
		throw failure('network', 'Network error downloading the terminal helper');
	} finally { if (timer) cancelTimeout(timer); }
}

interface Stamp {
	context: string;
	version: string;
	sha256: string;
	source: 'release' | 'development';
	/** Compatibility facts accepted before the file was first trusted; sealed with the digest. */
	detail?: string;
}

/** One kind of published native executable that shares the download, digest and receipt pipeline. */
export interface AssetSpec {
	/** Machine-readable key; separate kinds never share an installation operation. */
	kind: string;
	/** Name used in user-visible failures. */
	label: string;
	/** Sealed receipt file inside the version directory. */
	stamp: string;
	/** Environment variable naming a developer-built file to use instead of the release. */
	localEnv: string;
	assetName(platform: string, arch: string): string | null;
	/** Error code for an HTTP 404 on the digest file: a release that simply publishes no such asset. */
	absentCode?: BinaryErrorCode;
	/** Online, after the digest is known and before the executable is fetched. Returns detail kept in the receipt. */
	vet?(context: { base: string; name: string; digest: string; fetch: (url: string, limit: number) => Promise<Buffer> }): Promise<string | undefined>;
	/** Every reuse of a receipt-verified file, online or offline; throw to refuse execution. */
	accept?(detail: string | undefined, source: 'release' | 'development'): void;
}

const HELPER_SPEC: AssetSpec = {
	kind: 'helper',
	label: 'terminal helper',
	stamp: STAMP,
	localEnv: 'HUHU_PTY_BINARY',
	assetName,
};

function readStamp(dir: string, stampFile: string, receipt?: ProtectedReceipt): Stamp | null {
	try {
		const envelope = JSON.parse(fs.readFileSync(path.join(dir, stampFile), 'utf8')) as { proof?: unknown };
		if (!receipt || typeof envelope.proof !== 'string') return null;
		const value = JSON.parse(receipt.open(envelope.proof)) as Partial<Stamp>;
		return typeof value.context === 'string' && typeof value.version === 'string' && typeof value.sha256 === 'string' && (value.source === 'release' || value.source === 'development') && (value.detail === undefined || typeof value.detail === 'string') ? { context: value.context, version: value.version, sha256: value.sha256, source: value.source, detail: value.detail } : null;
	} catch {
		return null;
	}
}

export interface InstallOptions {
	receipt?: ProtectedReceipt;
	/** Opened vault and its initialized local device identity. */
	vault: string;
	device: string;
	/** Plugin version; the helper comes from the release with the same tag. */
	version: string;
	offline: boolean;
	platform?: string;
	arch?: string;
	/** Download function (tests replace it). */
	fetch?: (url: string, limit: number) => Promise<Buffer>;
	progress?: (state: 'downloading' | 'verifying') => void;
}

/**
 * Path of a usable helper binary, downloading and verifying it when needed. A file is trusted when it
 * matches the digest published for this plugin version. Offline use requires a verified receipt;
 * each version has its own path so an upgrade never replaces a running older executable.
 */
export function ensureHelper(options: InstallOptions): Promise<string> {
	return ensureAsset(options, HELPER_SPEC);
}

/** A verified executable and the digest it was verified against (so a later copy can be checked against the same value). */
export interface VerifiedAsset { file: string; sha256: string }

/** The shared pipeline behind every published executable (helper, command-line tool). */
export async function ensureAsset(options: InstallOptions, spec: AssetSpec): Promise<string> {
	return (await ensureVerifiedAsset(options, spec)).file;
}

export async function ensureVerifiedAsset(options: InstallOptions, spec: AssetSpec): Promise<VerifiedAsset> {
	const root = await absoluteHuhuPath(options.vault, `.huhu/helpers/${options.device}`);
	const key = JSON.stringify([spec.kind, root, options.version, options.platform ?? process.platform, options.arch ?? process.arch]);
	const operation = (installations.get(key) ?? Promise.resolve()).catch(() => {}).then(() => installAsset(options, spec));
	installations.set(key, operation);
	try { return await operation; } finally { if (installations.get(key) === operation) installations.delete(key); }
}

async function installAsset(options: InstallOptions, spec: AssetSpec): Promise<VerifiedAsset> {
	const local = process.env[spec.localEnv];
	const platform = options.platform ?? process.platform, arch = options.arch ?? process.arch;
	const name = spec.assetName(platform, arch);
	if (!name) throw new BinaryError('unsupported', `No ${spec.label} is published for this platform`);
	if (!/^\d+\.\d+\.\d+(?:-[a-z\d.-]+)?$/i.test(options.version)) throw new BinaryError('unsupported', `Invalid ${spec.label} version`);
	await secureOwnedDirectory(options.vault, `.huhu/helpers/${options.device}`);
	const relative = `.huhu/helpers/${options.device}/${platform}-${arch}/${options.version}`;
	const dir = await absoluteHuhuPath(options.vault, relative), file = await absoluteHuhuPath(options.vault, relative + '/' + name);
	await absoluteHuhuPath(options.vault, relative + '/' + spec.stamp);
	const localBytes = local ? fs.readFileSync(local) : undefined, source = localBytes ? 'development' : 'release';
	const localDigest = localBytes ? createHash('sha256').update(localBytes).digest('hex') : undefined;
	const exists = fs.existsSync(file);
	const context = JSON.stringify([dir, name]);
	const stamp = readStamp(dir, spec.stamp, options.receipt);
	const verified = exists && stamp?.context === context && stamp.version === options.version && stamp.source === source && sha256(file) === stamp.sha256 && (!localDigest || stamp.sha256 === localDigest);
	const ready = (sha256: string): VerifiedAsset => {
		if (process.platform !== 'win32') fs.chmodSync(file, 0o700);
		return { file, sha256 };
	};
	if (options.offline) {
		if (!verified) throw new BinaryError('offlineMissing', `Offline mode requires a verified ${spec.label} for this version`);
		spec.accept?.(stamp?.detail, source);
		return ready(stamp.sha256);
	}
	if (verified) {
		spec.accept?.(stamp?.detail, source);
		return ready(stamp.sha256);
	}

	const fetch = async (url: string, limit: number) => {
		try { return await (options.fetch ?? downloadHelperBytes)(url, limit); }
		catch (error) {
			if (error instanceof BinaryError) {
				throw new BinaryError(error.code, error.message, { ...error.detail, url, version: options.version });
			}
			throw new BinaryError('network', `Network error downloading ${url}`, { url, version: options.version });
		}
	};
	const base = `${RELEASE_BASE}/${encodeURIComponent(options.version)}/${name}`;
	options.progress?.('downloading');
	const published = async () => {
		try { return parseDigest((await fetch(`${base}.sha256`, DIGEST_LIMIT)).toString('utf8')); }
		catch (error) {
			// A release without this asset is a fact about the release, not a transient failure.
			if (spec.absentCode && error instanceof BinaryError && error.code === 'http' && error.detail?.status === 404)
				throw new BinaryError(spec.absentCode, `This release publishes no ${spec.label}`, { ...error.detail, version: options.version });
			throw error;
		}
	};
	const digest = localDigest ?? await published();
	if (!digest) throw new BinaryError('checksumMissing', `The published ${spec.label} checksum is missing or invalid`);
	// Compatibility is judged from published facts before any executable is written, let alone run.
	const detail = localDigest ? undefined : await spec.vet?.({ base, name, digest, fetch });
	spec.accept?.(detail, source);
	await nativeVaultStorage(options.vault).mkdir(relative);
	await absoluteHuhuPath(options.vault, relative + '/' + name);
	const remember = async () => {
		await absoluteHuhuPath(options.vault, relative + '/' + spec.stamp);
		const proof = options.receipt?.seal(JSON.stringify({ context, version: options.version, sha256: digest, source, detail }));
		fs.writeFileSync(path.join(dir, spec.stamp), JSON.stringify({ proof: proof ?? null }), { mode: 0o600 });
	};
	// A matching file placed by hand (same release) is accepted without downloading again.
	if (exists && sha256(file) === digest) {
		await remember();
		return ready(digest);
	}
	const retained = await absoluteHuhuPath(options.vault, `.huhu/helpers/${options.device}/legacy-plugin/files/${name}`);
	const retainedBytes = !localBytes && fs.existsSync(retained) && fs.lstatSync(retained).isFile() && fs.statSync(retained).size <= 256 * 1024 * 1024 ? fs.readFileSync(retained) : undefined;
	// Legacy stamps are not execution proofs. Reuse the retained bytes only after the official digest matches.
	const bytes = localBytes ?? (retainedBytes && createHash('sha256').update(retainedBytes).digest('hex') === digest ? retainedBytes : await fetch(base, 256 * 1024 * 1024));
	options.progress?.('verifying');
	if (createHash('sha256').update(bytes).digest('hex') !== digest) throw new BinaryError('checksumMismatch', `The downloaded ${spec.label} does not match its checksum; the previous file was kept`);
	await absoluteHuhuPath(options.vault, relative + '/' + name);
	const temporary = `${file}.download-${crypto.randomUUID()}`;
	fs.writeFileSync(temporary, bytes, { mode: 0o700, flag: 'wx' });
	try {
		fs.renameSync(temporary, file);
	} catch (error) {
		fs.rmSync(temporary, { force: true });
		throw new BinaryError('inUse', `The ${spec.label} could not be replaced: ${error instanceof Error ? error.message : String(error)}`);
	}
	await remember();
	return ready(digest);
}
