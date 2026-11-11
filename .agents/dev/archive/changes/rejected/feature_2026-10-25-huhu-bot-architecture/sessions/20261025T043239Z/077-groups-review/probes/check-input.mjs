import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { readArtifactSectionSync } from '/home/wta/orca/workspaces/obsidian-huhu/bot/.agents/speculo/lib/speculo-runtime.mjs';
import { resolveReviewScope } from '/home/wta/orca/workspaces/obsidian-huhu/bot/.agents/speculo/workflows/specdev/common/tools/review-scope.mjs';
const evidence='.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-01.md';
const read=n=>JSON.parse(readArtifactSectionSync(evidence,'review-input-'+n).text.match(/```json\n([\s\S]*?)\n```/)[1]);
const prior=JSON.parse(readArtifactSectionSync(evidence.replace('T-01.md','T-07.md'),'review-input-notes-r3').text.match(/```json\n([\s\S]*?)\n```/)[1]);
const input=JSON.parse(readArtifactSectionSync(evidence.replace('T-01.md','T-13.md'),'review-input-groups-r1').text.match(/```json\n([\s\S]*?)\n```/)[1]);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
assert.equal(hash(JSON.stringify(input)),'bac9f195888efe857183f3ff4e5e9ba05ba263a77ea9aba7ad81fd52a2611bc5');
for(const s of input.sources){const [path,anchor]=s.locator.split('#');assert.equal(hash(anchor?readArtifactSectionSync(path,anchor).text:fs.readFileSync(path)),s.sha256,s.locator)}
const actual=resolveReviewScope({repo:process.cwd(),mode:'working-tree',base:input.scope.base_sha,files:input.scope.scope_paths});
const strip=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['excluded_paths','inventory_sha256','input_sha256'].includes(k)));
assert.deepEqual(strip(actual),strip(input.scope));
console.log('INPUT_PASS',hash(JSON.stringify(input)),input.scope.scope_paths.length,'files; all sources/index/modes/baseline unchanged');

console.log('CURRENT_SOURCES',JSON.stringify(input.sources));


console.log('CHANGED_SNAPSHOT',JSON.stringify(input.scope.working_snapshot.filter(x=>!prior.scope.working_snapshot.some(y=>JSON.stringify(x)===JSON.stringify(y))).map(x=>x.path)));

fs.writeFileSync("/tmp/huhu-groups-review/input.json",JSON.stringify(input,null,2));

console.log("CHANGED_SOURCES",JSON.stringify(input.sources.filter(x=>!prior.sources.some(y=>JSON.stringify(x)===JSON.stringify(y)))));
