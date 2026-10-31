import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { goEnvironment, moduleDirectory, root, sha256, targets, toolchain } from './build-huhu-bot.mjs';
import { packageNotice, selectedLicenses } from './license-texts.mjs';

// Version-specific reviews. An added runtime dependency fails closed until its terms are reviewed.
export const reviewedLicenses = Object.freeze({
	'github.com/anthropics/anthropic-sdk-go@v1.56.0': 'MIT',
	'github.com/bahlo/generic-list-go@v0.2.0': 'BSD-3-Clause',
	'github.com/buger/jsonparser@v1.1.1': 'MIT',
	'github.com/buger/jsonparser@v1.1.2': 'MIT',
	'github.com/bytedance/gopkg@v0.1.3': 'Apache-2.0',
	'github.com/bytedance/sonic/loader@v0.5.0': 'Apache-2.0',
	'github.com/bytedance/sonic@v1.15.0': 'Apache-2.0',
	'github.com/cloudwego/base64x@v0.1.6': 'Apache-2.0',
	'github.com/cloudwego/eino-ext/components/model/openai@v0.1.13': 'Apache-2.0',
	'github.com/cloudwego/eino-ext/libs/acl/openai@v0.1.18-0.20260924031408-10df7cac3f6d': 'Apache-2.0',
	'github.com/cloudwego/eino@v0.9.22': 'Apache-2.0',
	'github.com/danieljoos/wincred@v1.2.3': 'MIT',
	'github.com/dustin/go-humanize@v1.0.1': 'MIT',
	'github.com/eino-contrib/jsonschema@v1.0.3': 'MIT',
	'github.com/evanphx/json-patch@v0.5.2': 'BSD-3-Clause',
	'github.com/godbus/dbus/v5@v5.2.2': 'BSD-2-Clause',
	'github.com/google/uuid@v1.6.0': 'BSD-3-Clause',
	'github.com/goph/emperror@v0.17.2': 'MIT',
	'github.com/invopop/jsonschema@v0.14.0': 'MIT',
	'github.com/json-iterator/go@v1.1.12': 'MIT',
	'github.com/klauspost/cpuid/v2@v2.2.9': 'MIT',
	'github.com/mailru/easyjson@v0.7.7': 'MIT',
	'github.com/meguminnnnnnnnn/go-openai@v0.1.6': 'Apache-2.0',
	'github.com/modern-go/concurrent@v0.0.0-20180306012644-bacd9c7ef1dd': 'Apache-2.0',
	'github.com/modern-go/reflect2@v1.0.2': 'Apache-2.0',
	'github.com/ncruces/go-sqlite3-wasm/v6@v6.3.35304': 'MIT-0',
	'github.com/ncruces/go-sqlite3@v0.35.6': 'MIT',
	'github.com/ncruces/julianday@v1.0.0': 'MIT',
	'github.com/nikolalohinski/gonja@v1.5.3': 'MIT',
	'github.com/openai/openai-go/v3@v3.44.0': 'Apache-2.0',
	'github.com/pb33f/ordered-map/v2@v2.3.1': 'Apache-2.0',
	'github.com/pelletier/go-toml/v2@v2.0.9': 'MIT',
	'github.com/pkg/errors@v0.9.1': 'BSD-2-Clause',
	'github.com/santhosh-tekuri/jsonschema/v6@v6.0.3': 'Apache-2.0',
	'github.com/sirupsen/logrus@v1.9.3': 'MIT',
	'github.com/slongfield/pyfmt@v0.0.0-20220222012616-ea85ff4c361f': 'BSD-3-Clause',
	'github.com/standard-webhooks/standard-webhooks/libraries@v0.0.1': 'MIT',
	'github.com/tidwall/gjson@v1.18.0': 'MIT',
	'github.com/tidwall/match@v1.1.1': 'MIT',
	'github.com/tidwall/pretty@v1.2.1': 'MIT',
	'github.com/tidwall/sjson@v1.2.5': 'MIT',
	'github.com/twitchyliquid64/golang-asm@v0.15.1': 'BSD-3-Clause',
	'github.com/wk8/go-ordered-map/v2@v2.1.8': 'Apache-2.0',
	'github.com/yargevad/filepathx@v1.0.0': 'MIT',
	'github.com/zalando/go-keyring@v0.2.8': 'MIT',
	'go.yaml.in/yaml/v4@v4.0.0-rc.2': 'MIT AND Apache-2.0',
	'golang.org/x/arch@v0.11.0': 'BSD-3-Clause',
	'golang.org/x/exp@v0.0.0-20230713183714-613f0c0eb8a1': 'BSD-3-Clause',
	'golang.org/x/sync@v0.23.0': 'BSD-3-Clause',
	'golang.org/x/sys@v0.48.0': 'BSD-3-Clause',
	'golang.org/x/text@v0.42.0': 'BSD-3-Clause',
	'gopkg.in/yaml.v3@v3.0.1': 'MIT AND Apache-2.0',
});

