import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const allowed = ['MIT', 'MIT-0', '0BSD', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Apache-2.0', 'Unicode-3.0', 'OFL-1.1', 'Unlicense', 'CC0-1.0', 'Zlib'];

/** Resolve SPDX AND/OR expressions; reject unknown/restricted branches rather than guessing. */
export function selectedLicenses(expression) {
	const normalized = expression.replaceAll('/', ' OR ');
	if (/[^A-Za-z0-9.+()\s-]/.test(normalized)) throw new Error(`Unsupported license expression: ${expression}`);
	const tokens = normalized.match(/[()]|[A-Za-z0-9.+-]+/g) ?? [];
	let cursor = 0;
	const rank = licenses => licenses.reduce((sum, id) => sum + allowed.indexOf(id) + 1, 0);
	function atom() {
		if (tokens[cursor] === '(') {
			cursor += 1;
			const value = or();
			if (tokens[cursor++] !== ')') throw new Error(`Unbalanced license expression: ${expression}`);
			return value;
		}
		const id = tokens[cursor++];
		if (!id || ['AND', 'OR', ')'].includes(id)) throw new Error(`Invalid license expression: ${expression}`);
		return allowed.includes(id) ? [id] : null;
	}
	function and() {
		let value = atom();
		while (tokens[cursor] === 'AND') {
			cursor += 1;
			const right = atom();
			value = value && right ? [...new Set([...value, ...right])] : null;
		}
		return value;
	}
	function or() {
		let value = and();
		while (tokens[cursor] === 'OR') {
			cursor += 1;
			const right = and();
			if (!value || (right && rank(right) < rank(value))) value = right;
		}
		return value;
	}
	const selected = or();
	if (cursor !== tokens.length || !selected) throw new Error(`Review license expression: ${expression}`);
	return selected;
}

const licenseFile = /^(licen[cs]e|copying|notice)([-._].*)?$/i;
const normalize = text => text.replace(/\r\n/g, '\n').trim();
const digest = text => createHash('sha256').update(text).digest('hex');

/** Read local release texts, or a version-pinned, hash-checked upstream copy. Never fetch during builds. */
export function packageNotice(pkg, { sourcesDirectory, overrides = {}, familyDirectory } = {}) {
	const selected = selectedLicenses(pkg.license);
	const files = fs.readdirSync(pkg.dir).filter(name => licenseFile.test(name) && fs.statSync(path.join(pkg.dir, name)).isFile()).sort();
	let source = '';
	let texts = files.map(name => ({ name, text: normalize(fs.readFileSync(path.join(pkg.dir, name), 'utf8')) }));
	if (!texts.length && familyDirectory && pkg.name.startsWith('@xterm/')) {
		texts = fs.readdirSync(familyDirectory).filter(name => licenseFile.test(name)).sort().map(name => ({ name, text: normalize(fs.readFileSync(path.join(familyDirectory, name), 'utf8')) }));
		source = 'The addon uses the xterm.js project license supplied with @xterm/xterm.';
	}
	if (!texts.length) {
		const entry = overrides[`${pkg.name}@${pkg.version}`];
		if (!entry || selected.length !== 1 || entry.license !== selected[0]) throw new Error(`Missing full license text: ${pkg.name}@${pkg.version} (${pkg.license})`);
		const file = path.resolve(sourcesDirectory, entry.file);
		const relative = path.relative(sourcesDirectory, file);
		if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`License source escapes its directory: ${entry.file}`);
		const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
		if (digest(raw) !== entry.sha256) throw new Error(`License source checksum mismatch: ${entry.file}`);
		if (!/https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[a-f0-9]{40}\//.test(entry.source)) throw new Error(`License source must pin a commit: ${pkg.name}`);
		texts = [{ name: entry.file, text: normalize(raw) }];
		source = `Original text: ${entry.source}${entry.note ? `\n\n${entry.note}` : ''}`;
	}
	// Include every supplied LICENSE/COPYING/NOTICE. In particular, AND clauses
	// must never be lost because the first MIT filename matched an OR choice.
	const markers = {
		MIT: /Permission is hereby granted, free of charge/i,
		'MIT-0': /Permission is hereby granted, free of charge/i,
		'0BSD': /Permission to use, copy, modify, and\/or distribute/i,
		'BSD-2-Clause': /Redistribution and use in source and binary forms/i,
		'BSD-3-Clause': /Redistribution and use in source and binary forms/i,
		ISC: /Permission to use, copy, modify, and\/or distribute/i,
		'Apache-2.0': /Apache License.{0,40}Version 2\.0/i,
		'Unicode-3.0': /UNICODE LICENSE|Unicode, Inc\./i,
		'OFL-1.1': /SIL OPEN FONT LICENSE|SIL Open Font License, Version 1\.1/i,
		Unlicense: /free and unencumbered software released into the public domain/i,
		'CC0-1.0': /CC0 1\.0 Universal/i,
		Zlib: /Permission is granted to anyone to use this software for any purpose/i,
	};
	const combined = texts.map(item => item.text).join(' ').replace(/\s+/g, ' ');
	for (const id of selected) {
		if (!markers[id].test(combined)) throw new Error(`Missing required ${id} notice: ${pkg.name}@${pkg.version}`);
	}
	for (const item of texts) if (!item.text) throw new Error(`Empty license text: ${pkg.name}/${item.name}`);
	return { selected, source, text: texts.map(item => item.text).join('\n\n') };
}
