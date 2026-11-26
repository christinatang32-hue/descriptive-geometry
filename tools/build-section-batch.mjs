import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const tools = import.meta.dirname;
const platform = path.dirname(tools);
const project = path.dirname(platform);
const read = name => fs.readFileSync(path.join(tools, name), 'utf8');
const geometry = JSON.parse(read('section-batch-geometry.json'));
const lessons = [
  { id:'8-2-11', draw:'A—A 旋转剖面图', catalogLabel:'旋转剖面图', material:'金属', stepMax:5, mobile:'700/860' },
  { id:'8-3-2', draw:'板梁柱结构的 1—1 剖面图和 2—2 断面图', catalogLabel:'剖面图和断面图', material:'钢筋混凝土', stepMax:5, mobile:'1284/875' },
  { id:'8-3-3', draw:'A—A 剖面图', catalogLabel:'剖面图', material:'通用材料图例', stepMax:4, mobile:'715/850' },
  { id:'8-3-4', draw:'A—A、B—B 剖面图', catalogLabel:'剖面图', material:'通用材料图例', stepMax:5, mobile:'874/1070' }
];
const exercise = process.argv.find(argument=>argument.startsWith('--exercise='))?.split('=')[1];
if (exercise && !lessons.some(({id})=>id===exercise)) throw Error('未知习题 '+exercise);

function screenshot(id, offline){
  const preview = path.join(project, '.preview', 'section-batch');
  fs.mkdirSync(preview, { recursive:true });
  const profile = fs.mkdtempSync(path.join(preview, 'reference-profile-'));
  const fixture = path.join(preview, id+'-reference.html');
  const rendered = path.join(profile, 'reference.png');
  const resultPage = offline.replace('</body>', `<script>
document.getElementById('complete').click();
document.body.style.cssText='margin:0;background:#fff;height:100vh';
document.body.replaceChildren(document.getElementById('diagram'));
</script></body>`);
  fs.writeFileSync(fixture, resultPage);
  const edge = process.env.SECTION_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const result = spawnSync(edge, ['--headless=new', '--disable-background-networking', '--no-first-run',
    '--disable-gpu', '--hide-scrollbars', '--window-size=1280,912', '--force-device-scale-factor=1',
    '--virtual-time-budget=1000', '--disable-renderer-backgrounding', '--user-data-dir='+profile,
    '--screenshot='+rendered, pathToFileURL(fixture).href],
  { encoding:'utf8', timeout:15000, windowsHide:true });
  const png = fs.existsSync(rendered) ? fs.readFileSync(rendered) : Buffer.alloc(0);
  if ((result.status !== 0 && result.error?.code !== 'ETIMEDOUT') ||
      png.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' ||
      png.subarray(-12).toString('hex') !== '0000000049454e44ae426082') {
    throw Error(result.stderr || String(result.error));
  }
  fs.copyFileSync(rendered, path.join(platform, 'answer-references', 'ex-'+id+'.png'));
}

const template = read('section-batch-template.html');
const engine = read('section-batch-engine.js')
  .replace('/* SECTION_BATCH_MESH */', () => read('section-batch-mesh.js').trimEnd())
  .replace('/* SECTION_AXON_VIEW */', () => read('section-axon-view.js').trimEnd())
  .replace('/* SECTION_LINE_TRACE */', () => read('section-line-trace.js').trimEnd());
const cards = [];
for (const { id, draw, catalogLabel, material, stepMax, mobile } of lessons){
  const number = id.replace('-', '.');
  cards.push({ id, html:`<a class="card" href="ex-${id}.html"><strong>作业 ${number}</strong><span>${number} ${catalogLabel??draw}</span><b>开始学习 →</b></a>` });
  if (exercise && id!==exercise) continue;
  const problem = '求作 '+draw+'（'+material+'）。';
  const js = engine.replace('__SECTION_GEOMETRY__', JSON.stringify(geometry[id]))
    .replace('/* SECTION_BATCH_LESSON */', () => read('section-'+id+'-lesson.js').trimEnd());
  const page = template.replaceAll('__NUMBER__', number).replaceAll('__DRAW__', draw)
    .replaceAll('__MATERIAL__', material).replace('__NARROW_RATIO__', mobile)
    .replace('__MAX_STEP__', stepMax).replace('__PROBLEM_DATA__', JSON.stringify({problem}))
    .replace('__SECTION_LESSON__', () => js.trimEnd());
  const offline = page.replace('<link rel="stylesheet" href="assignment-flow.css">', '')
    .replace('<script defer src="config.js"></script><script defer src="tracker.js"></script><script defer src="assignment-flow.js"></script>', '')
    .replace('<body class="assignment-locked">', '<body>')
    .replace(/<nav class="course-nav"[^>]*>.*?<\/nav>/, '');
  fs.writeFileSync(path.join(platform, 'ex-'+id+'.html'), page);
  fs.writeFileSync(path.join(project, 'assignment', '作业'+number+'.html'), offline);
  if (process.argv.includes('--reference') || process.argv.includes('--reference='+id)) screenshot(id, offline);
}

const catalogPath = path.join(platform, 'catalog.html');
let catalog = fs.readFileSync(catalogPath, 'utf8');
const cardPattern = id => new RegExp('<a class="card" href="ex-'+id+'\\.html">[\\s\\S]*?<\\/a>');
let previous = '8-2-10';
for (const { id, html } of cards){
  const existing = cardPattern(id);
  if (existing.test(catalog)){
    catalog = catalog.replace(existing, () => html);
  } else {
    const anchor = cardPattern(previous);
    if (!anchor.test(catalog)) throw Error('作业目录缺少 '+previous);
    catalog = catalog.replace(anchor, card=>card+html);
  }
  previous = id;
}
fs.writeFileSync(catalogPath, catalog);
console.log('已生成 '+(exercise?exercise.replace('-', '.'):lessons.map(({id})=>id.replace('-', '.')).join('、'))+' 的离线版及平台版。');
