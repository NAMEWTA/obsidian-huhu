export class FixtureStartupTimeout extends Error {
 constructor(timeoutMs) { super(`Timed out: fixture startup (${timeoutMs}ms)`); this.name='FixtureStartupTimeout'; }
}
export async function boundedStartup(startup, timeoutMs=10000) {
 let timer;
 try { return await Promise.race([startup, new Promise((_,reject)=>{timer=setTimeout(()=>reject(new FixtureStartupTimeout(timeoutMs)),timeoutMs);})]); }
 finally { clearTimeout(timer); }
}
