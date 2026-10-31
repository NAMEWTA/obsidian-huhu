import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { absoluteHuhuPath } from '../huhu-paths';
import { nativeVaultStorage } from '../vault-storage';
import { BinaryError, ensureVerifiedAsset, type AssetSpec, type VerifiedAsset, type InstallOptions } from './binary';
import { HELPER_PROTOCOL } from '../../../shared/native/frames';

/**
 * Local control protocol major this plugin speaks (`protocolVersion` in control-schema.json; a test keeps them equal).
 * A published `huhu` with another major is never installed or run.
 */
export const CLI_PROTOCOL_MAJOR = 1;
const COMPAT_LIMIT = 4096;

/** `huhu-<platform>-<arch>[.exe]`; the helper keeps its `huhu-pty-` prefix, so the names never collide. */
export function cliAssetName(platform: string, arch: string): string | null {
	if (platform === 'win32') return arch === 'x64' ? 'huhu-win32-x64.exe' : null;
	if ((platform === 'darwin' || platform === 'linux') && (arch === 'x64' || arch === 'arm64')) return `huhu-${platform}-${arch}`;
	return null;
}

/** Facts the release publishes next to each CLI asset (`<asset>.compat.json`), written from the binary that was built. */
export interface CliCompatibility {
	schema: 1;
	asset: string;
	cliProtocol: number;
	helperProtocol: number;
	sha256: string;
}

export function parseCompatibility(text: string): CliCompatibility | null {
	try {
		const value = JSON.parse(text) as Partial<CliCompatibility> | null;
		if (!value || typeof value !== 'object' || value.schema !== 1) return null;
		if (typeof value.asset !== 'string' || typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256)) return null;
		if (!Number.isSafeInteger(value.cliProtocol) || !Number.isSafeInteger(value.helperProtocol)) return null;
		return { schema: 1, asset: value.asset, cliProtocol: value.cliProtocol!, helperProtocol: value.helperProtocol!, sha256: value.sha256 };
	} catch {
		return null;
	}
}

/** Refuses a CLI whose protocol major or paired helper protocol this plugin does not speak. Pure; no process is started. */
export function assertCompatible(compat: Pick<CliCompatibility, 'cliProtocol' | 'helperProtocol'>, version?: string): void {
	if (compat.cliProtocol !== CLI_PROTOCOL_MAJOR)
		throw new BinaryError('incompatible', `The published command-line tool speaks control protocol ${compat.cliProtocol}; this plugin needs ${CLI_PROTOCOL_MAJOR}. Install the matching release.`, { version });
	if (compat.helperProtocol !== HELPER_PROTOCOL)
		throw new BinaryError('incompatible', `The published command-line tool pairs with terminal helper protocol ${compat.helperProtocol}; this plugin needs ${HELPER_PROTOCOL}. Install the matching release.`, { version });
}

const spec = (version: string): AssetSpec => ({
	kind: 'cli',
	label: 'command-line tool',
	stamp: 'huhu-cli.json',
	localEnv: 'HUHU_CLI_BINARY',
	assetName: cliAssetName,
	absentCode: 'compatMissing',
	async vet({ base, name, digest, fetch }) {
		let text: string;
		try {
			text = (await fetch(`${base}.compat.json`, COMPAT_LIMIT)).toString('utf8');
		} catch (error) {
			// An older release without the sidecar cannot prove compatibility: treat it as absent, never as compatible.
			if (error instanceof BinaryError && (error.code === 'http' && error.detail?.status === 404)) throw new BinaryError('compatMissing', 'This release publishes no compatible command-line tool', { version });
			throw error;
		}
		const compat = parseCompatibility(text);
		if (!compat || compat.asset !== name) throw new BinaryError('compatMissing', 'The published command-line tool compatibility record is missing or invalid', { version });
		if (compat.sha256 !== digest) throw new BinaryError('incompatible', 'The compatibility record does not describe the published command-line tool', { version });
		assertCompatible(compat, version);
		return JSON.stringify({ cliProtocol: compat.cliProtocol, helperProtocol: compat.helperProtocol });
	},
	accept(detail, source) {
		if (source === 'development') return;
		const compat = detail === undefined ? null : (() => { try { return JSON.parse(detail) as CliCompatibility; } catch { return null; } })();
		if (!compat) throw new BinaryError('compatMissing', 'The installed command-line tool has no verified compatibility record', { version });
		assertCompatible(compat, version);
	},
});

