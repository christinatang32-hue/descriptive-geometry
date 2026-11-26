import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const catalogPath=path.join(root,'catalog.html');
let catalog=fs.readFileSync(catalogPath,'utf8');
const projectionTypes={
  '3-2':'直线的投影',
  '3-3':'平面的投影',
  '3-4':'直线、平面的相对关系',
  '3-5':'平面立体的投影',
  '3-7':'曲面的投影'
};
const projectionTopic=name=>projectionTypes[name.match(/^ex-(3-\d+)-/)?.[1]];
const pages=fs.readdirSync(root).filter(name=>/^ex-[a-z0-9-]+\.html$/.test(name));
const missing=pages.filter(name=>!catalog.includes(`href="${name}"`)).sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true}));
const cards=missing.map(name=>{
  const type=projectionTopic(name);
  let number=name.replace(/^ex-(\d+)-(\d+)-/,'$1.$2-').replace(/\.html$/,'');
  if(type)number=number.replace(/^(3\.\d+-\d+)-([0-9]+[a-z]*)$/,'$1($2)');
  const topic=type??(number.startsWith('4.1-')?'正等测图':number.startsWith('4.3-')?'斜二测图':number.startsWith('8.2-')?'剖面图':'分步作图');
  return `<a class="card" href="${name}"><strong>作业 ${number}</strong><span>${number} ${topic}</span><b>开始学习 →</b></a>`;
}).join('');
const marker='</div></section><section id="topics"';
if(!catalog.includes(marker))throw Error('Topic boundary missing from catalog');
catalog=catalog.replace(marker,cards+marker);
let updated=0;
const existingProjectionCard=/(<a class="card" href="(ex-3-[a-z0-9-]+\.html)">\s*<strong>作业 ([^<]+)<\/strong>\s*<span>)([^<]*)(<\/span>)/g;
catalog=catalog.replace(existingProjectionCard,(card,before,name,number,oldLabel,after)=>{
  const type=projectionTopic(name);
  if(!type)return card;
  const label=`${number} ${type}`;
  if(label===oldLabel)return card;
  updated++;
  return before+label+after;
});
fs.writeFileSync(catalogPath,catalog,'utf8');
console.log(`Added ${missing.length} assignment cards and updated ${updated} projection labels. ${pages.length} exercises total.`);
