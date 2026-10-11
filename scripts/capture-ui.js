import {mkdtemp,rm,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createApp} from '../server/app.js';

// Screenshots of the real editor interface (built app, temporary data folder,
// this machine's GPU) for reviewing layout and wording.
//   npm run build && node scripts/capture-ui.js <out-dir> [width height]
const [out,width=1600,height=1000]=process.argv.slice(2),dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-ui-'));
const scene=JSON.parse(await readFile('public/scenes/casa-de-bairro.json','utf8')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
try {
  await mkdir(out,{recursive:true});
  const base=`http://127.0.0.1:${server.address().port}`,seeded=await fetch(`${base}/api/tabletop/scenes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:scene})});
  if(seeded.status!==201)throw new Error('Cena não gravada: '+seeded.status+' '+await seeded.text());
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:Number(width),height:Number(height)}});page.setDefaultTimeout(30000);page.on('dialog',d=>d.accept());
  const shot=async name=>{await page.waitForTimeout(700);await page.screenshot({path:`${out}/${name}.png`});console.log(name);};
  const open=async()=>{for(const d of await page.locator('aside details:not([open]) > summary, .panel details:not([open]) > summary').all())await d.click().catch(()=>{});};
  await page.goto(base+"/?diagnostics");await page.waitForFunction(()=>!!window.__tabletop);await shot('01-inicio');
  await page.locator('[data-action="open"]').first().click();await shot('02-abrir');
  await page.locator(`[data-open="${scene.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,scene.id);await page.waitForTimeout(4000);await shot('03-construir');
  await page.locator('[data-tab=elements]').click();await shot('04-elementos');await page.locator('#tree-search').fill('sof');await shot('04b-elementos-busca');await page.locator('#tree-search').fill('');
  await page.locator('[data-tab=scene]').click();await shot('04c-ambiente');await page.locator('[data-tab=elements]').click();
  const sofa=Object.values(scene.layout.entities).find(e=>e.assetRef?.id==='builtin-sofa'),floor=Object.values(scene.layout.entities).find(e=>e.kind==='floor');
  await page.locator(`[data-select="${sofa.id}"]`).first().click().catch(async()=>{await page.evaluate(id=>window.__tabletop.select?.(id),sofa.id);});await shot('05-objeto');
  await page.locator(`[data-select="${floor.id}"]`).first().click().catch(()=>{});await shot('06-piso');
  const texture=page.locator('[data-field="material-texture"]');
  if(await texture.count()){await texture.first().evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await texture.first().selectOption('tile');await page.waitForTimeout(500);
    await page.locator('[data-texture-options] > summary').first().click().catch(()=>{});await page.locator('[data-field="material-tilePattern"]').scrollIntoViewIfNeeded().catch(()=>{});await shot('07-material-azulejo');}
  await page.locator('[data-action="assets"]').first().click().catch(()=>{});await shot('08-assets');
}finally{await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});}
