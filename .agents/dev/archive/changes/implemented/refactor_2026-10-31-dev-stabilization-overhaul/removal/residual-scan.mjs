#!/usr/bin/env node
// T-39 删除盘点残留检索（只读，无第三方依赖）。
// 扫描当前工作区被 git 跟踪的文件（git ls-files）的路径与文本内容，
// 按关键词规则列出命中，并与 inventory.json 的处置分类比对。
//
//   node residual-scan.mjs                         列出命中（按规则/文件）
//   node residual-scan.mjs --inventory inv.json    输出未分类命中数；非 0 则退出 1
//   node residual-scan.mjs --residual [--inventory inv.json]
//                                                  删除完成后用：只允许分类为 keep 的命中
//   node residual-scan.mjs --self-test             内置自测
//
// 范围外（不扫描）：.agents/speculo/**（SpecDev 历史与永久知识，只经 A/T-45 处理）、
// 二进制文件。OUT 项（Obsidian 内置 webviewer、scripts/perf 与 UI runner 的独立 Chrome、
// Pi CLI 档案）若命中规则，须在清单中标为 keep 并写理由。
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXCLUDED_PREFIXES = ['.agents/speculo/'];
export const MAX_BYTES = 8 * 1024 * 1024;

// 规则 id → 正则。路径与内容都会匹配。
export const RULES = {
  huhubot: /huhubot|huhu[-_ ]?bot|HuhuBot|superbot|super[-_ ]bot|superhuhu|bot-runner|BotClient|BOT_CLIENT|BOT_RUNTIME|contracts\/hap|\bHAP\b/i,
  'browser-product':
    /browser-(runtime|session|worker|cli|client|material|tabs|workspace|protector|contribution|phase2|operation|assistant|synthesis|native|identity|profile)|browser\.(workspace|open|agent-access|tabs)|BROWSER_[A-Z_]+|Browser(Workspace|Tab|Runtime|Material|Open|Session|Settings|Client|Agent|Identity)|browserSettings|agent-browser|retained-browser|legacy-browser|modules\/browser|native\/browser|open-browser|kind:\s*['"]browser|['"`]browser['"`]/,
  'browser-generic': /\bbrowsers?\b/i,
  cookies: /cookie/i,
  'netease-music': /netease|music|Music/,
  'web-embed': /WebPanel|WebEmbed|web-precheck|webConfig|parseWebConfig|updateWebConfig|webview|webviewer/i,
  'shared-workspace': /shared-workspace|SharedWorkspace/,
};

export function scanText(path, text) {
  const hits = [];
  for (const [rule, re] of Object.entries(RULES)) {
    const flags = re.flags.replace('g', '');
    const r = new RegExp(re.source, flags);
    if (r.test(path)) hits.push({ rule, line: 0 });
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) if (r.test(lines[i])) hits.push({ rule, line: i + 1 });
  }
  return hits;
}

export function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          out += '(?:.*/)?';
        } else out += '.*';
      } else out += '[^/]*';
    } else if ('\\^$+?.()|{}[]'.includes(c)) out += '\\' + c;
    else out += c;
  }
  return new RegExp('^' + out + '$');
}

export function loadInventory(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(data.entries)) throw new Error('inventory.json 缺少 entries[]');
  const entries = data.entries.map((e, i) => {
    const pattern = e.path ?? e.glob;
    if (!pattern) throw new Error(`entries[${i}] 缺少 path/glob`);
    if (!['delete', 'rewrite', 'keep'].includes(e.disposition)) throw new Error(`entries[${i}] disposition 非法: ${e.disposition}`);
    if (!e.reason) throw new Error(`entries[${i}] 缺少 reason`);
    return { ...e, pattern, exact: e.path !== undefined, re: globToRegExp(pattern) };
  });
  return { ...data, entries };
}

// 精确 path 优先于 glob；多个 glob 取最具体（pattern 最长）。
export function classify(entries, path) {
  const exact = entries.find((e) => e.exact && e.path === path);
  if (exact) return exact;
  const globs = entries.filter((e) => !e.exact && e.re.test(path));
  globs.sort((a, b) => b.pattern.length - a.pattern.length);
  return globs[0] ?? null;
}

export function listFiles(cwd) {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd, maxBuffer: 1 << 28 }).toString('utf8');
  return out.split('\0').filter(Boolean).filter((p) => !EXCLUDED_PREFIXES.some((x) => p.startsWith(x)));
}

export function scanRepo(cwd) {
  const files = listFiles(cwd);
  const result = [];
  for (const p of files) {
    const abs = join(cwd, p);
    if (!existsSync(abs)) {
      // 已从工作区删除但仍在 index 中：按路径匹配
      const hits = scanText(p, '');
      if (hits.length) result.push({ path: p, hits, missing: true });
      continue;
    }
    let buf;
    try {
      buf = readFileSync(abs);
    } catch {
      continue;
    }
    let text = '';
    if (buf.length <= MAX_BYTES && !buf.subarray(0, 8000).includes(0)) text = buf.toString('utf8');
    const hits = scanText(p, text);
    if (hits.length) result.push({ path: p, hits });
  }
  return { files, result };
}

function summarize(hits) {
  const by = {};
  for (const h of hits) by[h.rule] = (by[h.rule] ?? 0) + 1;
  return Object.entries(by).map(([k, v]) => `${k}:${v}`).join(' ');
}

export function evaluate({ result, files }, inv, residual) {
  const unclassified = [];
  const violations = [];
  const counts = { delete: 0, rewrite: 0, keep: 0 };
  const used = new Set();
  for (const r of result) {
    const e = inv ? classify(inv.entries, r.path) : null;
    if (!e) {
      unclassified.push(r);
      continue;
    }
    used.add(e);
    counts[e.disposition]++;
    if (residual && e.disposition !== 'keep') violations.push({ ...r, disposition: e.disposition, ticket: e.ticket });
  }
  const matchCount = (e) => files.filter((p) => (e.exact ? e.path === p : e.re.test(p))).length;
  const stale = inv ? inv.entries.filter((e) => matchCount(e) === 0) : [];
  // 目录 glob 可带 count：必须等于当前被 git 跟踪的匹配文件数，防止清单与树漂移。
  const countMismatch = inv ? inv.entries.filter((e) => e.count !== undefined && matchCount(e) !== e.count).map((e) => ({ pattern: e.pattern, expected: e.count, actual: matchCount(e) })) : [];
  return { unclassified, violations, counts, stale, countMismatch };
}

function parseArgs(argv) {
  const a = { inventory: null, residual: false, selfTest: false, quiet: false, cwd: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--inventory') a.inventory = argv[++i];
    else if (v === '--residual') a.residual = true;
    else if (v === '--self-test') a.selfTest = true;
    else if (v === '--quiet') a.quiet = true;
    else if (v === '--cwd') a.cwd = resolve(argv[++i]);
    else if (v === '--help' || v === '-h') a.help = true;
    else throw new Error(`未知参数: ${v}`);
  }
  return a;
}

export function main(argv, io = { log: console.log, err: console.error }) {
  const args = parseArgs(argv);
  if (args.help) {
    io.log('用法: residual-scan.mjs [--inventory <json>] [--residual] [--self-test] [--cwd <repo>] [--quiet]');
    return 0;
  }
  if (args.selfTest) return selfTest(io);
  const here = dirname(fileURLToPath(import.meta.url));
  const invPath = args.inventory ?? (args.residual ? join(here, 'inventory.json') : null);
  const inv = invPath ? loadInventory(invPath) : null;
  const scan = scanRepo(args.cwd);
  const { unclassified, violations, counts, stale, countMismatch } = evaluate(scan, inv, args.residual);
  if (!inv) {
    for (const r of scan.result) io.log(`${r.path}\t${summarize(r.hits)}`);
    io.log(`命中文件 ${scan.result.length} / 扫描文件 ${scan.files.length}`);
    return 0;
  }
  if (!args.quiet) {
    for (const r of unclassified) io.err(`未分类\t${r.path}\t${summarize(r.hits)}`);
    for (const v of violations) io.err(`残留\t${v.path}\t${v.disposition}/${v.ticket ?? '-'}`);
    for (const s of stale) io.err(`清单条目无匹配文件\t${s.pattern}`);
    for (const c of countMismatch) io.err(`清单 count 漂移\t${c.pattern}\t期望 ${c.expected} 实际 ${c.actual}`);
  }
  io.log(
    `扫描文件 ${scan.files.length}；命中文件 ${scan.result.length}；删除 ${counts.delete}、改写 ${counts.rewrite}、保留 ${counts.keep}；` +
      `未分类命中 ${unclassified.length}；` +
      (args.residual ? `非保留残留 ${violations.length}；` : '') +
      `清单陈旧条目 ${stale.length}；count 漂移 ${countMismatch.length}`,
  );
  if (unclassified.length || countMismatch.length) return 1;
  if (args.residual && violations.length) return 1;
  return 0;
}

function selfTest(io) {
  let pass = 0;
  let fail = 0;
  const ok = (cond, name) => {
    if (cond) pass++;
    else {
      fail++;
      io.err(`FAIL ${name}`);
    }
  };
  ok(globToRegExp('a/**').test('a/b/c.ts'), 'glob dir');
  ok(globToRegExp('a/*.ts').test('a/b.ts') && !globToRegExp('a/*.ts').test('a/b/c.ts'), 'glob star');
  ok(globToRegExp('**/x.ts').test('x.ts') && globToRegExp('**/x.ts').test('a/b/x.ts'), 'glob leading **');
  ok(scanText('x.ts', 'import "native/huhubot"').some((h) => h.rule === 'huhubot'), 'rule huhubot');
  ok(scanText('src/modules/browser/api.ts', '').some((h) => h.rule === 'browser-product'), 'path hit');
  ok(scanText('a.ts', 'BROWSER_ROOT').some((h) => h.rule === 'browser-product'), 'rule BROWSER_');
  ok(scanText('a.ts', 'NetEase music').some((h) => h.rule === 'netease-music'), 'rule music');
  ok(scanText('a.ts', 'hello world').length === 0, 'no false positive');
  const inv = [
    { path: 'a/b.ts', pattern: 'a/b.ts', exact: true, disposition: 'keep', reason: 'r' },
    { glob: 'a/**', pattern: 'a/**', exact: false, re: globToRegExp('a/**'), disposition: 'delete', reason: 'r' },
  ];
  ok(classify(inv, 'a/b.ts').disposition === 'keep', 'exact beats glob');
  ok(classify(inv, 'a/c/d.ts').disposition === 'delete', 'glob match');
  ok(classify(inv, 'z.ts') === null, 'no match');

  const tmp = mkdtempSync(join(tmpdir(), 'residual-scan-'));
  try {
    const git = (...a) => execFileSync('git', a, { cwd: tmp, stdio: 'pipe' });
    git('init', '-q');
    mkdirSync(join(tmp, 'src'), { recursive: true });
    mkdirSync(join(tmp, '.agents/speculo'), { recursive: true });
    writeFileSync(join(tmp, 'src/a.ts'), 'export const x = "huhubot";\n');
    writeFileSync(join(tmp, 'src/b.ts'), 'export const y = 1;\n');
    writeFileSync(join(tmp, 'src/keep.ts'), '// webviewer is Obsidian core\n');
    writeFileSync(join(tmp, '.agents/speculo/h.md'), 'huhubot history\n');
    writeFileSync(join(tmp, 'bin.dat'), Buffer.from([0, 1, 2, 104, 117, 104, 117, 98, 111, 116]));
    git('add', '.');
    const invFile = join(tmp, 'inv.json');
    const run = (...a) => {
      const out = [];
      const code = main([...a, '--cwd', tmp], { log: (s) => out.push(s), err: (s) => out.push(s) });
      return { code, out: out.join('\n') };
    };
    let r = run();
    ok(r.code === 0 && r.out.includes('src/a.ts') && !r.out.includes('h.md') && !r.out.includes('bin.dat') && !r.out.includes('src/b.ts'), 'plain listing / exclusions');
    writeFileSync(invFile, JSON.stringify({ entries: [{ path: 'src/a.ts', disposition: 'delete', ticket: 'T-40', reason: 'x' }] }));
    r = run('--inventory', invFile);
    ok(r.code === 1 && r.out.includes('未分类\tsrc/keep.ts') && r.out.includes('未分类命中 1'), 'unclassified fails');
    writeFileSync(invFile, JSON.stringify({ entries: [{ path: 'src/a.ts', disposition: 'delete', ticket: 'T-40', reason: 'x' }, { glob: 'src/keep.ts', disposition: 'keep', reason: 'OUT' }] }));
    r = run('--inventory', invFile);
    ok(r.code === 0 && r.out.includes('未分类命中 0'), 'all classified passes');
    r = run('--residual', '--inventory', invFile);
    ok(r.code === 1 && r.out.includes('残留\tsrc/a.ts'), 'residual rejects non-keep');
    rmSync(join(tmp, 'src/a.ts'));
    git('rm', '-q', '--cached', 'src/a.ts');
    r = run('--residual', '--inventory', invFile);
    ok(r.code === 0 && r.out.includes('非保留残留 0'), 'residual passes after deletion');
    writeFileSync(invFile, JSON.stringify({ entries: [{ glob: 'src/**', count: 5, disposition: 'keep', reason: 'r' }] }));
    r = run('--inventory', invFile);
    ok(r.code === 1 && r.out.includes('count 漂移'), 'count drift fails');
    writeFileSync(invFile, JSON.stringify({ entries: [{ path: 'x', disposition: 'maybe', reason: 'r' }] }));
    let threw = false;
    try {
      run('--inventory', invFile);
    } catch {
      threw = true;
    }
    ok(threw, 'invalid disposition rejected');
    const cli = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--cwd', tmp, '--inventory', invFile.replace('inv.json', 'missing.json')], { encoding: 'utf8' });
    ok(cli.status !== 0, 'cli missing inventory fails');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  io.log(`self-test: ${pass} 通过, ${fail} 失败`);
  return fail ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(String(e?.message ?? e));
    process.exitCode = 2;
  }
}
