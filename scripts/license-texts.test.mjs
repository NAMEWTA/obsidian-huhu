import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { packageNotice, selectedLicenses } from './license-texts.mjs';

test('SPDX alternatives choose an allowed branch and preserve AND obligations', () => {
	assert.deepEqual(selectedLicenses('(MIT OR Apache-2.0) AND Unicode-3.0'), ['MIT', 'Unicode-3.0']);
	assert.deepEqual(selectedLicenses('Apache-2.0/MIT'), ['MIT']);
	assert.deepEqual(selectedLicenses('GPL-3.0 OR MIT'), ['MIT']);
	for (const expression of ['GPL-3.0 AND MIT', 'UNKNOWN', 'MIT OR', '(MIT', 'MIT WITH unknown-exception']) assert.throws(() => selectedLicenses(expression));
});

test('all required texts survive selection and a missing additional notice fails', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-notice-'));
	try {
		const pkg = { name: 'fixture', version: '1', license: '(MIT OR Apache-2.0) AND Unicode-3.0', dir };
		writeFileSync(path.join(dir, 'LICENSE-MIT'), 'MIT License\nCopyright fixture\nPermission is hereby granted, free of charge\n');
		assert.throws(() => packageNotice(pkg), /required Unicode/);
		writeFileSync(path.join(dir, 'LICENSE-UNICODE'), 'UNICODE LICENSE V3\nCopyright Unicode, Inc.\n');
		assert.match(packageNotice(pkg).text, /MIT License[\s\S]*UNICODE LICENSE V3/);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});

test('missing release licenses require an exact version and verified local source', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-notice-'));
	try {
		const pkg = { name: 'fixture', version: '1', license: 'MIT', dir };
		assert.throws(() => packageNotice(pkg), /Missing full license/);
		const raw = 'MIT License\nCopyright fixture\nPermission is hereby granted, free of charge\n';
		writeFileSync(path.join(dir, 'pinned.txt'), raw);
		const options = { sourcesDirectory: dir, overrides: { 'fixture@1': { license: 'MIT', file: 'pinned.txt', sha256: createHash('sha256').update(raw).digest('hex'), source: `https://github.com/owner/repo/blob/${'a'.repeat(40)}/LICENSE` } } };
		assert.equal(packageNotice(pkg, options).text, raw.trim());
		assert.throws(() => packageNotice({ ...pkg, version: '2' }, options), /Missing full license/);
		writeFileSync(path.join(dir, 'pinned.txt'), 'tampered');
		assert.throws(() => packageNotice(pkg, options), /checksum mismatch/);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
