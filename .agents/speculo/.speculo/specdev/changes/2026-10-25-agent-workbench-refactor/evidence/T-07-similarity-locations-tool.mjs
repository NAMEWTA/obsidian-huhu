// Numeric-only follow-up to the existing comparator. Never emits reference source text.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
const reportPath = '/tmp/huhu-t07-root-i2-similarity-12g-results.json';
const report = JSON.parse(fs.readFileSync(reportPath));
const input = JSON.parse(fs.readFileSync('/tmp/huhu-t07-root-integration2-similarity-inputs.json'));
const source = fs.readFileSync('scripts/check-similarity.mjs', 'utf8');
const hash = b => createHash('sha256').update(b).digest('hex');
const context = { createHash, k: report.k, window: report.window, result: null };
vm.runInNewContext(source.slice(source.indexOf('const TOKEN ='), source.indexOf('function load(')) + '\nresult = {TOKEN,tokens,fingerprint};', context);
const { TOKEN, tokens, fingerprint } = context.result;
const targets = new Map();
for (const r of report.results) if (r.raw.share >= 0.15 || r.raw.run > 40) targets.set(r.file + '|raw', [r, 'raw']);
for (const r of [...report.results].sort((a,b) => b.normalized.share - a.normalized.share).slice(0, 7)) targets.set(r.file + '|normalized', [r, 'normalized']);
for (const r of report.results) if (r.normalized.run > 100) targets.set(r.file + '|normalized', [r, 'normalized']);
const rows = [];
for (const [r, mode] of targets.values()) {
  const ours = path.resolve(r.file), ownBytes = fs.readFileSync(ours), ownText = ownBytes.toString();
  const positions = [...ownText.matchAll(TOKEN)].filter(m => !m[0].startsWith('//') && !m[0].startsWith('/*')).map(m => m.index);
  const grams = fingerprint(tokens(ownText)[mode]).grams;
  const candidates = input.reference_roots.map(root => path.join(root, r[mode].match)).filter(p => fs.existsSync(p));
  if (candidates.length !== 1) throw Error('Ambiguous numeric-only reference path');
  const ref = candidates[0], refBytes = fs.readFileSync(ref);
  const frozen = input.files.find(f => f.path === ref);
  if (!frozen || hash(refBytes) !== frozen.sha256) throw Error('Reference input drift');
  const other = new Set(fingerprint(tokens(refBytes.toString())[mode]).grams);
  let best = 0, run = 0, end = 0;
  for (let i = 0; i < grams.length; i++) {
    run = other.has(grams[i]) ? run + 1 : 0;
    if (run > best) { best = run; end = i; }
  }
  const tokenCount = best ? best + report.k - 1 : 0;
  if (tokenCount !== r[mode].run) throw Error('Original comparator result mismatch');
  const startToken = end - best + 1, finalToken = end + report.k - 1;
  const line = pos => ownText.slice(0,pos).split('\n').length;
  rows.push({ ours: path.relative('/tmp/huhu-t07-root-integration2-similarity-source', ours), ours_sha256: hash(ownBytes), mode, share: r[mode].share, token_run: tokenCount, own_start_line: line(positions[startToken]), own_end_line: line(positions[finalToken]), reference_path: ref, reference_sha256: hash(refBytes) });
}
const target = '/tmp/huhu-t07-root-i2-similarity-own-locations.json';
if (fs.existsSync(target)) throw Error('Refusing overwrite');
const result = { utc: new Date().toISOString(), actual_comparator_sha256: hash(source), helper_sha256: hash(fs.readFileSync(import.meta.filename)), report_sha256: hash(fs.readFileSync(reportPath)), policy: 'Only own-file line numbers, hashes and numeric matches emitted; reference source is never included in the result.', rows };
fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
