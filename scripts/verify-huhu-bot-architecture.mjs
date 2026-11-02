import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePrefix = 'github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/';

// Keep strings intact while removing comments, including examples containing fake imports.
export function goImports(source) {
	const clean = source.replace(/"(?:\\.|[^"\\])*"|`[^`]*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, token => token.startsWith('//') || token.startsWith('/*') ? ' ' : token);
	const imports = [];
	for (const match of clean.matchAll(/\bimport\s+(?:\(([\s\S]*?)\)|((?:[\w.]+\s+)?(?:"(?:\\.|[^"\\])*"|`[^`]*`)))/g)) {
		for (const entry of (match[1] ?? match[2]).matchAll(/"([^"\n]+)"|`([^`]+)`/g)) imports.push(entry[1] ?? entry[2]);
	}
	return imports;
}

export function architectureViolations(directory) {
	const violations = [];
	let inspected = 0;
	const visit = dir => {
		for (const item of readdirSync(dir, { withFileTypes: true })) {
			if (item.name === 'dist') continue;
			const file = path.join(dir, item.name);
			if (item.isDirectory()) visit(file);
			else if (item.name.endsWith('.go') && !item.name.endsWith('_test.go')) {
				const relative = path.relative(directory, file).split(path.sep).join('/');
				const inner = /^(domain|application)\//.test(relative);
				const inbound = /^adapters\/inbound\//.test(relative);
				if (!inner && !inbound) continue;
				inspected += 1;
				for (const imported of goImports(readFileSync(file, 'utf8'))) {
					const internal = imported.startsWith(modulePrefix) ? imported.slice(modulePrefix.length) : null;
					const sql = /^(database\/sql(?:\/|$)|github\.com\/(?:ncruces|mattn|jackc|jmoiron)\/|modernc\.org\/sqlite)/.test(imported);
					const external = imported.split('/')[0].includes('.');
					const forbidden = inner
						? sql || (internal !== null ? !/^(domain|application)(\/|$)/.test(internal) : external) || /(?:^|\/)(?:obsidian|hap)(?:\/|$)/i.test(imported)
						: sql || (internal !== null && /^adapters\/outbound(?:\/|$)/.test(internal));
					if (forbidden) violations.push(`${relative}: forbidden import ${imported}`);
				}
			}
		}
	};
	visit(directory);
	if (!inspected) violations.push('No production Domain/Application/inbound Go sources were inspected');
	return { inspected, violations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	const result = architectureViolations(path.resolve('native/huhubot/internal'));
	if (result.violations.length) { console.error(result.violations.join('\n')); process.exitCode = 1; }
	else console.log(`huhu-bot architecture: ${result.inspected} production files checked`);
}
