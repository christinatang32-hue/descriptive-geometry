import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const tools = import.meta.dirname;
const platform = path.resolve(tools, '..');
const project = path.resolve(platform, '..');
const read = name => fs.readFileSync(path.join(tools, name), 'utf8');
const geometry = JSON.parse(read('section-8-2-2-geometry.json'));
const source = read('section-8-2-2-source.js').replace('__SECTION_GEOMETRY__', JSON.stringify(geometry))
  .replace('  /* SECTION_LINE_TRACE */', () => read('section-line-trace.js').trimEnd());
const platformPage = read('section-8-2-2-template.html').replace('__SECTION_LESSON__', () => source.trimEnd());
const offlinePage = platformPage.replace('<link rel="stylesheet" href="assignment-flow.css">', '')
  .replace('<script defer src="config.js"></script><script defer src="tracker.js"></script><script defer src="assignment-flow.js"></script>', '')
  .replace('<body class="assignment-locked">', '<body>')
  .replace(/<nav class="course-nav"[^>]*>.*?<\/nav>/, '');
fs.writeFileSync(path.join(platform, 'ex-8-2-2.html'), platformPage);
fs.writeFileSync(path.join(project, 'assignment', '作业8.2-2.html'), offlinePage);

const catalogPath = path.join(platform, 'catalog.html');
const catalog = fs.readFileSync(catalogPath, 'utf8');
if (!catalog.includes('href="ex-8-2-2.html"')) {
  const precedingCard = /<a class="card" href="ex-8-2-1\.html">[\s\S]*?<\/a>/;
  if (!precedingCard.test(catalog)) throw Error('作业目录缺少 8.2-1，无法定位新增卡片');
  const card = '<a class="card" href="ex-8-2-2.html"><strong>作业 8.2-2</strong><span>8.2-2 剖面图</span><b>开始学习 →</b></a>';
  fs.writeFileSync(catalogPath, catalog.replace(precedingCard, existing => existing + card));
}

if (process.argv.includes('--reference')) {
  const previews = path.join(project, '.preview', 'section-8-2-2');
  fs.mkdirSync(previews, { recursive: true });
  const profile = fs.mkdtempSync(path.join(previews, 'reference-profile-'));
  const fixture = path.join(previews, 'reference.html');
  const rendered = path.join(profile, 'reference.png');
  const answer = path.join(platform, 'answer-references', 'ex-8-2-2.png');
  const referencePage = offlinePage.replace('</body>', `<script>
document.getElementById('complete').click();
document.body.style.cssText='margin:0;background:#fff;height:100vh';
document.body.replaceChildren(document.getElementById('diagram'));
</script></body>`);
  fs.writeFileSync(fixture, referencePage);
  const edge = process.env.SECTION_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const result = spawnSync(edge, ['--headless=new', '--disable-background-networking', '--no-first-run',
    '--disable-gpu', '--hide-scrollbars', '--window-size=1280,768', '--force-device-scale-factor=1',
    '--virtual-time-budget=1000', '--disable-renderer-backgrounding',
    '--user-data-dir='+profile, '--screenshot='+rendered, pathToFileURL(fixture).href],
  { encoding:'utf8', timeout:10000, windowsHide:true });
  const png = fs.existsSync(rendered) ? fs.readFileSync(rendered) : Buffer.alloc(0);
  // Edge can finish writing its screenshot before an auxiliary process exits.
  if ((result.status !== 0 && result.error?.code !== 'ETIMEDOUT') ||
      png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
      png.subarray(-12).toString('hex') !== '0000000049454e44ae426082') {
    throw Error(result.stderr || String(result.error));
  }
  fs.copyFileSync(rendered, answer);
}
console.log('已生成作业 8.2-2 离线版及本地平台版。');
