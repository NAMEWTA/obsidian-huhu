import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, test } from 'vitest';

interface Step {
	uses?: string;
	run?: string;
	if?: string;
	'continue-on-error'?: boolean;
	with?: Record<string, unknown>;
}
interface Job {
	uses?: string;
	'runs-on'?: string;
	needs?: string[];
	if?: string;
	'continue-on-error'?: boolean;
	env?: Record<string, string>;
	strategy?: unknown;
	steps?: Step[];
}
const workflow = (name: string) =>
	parse(readFileSync(`.github/workflows/${name}.yml`, 'utf8')) as {
		on: Record<string, unknown>;
		jobs: Record<string, Job>;
	};

test('tag releases require successful checks and all helpers from the calling commit', () => {
	const release = workflow('release'),
		checks = workflow('lint'),
		terminal = workflow('terminal-build');
	expect(checks.on).toHaveProperty('workflow_call');
	expect(release.jobs.checks?.uses).toBe('./.github/workflows/lint.yml');
	expect(release.jobs.terminal?.uses).toBe('./.github/workflows/terminal-build.yml');
	expect(release.jobs.release?.needs).toEqual(['checks', 'terminal']);
	expect(release.jobs.release?.if).toBe(
		"${{ needs.checks.result == 'success' && needs.terminal.result == 'success' }}",
	);
	for (const file of [release, checks, terminal])
		for (const job of Object.values(file.jobs)) {
			expect(job['continue-on-error']).not.toBe(true);
			for (const step of job.steps ?? []) {
				expect(step['continue-on-error']).not.toBe(true);
				if (step.uses?.startsWith('actions/checkout@')) expect(step.with?.ref).toBe('${{ github.sha }}');
			}
		}
});

test('daily CI runs once and keeps the checks needed to publish matching source and assets', () => {
	const checks = workflow('lint'),
		build = checks.jobs.build!;
	expect(checks.on.push).toEqual({ branches: ['main'] });
	expect(checks.on).toHaveProperty('pull_request');
	expect(checks.on).toHaveProperty('workflow_dispatch');
	expect(build['runs-on']).toBe('ubuntu-latest');
	expect(build.strategy).toBeUndefined();
	expect(build.if).toBeUndefined();
	const commands = (build.steps ?? []).flatMap((step) => (step.run ? [step.run] : []));
	for (const required of [
		'pnpm install --frozen-lockfile',
		'pnpm run build',
		'pnpm run check:bundle',
		'git diff --exit-code -- main.js styles.css',
		'pnpm run lint',
		'pnpm run lint:css',
		'pnpm run test:all',
		'pnpm run check:notices',
		'pnpm run check:native',
	]) {
		expect(commands.filter((command) => command === required)).toHaveLength(1);
		expect(build.steps?.find((step) => step.run === required)?.if).toBeUndefined();
	}
	expect(workflow('terminal-build').on).not.toHaveProperty('push');
});
