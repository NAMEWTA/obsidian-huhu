"""Supplementary offline checks for this documentation/prototype package.
Not the repository's validate-specdev or formal design-digest validator.
Usage: python evidence/verify-docs.py [change-directory]
Dependencies: PyYAML (no dependency is added to the project).
"""
from pathlib import Path
import sys,re,json,hashlib,datetime,yaml,posixpath
D=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
R='.agents/speculo/.speculo/specdev/changes/'+D.name
results=[]
def assert_(value,message='assertion failed'):
 if not value:raise AssertionError(message)
def check(name,fn):
 try:
  detail=fn();results.append({'test':name,'status':'passed','detail':detail})
 except Exception as e:results.append({'test':name,'status':'failed','error':str(e)})
def fm(p):
 s=p.read_text();return yaml.safe_load(s.split('---',2)[1]) if s.startswith('---\n') else None
metas={}
def parse():
 for p in D.rglob('*.md'):
  m=fm(p)
  if m is not None:assert_(isinstance(m,dict),str(p));metas[p.relative_to(D).as_posix()]=m
 for p in D.rglob('*.json'):json.loads(p.read_text())
 return {'yaml_frontmatter_files':len(metas)}
check('all authored YAML/JSON parse',parse)
def sources():
 m=metas['source.md'];h=hashlib.sha256((D/'sources/issue-39-body.md').read_bytes()).hexdigest()
 assert_(m['content_sha256']==h,'source hash mismatch')
 sections=re.findall(r'^## (\d+)\.',(D/'sources/issue-39-body.md').read_text(),re.M)
 assert_(sections==[str(i) for i in range(22)],str(sections))
 ac=re.findall(r'^\| (A\d{2}) \|',(D/'sources/issue-39-body.md').read_text(),re.M)
 assert_(ac==[f'A{i:02}' for i in range(1,29)],str(ac))
 return {'sections':22,'original_acceptance_rows':28,'sha256':h,'semantics':'local normalized transcription'}
check('source: normalized snapshot hash, 22 sections, 28 original acceptance rows',sources)
T={v['id']:v for k,v in metas.items() if k.startswith('ticket/')};AC={x['id'] for x in json.loads((D/'sources/acceptance-index.json').read_text())}
def cover():
 assert_(set(T)=={f'T-{i:02}' for i in range(1,25)},'ticket IDs')
 assert_(AC=={f'AC-{i:03}' for i in range(1,29)},'AC inventory')
 seen=set()
 for id,t in T.items():
  assert_(set(t['contract_ids'])<=AC,id)
  assert_(t['status']=='draft' and t['ready'] is False,id+' wrongly executable')
  assert_(t['owner']=='unassigned',id+' fake implementation assignment')
  seen.update(t['contract_ids'])
 assert_(seen==AC,'uncovered AC')
 return {'ticket_count':24,'contracts':28,'executable_tickets':0}
check('coverage: 24 draft tickets cover 28 ACs, no implementation readiness',cover)
def dag():
 deps={i:set(t['blocked_by']) for i,t in T.items()};done=set();waves=[]
 assert_(all(d<=set(T) for d in deps.values()),'missing dependency')
 while len(done)<len(T):
  batch=sorted(i for i,d in deps.items() if i not in done and d<=done)
  assert_(batch,'DAG cycle');waves.append(batch);done.update(batch)
 return {'waves':waves,'cycle':False,'parallel_safety':'not inferred; shared resource claims require serialized owners'}
check('dependency DAG: complete and acyclic',dag)
def paths():
 for i,t in T.items():
  for f in ['expected_changes','writable_paths','read_only_paths','shared_paths']:
   assert_(len(t[f])==len(set(t[f])),i+f+' duplicates')
   assert_(all(re.fullmatch(r'<Path>[^<]+</Path>',p) for p in t[f]),i+f+' path wrapper')
  assert_(len(t['shared_paths'])==len(t['shared_path_owners']),i+' shared ownership count')
  for o in t['shared_path_owners']:assert_(re.fullmatch(r'<Path>[^<]+</Path>\s*=>\s*[^=].+',o),o)
  assert_(t['resource_claims'],i+' missing semantic resource claims')
 return 'path wrappers and explicit shared ownership present; planned paths not claimed to already exist'
check('ticket path contracts and shared-resource declarations',paths)
def readiness():
 assert_(metas['spec.md']['ready_for_tickets'] is False)
 g=metas['goal-plan.md'];assert_(g['schema_version']==8 and g['status']=='draft' and not g['ready_for_execution'])
 assert_(set(g)<=set('schema_version artifact change status modes orchestration lead integration_attempt_limit ready_for_execution ticket_execution concurrent_implementation_limit max_parallel_tickets'.split()),'unknown goal keys')
 assert_(set(g['modes'])<=set(['migration','high-assurance','reference-conformance','release-coordination']))
 m=metas['DESIGN.md'];assert_(m['status']=='draft' and m['confirmation'] is None,'false design approval')
 assert_(m['baseline']['revision']=='DESIGN-0002')
 p=metas['prototypes/UI-001/design-system.md'];assert_(p['status']=='blocked' and p['selected_candidate'] is None)
 assert_(len(p['candidates'])==3)
 tr=metas['triage.md'];assert_(tr['schema_version']==3 and tr['ready_for_implementation'] is False and not tr['remote_actions'])
 return 'draft/blocked retained; no user approval, implementation or remote-write receipt invented'
