from pathlib import Path
import hashlib,json,os,subprocess,sys,time
repo=Path.cwd();change=repo/'.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture';logs=change/'evidence/T-14-logs'
attempt=sys.argv[1];assert attempt.isdigit();input_result=logs/'lead-memory-default-core-r1.json';base=json.loads(input_result.read_text());assert base['command']['actualExit']==0 and base['sourceDrift']==[]
p=logs/f'lead-memory-runtime-contracts-r{attempt}.json';assert not p.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
def drift(root):return [name for name,expected in base['input'].items() if not (root/name).is_file() or sha((root/name).read_bytes())!=expected['sha256'] or (root/name).stat().st_mode&0o777!=expected['mode']]
snapshot=Path(base['snapshot']);assert not drift(snapshot);assert not drift(repo)
packages=['./tests/contract/foundation','./tests/contract/chat','./tests/contract/collaboration-policy','./tests/contract/groups','./tests/contract/engine/chat']
names=['DefaultMemoryRuntimeSealsActualContextAndComposesAgentUsage','OrdinaryMemoryCandidatesFailWithoutPublishingOrCreatingJobs','StdioMemoryAndContextProofsDoNotCollapseIntoRunOrMessage','MemorySealAndOriginalMarkRunningRollbackInOneTransaction','DirectHistoryMemoryFilterPrecedesSourceFreeFastPathAndFinalProofs','LegacyModelHistoryCommitsOnlyFinallyRetainedMemoryClosure','RealMemoryForgetFiltersDerivedHistoryButKeepsIndependentIntentAndRunMetadata','ActualRecalledMemoryForgetFencesSourceFreeRunAndDispatch','ActualMaintenanceAttemptsKeepSummaryRetryInTrustedFamily','PublishedMemoryAncestorsKeepRealNamespaceWithoutPrivateLibraryInheritance','SealedContextAndRecallReachRealSDKOnceInOrder']
args=['go','test','-mod=readonly','-p=1',*packages,'-run','^Test('+'|'.join(names)+')$','-count=1','-timeout=90s','-v']
settings={'GOTOOLCHAIN':'go1.26.10','GOWORK':'off','GOEXPERIMENT':'','GOFLAGS':'-mod=readonly','GOPROXY':'off','CGO_ENABLED':'0'};env=os.environ.copy();env.update(settings)
result={'observer':'native:/root','baselineResult':str(input_result.relative_to(change)),'inputSha256':base['inputSha256'],'inputFiles':base['inputFiles'],'snapshot':str(snapshot),'command':None,'sourceDrift':None,'snapshotDrift':None,'boundary':'11 authored new public/runtime/component targets compiled with real Core; partial integration checks; not full T14 or live Provider/Obsidian/OS'}
(logs/f'lead-memory-runtime-contracts-script-r{attempt}.py').write_bytes(Path(__file__).read_bytes())
def save():p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
log=logs/f'lead-memory-runtime-contracts-r{attempt}.log';save();start=time.monotonic()
try:
    with log.open('w') as output:
        output.write('Command: '+json.dumps(args)+'\nCwd: '+str(snapshot/'native/huhubot')+'\n');output.flush()
        run=subprocess.run(args,cwd=snapshot/'native/huhubot',env=env,stdout=output,stderr=subprocess.STDOUT)
    result['command']={'argv':args,'cwd':str(snapshot/'native/huhubot'),'environment':settings,'actualExit':run.returncode,'waited':True,'seconds':time.monotonic()-start,'log':str(log.relative_to(change))}
finally:
    result['sourceDrift']=drift(repo);result['snapshotDrift']=drift(snapshot);save()
print(json.dumps({'result':str(p.relative_to(change)),'command':result['command'],'sourceDrift':result['sourceDrift'],'snapshotDrift':result['snapshotDrift']}),flush=True)
assert not result['sourceDrift'] and not result['snapshotDrift']
sys.exit(result['command']['actualExit'])