// Embedded data and translated runtime code retain obligations beyond each Go module's root license.
export const reviewedSupplementalNotices = Object.freeze({
	'go.yaml.in/yaml/v4@v4.0.0-rc.2': [{
		name: 'Go YAML v4 full Apache terms', license: 'Apache-2.0', file: 'Apache-2.0-full.txt',
		sha256: '69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b',
		source: 'https://github.com/cloudwego/eino-ext/blob/0ebab92e14f26088411dbc440a1ebdc904ccd8a1/LICENSE-APACHE',
		note: 'go.yaml.in/yaml/v4 v4.0.0-rc.2 (79a895ba05137f58781f9f6ff38a0f04c02816bc) supplies LICENSE and NOTICE with the libyaml/Kirill Simonov MIT and Canonical Apache attribution, but only an abbreviated Apache grant. Both release legal files are byte-identical to the reviewed yaml.v3 texts. This unchanged complete Apache 2.0 legal text supplies the full terms independently for this version; its fixed EinoExt source is a legal-text source, not a YAML implementation source.',
	}],
	'github.com/anthropics/anthropic-sdk-go@v1.56.0': [{
		name: 'Anthropic SDK vendored Go encoding/json', license: 'BSD-3-Clause', file: 'go-1.24rc1-BSD-3-Clause.txt',
		sha256: '911f8f5782931320f5b8d1160a76365b83aea6447ee6c04fa6d5591467db9dad',
		source: 'https://github.com/golang/go/blob/16afa6a740fac7442e94dcd2ec5ea4a4853e45dc/LICENSE',
		note: 'anthropic-sdk-go v1.56.0 (b0e07bb34ffc0d018c89b5cec8f62a7b823927f3) imports its own internal/encoding/json from internal/apijson/encoder.go. The vendored encode/decode/indent/scanner/stream files retain Copyright 2010 The Go Authors. All rights reserved.; tags.go retains Copyright 2011 The Go Authors. All rights reserved.; fold.go retains Copyright 2013 The Go Authors. All rights reserved.; tables.go retains Copyright 2016 The Go Authors. All rights reserved. These BSD notices supplement the SDK root MIT license independently of the OpenAI SDK. The SDK says Go 1.24.0-pre-release without an exact vendored source commit; the unchanged legal text comes from this fixed Go 1.24rc1 license, not an invented implementation identity.',
	}],
	'github.com/openai/openai-go/v3@v3.44.0': [{
		name: 'Vendored Go encoding/json', license: 'BSD-3-Clause', file: 'go-1.24rc1-BSD-3-Clause.txt',
		sha256: '911f8f5782931320f5b8d1160a76365b83aea6447ee6c04fa6d5591467db9dad',
		source: 'https://github.com/golang/go/blob/16afa6a740fac7442e94dcd2ec5ea4a4853e45dc/LICENSE',
		note: 'openai-go/v3 v3.44.0 (83462dff240801783d9cd32dece645c86875abec) imports internal/encoding/json from internal/apijson/encoder.go. The vendored encode/decode/indent/scanner/stream files retain Copyright 2010 The Go Authors. All rights reserved.; tags.go retains Copyright 2011 The Go Authors. All rights reserved.; fold.go retains Copyright 2013 The Go Authors. All rights reserved.; tables.go retains Copyright 2016 The Go Authors. All rights reserved. They explicitly use the Go BSD license, beyond the SDK root Apache license. The SDK identifies Go 1.24.0-pre-release without an exact vendored commit; this fixed Go 1.24rc1 source supplies the unchanged legal text only, not an invented vendoring identity.',
	}],
	'github.com/ncruces/go-sqlite3-wasm/v6@v6.3.35304': [{
		name: 'wasm2go/libc-gen translated C runtime and TLSF allocator', license: 'MIT', file: 'wasm2go-v0.4.15-MIT.txt',
		sha256: '13b7919ffbff20b54d133748a783ade8b3ecb1810144194aad70928070f2c0df',
		source: 'https://github.com/ncruces/wasm2go/blob/c0a4be49ed2521303a8b47a8ccbe974da0444762/LICENSE',
		note: 'go-sqlite3-wasm/v6 v6.3.35304 (d923b955a175c983578bd2196ce9ac0511f6159d) pins wasm2go v0.4.15. Its build/main.c includes libc.c and malloc_tlsf.c emitted by libc-gen; build/build.sh translates them into the linked Go runtime. The MIT text covers this translated C runtime/allocator; wasm2go and its unused build dependencies are not reported as linked Go modules. SQLite retains its public-domain status; the translation module only licenses its remaining glue under MIT-0.',
	}],
	'github.com/santhosh-tekuri/jsonschema/v6@v6.0.3': [{
		name: 'JSON Schema metaschemas', license: 'BSD-3-Clause', file: 'json-schema-spec-LICENSE.txt',
		sha256: '909b25a80d4945b21d3adb2fb17f90bf592e0274bdf117c069c088a8e44dc7b6',
		source: 'https://github.com/json-schema-org/json-schema-spec/blob/ce9738c9064662ec791fcb13f56b5cab5b3bc450/LICENSE',
		note: 'jsonschema/v6 embeds metaschemas/. The pinned upstream README offers BSD-3-Clause OR AFL-3.0; BSD-3-Clause is selected, and the complete supplied LICENSE is retained.',
	}],
	'golang.org/x/text@v0.42.0': [{
		name: 'Unicode CLDR 32 data', license: 'Unicode-DFS-2016', file: 'cldr-32-unicode-license.txt',
		sha256: '6a6976a5da6ac21a6a001c685c057f4a6e619be11f5465371088ecd80c7fbe06',
		source: 'https://github.com/unicode-org/cldr/blob/5dfac9269ed58eeaeddd6ca887bdc7eb43a481fd/unicode-license.txt',
		note: 'The compiled language, internal/language, internal/language/compact, feature/plural and internal/number tables declare CLDRVersion 32. This is the matching CLDR 32 data license, not the unrelated CLDR tools licenses.',
	}],
	'github.com/bytedance/sonic@v1.15.0': [{
		name: 'sonic-v1.15.0-LICENSE-Drachennest', license: 'BSL-1.0', file: 'sonic-v1.15.0-LICENSE-Drachennest.txt',
		sha256: '8d8291caf1cee26d23acf3eb67c9f9a2d58f1c681b16a4fbe8cbfb9e3c0b5a9b',
		source: 'https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-Drachennest',
		note: 'The native/f32toa.c and native/f64toa.c sources retain Copyright 2020 Alexander Bolz and ByteDance modification notices; their generated internal/native float conversion runtime is compiled on supported SIMD targets. This is the full supplied Boost text, including the machine-executable object-code exception.',
}, {
		name: 'sonic-v1.15.0-LICENSE-eisel_lemire', license: 'BSL-1.0', file: 'sonic-v1.15.0-LICENSE-eisel_lemire.txt',
		sha256: 'cc3a949197f7f066770ae05ced2a2e1dfebb850f5a7587f085dd314bdbbce5c0',
		source: 'https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-eisel_lemire',
		note: 'The translated native/atof_eisel_lemire.h conversion retains Copyright (c) Daniel Lemire and ByteDance modifications. Preserve the supplied full Boost text.',
}, {
		name: 'sonic-v1.15.0-LICENSE-golang', license: 'BSD-3-Clause', file: 'sonic-v1.15.0-LICENSE-golang.txt',
		sha256: '4214d8afcc3620b7fb7aa9c7695e8f659a90011a830caf0e0c72a385d7d3b2a5',
		source: 'https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-golang',
		note: 'Sonic supplies this complete Go-derived-code notice alongside its Apache root license.',
}, {
		name: 'sonic-v1.15.0-LICENSE-golang-asm', license: 'BSD-3-Clause', file: 'sonic-v1.15.0-LICENSE-golang-asm.txt',
		sha256: '4214d8afcc3620b7fb7aa9c7695e8f659a90011a830caf0e0c72a385d7d3b2a5',
		source: 'https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-golang-asm',
		note: 'Sonic supplies this complete Go assembler-derived-code notice; golang-asm is also an independently compiled module, with additional Inferno file notices retained under its own entry.',
}, {
		name: 'sonic-v1.15.0-LICENSE-yyjson', license: 'MIT', file: 'sonic-v1.15.0-LICENSE-yyjson.txt',
		sha256: '45e384d3d52c73cba3a64d6e6c25d47cd738cd8a55c30629e3201046eda62947',
		source: 'https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-yyjson',
		note: 'Sonic supplies this complete yyjson attribution (Copyright (c) 2020 YaoYuan <ibireme@gmail.com>) for its native code. Retaining a supplied notice does not assert that the complete yyjson repository is linked.',
}, {
		name: 'sonic-v1.15.0-LICENSE-simdjson', license: 'Apache-2.0', file: 'sonic-v1.15.0-LICENSE-simdjson.txt',
		sha256: '1c351ddfc2b959867290106301ba287d0525071630896709f74b3c3a621b0586',
		source: 'https://github.com/bytedance/sonic/blob/afa2fcee563e04e912786ebd77b53760181fa622/licenses/LICENSE-simdjson',
		note: 'native/utf8.h retains Copyright 2018-2023 The simdjson authors and Copyright (C) 2019 Yaoyuan <ibireme@gmail.com>. Its generated SIMD validation runtime is compiled on supported targets; retain the full supplied Apache text.',
	}],
	'github.com/twitchyliquid64/golang-asm@v0.15.1': [{
		name: 'golang-asm-v0.15.1-inferno-1-MIT', license: 'MIT', file: 'golang-asm-v0.15.1-inferno-1-MIT.txt',
		sha256: '27d3a94ff600a1f100136f7743777284c8dccf707606ab07a2e20d032996cb15',
		source: 'https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/objabi/autotype.go',
		note: 'Verbatim legal comment (not implementation) from the fixed compiled file. This notice variant covers: objabi/autotype.go, objabi/head.go, objabi/reloctype.go, objabi/symkind.go, obj/data.go, obj/ld.go, obj/link.go, obj/pass.go, obj/sym.go, obj/arm/a.out.go, obj/arm/asm5.go, obj/arm/list5.go, obj/arm/obj5.go, obj/x86/a.out.go, obj/x86/asm6.go, obj/x86/list6.go, obj/x86/obj6.go. The module root BSD license does not replace these Inferno-derived MIT terms.',
}, {
		name: 'golang-asm-v0.15.1-inferno-2-MIT', license: 'MIT', file: 'golang-asm-v0.15.1-inferno-2-MIT.txt',
		sha256: 'bb1458854751422ecfac21563c365bf09d8e3a0838db75ba815c14395cbadb57',
		source: 'https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/obj/arm64/a.out.go',
		note: 'Verbatim legal comment (not implementation) from the fixed compiled file. This notice variant covers: obj/arm64/a.out.go, obj/arm64/asm7.go, obj/arm64/list7.go, obj/arm64/obj7.go. The module root BSD license does not replace these Inferno-derived MIT terms.',
}, {
		name: 'golang-asm-v0.15.1-inferno-3-MIT', license: 'MIT', file: 'golang-asm-v0.15.1-inferno-3-MIT.txt',
		sha256: '7c886985b97808b0ddcda7bcb747fb39b3026dd2d50cd4b3d557c37b629722d2',
		source: 'https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/obj/mips/a.out.go',
		note: 'Verbatim legal comment (not implementation) from the fixed compiled file. This notice variant covers: obj/mips/a.out.go, obj/mips/asm0.go, obj/mips/list0.go, obj/mips/obj0.go, obj/ppc64/a.out.go, obj/ppc64/asm9.go, obj/ppc64/list9.go, obj/ppc64/obj9.go, obj/s390x/a.out.go, obj/s390x/listz.go, obj/s390x/objz.go. The module root BSD license does not replace these Inferno-derived MIT terms.',
}, {
		name: 'golang-asm-v0.15.1-inferno-4-MIT', license: 'MIT', file: 'golang-asm-v0.15.1-inferno-4-MIT.txt',
		sha256: 'c00b4b59c25a4054fe88a51dd32fc1e4f223f93cf77855ecdb74ebad574b2215',
		source: 'https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/obj/riscv/cpu.go',
		note: 'Verbatim legal comment (not implementation) from the fixed compiled file. This notice variant covers: obj/riscv/cpu.go. The module root BSD license does not replace these Inferno-derived MIT terms.',
}, {
		name: 'golang-asm-v0.15.1-inferno-5-MIT', license: 'MIT', file: 'golang-asm-v0.15.1-inferno-5-MIT.txt',
		sha256: 'eeecad0dc7d079ac0151c13c7b3cba4f56732c33471f36969f9298ac2e81cbee',
		source: 'https://github.com/twitchyliquid64/golang-asm/blob/8d7f1f783b11f9a00f5bcdfcae17f5ac8f22512e/obj/s390x/asmz.go',
		note: 'Verbatim legal comment (not implementation) from the fixed compiled file. This notice variant covers: obj/s390x/asmz.go. The module root BSD license does not replace these Inferno-derived MIT terms.',
	}],
	'github.com/sirupsen/logrus@v1.9.3': [{
		name: 'logrus-v1.9.3-atexit-MIT', license: 'MIT', file: 'logrus-v1.9.3-atexit-MIT.txt',
		sha256: '017f4e6ccc2a628990502e0394691722427f258cd9264246e328c74fb82d7931',
		source: 'https://github.com/sirupsen/logrus/blob/d40e25cd45ed9c6b2b66e6b97573a0413e4c23bd/alt_exit.go',
		note: 'Verbatim legal comment for the compiled atexit adaptation, Copyright (c) 2012 Miki Tebeka <miki.tebeka@gmail.com>. It supplements the Logrus root MIT text; no separate atexit Go module is linked.',
	}],
	'gopkg.in/yaml.v3@v3.0.1': [{
		name: 'Apache-2.0-full', license: 'Apache-2.0', file: 'Apache-2.0-full.txt',
		sha256: '69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b',
		source: 'https://github.com/cloudwego/eino-ext/blob/0ebab92e14f26088411dbc440a1ebdc904ccd8a1/LICENSE-APACHE',
		note: 'yaml.v3 LICENSE divides the compiled libyaml-derived files (MIT, Kirill Simonov) from the remaining files (Apache-2.0, Canonical Ltd). Its release LICENSE/NOTICE contain the attribution and abbreviated Apache grant, so this unchanged complete Apache 2.0 text supplies the full terms. The source URL identifies the local full legal text, not a YAML implementation source.',
	}],

});

