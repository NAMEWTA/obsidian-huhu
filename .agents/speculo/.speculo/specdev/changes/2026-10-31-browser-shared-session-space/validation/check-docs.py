from pathlib import Path
import re,json,hashlib,yaml,sys
C=Path(__file__).resolve().parents[1]
checks=[]
def check(name,ok,detail=''):
 checks.append({'name':name,'result':'passed' if ok else 'failed','detail':detail})
def fm(p):
 text=p.read_text();return yaml.safe_load(text.split('---',2)[1]) if text.startswith('---\n') else None
spec=fm(C/'spec.md');goal=fm(C/'goal-plan.md');tree=json.loads((C/'design-tree.json').read_text())
tickets={fm(p)['id']:(p,fm(p)) for p in (C/'ticket').glob('*.md')}
check('13 uniquely identified future draft tickets',len(tickets)==13)
check('No product execution claimed',all(d['status']=='draft' and d['ready'] is False for p,d in tickets.values()) and goal['ready_for_execution'] is False)
check('Spec is explicitly draft',spec['status']=='draft' and not spec['ready_for_tickets'])
check('Pending UI confirmation is preserved',tree['status']=='active' and tree['nodes'][-1]['answer'] is None and fm(C/'DESIGN.md')['confirmation'] is None)
visiting=set();done=set()
def dfs(k):
 if k in visiting:raise ValueError('cycle '+k)
 if k in done:return
 visiting.add(k)
 for d in tickets[k][1]['blocked_by']:dfs(d)
 visiting.remove(k);done.add(k)
try:
 for k in tickets:dfs(k)
 check('DAG resolves and has no cycle',True)
except Exception as e:check('DAG resolves and has no cycle',False,str(e))
all_ac={f'AC-{n:03}' for n in range(1,41)}
actual=set(a for p,d in tickets.values() for a in d['contract_ids'])
check('Every AC-001 to AC-040 has a ticket',all_ac<=actual)
text=(C/'acceptance-matrix.md').read_text()
check('All B01-B40 have individual acceptance sections',all(f'### B{n:02} / AC-{n:03}' in text for n in range(1,41)))
check('All F01-F12 are present',all(f'| F{n:02} |' in text for n in range(1,13)))
source=(C/'source.md').read_text();raw=source.split('## Original Content\n\n',1)[1].split('\n## Source Comments',1)[0].rstrip()+'\n'
check('Frozen Issue body hash matches normalized source',hashlib.sha256(raw.encode()).hexdigest()==fm(C/'source.md')['content_sha256'])
pkg=(C/'prototypes/UI-001/design-system.md').read_text();blocks=re.findall(r'<!-- PROTOTYPE-FILE: (.*?) -->\n```[^\n]*\n(.*?)\n```\n<!-- /PROTOTYPE-FILE -->',pkg,re.S)
check('Named prototype source blocks are byte-equivalent',len(blocks)==3 and all((C/'prototypes/UI-001'/path).read_bytes()==(body+'\n').encode() for path,body in blocks))
manifest=json.loads((C/'prototypes/UI-001/evidence/content-manifest.json').read_text())
check('Prototype source file hashes match',all(hashlib.sha256((C/'prototypes/UI-001'/f['path']).read_bytes()).hexdigest()==f['sha256'] for f in manifest['files']))
check('Three standalone candidates plus comparison entry',all((C/f'prototypes/UI-001/comparison/variants/candidate-{k}.html').exists() for k in 'abc') and (C/'prototypes/UI-001/comparison/index.html').exists())
b=json.loads((C/'prototypes/UI-001/evidence/browser-local.json').read_text())
check('33 actual offline browser checks passed',len(b['checks'])==33 and all(q['result']=='passed' for q in b['checks']) and not b['page_errors'] and not b['unexpected_network'])
check('No font files or production extensions outside prototypes',not any(p.suffix in ['.woff','.woff2','.ttf','.otf','.exe','.node','.ts','.tsx'] for p in C.rglob('*') if p.is_file()))
check('README and all key artifacts present',all((C/p).exists() for p in ['README.md','source.md','triage.md','CONTEXT.md','ADR.md','LOG.md','design-tree.json','spec.md','DESIGN.md','architecture.md','api-contract.md','reuse-analysis.md','migration-and-deletion.md','acceptance-matrix.md','baseline-and-impact.md','tickets-map.md','goal-plan.md','review-request.md','delivery/PR-body.md','delivery/remote-receipt.json']))
check('Remote receipt never fabricates PR',json.loads((C/'delivery/remote-receipt.json').read_text())['pull_request_url'] is None)
report={'artifact':'local-document-checks','official_specdev_validator':False,'results':checks}
(C/'validation/local-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(0 if all(q['result']=='passed' for q in checks) else 1)
