import fs from 'node:fs';

const pages=fs.readdirSync('.').filter(name=>/^ex-[a-z0-9-]+\.html$/.test(name));
const catalog=fs.readFileSync('catalog.html','utf8');
for(const page of pages){
  const html=fs.readFileSync(page,'utf8');
  const match=html.match(/<script id="lesson-data" type="application\/json">([\s\S]*?)<\/script>/);
  if(!match)throw Error(`Metadata missing: ${page}`);
  const data=JSON.parse(match[1]);
  if(!data.problem)throw Error(`Invalid metadata: ${page}`);
  if(!html.includes('assignment-flow.js')||!html.includes('catalog.html#assignments'))throw Error(`Flow or home link missing: ${page}`);
  if(!fs.existsSync(`answer-references/${page.replace(/\.html$/,'.png')}`))throw Error(`Reference missing: ${page}`);
  if(!catalog.includes(`href="${page}"`))throw Error(`Catalog card missing: ${page}`);
}
console.log(`Checked ${pages.length} homework pages, their reference images, metadata, flow and catalog links.`);
