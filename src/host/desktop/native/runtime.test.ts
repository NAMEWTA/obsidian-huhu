import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Notice } from 'obsidian';
import { expect, test, vi } from 'vitest';
import { getLanguage, setLanguage } from '../../../shared/i18n';
import { createNativeHost } from './runtime';

for (const language of ['en', 'zh'] as const) test(`independent native installation keeps ${language} progress and checksum failure feedback`, async () => {
	const vault = await mkdtemp(join(tmpdir(), 'huhu-native-feedback-'));
	const previous = getLanguage();
	const notices = (Notice as unknown as { messages: string[] }).messages;
	const before = notices.length;
	const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
	setLanguage(language);
	const host = createNativeHost(() => ({ vault, device: 'test-device', version: '0.0.1', platform: 'linux', arch: 'x64', offline: false, fetch: async () => Buffer.from('invalid checksum') }), globalThis as unknown as Window);
	try {
		await expect(host.acquire('cookies')).rejects.toThrow('checksum');
		const messages = notices.slice(before);
		expect(messages).toContain(language === 'en' ? 'Downloading the terminal helper…' : '正在下载终端组件…');
		expect(messages.at(-1)).toBe(language === 'en' ? 'The terminal helper is not available: the published checksum is missing or invalid' : '终端组件不可用：发布的校验值缺失或无效');
	} finally { await host.dispose(); setLanguage(previous); warning.mockRestore(); await rm(vault, { recursive: true, force: true }); }
});

/** A release for linux-x64 whose CLI speaks `cliProtocol`; digest and sidecar are served from memory. */
function publishedCli(cliProtocol: number) {
	const bytes = Buffer.from('cli-binary'), digest = createHash('sha256').update(bytes).digest('hex');
	const requests: string[] = [];
	const fetch = async (url: string) => {
		requests.push(url.slice(url.lastIndexOf('/') + 1));
		if (url.endsWith('huhu-linux-x64.sha256')) return Buffer.from(`${digest}  huhu-linux-x64\n`);
		if (url.endsWith('huhu-linux-x64.compat.json')) return Buffer.from(JSON.stringify({ schema: 1, asset: 'huhu-linux-x64', cliProtocol, helperProtocol: 3, sha256: digest }));
		if (url.endsWith('huhu-linux-x64')) return bytes;
		throw new Error('unexpected ' + url);
	};
	return { fetch, requests };
}

for (const language of ['en', 'zh'] as const) test(`the command-line tool is exposed as huhu when verified, and a mismatch raises one ${language} notice and nothing runs`, async () => {
	const vault = await mkdtemp(join(tmpdir(), 'huhu-native-cli-'));
	const previous = getLanguage();
	const notices = (Notice as unknown as { messages: string[] }).messages;
	const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
	setLanguage(language);
	const good = publishedCli(1), bad = publishedCli(2);
	const key = randomBytes(32);
	const receipt = {
		seal(value: string) { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key, iv), body = Buffer.concat([c.update(value, 'utf8'), c.final()]); return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64'); },
		open(value: string) { const b = Buffer.from(value, 'base64'), d = createDecipheriv('aes-256-gcm', key, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); },
	};
	const make = (fetch: typeof good.fetch, offline = false) => createNativeHost(() => ({ receipt, vault, device: 'dev', version: '0.0.1', platform: 'linux', arch: 'x64', offline, fetch }), globalThis as unknown as Window);
	try {
		const bounced = make(bad.fetch);
		const before = notices.length;
		const refused = await bounced.cli();
		expect(refused).toMatchObject({ state: 'incompatible' });
		expect(bad.requests).not.toContain('huhu-linux-x64');
		expect(await bounced.cli()).toMatchObject({ state: 'incompatible' });
		const incompatibleText = language === 'en' ? 'does not match this plugin' : '协议不匹配';
		expect(notices.slice(before).filter(message => message.includes(incompatibleText))).toHaveLength(1);
		expect(refused.text).toContain(language === 'en' ? 'Update HUHU' : '更新');
		expect(existsSync(join(vault, '.huhu/helpers/dev/linux-x64/0.0.1/bin/huhu'))).toBe(false);

		const host = make(good.fetch);
		const ready = await host.cli({ notify: false });
		expect(ready.state).toBe('ready');
		if (ready.state !== 'ready') return;
		expect(ready.path.endsWith(join('0.0.1', 'bin', 'huhu'))).toBe(true);
		expect(ready.directory).toBe(join(ready.path, '..'));
		expect(createHash('sha256').update(readFileSync(ready.path)).digest('hex')).toBe(createHash('sha256').update('cli-binary').digest('hex'));
		// The execute bit is a POSIX host permission (exposeCli sets 0700 there); a Windows host has no such bit.
		if (process.platform !== 'win32') expect(statSync(ready.path).mode & 0o111).not.toBe(0);
		// Offline reuse: no network, still verified, and a replaced exposed file is repaired from the verified asset.
		const offline = make(async () => { throw new Error('network is off'); }, true);
		writeFileSync(ready.path, 'tampered');
		const again = await offline.cli({ notify: false });
		expect(again.state).toBe('ready');
		expect(readFileSync(ready.path, 'utf8')).toBe('cli-binary');
		await bounced.dispose(); await host.dispose(); await offline.dispose();
	} finally { setLanguage(previous); warning.mockRestore(); await rm(vault, { recursive: true, force: true }); }
});