// Missing release texts may use only this exact reviewed root source and digest.
const reviewedLicenseSources = Object.freeze({
	'github.com/cloudwego/eino-ext/components/model/openai@v0.1.13': {
		license: 'Apache-2.0',
		file: 'eino-ext-openai-v0.1.13-LICENSE-APACHE.txt',
		sha256: '69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b',
		source: 'https://github.com/cloudwego/eino-ext/blob/0ebab92e14f26088411dbc440a1ebdc904ccd8a1/LICENSE-APACHE',
		note: 'The versioned components/model/openai module omits the repository root license. The exact tag commit and its source headers identify Apache-2.0, Copyright 2024/2025 CloudWeGo Authors. This is the complete unchanged repository-root original.',
	},
});

const reviewedSupplementalSources = new Map(Object.values(reviewedSupplementalNotices).flat().map(entry => [entry.source, { license: entry.license, sha256: entry.sha256 }]));

export function goPackageNotice(pkg, { sourcesDirectory = path.join(root, 'docs/third-party/licenses/go'), overrides = {}, supplemental = reviewedSupplementalNotices } = {}) {
	const id = `${pkg.name}@${pkg.version}`;
	if (Object.hasOwn(overrides, id)) assert.deepEqual(overrides[id], reviewedLicenseSources[id], `Unreviewed root license source: ${id}`);
	const base = packageNotice(pkg, { sourcesDirectory, overrides });
	const selected = [...base.selected], texts = [base.text], sources = base.source ? [base.source] : [];
	for (const entry of supplemental[`${pkg.name}@${pkg.version}`] ?? []) {
		// Legacy Unicode and Boost are reviewed here only for the exact pinned supplemental sources.
		const terms = ['Unicode-DFS-2016', 'BSL-1.0'].includes(entry.license) ? [entry.license] : selectedLicenses(entry.license);
		assert.ok(['MIT', 'BSD-3-Clause', 'Apache-2.0', 'Unicode-DFS-2016', 'BSL-1.0'].includes(entry.license), `Review supplemental license: ${entry.license}`);
		const file = path.resolve(sourcesDirectory, entry.file), relative = path.relative(sourcesDirectory, file);
		assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), `Supplemental license escapes its directory: ${entry.file}`);
		assert.match(entry.source, /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[a-f0-9]{40}\//, 'Supplemental license must pin a commit');
		const reviewedSource = reviewedSupplementalSources.get(entry.source);
		assert.ok(reviewedSource, `Unreviewed supplemental source: ${entry.source}`);
		assert.equal(entry.license, reviewedSource.license, `Supplemental source license mismatch: ${entry.source}`);
		assert.equal(entry.sha256, reviewedSource.sha256, `Supplemental source checksum mismatch: ${entry.source}`);
		const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
		assert.equal(sha256(text), entry.sha256, `Supplemental license checksum mismatch: ${entry.file}`);
		assert.ok(text.trim(), `Empty supplemental license: ${entry.file}`);
		// Some upstream legal originals are verbatim source comment blocks.
		const body = text.replace(/^\s*\/\/ ?/gm, '').replace(/\s+/g, ' ');
		if (entry.license === 'MIT') assert.match(body, /Permission is hereby granted, free of charge[\s\S]*above copyright notice[\s\S]*included in all[\s\S]*THE SOFTWARE IS PROVIDED "AS IS"/);
		else if (entry.license === 'Unicode-DFS-2016') assert.match(body, /UNICODE, INC\. LICENSE AGREEMENT - DATA FILES AND SOFTWARE[\s\S]*Permission is hereby granted,[\s\S]*without restriction/);
		else if (entry.license === 'Apache-2.0') assert.match(body, /Apache License[\s\S]*Version 2\.0[\s\S]*TERMS AND CONDITIONS[\s\S]*END OF TERMS AND CONDITIONS/);
		else if (entry.license === 'BSL-1.0') assert.match(body, /Boost Software License - Version 1\.0[\s\S]*Permission is hereby granted,[\s\S]*machine-executable object code[\s\S]*THE SOFTWARE IS PROVIDED/);
		else assert.match(body, /Redistribution and use in source and binary forms[\s\S]*Neither the name[\s\S]*CONSEQUENTIAL DAMAGES/);
		selected.push(...terms); texts.push(text.trim());
		sources.push(`${entry.name}: ${entry.source}\n\n${entry.note ?? ''}`.trim());
	}
	return { selected: [...new Set(selected)], source: sources.join('\n\n'), text: texts.join('\n\n') };
}

