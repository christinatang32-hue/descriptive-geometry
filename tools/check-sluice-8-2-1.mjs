import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const g=JSON.parse(fs.readFileSync(path.join(root,'tools','sluice-8-2-1-geometry.json'),'utf8'));
const x=[0,...g.breaks,...g.slot,g.length].sort((a,b)=>a-b);
const y=[...g.walls.slice(0,3),g.cutY,...g.walls.slice(3)];
assert.deepEqual(g.photo.x.map(v=>v-g.photo.x[0]),x);
assert.deepEqual(g.photo.planY.map(v=>v-g.photo.planY[0]),y);
assert.deepEqual(g.photo.elevationY.map(v=>g.photo.elevationY.at(-1)-v),[g.height,g.crest,g.floor,0]);
assert(g.cutY>g.walls[2]&&g.cutY<g.walls[3]);
assert(g.floor<g.crest&&g.crest<g.height);
const page=fs.readFileSync(path.join(root,'ex-8-2-1.html'),'utf8');
const offline=fs.readFileSync(path.resolve(root,'..','assignment','作业8.2-1.html'),'utf8');
const source=fs.readFileSync(path.join(root,'tools','sluice-8-2-1-source.js'),'utf8');
const trace=fs.readFileSync(path.join(root,'tools','section-line-trace.js'),'utf8');
const embedded=source.replace('__SLUICE_GEOMETRY__',JSON.stringify(g))
  .replace('  /* SECTION_LINE_TRACE */',()=>trace.trimEnd()).trimEnd();
assert(page.includes(embedded));
assert(offline.includes(embedded));
assert(!/<script[^>]+src=|<link[^>]+stylesheet|class="assignment-locked"/.test(offline));
assert(page.includes('assignment-flow.js')&&page.includes('catalog.html#assignments'));
assert(fs.readFileSync(path.join(root,'catalog.html'),'utf8').includes('href="ex-8-2-1.html"'));
assert(fs.existsSync(path.join(root,'answer-references','ex-8-2-1.png')));
console.log('Verified photo measurements, shared geometry, platform flow, offline page and answer reference.');
