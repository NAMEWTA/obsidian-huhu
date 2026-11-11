import {pathToFileURL} from 'node:url';import fs from 'node:fs';
const names=process.argv.slice(3);const dir=process.argv[2];const out={};const missing=[];
for(const n of names){const f=`${dir}/${n}.js`;if(!fs.existsSync(f)){missing.push(n);continue;}const m=await import(pathToFileURL(f));out[n]=m.__iconNode.map(([tag,attrs])=>{const a={...attrs};delete a.key;return [tag,a];});}
if(missing.length){console.error('missing',missing.join(' '));process.exit(1)}
const ser=Object.entries(out).map(([k,v])=>`${JSON.stringify(k)}:${JSON.stringify(v.map(([t,a])=>t+' '+Object.entries(a).map(([x,y])=>`${x}="${y}"`).join(' ')))}`).join(',\n');
process.stdout.write(`/* Icons: Lucide v0.577.0 (ISC License, Copyright (c) Lucide Contributors 2022; portions Copyright (c) 2013-2022 Cole Bemis, Feather, MIT). https://github.com/lucide-icons/lucide · inlined from node_modules/lucide-react/dist/esm/icons */\nconst ICONS={\n${ser}\n};\n`);