/** go list emits a stream of JSON objects, not a JSON array or one object per line. */
export function parseGoJSON(text) {
	const objects = [];
	let start = -1, depth = 0, quoted = false, escaped = false;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; continue; }
		if (char === '"') { assert.ok(depth > 0, 'Invalid Go JSON stream root'); quoted = true; }
		else if (char === '{') { if (!depth) start = i; depth++; }
		else if (char === '}') { assert.ok(depth > 0, 'Invalid Go JSON stream'); if (--depth === 0) { objects.push(JSON.parse(text.slice(start, i + 1))); start = -1; } }
		else if (!depth) assert.ok(/\s/.test(char), 'Unexpected data in Go JSON stream');
	}
	assert.ok(!quoted && depth === 0, 'Truncated Go JSON stream');
	return objects;
}

export function runtimeModules(packages, sums, reviewed = reviewedLicenses) {
	const modules = new Map();
	for (const pkg of packages) {
		assert.ok(!pkg.Error && !pkg.DepsErrors?.length && !pkg.Incomplete, `Incomplete Go dependency: ${pkg.ImportPath}`);
		if (pkg.Standard || pkg.Module?.Main) continue;
		assert.ok(pkg.Module, `Missing module metadata: ${pkg.ImportPath}`);
		const mod = pkg.Module, id = `${mod.Path}@${mod.Version}`;
		assert.ok(!mod.Replace, `Unreviewed Go replacement: ${id}`);
		assert.ok(mod.Version && mod.Dir && mod.Sum, `Missing locked module metadata: ${id}`);
		assert.ok(sums.has(`${mod.Path} ${mod.Version} ${mod.Sum}`), `go.sum mismatch: ${id}`);
		assert.ok([...sums].some(line => line.startsWith(`${mod.Path} ${mod.Version}/go.mod h1:`)), `Missing go.mod checksum: ${id}`);
		const license = reviewed[id];
		assert.ok(license, `Unreviewed runtime Go license: ${id}`);
		// The upstream Darwin adapter has a separate Apache header. Our Darwin
		// adapter does not import it; a future change must review that file's terms.
		if (id === 'github.com/zalando/go-keyring@v0.2.8') {
			assert.ok(!pkg.GoFiles?.includes('keyring_darwin.go'), `Unreviewed compiled Go license scope: ${id}/keyring_darwin.go`);
		}
		selectedLicenses(license);
		const existing = modules.get(id);
		if (existing) assert.equal(existing.dir, mod.Dir, `Ambiguous Go module: ${id}`);
		else modules.set(id, { name: mod.Path, version: mod.Version, license, dir: mod.Dir });
	}
	return [...modules.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function goPackages() {
	const packages = [];
	execFileSync('go', ['mod', 'verify'], { cwd: moduleDirectory, env: goEnvironment(targets[0]), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
	const sums = new Set(readFileSync(path.join(moduleDirectory, 'go.sum'), 'utf8').trim().split(/\r?\n/));
	for (const target of targets) {
		const env = goEnvironment(target);
		assert.equal(execFileSync('go', ['env', 'GOVERSION'], { env, encoding: 'utf8' }).trim(), toolchain);
		const output = execFileSync('go', ['list', '-mod=readonly', '-deps', '-json', './cmd/huhubot'], { cwd: moduleDirectory, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
		const listed = parseGoJSON(output);
		assert.ok(listed.some(pkg => pkg.Name === 'main' && pkg.Module?.Main), `Runner compilation closure missing: ${target.id}`);
		packages.push(...listed);
	}
	const modules = runtimeModules(packages, sums);
	const goroot = execFileSync('go', ['env', 'GOROOT'], { env: goEnvironment(targets[0]), encoding: 'utf8' }).trim();
	// The runtime and standard library are linked into every Go executable too.
	return [{ name: 'Go runtime and standard library', version: toolchain, license: 'BSD-3-Clause', dir: goroot }, ...modules];
}

export function goNoticeSection(packages = goPackages()) {
	const sourcesDirectory = path.join(root, 'docs/third-party/licenses/go');
	const sourceManifest = path.join(sourcesDirectory, 'sources.json');
	const overrides = existsSync(sourceManifest) ? JSON.parse(readFileSync(sourceManifest, 'utf8')) : {};
	const lines = ['## Linked into huhu-bot', '', '由固定 Go 工具链及五个拟发行目标的 `go list -mod=readonly -deps -json ./cmd/huhubot` 非测试编译闭包生成；只包含实际链接的模块和 Go 运行时。交叉编译目标清单不代表目标平台已通过真实操作验收。', ''];
	for (const pkg of packages) {
		const notice = goPackageNotice(pkg, { sourcesDirectory, overrides });
		lines.push(`### ${pkg.name} ${pkg.version}`, '', `License: ${pkg.license}`, '', `Selected terms: ${notice.selected.join(' AND ')}`, '');
		if (notice.source) lines.push(notice.source, '');
		lines.push(`\`\`\`text\n${notice.text}\n\`\`\``, '');
	}
	return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	const packages = goPackages();
	goNoticeSection(packages); // Missing, restrictive or incomplete full texts fail here.
	console.log(`huhu-bot notices verified: ${packages.length} runtime/third-party modules, ${targets.length} compilation targets`);
}
