from pathlib import Path
import subprocess,json,os,time,difflib
base=Path('/tmp/huhu-notes-r3-review'); repo=base/'repo/native/huhubot'; target=repo/'tests/contract/delegation/wait_test.go';original=(base/'wait-original.go').read_text()
cp=original.replace('strings.NewReader("child-state")','strings.NewReader("reviewer-wrong-checkpoint")')
needle='return api.EngineResult{}, fmt.Errorf("wrong checkpoint/resumption %#v", i.Decision)'
assert cp.count(needle)==1
cp=cp.replace(needle,'t.Logf("REVIEWER negative actual checkpoint body=%q", body)\n\t\t\t\t\t'+needle)
pinneedle='\t\t\tif count(t, db, "SELECT count(*) FROM execution_runs r WHERE r.intent=\'parent-child\' AND NOT EXISTS'
pos=original.index(pinneedle)
pininject='\t\t\tdeleted, de := db.Exec("DELETE FROM task_config_pins WHERE run_id=(SELECT run_id FROM execution_runs WHERE intent=\'parent-child\' ORDER BY created_at,run_id LIMIT 1)")\n\t\t\tif de != nil { t.Fatal(de) }; dn,de := deleted.RowsAffected(); if de != nil || dn != 1 { t.Fatalf("negative pin setup rows=%d error=%v",dn,de) }; t.Log("REVIEWER negative removed one real waiting parent pin")\n'
pin=original[:pos]+pininject+original[pos:]
results=[]
for label,body,marker in [('checkpoint',cp,'REVIEWER negative actual checkpoint body="reviewer-wrong-checkpoint"'),('pin',pin,'waiting/queued task released its live configuration pin')]:
 target.write_text(body);(base/('wait-negative-'+label+'.go')).write_text(body);(base/('negative-'+label+'.diff')).write_text(''.join(difflib.unified_diff(original.splitlines(True),body.splitlines(True),fromfile='frozen/wait_test.go',tofile='external-negative/wait_test.go')))
 cmd=['go','test','-mod=readonly','-count=1','-v','-timeout=45s','-run','^TestChildCheckpointWaitReleasesAndAtomicallyReclaimsRootSlots$/four-leaves-before-last-parents$','./tests/contract/delegation']
 env=os.environ.copy();env['CGO_ENABLED']='0';start=time.monotonic()
 with (base/('negative-'+label+'.log')).open('w') as out:
  result=subprocess.run(cmd,cwd=repo,env=env,stdout=out,stderr=subprocess.STDOUT,timeout=60)
 text=(base/('negative-'+label+'.log')).read_text();row={'label':label,'command':cmd,'CGO_ENABLED':'0','exit':result.returncode,'wallSeconds':time.monotonic()-start,'expectedFailureMarkerPresent':marker in text,'actualWait':True};results.append(row)
 (base/'negative-results.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(row),flush=True)
 assert result.returncode==1 and marker in text
 target.write_text(original)
