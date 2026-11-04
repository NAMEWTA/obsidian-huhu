/** Explicit, auditable evidence mode. Undeclared changes keep the full process-evidence contract. */
import { readFileSync } from 'node:fs';
import * as runtime from '../../../../lib/speculo-runtime.mjs';

export const CONCLUSION_REPORT = 'conclusion-report';
const MODES = new Set([CONCLUSION_REPORT]);

/**
 * Reads `Evidence-Mode:`, `Evidence-Basis:` and `History-Rewrite:` lines from the change README body
 * (fenced code is ignored). Returns {mode:null} when the change did not opt in.
 */
export function readEvidenceMode(change) {
  const result = {mode: null, basis: null, historyRewrite: null, errors: []};
  let source, path;
  try {
    path = runtime.safeWorkPathSync(change, 'README.md', {mustExist: true, type: 'file'});
    source = readFileSync(path, 'utf8');
  } catch { return result; }
  const lines = runtime.markdownBodyLines(source, path).map(line => line.text);
  const read = key => lines.flatMap(line => new RegExp(`^${key}:\\s*(.*?)\\s*$`).exec(line)?.slice(1) ?? []);
  const modes = read('Evidence-Mode'), bases = read('Evidence-Basis'), rewrites = read('History-Rewrite');
  if (modes.length > 1) result.errors.push('README: duplicate Evidence-Mode declaration');
  if (rewrites.length > 1) result.errors.push('README: duplicate History-Rewrite declaration');
  if (!modes.length) {
    if (bases.length || rewrites.length) result.errors.push('README: Evidence-Basis/History-Rewrite require Evidence-Mode');
    return result;
  }
  if (!MODES.has(modes[0])) { result.errors.push(`README: unsupported Evidence-Mode '${modes[0]}'`); return result; }
  result.mode = modes[0];
  if (bases.length !== 1 || bases[0].length < 8) result.errors.push('README: Evidence-Mode requires exactly one Evidence-Basis line naming the governing rule (for example AGENTS.md evidence rule and LOG entry)');
  else result.basis = bases[0];
  if (rewrites.length && rewrites[0].length < 8) result.errors.push('README: History-Rewrite needs a concrete explanation');
  else result.historyRewrite = rewrites[0] ?? null;
  return result;
}

const DIGEST = /^[a-f0-9]{64}$/i;
const section = (text, heading) => {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const start = lines.findIndex(line => line.trim().replace(/^#{1,6}\s+/, '') === heading && /^#{1,6}\s/.test(line.trim()));
  if (start < 0) return null;
  const level = /^(#+)/.exec(lines[start].trim())[1].length;
  const end = lines.findIndex((line, index) => index > start && /^#{1,6}\s/.test(line) && /^(#+)/.exec(line)[1].length <= level);
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
};
const headingBody = (text, pattern) => {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const start = lines.findIndex(line => /^#{1,6}\s/.test(line) && pattern.test(line.replace(/^#{1,6}\s+/, '')));
  if (start < 0) return null;
  const level = /^(#+)/.exec(lines[start])[1].length;
  const end = lines.findIndex((line, index) => index > start && /^#{1,6}\s/.test(line) && /^(#+)/.exec(line)[1].length <= level);
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
};
const hasHeading = (text, pattern) => text.replaceAll('\r\n', '\n').split('\n').some(line => /^#{1,6}\s/.test(line) && pattern.test(line.replace(/^#{1,6}\s+/, '').trim()));

/**
 * Conclusion-report evidence for one finished Ticket (or final review): a short checked verdict,
 * not process material. Returns error strings relative to the change.
 */
export function validateConclusionReport(label, text, {contractIds = [], requireContracts = true} = {}) {
  const errors = [];
  const conclusion = section(text, '结论');
  if (conclusion === null) errors.push(`${label}: conclusion report requires a '## 结论' section`);
  else if (!/^\s*[-*]?\s*Result:\s*\**passed\**(?![A-Za-z0-9_-])/m.test(conclusion)) errors.push(`${label}: '## 结论' must contain 'Result: passed'`);
  for (const [name, pattern] of [['修改范围', /修改范围|Change Scope|Scope/i], ['验收与合同映射', /验收|Acceptance|合同映射/i], ['验证', /验证|Verification/i]]) {
    if (!hasHeading(text, pattern)) errors.push(`${label}: conclusion report requires a '${name}' section`);
  }
  const mapping = text;
  if (requireContracts) for (const id of new Set(contractIds)) if (!new RegExp(`\\b${id}\\b`).test(mapping)) errors.push(`${label}: acceptance mapping does not mention ${id}`);
  const verification = headingBody(text, /验证|Verification/i) ?? text;
  if (!/`[^`\n]+`/.test(verification) || !/退出|exit|通过|passed|成功|\b0\s*(?:错误|failures?|errors?)|均\s*0/i.test(verification)) errors.push(`${label}: verification must record the commands run and their outcome (exit codes or pass/fail)`);
  for (const match of text.matchAll(/input_sha256\W{0,6}([^\s"'`,]+)/gi)) if (!DIGEST.test(match[1])) errors.push(`${label}: input_sha256 must be a 64-character hex digest`);
  return errors;
}

/** Cancelled Tickets keep their reason either in the Ticket body or in evidence. */
export function validateCancellationReason(ticketText, evidenceText = '') {
  return `${ticketText}\n${evidenceText}`.split('\n').some(line => /取消|cancel/i.test(line) && /原因|因为|据此|决定|用户|reason|because|decid|user/i.test(line) && line.replace(/\s/g, '').length >= 16);
}

export function designConformanceOk(text, ref) {
  const body = section(text, 'Design Conformance');
  if (body === null) return false;
  if (/^\s*[-*]?\s*(?:不适用|N\/A|Not applicable)\s*[:：]\s*\S{4,}/mi.test(body)) return true;
  return body.includes(ref.digest) && [...ref.pages, ...ref.acceptance].every(id => body.includes(id));
}
