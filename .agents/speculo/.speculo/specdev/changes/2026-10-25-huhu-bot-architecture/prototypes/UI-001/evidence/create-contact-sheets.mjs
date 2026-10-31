import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root=dirname(fileURLToPath(import.meta.url));
const evidence=JSON.parse(await readFile(resolve(root,'browser.json'),'utf8'));
await mkdir(resolve(root,'contact-sheets'),{recursive:true});
const index=[];
for(let start=0;start<evidence.cases.length;start+=9){
  const cases=evidence.cases.slice(start,start+9),file=`contact-sheets/sheet-${String(start/9+1).padStart(2,'0')}.png`;
  const args=['-font','DejaVu-Sans','-pointsize','12'];
  for(const item of cases)args.push('-label',item.id,resolve(root,'..',item.screenshot));
  args.push('-thumbnail','450x300','-tile','3x3','-geometry','470x330+4+4',resolve(root,file));
  execFileSync('montage',args);index.push({file,cases:cases.map(c=>c.id)});
}
await writeFile(resolve(root,'contact-sheets/index.json'),JSON.stringify(index,null,2)+'\n');
console.log(`Created ${index.length} contact sheets from ${evidence.cases.length} original PNGs; originals unmodified.`);
