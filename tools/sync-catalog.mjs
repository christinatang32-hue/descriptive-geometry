import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const catalogPath=path.join(root,'catalog.html');
let catalog=fs.readFileSync(catalogPath,'utf8');
const pages=fs.readdirSync(root).filter(name=>/^ex-[a-z0-9-]+\.html$/.test(name));
const missing=pages.filter(name=>!catalog.includes(`href="${name}"`)).sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true}));
const cards=missing.map(name=>{
  const number=name.replace(/^ex-(\d+)-(\d+)-/,'$1.$2-').replace(/\.html$/,'');
  const topic=number.startsWith('4.1-')?'正等测图':number.startsWith('4.3-')?'斜二测图':'分步作图';
  return `<a class="card" href="${name}"><strong>作业 ${number}</strong><span>${number} ${topic}</span><b>开始学习 →</b></a>`;
}).join('');
const marker='</div></section><section id="topics"';
if(!catalog.includes(marker))throw Error('Topic boundary missing from catalog');
catalog=catalog.replace(marker,cards+marker);
fs.writeFileSync(catalogPath,catalog,'utf8');
console.log(`Added ${missing.length} assignment cards; ${pages.length} exercises total.`);