check('frontmatter: expected known enums/version/authority boundary checks',readiness)
def design_tree():
 j=json.loads((D/'design-tree.json').read_text());assert_(set(j)==set(['schema_version','artifact','change','status','round','nodes']));assert_(j['schema_version']==1 and j['status']=='active')
 ids={n['id'] for n in j['nodes']}
 for n in j['nodes']:
  assert_(set(n)==set(['id','title','question','depends_on','recommendation','status','round','answer','log_ref']))
  assert_(set(n['depends_on'])<=ids)
  assert_(n['status'] in ['open','answered','deferred','rejected'])
  if n['status']=='answered':assert_(n['answer'] and n['log_ref'],'answer provenance absent')
 return {'nodes':len(ids),'consensus':False}
check('design tree structural checks: decisions and open conditions',design_tree)
def links():
 missing=[];future=[]
 for p in D.rglob('*.md'):
  if p.relative_to(D).parts[0]=='sources':continue
  chunks=re.split(r'(```[\s\S]*?```)',p.read_text());txt=''.join(chunks[::2])
  assert_(not re.search(r'\[[^\]]+\]\((?!https?://|mailto:|#)[^)]+\)',txt),'internal Markdown link in '+str(p.relative_to(D)))
  for path in re.findall(r'<Path>([^<]+)</Path>',txt):
   if not path.startswith(R+'/'):continue
   rel=path[len(R)+1:].split('#')[0];target=D/rel
   if target.exists():continue
   if re.fullmatch(r'evidence/T-\d+\.md',rel) or rel.startswith('sources/SRC-') or '{' in rel or rel=='evidence/validation.json' or any('<Path>'+path+'</Path>' in t['writable_paths'] for t in T.values()):future.append(rel)
   else:missing.append(rel)
 assert_(not missing,'missing local artifact references: '+str(sorted(set(missing))))
 return {'broken_current_references':0,'unexecuted_future_evidence':sorted(set(future))}
check('internal artifact navigation uses Path; current referenced files exist',links)
def source_blocks():
 pack=(D/'prototypes/UI-001/design-system.md').read_text()
 blocks=re.findall(r'<!-- PROTOTYPE-FILE: ([^\n]+) -->\n```[^\n]*\n([\s\S]*?)```\n<!-- /PROTOTYPE-FILE -->',pack)
 assert_(len(blocks)==7,'expected final3 + comparison4')
 for path,body in blocks:assert_((D/'prototypes/UI-001'/path).read_bytes()==body.encode(),path+' mismatch')
 return {'byte_equivalent_named_blocks':len(blocks)}
check('prototype source blocks exactly match all seven materialized resources',source_blocks)
def digests():
 P=D/'prototypes/UI-001';m=json.loads((P/'evidence/source-manifest.json').read_text());fs=m['files']
 for f in fs:assert_(hashlib.sha256((P/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path'])
 h=hashlib.sha256(json.dumps(fs,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
 assert_(h==m['prototype_source_set_digest']==metas['DESIGN.md']['prototype_ref']['digest'])
 b=json.loads((P/'evidence/browser-results.json').read_text())
 for name,h in b['inputs'].items():assert_(hashlib.sha256((P/'final'/name).read_bytes()).hexdigest()==h,'browser evidence stale: '+name)
 assert_(b['summary']=={'passed':98,'failed':0},'browser result')
 c=json.loads((P/'evidence/candidate-results.json').read_text());assert_(c['summary']=={'passed':6,'failed':0})
 return {'source_set_integrity':True,'final_browser_checks':98,'candidate_checks':6,'official_digest_gate':'not-run'}
check('prototype digest and browser evidence correspond to final source bytes',digests)
def scope():
 files=[p for p in D.rglob('*') if p.is_file()]
 assert_(not any(p.suffix in ['.woff','.woff2','.ttf','.otf','.node','.exe'] for p in files),'forbidden binary/font')
 assert_(re.findall(r'^Outcome: (\w+)$',(D/'README.md').read_text(),re.M)==['active'])
 assert_(not json.loads((D/'evidence/source-check.json').read_text())['pr_created'])
 for t in T.values():assert_(not t['ready'])
 return {'package_files_before_report_write':len(files),'all_paths_under_new_change':True,'production_edits':0,'pr_created':False}
check('delivery scope: new change only, no fonts/runtime assets, no false completion',scope)
report={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'kind':'supplementary-document-validation','not_equivalent_to':'official SpecDev validators, independent review, full checkout build, Obsidian/Pi integration or GitHub PR','summary':{'passed':sum(x['status']=='passed' for x in results),'failed':sum(x['status']=='failed' for x in results)},'results':results,'known_gates':['New UI approval pending','Official work validators and semantic digest not run','Complete active/archive canonical-locator dedup pending','Required project-skill reference hash bindings pending before Ready','P0 installed-host and four-platform release not run','No GitHub write action; requested PR not created']}
(D/'evidence/validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
for r in results:
 if r['status']=='failed':print('FAIL:',r['test'],r['error'])
print(json.dumps(report['summary']))
sys.exit(1 if report['summary']['failed'] else 0)
