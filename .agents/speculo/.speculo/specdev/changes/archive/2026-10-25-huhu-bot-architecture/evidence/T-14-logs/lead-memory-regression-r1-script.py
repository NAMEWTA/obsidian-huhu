from pathlib import Path
import hashlib,json,os,shutil,stat,subprocess,sys,tempfile,time

repo=Path('/home/wta/orca/workspaces/obsidian-huhu/bot')
change=repo/'.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture'
logs=change/'evidence/T-14-logs'
attempt=sys.argv[1]
assert attempt.isdigit()
name='lead-memory-regression-r'+attempt
result_path=logs/(name+'.json')
assert not result_path.exists()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
inputs={}
for top in ['native/huhubot','contracts/hap/v0.1']:
    for p in sorted((repo/top).rglob('*')):
        if p.is_file() and 'dist' not in p.relative_to(repo).parts:
            inputs[str(p.relative_to(repo))]={'sha256':sha(p),'mode':stat.S_IMODE(p.stat().st_mode)}
snapshot=Path(tempfile.mkdtemp(prefix='huhu-'+name+'-'))
for rel in inputs:
    target=snapshot/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(repo/rel,target)
go='/home/wta/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.26.10.linux-amd64/bin/go'
settings={'GOTOOLCHAIN':'local','GOWORK':'off','GOEXPERIMENT':'','GOFLAGS':'-mod=readonly','GOPROXY':'off','CGO_ENABLED':'0'}
env=os.environ.copy();env.update(settings)
result={'observer':'native:/root','input':inputs,'inputFiles':len(inputs),'inputSHA256':hashlib.sha256(json.dumps(inputs,sort_keys=True).encode()).hexdigest(),'snapshot':str(snapshot),'commands':[],'sourceDrift':None,'snapshotDrift':None,'complete':False,'boundary':'Root shared Go regression on frozen source; no real Provider/Obsidian/target OS acceptance'}
def save():result_path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
def run(label,args,extra=None):
    log=logs/(name+'-'+label+'.log');local=env.copy();local.update(extra or {})
    start=time.monotonic()
    with log.open('w') as f:
        proc=subprocess.run(args,cwd=repo/'native/huhubot',env=local,stdout=f,stderr=subprocess.STDOUT)
    rec={'label':label,'argv':args,'cwd':str(repo/'native/huhubot'),'environment':{**settings,**(extra or {})},'exitCode':proc.returncode,'seconds':time.monotonic()-start,'waited':True,'log':str(log.relative_to(change)),'logSHA256':sha(log)}
    result['commands'].append(rec);save();print(json.dumps(rec),flush=True)
    return proc.returncode
save();(logs/(name+'-script.py')).write_bytes(Path(__file__).read_bytes())
print(json.dumps({'snapshot':str(snapshot),'inputFiles':len(inputs),'inputSHA256':result['inputSHA256']}),flush=True)
status=run('version',[go,'version'])
if status==0:status=run('normal',[go,'test','-mod=readonly','-p=1','-count=1','-timeout=180s','-json','./...'])
def drift(root):return [p for p,v in inputs.items() if not (root/p).exists() or sha(root/p)!=v['sha256'] or stat.S_IMODE((root/p).stat().st_mode)!=v['mode']]
result['sourceDrift']=drift(repo);result['snapshotDrift']=drift(snapshot);result['complete']=status==0 and not result['sourceDrift'] and not result['snapshotDrift'];save()
print(json.dumps({'complete':result['complete'],'sourceDrift':result['sourceDrift'],'snapshotDrift':result['snapshotDrift']}),flush=True)
sys.exit(status if status else 0 if result['complete'] else 1)
