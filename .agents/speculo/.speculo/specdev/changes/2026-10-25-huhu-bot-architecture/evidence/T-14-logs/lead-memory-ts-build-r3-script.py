import hashlib, json, pathlib, shutil, stat, subprocess, tempfile, time

repo = pathlib.Path('/home/wta/orca/workspaces/obsidian-huhu/bot')
change = repo / '.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture'
logs = change / 'evidence/T-14-logs'
baseline = json.loads((logs / 'lead-memory-ts-build-r2.json').read_text())
outputs = ['main.js', 'styles.css', 'src/ui/styles/fonts.generated.css']
snapshot = pathlib.Path(tempfile.mkdtemp(prefix='huhu-lead-memory-ts-r3-'))

def state(path):
    return {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'mode': stat.S_IMODE(path.stat().st_mode)}

inputs = {p: state(repo / p) for p in sorted(baseline['input']) if p not in outputs}
for rel in inputs:
    dest = snapshot / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(repo / rel, dest)
record = {'observer': 'native:/root', 'scope': 'TS/JS/CSS lint and rebuild; Go source writers excluded from actual inputs', 'snapshot': str(snapshot), 'input': inputs, 'commands': [], 'complete': False}
result = logs / 'lead-memory-ts-build-r3.json'
assert not result.exists()
(logs / 'lead-memory-ts-build-r3-script.py').write_bytes(pathlib.Path(__file__).read_bytes())

def save():
    result.write_text(json.dumps(record, indent=2) + '\n')

save()
for label, command in [('lint', ['pnpm', 'run', 'lint']), ('build', ['pnpm', 'run', 'build'])]:
    logfile = logs / f'lead-memory-ts-{label}-r3.log'
    start = time.monotonic()
    with logfile.open('w') as log:
        log.write('Command: ' + json.dumps(command) + '\nCwd: ' + str(repo) + '\n')
        log.flush()
        process = subprocess.Popen(command, cwd=repo, stdout=log, stderr=subprocess.STDOUT)
        code = process.wait()
    item = {'command': command, 'exitCode': code, 'seconds': time.monotonic() - start, 'waited': True, 'log': str(logfile.relative_to(change)), 'logSHA256': state(logfile)['sha256']}
    record['commands'].append(item)
    save()
    print(json.dumps(item), flush=True)
    if code:
        break
record['complete'] = len(record['commands']) == 2 and all(r['exitCode'] == 0 for r in record['commands'])
record['sourceDrift'] = [p for p, v in inputs.items() if state(repo / p) != v]
record['snapshotDrift'] = [p for p, v in inputs.items() if state(snapshot / p) != v]
record['outputs'] = {p: state(repo / p) for p in outputs}
save()
print(json.dumps({'complete': record['complete'], 'sourceDrift': record['sourceDrift'], 'snapshotDrift': record['snapshotDrift'], 'outputs': record['outputs']}), flush=True)

raise SystemExit(0 if record["complete"] and not record["sourceDrift"] and not record["snapshotDrift"] else 1)
