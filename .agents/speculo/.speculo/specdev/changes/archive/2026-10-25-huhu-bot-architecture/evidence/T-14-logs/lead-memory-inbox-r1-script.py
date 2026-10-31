from pathlib import Path
import hashlib, json, os, shutil, sqlite3, subprocess, sys, tempfile, time

repo = Path('/home/wta/orca/workspaces/obsidian-huhu/bot')
change = repo / '.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture'
logs = change / 'evidence/T-14-logs'
attempt = sys.argv[1]
assert attempt.isdigit()
name = f'lead-memory-inbox-r{attempt}'
result_path = logs / f'{name}.json'
assert not result_path.exists()
sha = lambda value: hashlib.sha256(value).hexdigest()
roots = ['native/huhubot', 'src', 'contracts/hap/v0.1', 'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'tsconfig.test.json']

def inventory():
    names = subprocess.check_output(['git', 'ls-files', '-c', '-o', '--exclude-standard', '-z', '--', *roots], cwd=repo, text=True).split('\0')
    return {p: {'sha256': sha((repo / p).read_bytes()), 'mode': (repo / p).stat().st_mode & 0o777}
            for p in sorted(set(names)) if p and (repo / p).is_file()
            and not (p.startswith('native/huhubot/') and (p.endswith('_test.go') or p.startswith('native/huhubot/tests/')))}

before = inventory()
snapshot = Path(tempfile.mkdtemp(prefix=f'huhu-{name}-'))
for rel in before:
    target = snapshot / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(repo / rel, target)
os.symlink(repo / 'node_modules', snapshot / 'node_modules', target_is_directory=True)
probes = {}
for rel in ['huhu-lead-memory-inbox.ts', 'huhu-lead-obsidian-stub.ts']:
    source = Path('/tmp') / rel
    copied = source.read_text().replace(str(repo) + '/', str(snapshot) + '/')
    (snapshot / rel).write_text(copied)
    (logs / f'{name}-{rel}.txt').write_bytes(source.read_bytes())
    probes[rel] = {'source': sha(source.read_bytes()), 'snapshot': sha(copied.encode())}
(logs / f'{name}-script.py').write_bytes(Path(__file__).read_bytes())
result = {'observer': 'native:/root', 'snapshot': str(snapshot), 'input': before, 'inputFiles': len(before),
          'inputSha256': sha(json.dumps(before, sort_keys=True, separators=(',', ':')).encode()), 'probes': probes,
          'commands': [], 'protocols': {}, 'complete': False, 'sourceDrift': None,
          'boundary': 'production TS and physical HAP/default CLI/real SDKs/local HTTP/actual SQLite; no real Provider/Obsidian/target OS acceptance'}

def save():
    result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')

def run(args, cwd, label):
    env = os.environ.copy()
    env.update(GOTOOLCHAIN='local', CGO_ENABLED='0', GOFLAGS='-mod=readonly', GOWORK='off', GOEXPERIMENT='', GOPROXY='off')
    logfile = logs / f'{name}-{label}.log'
    start = time.monotonic()
    with logfile.open('w') as output:
        output.write('Command: ' + json.dumps(args) + '\nCwd: ' + str(cwd) + '\n')
        output.flush()
        process = subprocess.run(args, cwd=cwd, env=env, stdout=output, stderr=subprocess.STDOUT)
    item = {'command': args, 'cwd': str(cwd), 'exitCode': process.returncode, 'seconds': time.monotonic() - start,
            'waited': True, 'log': str(logfile.relative_to(change)), 'logSHA256': sha(logfile.read_bytes())}
    result['commands'].append(item); save(); print(json.dumps(item), flush=True)
    assert process.returncode == 0, f'Actual failure preserved in {logfile}'

try:
    save()
    binary = snapshot / 'huhu-bot'
    bundle = snapshot / 'lead-memory-inbox.mjs'
    go = '/home/wta/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.26.10.linux-amd64/bin/go'
    run([go, 'version'], snapshot / 'native/huhubot', 'go-version')
    run([go, 'build', '-o', str(binary), './cmd/huhubot'], snapshot / 'native/huhubot', 'build')
    run(['pnpm', 'exec', 'esbuild', str(snapshot / 'huhu-lead-memory-inbox.ts'), '--bundle', '--platform=node', '--format=esm',
         '--alias:obsidian=' + str(snapshot / 'huhu-lead-obsidian-stub.ts'), '--outfile=' + str(bundle)], repo, 'ts-build')
    for protocol in ['openai-chat-completions', 'openai-responses', 'anthropic-messages']:
        output_dir = snapshot / protocol
        output_dir.mkdir(mode=0o700)
        run(['node', str(bundle), str(binary), str(output_dir), protocol], repo, protocol)
        wire = json.loads((output_dir / 'result.json').read_text())
        result['protocols'][protocol] = {'wire': wire}; save()
        assert wire['complete'] and wire['exits'] == [{'code': 0, 'signal': None}] * 2
        database = Path(wire['profileDir']) / 'profile.sqlite3'
        with sqlite3.connect('file:' + str(database) + '?mode=ro&immutable=1', uri=True) as db:
            db.row_factory = sqlite3.Row
            facts = {'integrity': db.execute('PRAGMA integrity_check').fetchone()[0],
                     'foreignKeys': [list(x) for x in db.execute('PRAGMA foreign_key_check')],
                     'schemaVersion': db.execute('PRAGMA user_version').fetchone()[0],
                     'runs': [dict(x) for x in db.execute('SELECT run_id,parent_run_id,status,child_slot,execution_position_json FROM execution_runs ORDER BY created_at,run_id')],
                     'attempts': [dict(x) for x in db.execute('SELECT run_id,root_run_id,account_id,purpose,state,producer_ended,knowledge,input_tokens,output_tokens FROM model_attempts ORDER BY created_at,attempt_id')],
                     'accounts': [dict(x) for x in db.execute('SELECT account_id,root_run_id,purpose,reserved_tokens,charged_tokens FROM model_budget_accounts ORDER BY account_id')],
                     'pins': db.execute('SELECT (SELECT count(*) FROM config_snapshot_pins)+(SELECT count(*) FROM task_config_pins)').fetchone()[0],
                     'contextCount': db.execute('SELECT count(*) FROM memory_run_contexts').fetchone()[0],
                     'activeSessionRuns': db.execute("SELECT count(*) FROM conversation_sessions WHERE active_run_id IS NOT NULL AND active_run_id!=''").fetchone()[0],
                     'supplementRows': db.execute('SELECT count(*) FROM collaboration_messages WHERE message_id=? AND text=?', [wire['supplement']['id'], wire['supplement']['text']]).fetchone()[0]}
        result['protocols'][protocol]['persistentReadback'] = facts; save()
        assert facts['integrity'] == 'ok' and facts['foreignKeys'] == [] and facts['schemaVersion'] == 10
        assert facts['pins'] == facts['activeSessionRuns'] == 0
        assert facts['supplementRows'] == 1
        assert len(facts['runs']) == 3 and all(r['status'] == 'succeeded' and r['child_slot'] == 0 for r in facts['runs'])
        assert len(facts['attempts']) == 5
        assert all(x['state'] == 'settled' and x['producer_ended'] == 1 and x['knowledge'] == 'known' for x in facts['attempts'])
        assert all(x['purpose'] != 'maintenance' for x in facts['attempts'])
        accounts = {x['account_id']: x for x in facts['accounts']}
        assert accounts['profile:' + wire['profileId']]['charged_tokens'] == 80
        assert all(x['reserved_tokens'] == 0 for x in facts['accounts'])
        assert facts['contextCount'] == 3
        middle = next(x for x in facts['runs'] if x['run_id'] == wire['middleRun']['id'])
        position = json.loads(middle['execution_position_json'])
        decision = position.get('Decision', position.get('decision', {}))
        packet = decision.get('resumeInbox')
        assert packet and any(x['message']['id'] == wire['supplement']['id'] and x['message']['text'] == wire['supplement']['text'] for x in packet['messages'])
        result['protocols'][protocol]['complete'] = True; save()
    result['complete'] = True
finally:
    after = inventory()
    result['sourceDrift'] = [p for p in sorted(before.keys() | after.keys()) if before.get(p) != after.get(p)]
    result['snapshotDrift'] = [p for p,v in before.items() if sha((snapshot / p).read_bytes()) != v['sha256'] or ((snapshot / p).stat().st_mode & 0o777) != v['mode']]
    result['waitBoundary'] = 'Every subprocess waited; TS naturally closes CLI twice; SQLite read only after CLI exits; one new frozen build for all3 isolated Profiles'
    save()
print(json.dumps({'result': str(result_path), 'complete': result['complete'], 'sourceDrift': result['sourceDrift'], 'snapshotDrift': result['snapshotDrift']}), flush=True)
assert not result['sourceDrift'] and not result['snapshotDrift']
