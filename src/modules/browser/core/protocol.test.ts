import {expect,it} from 'vitest';
import {parseMethod,protocolTools,validatePageUrl} from './protocol';
it('exposes only fixed Agent commands from the shared schemas',()=>{
 const common={runId:'r',capability:'a'.repeat(40),pageId:'p',requestId:'q'};
 for(const command of [{kind:'evaluate',code:'x'},{kind:'dialog',requestId:'d',revision:1,accept:true},{kind:'input',text:'x'},{kind:'upload',observationId:'o',ref:'r',fileIds:['/etc/private']}])expect(()=>parseMethod('operation.prepare',{...common,command})).toThrow('invalid_request');
 expect(parseMethod('operation.prepare',{...common,command:{kind:'click',observationId:'o',ref:'e1'}}).command.kind).toBe('click');
 const tools=protocolTools();expect(tools.every(t=>t.exposure==='agent')).toBe(true);expect(JSON.stringify(tools)).not.toContain('readIdentity');
});
it('rejects host file, internal, credential-bearing and script navigations',()=>{for(const url of ['file:///etc/passwd','chrome://settings','javascript:alert(1)','https://user:pass@example.com'])expect(()=>validatePageUrl(url)).toThrow('unsupported_url');expect(validatePageUrl('http://localhost:8080')).toBe('http://localhost:8080/');});
