import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { botAssetName, ensureBotBinary, validateBotMetadata } from './binary';

const bytes = Buffer.from('runner fixture A');
const digest = createHash('sha256').update(bytes).digest('hex');
const asset = botAssetName(process.platform, process.arch);
const metadata = { formatVersion: 1, asset, platform: process.platform, arch: process.arch, version: '1.0.0', protocolVersion: '0.1', schemaVersion: 1,
	sha256: digest, sourceRevision: 'a'.repeat(40), sourceTreeHash: 'b'.repeat(64) };

it('rejects mismatched platform, version and protocol before accepting an executable', () => {
	for (const invalid of [{ ...metadata, arch: 'other' }, { ...metadata, version: '2.0.0' }, { ...metadata, protocolVersion: '1.0' }])
		expect(() => validateBotMetadata(invalid, asset, process.platform, process.arch, '1.0.0')).toThrow('HUHUBOT_BINARY_INCOMPATIBLE');
});

it('keeps an installed executable intact when a subsequent asset fails integrity verification', async () => {
	const vaultRoot = await mkdtemp(path.join(tmpdir(), 'huhu-bot-install-'));
	let next = false;
	const fetch = async (url: string) => {
		const hash = next ? 'c'.repeat(64) : digest;
		if (url.endsWith('.json')) return Buffer.from(JSON.stringify({ ...metadata, sha256: hash }));
		if (url.endsWith('.sha256')) return Buffer.from(`${hash}  ${asset}\n`);
		return next ? Buffer.from('damaged download') : bytes;
	};
	try {
		const options = { vaultRoot, deviceId: 'device-test', version: '1.0.0', fetch };
		const binary = await ensureBotBinary(options);
		expect(await readFile(binary)).toEqual(bytes);
		next = true;
		await expect(ensureBotBinary(options)).rejects.toThrow('HUHUBOT_CHECKSUM_MISMATCH');
		expect(await readFile(binary)).toEqual(bytes);
	} finally { await rm(vaultRoot, { recursive: true, force: true }); }
});

it('requires the adjacent manifest and checksum for an explicit local override', async () => {
	const vaultRoot = await mkdtemp(path.join(tmpdir(), 'huhu-bot-local-'));
	const override = path.join(vaultRoot, asset);
	const options = { vaultRoot, deviceId: 'device-test', version: '1.0.0', override };
	try {
		await writeFile(override, bytes);
		await expect(ensureBotBinary(options)).rejects.toThrow();
		await writeFile(`${override}.json`, JSON.stringify(metadata));
		await writeFile(`${override}.sha256`, `${digest}  ${asset}\n`);
		const installed = await ensureBotBinary(options);
		expect(installed).not.toBe(override);
		expect(await readFile(installed)).toEqual(bytes);
	} finally { await rm(vaultRoot, { recursive: true, force: true }); }
});
