import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, test } from 'vitest';
import { cliAssetName } from '../../src/host/desktop/native/binary-cli';
import { terminalAssets } from '../../scripts/verify-release-artifacts.mjs';

interface Step { name?: string; run?: string }
const workflow = parse(readFileSync('.github/workflows/terminal-build.yml', 'utf8')) as { jobs: { build: { strategy: { matrix: { include: { target: string; asset: string; ext: string }[] } }; steps: Step[] } } };

test('the five-platform build verifies and packages the CLI beside the helper from the same build', () => {
	const { steps, strategy } = workflow.jobs.build;
	const verify = steps.find(step => step.run?.includes('verify-pty-helper.mjs'))!;
	expect(verify.run).toMatch(/release\/huhu-pty\$\{\{ matrix\.ext \}\} native\/pty-server\/target\/\$\{\{ matrix\.target \}\}\/release\/huhu\$\{\{ matrix\.ext \}\}$/);
	const packaging = steps.find(step => step.run?.includes('compat.json'))!.run!;
	expect(packaging).toContain("'huhu-pty-${{ matrix.asset }}${{ matrix.ext }}'");
	expect(packaging).toContain("'huhu-${{ matrix.asset }}${{ matrix.ext }}'");
	expect(packaging).toContain("'--json', 'version'");
	for (const key of ['schema', 'asset', 'cliProtocol', 'helperProtocol', 'sha256']) expect(packaging).toContain(`'${key}'`);
	expect(strategy.matrix.include).toHaveLength(5);
});

test('every matrix asset name equals the name the plugin downloads and the release verifier expects', () => {
	const matrix = workflow.jobs.build.strategy.matrix.include;
	const names = matrix.map(entry => `huhu-${entry.asset}${entry.ext}`).sort();
	const expected = terminalAssets.map(name => name.replace('huhu-pty-', 'huhu-')).sort();
	expect(names).toEqual(expected);
	expect(matrix.map(entry => {
		const [os, cpu] = entry.asset.split('-') as [string, string];
		return cliAssetName(os, cpu);
	}).sort()).toEqual(expected);
});
