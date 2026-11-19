import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const htmlPath=path.join(root,'ex-8-2-1.html');
const sourcePath=path.join(root,'tools','sluice-8-2-1-source.js');
const geometryPath=path.join(root,'tools','sluice-8-2-1-geometry.json');
let html=fs.readFileSync(htmlPath,'utf8');
const start='// BEGIN GENERATED SLUICE LESSON';
const end='// END GENERATED SLUICE LESSON';
if(!html.includes(start)||!html.includes(end))throw Error('Lesson markers missing');
const geometry=JSON.parse(fs.readFileSync(geometryPath,'utf8'));
const source=fs.readFileSync(sourcePath,'utf8').replace('__SLUICE_GEOMETRY__',JSON.stringify(geometry));
html=html.replace(new RegExp(`${start}[\\s\\S]*?${end}`),`${start}\n${source.trimEnd()}\n${end}`);
fs.writeFileSync(htmlPath,html,'utf8');
const offline=html.replace('<link rel="stylesheet" href="assignment-flow.css">','')
  .replace('<script defer src="config.js"></script><script defer src="tracker.js"></script><script defer src="assignment-flow.js"></script>','')
  .replace('<body class="assignment-locked">','<body>')
  .replace(/<nav class="course-nav"[^>]*>[^<]*<a[^>]*>[^<]*<\/a><\/nav>/,'');
const offlinePath=path.resolve(root,'..','assignment','作业8.2-1.html');
fs.writeFileSync(offlinePath,offline,'utf8');
console.log('Updated platform exercise and standalone offline lesson from the measured geometry source.');
