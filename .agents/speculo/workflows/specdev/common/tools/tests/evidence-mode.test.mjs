/** Conclusion-report evidence mode: explicit opt-in, checked verdicts, unchanged default. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readEvidenceMode, validateConclusionReport, validateCancellationReason, designConformanceOk } from '../evidence-mode.mjs';
import { resolveExecutionWorkspace } from '../execution-context.mjs';

function change(t, readme) {
  const root = mkdtempSync(join(tmpdir(), 'specdev-evidence-mode-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  writeFileSync(join(root, 'README.md'), readme);
  return root;
}
const GOOD = `# Evidence: T-01

## 结论
Result: passed。全部验收成立。

## 修改范围
- src/a.ts

## 验收与合同映射
| AC | 证据 |
| AC-101 | 单测 |

## 验证
- \`pnpm test\`：退出码 0
`;

test('undeclared README keeps the default evidence contract', t => {
  const result = readEvidenceMode(change(t, '# x\n\nOutcome: completed\n'));
  assert.equal(result.mode, null);
  assert.deepEqual(result.errors, []);
});

test('declared mode needs a basis, rejects unknown modes and orphan lines', t => {
  assert.equal(readEvidenceMode(change(t, 'Evidence-Mode: conclusion-report\nEvidence-Basis: AGENTS.md evidence 入库规则; LOG-026\n')).mode, 'conclusion-report');
  assert.match(readEvidenceMode(change(t, 'Evidence-Mode: conclusion-report\n')).errors.join(), /Evidence-Basis/);
  assert.match(readEvidenceMode(change(t, 'Evidence-Mode: whatever\nEvidence-Basis: some long basis\n')).errors.join(), /unsupported/);
  assert.match(readEvidenceMode(change(t, 'History-Rewrite: history was rewritten\n')).errors.join(), /require Evidence-Mode/);
  assert.equal(readEvidenceMode(change(t, '```\nEvidence-Mode: conclusion-report\n```\n')).mode, null, 'fenced text is not a declaration');
});

test('compliant conclusion report passes', () => {
  assert.deepEqual(validateConclusionReport('evidence/T-01.md', GOOD, {contractIds: ['AC-101']}), []);
});

test('missing conclusion, non-passed result, missing AC and missing verification fail', () => {
  assert.match(validateConclusionReport('e', GOOD.replace('## 结论', '## 摘要')).join(), /结论/);
  assert.match(validateConclusionReport('e', GOOD.replace('Result: passed', 'Result: partial')).join(), /Result: passed/);
  assert.match(validateConclusionReport('e', GOOD, {contractIds: ['AC-102']}).join(), /AC-102/);
  assert.match(validateConclusionReport('e', GOOD.replace('## 验证', '## 备注')).join(), /验证/);
  assert.match(validateConclusionReport('e', GOOD.replace('`pnpm test`：退出码 0', '看过了')).join(), /commands/);
  assert.match(validateConclusionReport('e', `${GOOD}\ninput_sha256: nothex\n`).join(), /input_sha256/);
  assert.deepEqual(validateConclusionReport('e', `${GOOD}\ninput_sha256: ${'a'.repeat(64)}\n`), []);
});

test('cancelled Tickets need a stated reason', () => {
  assert.equal(validateCancellationReason('2026-10-31 用户答复后，因无法复现而取消该票的调查工作。'), true);
  assert.equal(validateCancellationReason('status: cancelled'), false);
});

test('Design Conformance accepts bound IDs or an explained not-applicable', () => {
  const ref = {digest: 'd'.repeat(64), pages: ['P1'], acceptance: ['A1']};
  assert.equal(designConformanceOk('## Design Conformance\n不适用：本票仅删除模块，没有界面改动', ref), true);
  assert.equal(designConformanceOk(`## Design Conformance\n${ref.digest} P1 A1`, ref), true);
  assert.equal(designConformanceOk('## Design Conformance\n不适用', ref), false);
  assert.equal(designConformanceOk('无此段', ref), false);
});

test('unreachable base_sha is an error unless History-Rewrite is declared, then a visible warning', t => {
  const repo = mkdtempSync(join(tmpdir(), 'specdev-evidence-git-'));
  t.after(() => rmSync(repo, {recursive: true, force: true}));
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], {encoding: 'utf8'}).trim();
  git('init', '-q', '-b', 'dev'); writeFileSync(join(repo, 'f'), 'x'); git('add', '.');
  git('-c', 'user.email=a@b', '-c', 'user.name=x', 'commit', '-qm', 'init');
  const context = {workspace_policy: 'current', workspace_ref: 'current', branch: 'dev', base_sha: '1'.repeat(40)};
  assert.throws(() => resolveExecutionWorkspace(repo, context));
  const warnings = [];
  assert.ok(resolveExecutionWorkspace(repo, context, {historyRewrite: 'history rewritten on purpose', warn: message => warnings.push(message)}));
  assert.match(warnings.join(), /not a Git object/);
  const reachable = {...context, base_sha: git('rev-parse', 'HEAD')};
  assert.ok(resolveExecutionWorkspace(repo, reachable));
});