/**
 * Path of a verified, protocol-compatible `huhu` command-line tool. Same digest, receipt and offline rules as the
 * helper; the compatibility record is checked before the executable is downloaded, and again on every reuse.
 */
export async function ensureCli(options: InstallOptions): Promise<string> {
	return (await ensureCliVerified(options)).file;
}

/** Same, with the digest the file was verified against; `exposeCli` needs it. */
export function ensureCliVerified(options: InstallOptions): Promise<VerifiedAsset> {
	return ensureVerifiedAsset(options, spec(options.version));
}

export type CliDiagnosis =
	| { state: 'ready'; path: string; sha256: string }
	| { state: 'unsupported' | 'offlineMissing' | 'incompatible' | 'compatMissing' | 'checksumMissing' | 'checksumMismatch' | 'downloadFailed' | 'unavailable'; reason: string };

const DIRECT = ['unsupported', 'offlineMissing', 'incompatible', 'compatMissing', 'checksumMissing', 'checksumMismatch'] as const;
const DOWNLOAD = ['http', 'network', 'redirects', 'timeout', 'tooLarge'];

/** Installation diagnostic that never throws and never depends on localized text. */
export async function diagnoseCli(options: InstallOptions): Promise<CliDiagnosis> {
	try {
		const verified = await ensureCliVerified(options);
		return { state: 'ready', path: verified.file, sha256: verified.sha256 };
	} catch (error) {
		if (!(error instanceof BinaryError)) return { state: 'unavailable', reason: 'unknown' };
		const direct = DIRECT.find((code) => code === error.code);
		if (direct) return { state: direct, reason: error.code };
		return { state: DOWNLOAD.includes(error.code) ? 'downloadFailed' : 'unavailable', reason: error.code };
	}
}

/**
 * The name terminals type is `huhu`, so a verified asset is exposed as `<version dir>/bin/huhu[.exe]`. `sha256` is the
 * digest `ensureCli` verified the asset against: an existing target is kept only if it hashes to that value, and a new
 * copy is hashed against it before it replaces anything, so bytes that changed after verification are never exposed.
 */
export async function exposeCli(options: Pick<InstallOptions, 'vault' | 'device' | 'version' | 'platform' | 'arch'>, asset: string, sha256: string): Promise<string> {
	const platform = options.platform ?? process.platform, arch = options.arch ?? process.arch;
	const relative = `.huhu/helpers/${options.device}/${platform}-${arch}/${options.version}/bin`;
	await absoluteHuhuPath(options.vault, relative);
	const target = await absoluteHuhuPath(options.vault, `${relative}/${platform === 'win32' ? 'huhu.exe' : 'huhu'}`);
	const digest = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
	await nativeVaultStorage(options.vault).mkdir(relative);
	if (!(fs.existsSync(target) && fs.lstatSync(target).isFile() && digest(target) === sha256)) {
		const temporary = `${target}.tmp-${crypto.randomUUID()}`;
		try {
			fs.copyFileSync(asset, temporary, fs.constants.COPYFILE_EXCL);
			if (digest(temporary) !== sha256) throw new BinaryError('checksumMismatch', 'The command-line tool changed after it was verified; it was not exposed');
			if (process.platform !== 'win32') fs.chmodSync(temporary, 0o700);
			fs.rmSync(target, { force: true });
			fs.renameSync(temporary, target);
		} catch (error) {
			fs.rmSync(temporary, { force: true });
			if (error instanceof BinaryError) throw error;
			throw new BinaryError('inUse', `The command-line tool could not be exposed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	if (process.platform !== 'win32') fs.chmodSync(target, 0o700);
	return target;
}
