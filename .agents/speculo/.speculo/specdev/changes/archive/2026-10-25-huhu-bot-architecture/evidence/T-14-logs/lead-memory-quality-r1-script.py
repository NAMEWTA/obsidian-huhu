from pathlib import Path
import hashlib, json, os, re, shutil, stat, subprocess, sys, tempfile, time

repo = Path('/home/wta/orca/workspaces/obsidian-huhu/bot')
change = repo / '.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture'
logs = change / 'evidence/T-14-logs'
attempt = sys.argv[1]
assert attempt.isdigit()
name = 'lead-memory-quality-r' + attempt
result_path = logs / (name + '.json')
assert not result_path.exists()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
fixed = {}
for top in ['native/huhubot', 'contracts/hap/v0.1', 'docs/third-party/licenses/go']:
    for p in sorted((repo / top).rglob('*')):
        if p.is_file() and 'dist' not in p.relative_to(repo).parts:
            fixed[str(p.relative_to(repo))] = {'sha256': sha(p), 'mode': stat.S_IMODE(p.stat().st_mode)}
for rel in ['package.json', 'pnpm-lock.yaml', 'scripts/build-huhu-bot.mjs', 'scripts/verify-huhu-bot-architecture.mjs', 'scripts/verify-huhu-bot.mjs', 'scripts/huhu-bot-build.test.mjs', 'scripts/huhu-bot-notices.mjs', 'scripts/license-texts.mjs', 'scripts/huhu-bot-notices.test.mjs']:
    fixed[rel] = {'sha256': sha(repo / rel), 'mode': stat.S_IMODE((repo / rel).stat().st_mode)}
snapshot = Path(tempfile.mkdtemp(prefix='huhu-' + name + '-'))
for rel in fixed:
    dest = snapshot / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(repo / rel, dest)
env = os.environ.copy()
settings = {'GOTOOLCHAIN': 'local', 'GOWORK': 'off', 'GOEXPERIMENT': '', 'GOFLAGS': '-mod=readonly', 'GOPROXY': 'off', 'CGO_ENABLED': '0'}
env.update(settings)
go = '/home/wta/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.26.10.linux-amd64/bin/go'
result = {'observer': 'native:/root', 'input': fixed, 'snapshot': str(snapshot), 'commands': [], 'complete': False, 'sourceDrift': None, 'snapshotDrift': None, 'boundary': 'Go vet, affected concurrency race tests, architecture and engineering tooling; real Provider/Obsidian/target OS user-owned'}
def save():
    result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
def run(label, args, cwd, extra=None):
    output = logs / (name + '-' + label + '.log')
    local = env.copy(); local.update(extra or {})
    start = time.monotonic()
    with output.open('w') as f:
        p = subprocess.run(args, cwd=cwd, env=local, stdout=f, stderr=subprocess.STDOUT)
    record = {'label': label, 'argv': args, 'cwd': str(cwd), 'environment': {**settings, **(extra or {})}, 'exitCode': p.returncode, 'seconds': time.monotonic()-start, 'waited': True, 'log': str(output.relative_to(change)), 'logSHA256': sha(output)}
    result['commands'].append(record); save(); print(json.dumps(record), flush=True)
    return p.returncode
save(); (logs / (name + '-script.py')).write_bytes(Path(__file__).read_bytes())
status = run('version', [go, 'version'], repo / 'native/huhubot')
if status == 0:
    status = run('vet', [go, 'vet', '-p=1', './...'], repo / 'native/huhubot')
if status == 0:
    names = []
    for f in (repo / 'native/huhubot/tests/contract/private-memory').glob('*_test.go'):
        names.extend(re.findall(r'^func (Test\w+)\(', f.read_text(), re.MULTILINE))
    # The new 70-round capacity path is independently tested twice with actual
    # SQLite/accounting in normal mode. Race focuses on lifecycle, snapshot,
    # authorization and transactional memory paths, without repeating that scale.
    names = [n for n in names if n != 'TestCompletedChatKeepsFullProvenanceWhenMaintenanceCannotFit']
    for rel in ['internal/adapters/outbound/sqlite/execution/context_retry_test.go', 'tests/contract/foundation/resume_inbox_test.go']:
        names.extend(re.findall(r'^func (Test\w+)\(', (repo / 'native/huhubot' / rel).read_text(), re.MULTILINE))
    pattern = '^(' + '|'.join(sorted(set(names))) + ')$'
    status = run('race', [go, 'test', '-race', '-mod=readonly', '-p=1', '-count=1', '-timeout=180s', '-json', './internal/adapters/outbound/sqlite/execution', './tests/contract/foundation', './tests/contract/private-memory', '-run', pattern], repo / 'native/huhubot', {'CGO_ENABLED': '1'})
if status == 0:
    status = run('architecture', ['pnpm', 'run', 'test:huhu-bot-architecture'], repo)
if status == 0:
    status = run('tooling', ['pnpm', 'run', 'test:huhu-bot-tooling'], repo)
def drift(base):
    return [p for p,v in fixed.items() if not (base/p).is_file() or sha(base/p) != v['sha256'] or stat.S_IMODE((base/p).stat().st_mode) != v['mode']]
result['sourceDrift'] = drift(repo); result['snapshotDrift'] = drift(snapshot)
result['complete'] = status == 0 and not result['sourceDrift'] and not result['snapshotDrift']
save(); print(json.dumps({'complete': result['complete'], 'sourceDrift': result['sourceDrift'], 'snapshotDrift': result['snapshotDrift']}), flush=True)
sys.exit(0 if result['complete'] else status or 1)
