// Build-time minifier for the generated Node scripts that HUHU writes to disk (hook publisher,
// spool guard, command-hook script). A template literal preceded by the marker comment
// `/* @minify-script */` is cooked, each `${expr}` is replaced by an identifier slot, the script is
// minified with esbuild's own JS transform, and the slots are put back. Slots survive the transform
// as unbound identifiers; a missing or duplicated slot fails the build instead of shipping a broken script.
import { transformSync } from 'esbuild';

const MARKER = '/* @minify-script */';

function scan(source, start) {
	// `start` is the index of the opening backtick. Returns static raw segments and `${...}` expressions.
	const raws = [''];
	const exprs = [];
	let i = start + 1;
	for (;;) {
		const c = source[i];
		if (c === undefined) throw new Error('unterminated template literal');
		if (c === '\\') { raws[raws.length - 1] += c + source[i + 1]; i += 2; continue; }
		if (c === '`') return { raws, exprs, end: i + 1 };
		if (c === '$' && source[i + 1] === '{') {
			let depth = 1;
			let j = i + 2;
			for (; j < source.length && depth > 0; j++) {
				if (source[j] === '`') throw new Error('nested template literals are not supported in minified scripts');
				if (source[j] === '{') depth++;
				else if (source[j] === '}') depth--;
			}
			exprs.push(source.slice(i + 2, j - 1));
			raws.push('');
			i = j;
			continue;
		}
		raws[raws.length - 1] += c;
		i++;
	}
}

const cook = (raw) => new Function(`return \`${raw}\`;`)();
const escapeTemplate = (text) => text.replace(/[\\`]/g, '\\$&').replaceAll('${', '\\${');

export function minifyScriptText(text, label) {
	const result = transformSync(text, { loader: 'js', minify: true, target: 'es2021', legalComments: 'inline', charset: 'utf8' });
	void label;
	return result.code.replace(/\n$/, '');
}

export function minifyHookScripts(source, file = '<source>') {
	// Windows checkouts deliver CRLF. Template literals cook CRLF to LF anyway, and the statement-slot
	// detection below is line-based: without this, a slot alone on its line was taken for an expression
	// and esbuild merged it into a comma expression, shipping a syntax error on Windows only.
	source = source.replace(/\r\n?/g, '\n');
	let out = '';
	let cursor = 0;
	for (let at = source.indexOf(MARKER); at >= 0; at = source.indexOf(MARKER, cursor)) {
		const tick = source.indexOf('`', at);
		if (tick < 0 || source.slice(at + MARKER.length, tick).trim() !== '') throw new Error(`${file}: ${MARKER} must directly precede a template literal`);
		const { raws, exprs, end } = scan(source, tick);
		// A `${expr}` alone on its line stands for statements: a function declaration keeps its place
		// (an expression-statement slot would be merged into a comma expression with its neighbours).
		const statement = exprs.map((_, index) => /(^|\n)[ \t]*$/.test(raws[index]) && /^[ \t]*(\n|$)/.test(raws[index + 1]));
		const marker = (index) => (statement[index] ? `function __HUHU_SLOT_${index}__(){}` : `__HUHU_SLOT_${index}__`);
		let script = cook(raws[0]);
		exprs.forEach((_, index) => { script += marker(index) + cook(raws[index + 1]); });
		let min = minifyScriptText(script, file);
		let rebuilt = '';
		let rest = min;
		for (let index = 0; index < exprs.length; index++) {
			const parts = rest.split(marker(index));
			if (parts.length !== 2) throw new Error(`${file}: slot ${index} (${exprs[index]}) appears ${parts.length - 1} times after minification`);
			rebuilt += escapeTemplate(parts[0]) + '${' + exprs[index] + '}' + (statement[index] ? ';' : '');
			rest = parts[1];
		}
		rebuilt += escapeTemplate(rest);
		out += source.slice(cursor, at) + '`' + rebuilt + '`';
		cursor = end;
	}
	return out + source.slice(cursor);
}

const HOOKS = /[\\/]src[\\/]modules[\\/]agent[\\/]platform[\\/]desktop[\\/]hooks[\\/][^\\/]+\.ts$/;

/** esbuild plugin; the same transform backs the vitest plugin so tests can exercise the shipped bytes. */
export const hookScriptMinify = {
	name: 'huhu-hook-script-minify',
	setup(build) {
		build.onLoad({ filter: HOOKS }, async (args) => {
			const { readFileSync } = await import('node:fs');
			const source = readFileSync(args.path, 'utf8');
			if (!source.includes(MARKER)) return null;
			return { contents: minifyHookScripts(source, args.path), loader: 'ts' };
		});
	},
};
