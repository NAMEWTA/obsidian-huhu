import { useEffect, useState } from 'react';
import { Button } from '../../../ui/components/button';
import type { DefinitionState } from '../api';
import type { ArchiveUiServices } from './ArchiveWorkspace';
import { ct } from './labels';
import { errorText } from './forms';
/** PAGE-002 exposes the portable facts without offering T28's branch resolution editor. */
export function DefinitionDiagnostics({ services }: { services: ArchiveUiServices }) {
 const [states,setStates]=useState<DefinitionState[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true,request=0;const load=async()=>{const token=++request;setLoading(true);try{const next=await services.catalog.definitionStates();if(active&&token===request){setStates(next);setError('');}}catch(failure){if(active&&token===request)setError(errorText(failure));}finally{if(active&&token===request)setLoading(false);}};void load();const off=services.query.subscribe(()=>void load());return()=>{active=false;request++;off();};},[services,refresh]);
 return <section aria-label={ct('definitionDiagnostics')} className="space-y-4 rounded-md border border-border p-4">
  <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{ct('definitionDiagnostics')}</h2><Button variant="outline" onClick={()=>setRefresh(value=>value+1)}>{ct('recheckDefinitions')}</Button></header>
  <p className="text-sm text-muted-foreground">{ct('definitionGraphHelp')}</p>{loading&&<p role="status">{ct('loading')}</p>}{error&&<p role="alert">{error}</p>}
  {!loading&&!states.length&&!error&&<p>{ct('noPublishedDefinitions')}</p>}
  {states.map(state=><details key={state.family+':'+state.definitionId} open={state.blocked} className="space-y-3 rounded-md border border-border p-3">
   <summary className="cursor-pointer break-words">{ct('definitionFamily.'+state.family)} · {state.definitionId} · {ct(state.blocked?'definitionBlocked':'definitionVerified')}</summary>
   <p>{ct('definitionHeads')}: {state.heads.join(', ')||ct('unfilled')}</p><p>{ct('definitionAffected',{count:state.affected})}</p>
   {state.diagnostics.map((item,index)=><p role={item.severity==='warning'?undefined:'alert'} key={item.path+index}>{ct(item.code)} · {item.path}{item.detail?' · '+item.detail:''}</p>)}
   {state.revisions.map(revision=><details className="min-w-0 space-y-2" key={revision.path}><summary className="cursor-pointer break-words">{revision.revisionId} · {ct('definitionPublication.'+revision.publication)}</summary><p className="break-words">{ct('definitionParents')}: {revision.parentRevisionIds.join(', ')||ct('definitionRoot')}</p><p className="break-words">{revision.path}</p><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{revision.raw}</pre></details>)}
   {state.diagnostics.filter(item=>item.raw!==undefined).map((item,index)=><details key={item.path+index}><summary className="cursor-pointer break-words">{ct('rawArchive')} · {item.path}</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{item.raw}</pre></details>)}
  </details>)}
 </section>;
}
