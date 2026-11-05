import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const skip=new Set(['index.html','admin.html']);
const tag='<script defer src="config.js"></script><script defer src="tracker.js"></script>';
let changed=0;
for(const name of fs.readdirSync(root)){
  if(!name.endsWith('.html')||skip.has(name))continue;
  const file=path.join(root,name);
  let source=fs.readFileSync(file,'utf8');
  const original=source;
  if(/^(lecture-|example-|ex-)/.test(name)){
    source=source.replace(/<a href="index\.html#(lectures|examples|assignments)">← 课程目录<\/a>/,
      (_match,module)=>`<a href="catalog.html#${module}">← 首页</a>`);
    if(!/<a href="catalog\.html#(?:lectures|examples|assignments)">← 首页<\/a>/.test(source)){
      throw Error(`Missing course home link: ${name}`);
    }
  }
  if(!source.includes('src="tracker.js"')){
    if(!source.includes('</body>'))throw Error(`Missing body close: ${name}`);
    source=source.replace('</body>',`${tag}</body>`);
  }
  if(name.startsWith('ex-')){
    if(!source.includes('id="lesson-data"'))throw Error(`Missing assignment data: ${name}`);
    if(!source.includes('href="assignment-flow.css"')){
      source=source.replace('</head>','<link rel="stylesheet" href="assignment-flow.css"></head>');
    }
    if(!source.includes('class="assignment-locked"')){
      source=source.replace('<body>','<body class="assignment-locked">');
    }
    if(!source.includes('src="assignment-flow.js"')){
      source=source.replace('<script defer src="tracker.js"></script>',
        '<script defer src="assignment-flow.js"></script><script defer src="tracker.js"></script>');
    }
  }
  if(source!==original){fs.writeFileSync(file,source,'utf8');changed++}
}
console.log(`Course navigation or tracking updated on ${changed} pages.`);
