from pathlib import Path
import hashlib, json, os, shutil, subprocess, sys, tempfile, time
repo=Path.cwd();change=repo/'.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture';logs=change/'evidence/T-14-logs'
attempt=sys.argv[1];assert attempt.isdigit()
result_path=logs/f'lead-memory-default-core-r{attempt}.json';assert not result_path.exists(), 'Preserve every executed attempt'
sha=lambda b:hashlib.sha256(b).hexdigest()
def inventory():
    paths=subprocess.check_output(['git','ls-files','-c','-o','--exclude-standard','-z','--','native/huhubot','contracts/hap/v0.1'],text=True).split('\0')
    return {p:{'sha256':sha((repo/p).read_bytes()),'mode':(repo/p).stat().st_mode&0o777} for p in sorted(set(paths)) if p and (repo/p).is_file()}
before=inventory();snapshot=Path(tempfile.mkdtemp(prefix=f'huhu-lead-memory-default-core-r{attempt}-'))
for p in before:
    target=snapshot/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(repo/p,target)
result={'observer':'native:/root','inputFiles':len(before),'input':before,'inputSha256':sha(json.dumps(before,sort_keys=True,separators=(',',':')).encode()),'snapshot':str(snapshot),'command':None,'sourceDrift':None,'boundary':'first default Core/HAP/SQLite management target; real Provider/Obsidian/target OS unexecuted'}
(logs/f'lead-memory-default-core-script-r{attempt}.py').write_bytes(Path(__file__).read_bytes())
def save():result_path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
args=['go','test','-mod=readonly','-p=1','./tests/contract/private-memory','-run','^TestDefaultMemorySettingsAreVirtualAndPrivateManagementIsDurable$','-count=1','-timeout=90s','-v']
env=os.environ.copy();settings={'GOTOOLCHAIN':'go1.26.10','GOWORK':'off','GOEXPERIMENT':'','GOFLAGS':'-mod=readonly','GOPROXY':'off','CGO_ENABLED':'0'};env.update(settings)
log=logs/f'lead-memory-default-core-r{attempt}.log';save();start=time.monotonic()
try:
    with log.open('w') as output:
        output.write('Command: '+json.dumps(args)+'\nCwd: '+str(snapshot/'native/huhubot')+'\n');output.flush()
        process=subprocess.run(args,cwd=snapshot/'native/huhubot',env=env,stdout=output,stderr=subprocess.STDOUT)
    result['command']={'argv':args,'environment':settings,'cwd':str(snapshot/'native/huhubot'),'actualExit':process.returncode,'waited':True,'seconds':time.monotonic()-start,'log':str(log.relative_to(change))}
finally:
    after=inventory();result['sourceDrift']=[p for p in sorted(before.keys()|after.keys()) if before.get(p)!=after.get(p)];save()
print(json.dumps({'result':str(result_path.relative_to(change)),'command':result['command'],'sourceDrift':result['sourceDrift']}),flush=True)
assert not result['sourceDrift'],'Inputs changed; do not accept result'
sys.exit(result['command']['actualExit'])
