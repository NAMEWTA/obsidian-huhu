import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { goNoticeSection, goPackageNotice, parseGoJSON, reviewedSupplementalNotices, runtimeModules } from './huhu-bot-notices.mjs';

test('parses concatenated pretty-printed go list JSON, including escaped braces', () => {
	assert.deepEqual(parseGoJSON('{"a":"brace } and \\\" quote"}\n{\n"b": {}\n}'), [{ a: 'brace } and " quote' }, { b: {} }]);
	for (const invalid of ['{', '{"a":', '{} garbage', '[]', '"unexpected"']) assert.throws(() => parseGoJSON(invalid));
});
const mod = { Path: 'example.com/reviewed', Version: 'v1.0.0', Sum: 'h1:abc', Dir: '/runtime-module' };
const sums = new Set(['example.com/reviewed v1.0.0 h1:abc', 'example.com/reviewed v1.0.0/go.mod h1:def']);
test('uses only the non-test compiled union, excluding standard/main and unconsumed modules', () => {
	const packages = [{ Standard: true }, { Module: { Main: true } }, { Module: mod }, { Module: mod }];
	assert.deepEqual(runtimeModules(packages, sums, { 'example.com/reviewed@v1.0.0': 'MIT' }).map(pkg => pkg.name), ['example.com/reviewed']);
});
test('fails on unreviewed/restricted modules, lock mismatch, replacement or incomplete graph', () => {
	assert.throws(() => runtimeModules([{ Module: mod }], sums), /Unreviewed/);
	assert.throws(() => runtimeModules([{ Module: mod }], sums, { 'example.com/reviewed@v1.0.0': 'GPL-3.0' }), /Review license/);
	assert.throws(() => runtimeModules([{ Module: mod }], new Set(), { 'example.com/reviewed@v1.0.0': 'MIT' }), /go.sum mismatch/);
	assert.throws(() => runtimeModules([{ Module: { ...mod, Replace: {} } }], sums), /replacement/);
	assert.throws(() => runtimeModules([{ ImportPath: 'bad', Error: { Err: 'failed' } }], sums), /Incomplete/);
});
test('missing or invalid complete license text cannot produce a passing notice', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-go-license-'));
	try {
		const pkg = { name: 'example.com/a', version: 'v1.0.0', license: 'MIT', dir };
		assert.throws(() => goNoticeSection([pkg]), /Missing full license/);
		writeFileSync(path.join(dir, 'LICENSE'), 'MIT'); assert.throws(() => goNoticeSection([pkg]), /Missing required MIT/);
		writeFileSync(path.join(dir, 'LICENSE'), 'Permission is hereby granted, free of charge, to use fixture software.');
		writeFileSync(path.join(dir, 'NOTICE'), 'Required fixture attribution');
		const notice = goNoticeSection([pkg]); assert.match(notice, /Required fixture attribution/); assert.match(notice, /Permission is hereby granted/);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
test('reviewed validator modules require their precise runtime versions and checksums', () => {
	const modules = [
		{ Path: 'github.com/santhosh-tekuri/jsonschema/v6', Version: 'v6.0.3', Sum: 'h1:validator', Dir: '/validator' },
		{ Path: 'golang.org/x/text', Version: 'v0.42.0', Sum: 'h1:text', Dir: '/text' },
	];
	const locked = new Set(modules.flatMap(item => [`${item.Path} ${item.Version} ${item.Sum}`, `${item.Path} ${item.Version}/go.mod h1:mod`]));
	assert.deepEqual(runtimeModules(modules.map(Module => ({ Module })), locked).map(pkg => pkg.license), ['Apache-2.0', 'BSD-3-Clause']);
	const unreviewed = { ...modules[0], Version: 'v6.0.4' };
	assert.throws(() => runtimeModules([{ Module: unreviewed }], new Set([`${unreviewed.Path} v6.0.4 h1:validator`, `${unreviewed.Path} v6.0.4/go.mod h1:mod`])), /Unreviewed runtime Go license/);
});
test('credential runtime reviews accept only locked versions and the reviewed compiled adapters', () => {
	const modules = [
		{ Path: 'github.com/danieljoos/wincred', Version: 'v1.2.3', Sum: 'h1:wincred', Dir: '/wincred' },
		{ Path: 'github.com/godbus/dbus/v5', Version: 'v5.2.2', Sum: 'h1:dbus', Dir: '/dbus' },
		{ Path: 'github.com/zalando/go-keyring', Version: 'v0.2.8', Sum: 'h1:keyring', Dir: '/keyring' },
	];
	const locked = items => new Set(items.flatMap(item => [`${item.Path} ${item.Version} ${item.Sum}`, `${item.Path} ${item.Version}/go.mod h1:mod`]));
	const packages = modules.map(Module => ({ Module, GoFiles: Module.Path.endsWith('go-keyring') ? ['keyring.go', 'keyring_unix.go'] : ['runtime.go'] }));
	assert.deepEqual(runtimeModules(packages, locked(modules)).map(pkg => pkg.license), ['MIT', 'BSD-2-Clause', 'MIT']);
	const windows = { Module: modules[2], GoFiles: ['keyring.go', 'keyring_windows.go'] };
	assert.equal(runtimeModules([windows], locked(modules))[0].license, 'MIT');
	assert.throws(() => runtimeModules([{ ...windows, GoFiles: ['keyring.go', 'keyring_darwin.go'] }], locked(modules)), /Unreviewed compiled Go license scope/);
	for (const Module of modules) {
		assert.throws(() => runtimeModules([{ Module }], locked([{ ...Module, Sum: 'h1:changed' }])), /go.sum mismatch/);
		const updated = { ...Module, Version: 'v99.0.0' };
		assert.throws(() => runtimeModules([{ Module: updated }], locked([updated])), /Unreviewed runtime Go license/);
	}
});
test('embedded metaschema and CLDR notices survive alongside the module root license', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-go-supplement-'));
	try {
		writeFileSync(path.join(dir, 'LICENSE'), 'Permission is hereby granted, free of charge, to use fixture software.');
		const metaschema = goPackageNotice({ name: 'github.com/santhosh-tekuri/jsonschema/v6', version: 'v6.0.3', license: 'MIT', dir });
		assert.deepEqual(metaschema.selected, ['MIT', 'BSD-3-Clause']); assert.match(metaschema.text, /JSON Schema Specification Authors/); assert.match(metaschema.text, /Academic Free License/);
		const cldr = goPackageNotice({ name: 'golang.org/x/text', version: 'v0.42.0', license: 'MIT', dir });
		assert.deepEqual(cldr.selected, ['MIT', 'Unicode-DFS-2016']); assert.match(cldr.text, /1991-2017 Unicode/);
		assert.match(cldr.source, /5dfac9269ed58eeaeddd6ca887bdc7eb43a481fd/);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
test('missing, altered, unpinned and restrictive supplemental notices fail closed', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-go-supplement-'));
	try {
		writeFileSync(path.join(dir, 'LICENSE'), 'Permission is hereby granted, free of charge, to use fixture software.');
		const pkg = { name: 'fixture', version: '1', license: 'MIT', dir };
		const entry = reviewedSupplementalNotices['golang.org/x/text@v0.42.0'][0];
		const run = patch => goPackageNotice(pkg, { sourcesDirectory: dir, supplemental: { 'fixture@1': [{ ...entry, ...patch }] } });
		assert.throws(() => run({}), /ENOENT/);
		writeFileSync(path.join(dir, entry.file), 'altered'); assert.throws(() => run({}), /checksum mismatch/);
		assert.throws(() => run({ source: 'https://github.com/unicode-org/cldr/blob/main/unicode-license.txt' }), /pin a commit/);
		assert.throws(() => run({ license: 'GPL-3.0' }), /Review license/);
		assert.throws(() => run({ file: '../escape' }), /escapes/);
		// The complete reviewed release text, rather than a marker string, is the pinned input.
		const original = readFileSync(new URL('../docs/third-party/licenses/go/cldr-32-unicode-license.txt', import.meta.url));
		writeFileSync(path.join(dir, entry.file), original); assert.match(run({}).text, /1991-2017 Unicode/);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
test('linked wasm libc/TLSF translation retains the complete fixed upstream MIT notice', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-wasm-license-'));
	try {
		writeFileSync(path.join(dir, 'LICENSE'), 'MIT No Attribution License\nPermission is hereby granted, free of charge, to use fixture glue.');
		const pkg = { name: 'github.com/ncruces/go-sqlite3-wasm/v6', version: 'v6.3.35304', license: 'MIT-0', dir };
		const original = readFileSync(new URL('../docs/third-party/licenses/go/wasm2go-v0.4.15-MIT.txt', import.meta.url), 'utf8').replace(/\r\n/g, '\n').trim();
		const section = goNoticeSection([pkg]);
		assert.ok(section.includes(original), 'the full original MIT copyright and permission text must accompany the translated runtime');
		assert.match(section, /Selected terms: MIT-0 AND MIT/);
		assert.doesNotMatch(section, /### github\.com\/ncruces\/wasm2go\b/);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
test('translated runtime fails on missing or altered MIT text and unknown source/version', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-wasm-license-'));
	try {
		writeFileSync(path.join(dir, 'LICENSE'), 'MIT No Attribution License\nPermission is hereby granted, free of charge, to use fixture glue.');
		const pkg = { name: 'github.com/ncruces/go-sqlite3-wasm/v6', version: 'v6.3.35304', license: 'MIT-0', dir };
		const id = `${pkg.name}@${pkg.version}`, entry = reviewedSupplementalNotices[id][0];
		const run = patch => goPackageNotice(pkg, { sourcesDirectory: dir, supplemental: { [id]: [{ ...entry, ...patch }] } });
		assert.throws(() => run({}), /ENOENT/);
		writeFileSync(path.join(dir, entry.file), 'MIT License only'); assert.throws(() => run({}), /checksum mismatch/);
		const original = readFileSync(new URL('../docs/third-party/licenses/go/wasm2go-v0.4.15-MIT.txt', import.meta.url));
		writeFileSync(path.join(dir, entry.file), original); assert.deepEqual(run({}).selected, ['MIT-0', 'MIT']);
		assert.throws(() => run({ source: `https://github.com/unknown/source/blob/${'a'.repeat(40)}/LICENSE` }), /Unreviewed supplemental source/);
		assert.throws(() => run({ source: entry.source.replace('c0a4be49ed2521303a8b47a8ccbe974da0444762', 'b'.repeat(40)) }), /Unreviewed supplemental source/);
		assert.throws(() => run({ license: 'MIT-0' }), /Review supplemental license/);
		assert.throws(() => run({ sha256: '0'.repeat(64) }), /source checksum mismatch/);
		const unreviewed = { Path: pkg.name, Version: 'v6.3.35305', Sum: 'h1:wrong-version', Dir: dir };
		assert.throws(() => runtimeModules([{ Module: unreviewed }], new Set([`${pkg.name} ${unreviewed.Version} ${unreviewed.Sum}`, `${pkg.name} ${unreviewed.Version}/go.mod h1:mod`])), /Unreviewed runtime Go license/);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the consumed SDK and mixed-license modules require their exact reviewed versions', () => {
	const entries = [
		['github.com/anthropics/anthropic-sdk-go', 'v1.56.0', 'MIT'],
		['github.com/buger/jsonparser', 'v1.1.2', 'MIT'],
		['github.com/invopop/jsonschema', 'v0.14.0', 'MIT'],
		['github.com/pb33f/ordered-map/v2', 'v2.3.1', 'Apache-2.0'],
		['github.com/standard-webhooks/standard-webhooks/libraries', 'v0.0.1', 'MIT'],
		['go.yaml.in/yaml/v4', 'v4.0.0-rc.2', 'MIT AND Apache-2.0'],
		['golang.org/x/sync', 'v0.23.0', 'BSD-3-Clause'],
		['github.com/cloudwego/eino', 'v0.9.22', 'Apache-2.0'],
		['github.com/cloudwego/eino-ext/components/model/openai', 'v0.1.13', 'Apache-2.0'],
		['github.com/cloudwego/eino-ext/libs/acl/openai', 'v0.1.18-0.20260924031408-10df7cac3f6d', 'Apache-2.0'],
		['github.com/meguminnnnnnnnn/go-openai', 'v0.1.6', 'Apache-2.0'],
		['github.com/bytedance/sonic', 'v1.15.0', 'Apache-2.0'],
		['github.com/twitchyliquid64/golang-asm', 'v0.15.1', 'BSD-3-Clause'],
		['gopkg.in/yaml.v3', 'v3.0.1', 'MIT AND Apache-2.0'],
		['github.com/openai/openai-go/v3', 'v3.44.0', 'Apache-2.0'],
		['github.com/tidwall/gjson', 'v1.18.0', 'MIT'],
		['github.com/tidwall/sjson', 'v1.2.5', 'MIT'],
		['github.com/tidwall/match', 'v1.1.1', 'MIT'],
		['github.com/tidwall/pretty', 'v1.2.1', 'MIT'],
	];
	for (const [Path, Version, license] of entries) {
		const Module = { Path, Version, Sum: 'h1:fixture', Dir: '/fixture' };
		const locked = item => new Set([`${item.Path} ${item.Version} ${item.Sum}`, `${item.Path} ${item.Version}/go.mod h1:mod`]);
		assert.equal(runtimeModules([{ Module }], locked(Module))[0].license, license);
		assert.throws(() => runtimeModules([{ Module }], locked({ ...Module, Sum: 'h1:altered' })), /go.sum mismatch/);
		const updated = { ...Module, Version: 'v99.0.0' };
		assert.throws(() => runtimeModules([{ Module: updated }], locked(updated)), /Unreviewed runtime Go license/);
	}
});

test('each official SDK retains its own vendored Go JSON BSD obligation alongside its root license', () => {
	for (const [name, version, license, rootText] of [
		['github.com/openai/openai-go/v3', 'v3.44.0', 'Apache-2.0', 'Apache-2.0-full.txt'],
		['github.com/anthropics/anthropic-sdk-go', 'v1.56.0', 'MIT', 'wasm2go-v0.4.15-MIT.txt'],
	]) {
		const dir = mkdtempSync(path.join(tmpdir(), 'huhu-sdk-license-'));
		try {
			writeFileSync(path.join(dir, 'LICENSE'), readFileSync(new URL(`../docs/third-party/licenses/go/${rootText}`, import.meta.url)));
			const pkg = { name, version, license, dir };
			const notice = goPackageNotice(pkg);
			assert.deepEqual(notice.selected, [license, 'BSD-3-Clause']);
			assert.match(notice.source, /Copyright 2010 The Go Authors/);
			assert.match(notice.source, /2011[\s\S]*2013[\s\S]*2016/);
			const id = `${pkg.name}@${pkg.version}`, entry = reviewedSupplementalNotices[id][0];
			const original = readFileSync(new URL(`../docs/third-party/licenses/go/${entry.file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
			assert.ok(notice.text.includes(original.trim()));
			const run = patch => goPackageNotice(pkg, { sourcesDirectory: dir, supplemental: { [id]: [{ ...entry, ...patch }] } });
			assert.throws(() => run({}), /ENOENT/);
			writeFileSync(path.join(dir, entry.file), 'BSD license marker only');
			assert.throws(() => run({}), /checksum mismatch/);
			writeFileSync(path.join(dir, entry.file), original);
			assert.deepEqual(run({}).selected, [license, 'BSD-3-Clause']);
			assert.throws(() => run({ sha256: '0'.repeat(64) }), /source checksum mismatch/);
			assert.throws(() => run({ source: entry.source.replace('16afa6a740fac7442e94dcd2ec5ea4a4853e45dc', 'a'.repeat(40)) }), /Unreviewed supplemental source/);
		} finally { rmSync(dir, { recursive: true, force: true }); }
	}
});

test('the EinoExt submodule missing its license uses only the fixed reviewed root original', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-ext-license-'));
	try {
		const pkg = { name: 'github.com/cloudwego/eino-ext/components/model/openai', version: 'v0.1.13', license: 'Apache-2.0', dir };
		const section = goNoticeSection([pkg]);
		const overrides = JSON.parse(readFileSync(new URL('../docs/third-party/licenses/go/sources.json', import.meta.url), 'utf8'));
		const id = `${pkg.name}@${pkg.version}`, entry = overrides[id];
		assert.ok(section.includes(readFileSync(new URL(`../docs/third-party/licenses/go/${entry.file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n').trim()));
		assert.match(section, /0ebab92e14f26088411dbc440a1ebdc904ccd8a1/);
		assert.throws(() => goPackageNotice(pkg), /Missing full license/);
		assert.throws(() => goPackageNotice(pkg, { overrides: { [id]: { ...entry, source: entry.source.replace('0ebab92e14f26088411dbc440a1ebdc904ccd8a1', 'a'.repeat(40)) } } }), /Unreviewed root license source/);
		assert.throws(() => goPackageNotice(pkg, { overrides: { [id]: { ...entry, sha256: '0'.repeat(64) } } }), /checksum mismatch|Unreviewed root license source/);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});

test('runtime embedded notices retain every reviewed full text and reject changed inputs', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-chat-notices-'));
	try {
		writeFileSync(path.join(dir, 'LICENSE'), 'Permission is hereby granted, free of charge, to use fixture software.');
		for (const id of ['github.com/bytedance/sonic@v1.15.0', 'github.com/twitchyliquid64/golang-asm@v0.15.1', 'github.com/sirupsen/logrus@v1.9.3', 'gopkg.in/yaml.v3@v3.0.1', 'go.yaml.in/yaml/v4@v4.0.0-rc.2']) {
			const split = id.lastIndexOf('@'), pkg = { name: id.slice(0, split), version: id.slice(split + 1), license: 'MIT', dir };
			const entries = reviewedSupplementalNotices[id];
			assert.ok(entries?.length, `Missing embedded notice review: ${id}`);
			const notice = goPackageNotice(pkg);
			for (const entry of entries) {
				const original = readFileSync(new URL(`../docs/third-party/licenses/go/${entry.file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n').trim();
				assert.ok(notice.text.includes(original), `Missing complete original: ${entry.file}`);
				const run = patch => goPackageNotice(pkg, { sourcesDirectory: dir, supplemental: { [id]: [{ ...entry, ...patch }] } });
				assert.throws(() => run({}), /ENOENT/);
				writeFileSync(path.join(dir, entry.file), 'altered');
				assert.throws(() => run({}), /checksum mismatch/);
				writeFileSync(path.join(dir, entry.file), `${original}\n`);
				assert.throws(() => run({ source: entry.source.replace(/blob\/[a-f0-9]{40}/, `blob/${'f'.repeat(40)}`) }), /Unreviewed supplemental source/);
				rmSync(path.join(dir, entry.file));
			}
		}
		assert.match(goPackageNotice({ name: 'github.com/twitchyliquid64/golang-asm', version: 'v0.15.1', license: 'MIT', dir }).text, /Lucent Technologies/);
		assert.match(goPackageNotice({ name: 'github.com/sirupsen/logrus', version: 'v1.9.3', license: 'MIT', dir }).text, /Miki Tebeka/);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
