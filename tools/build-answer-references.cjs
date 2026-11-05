// Rebuild the AI comparison images after changing any exercise's final drawing.
// Requires Playwright and a local static server for this directory.
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const base=process.env.COURSE_PREVIEW_URL||'http://127.0.0.1:8765/';

(async()=>{
  const output=path.join(root,'answer-references');
  fs.mkdirSync(output,{recursive:true});
  const files=fs.readdirSync(root).filter(name=>/^ex-[a-z0-9-]+\.html$/.test(name)).sort();
  const launch=process.env.BROWSER_BINARY?{executablePath:process.env.BROWSER_BINARY,headless:true}:{headless:true};
  const browser=await chromium.launch(launch);
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    await page.route('**/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:''}));
    await page.route('**/assignment-flow.js',route=>route.fulfill({contentType:'text/javascript',body:''}));
    for(const name of files){
      await page.goto(new URL(name,base).href);
      await page.evaluate(()=>document.body.classList.remove('assignment-locked'));
      await page.locator('#complete').click();
      await page.locator('#diagram').screenshot({path:path.join(output,name.replace(/\.html$/,'.png')),animations:'disabled'});
    }
    console.log('Generated '+files.length+' answer reference images.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
