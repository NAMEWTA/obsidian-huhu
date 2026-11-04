import { runInNewContext, Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { minifyHookScripts } from '../../../../../../scripts/hook-script-minify.mjs';
import { HOOK_SCRIPT } from './automation-hooks';
import { HOOK_PUBLISHER_SCRIPT } from './hook-spool';
import { SPOOL_GUARD } from './spool-guard';

// Built by concatenation so the build/vitest transform does not treat this file's own text as a script.
const MARK = '/* @minify' + '-script */';
const BACKTICK = String.fromCharCode(96);
const template = (body: string) => `export const T = ${MARK} ${BACKTICK}${body}${BACKTICK};`;
/** The string value of the exported template, with `${LIMIT}` bound to 7. */
const value = (source: string) => runInNewContext(`var LIMIT = 7; ${source.replace('export const T =', 'var T =')}; T`) as string;
const outcome = (script: string) => runInNewContext(`${script}; out`) as unknown[];

describe('hook script build-time minification', () => {
	it('ships parseable, compact scripts that keep every composed part', () => {
		for (const script of [HOOK_SCRIPT, HOOK_PUBLISHER_SCRIPT, SPOOL_GUARD]) expect(script.length).toBeGreaterThan(500);
		expect(HOOK_PUBLISHER_SCRIPT).not.toContain('\n ');
		expect(() => new Script(HOOK_SCRIPT, { filename: 'hook.cjs' })).not.toThrow();
		for (const name of ['hookGuard', 'hookPath', 'hookPublish', 'hookIngress', 'eventData']) expect(HOOK_SCRIPT).toContain(`function ${name}(`);
	});

	it('keeps strings, escapes, regexes, Windows paths and interpolations semantically identical', () => {
		const body = [
			String.raw`const win = 'C:\\\\Users\\\\a b\\\\x.cjs', quoted = "say \\"hi\\" \${not}";`,
			String.raw`const re = /^(?:[0-9]|[12][0-9])$/.test(win) || /\\\\/.test(win);`,
			'${LIMIT}',
			'let n = ${LIMIT} + 1',
			'var out = [win, quoted, re, n]',
			'',
		].join('\n');
		const original = template(body);
		const minified = minifyHookScripts(original, 'sample');
		expect(minified.length).toBeLessThan(original.length);
		const result = outcome(value(minified));
		expect(result).toEqual(outcome(value(original)));
		expect(result[0]).toBe('C:\\Users\\a b\\x.cjs');
		expect(result[1]).toBe('say "hi" ${not}');
		expect(result[3]).toBe(8);
	});

	it('treats CRLF sources (Windows checkouts) exactly like LF, keeping statement slots as statements', () => {
		// Shape of HOOK_SCRIPT: an expression statement followed by two statement slots on their own lines.
		const parts = 'var P1 = "function one(){return 1}", P2 = "function two(){return 2}";';
		const lf = parts + template('let a = 0;\nglobalThis.x && (a = 9);\n${P1}\n${P2}\nconst out = [a, one(), two()];').replace('export const T =', ' export const T =');
		const crlf = lf.replace(/\n/g, '\r\n');
		const fromLf = minifyHookScripts(lf, 'sample');
		const fromCrlf = minifyHookScripts(crlf, 'sample');
		expect(fromCrlf).toBe(fromLf);
		const script = runInNewContext(`${fromCrlf.replace(' export const T =', ' var T =')}; T`) as string;
		expect(outcome(script)).toEqual([0, 1, 2]);
	});

	it('rejects a marker that does not precede a template literal', () => {
		expect(() => minifyHookScripts(`${MARK} const x = 1;`, 'sample')).toThrow(/directly precede/);
	});
});
