const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const fixtures=require('../fixtures/presets.json');
const url=process.argv[2],stage=Number(process.argv[3]||4);
const close=(a,b)=>Math.abs(a-b)<1e-7;
function checkProjection(s){
 assert.equal(s.tiles.length,s.shadows.length);
 s.tiles.forEach((tile,i)=>tile.vertices.forEach((v,j)=>{
  const t=-s.lamp[2]/(v[2]-s.lamp[2]);
  assert.ok(close(s.shadows[i][j][0],s.lamp[0]+t*(v[0]-s.lamp[0])));
  assert.ok(close(s.shadows[i][j][1],s.lamp[1]+t*(v[1]-s.lamp[1])));
 }));
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of (stage>=4?[1100,390]:[1100])){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   const response=await page.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200);
   await page.waitForFunction(()=>window.shadowCabinet?.snapshot());
   const snap=()=>page.evaluate(()=>window.shadowCabinet.snapshot());
   assert.equal(await page.locator('h1').innerText(),'Shadow Cabinet');
   assert.deepEqual((await snap()).lamp,[70,-25,-600]);
   assert.equal((await snap()).preset,'rabbit');
   for(const id of ['paper','wall']){
    const result=await page.locator('#'+id).evaluate(c=>{
     const ctx=c.getContext('2d');if(!ctx)return {pixels:0};
     const p=ctx.getImageData(0,0,c.width,c.height).data;
     const colors=new Set();for(let i=0;i<p.length;i+=16)if(p[i+3])colors.add(`${p[i]},${p[i+1]},${p[i+2]}`);
     return {colors:colors.size,width:c.width,height:c.height};
    });assert.ok(result.colors>=3,`${id} not painted`);
   }
   for(const preset of fixtures){
    await page.locator(`[data-preset="${preset.id}"]`).click();
    await page.locator('#home').click();
    await page.waitForFunction(()=>window.shadowCabinet.snapshot().lamp.every((v,i)=>v===[0,0,-600][i]));
    const before=await snap();assert.equal(before.preset,preset.id);assert.deepEqual(before.rows,preset.rows);checkProjection(before);
    // Inspect actual canvas pixels, not only the observation hook.
    const mismatches=await page.locator('#wall').evaluate((c,rows)=>{
     const ctx=c.getContext('2d'),scale=c.width/720,wrong=[];
     for(let r=0;r<24;r++)for(let col=0;col<24;col++){
      const x=360-240+20*col+10,y=300-240+20*r+10;
      if(Math.hypot(x-360,y-300)<40)continue;
      const p=ctx.getImageData(Math.floor(x*scale),Math.floor(y*scale),1,1).data;
      const expected=rows[r][col]==='#'?[36,32,42]:[244,229,198];
      if(expected.some((v,i)=>Math.abs(v-p[i])>3))wrong.push([r,col,...p]);
     }return wrong;
    },preset.rows);assert.equal(mismatches.length,0,JSON.stringify(mismatches.slice(0,5)));
    await page.locator('#wall').scrollIntoViewIfNeeded();const box=await page.locator('#wall').boundingBox();
    await page.mouse.click(box.x+box.width*.85,box.y+box.height*.30);
    await page.waitForFunction(()=>window.shadowCabinet.snapshot().lamp[0]!==0);
    const moved=await snap();assert.deepEqual(moved.tiles,before.tiles);assert.notDeepEqual(moved.shadows,before.shadows);checkProjection(moved);
    const range=page.locator('#lamp-x');await range.focus();await page.keyboard.press('ArrowLeft');
    assert.equal((await snap()).lamp[0],moved.lamp[0]-1);
    const beforeScatter=await snap();await page.locator('#scatter').click();const scattered=await snap();
    assert.equal(scattered.seed,2);assert.deepEqual(scattered.lamp,beforeScatter.lamp);
    assert.notDeepEqual(scattered.tiles,moved.tiles);assert.deepEqual(scattered.rows,preset.rows);
    await page.locator('#home').click();await page.waitForFunction(()=>window.shadowCabinet.snapshot().lamp[0]===0&&window.shadowCabinet.snapshot().lamp[1]===0);
    const home=await snap();home.shadows.forEach((poly,i)=>poly.forEach((v,j)=>v.forEach((n,k)=>assert.ok(close(n,before.shadows[i][j][k])))));
   }
   if(stage>=3){
    const original=await snap();await page.locator('#open-maker').click();
    await page.locator('#maker').waitFor({state:'visible'});assert.ok(await page.locator('#make-sculpture').isDisabled());
    await page.locator('#cancel-maker').click();assert.deepEqual(await snap(),original);
    await page.locator('#open-maker').click();
    const drawBox=await page.locator('#drawing').boundingBox();
    const cell=(r,c)=>({x:drawBox.x+drawBox.width*(c+.5)/24,y:drawBox.y+drawBox.height*(r+.5)/24});
    const start=cell(8,4),end=cell(8,16);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:2});await page.mouse.up();
    assert.ok(await page.locator('#make-sculpture').isEnabled());
    await page.locator('#erase-mode').click();const e=cell(8,10);await page.mouse.click(e.x,e.y);
    await page.locator('#make-sculpture').click();await page.waitForFunction(()=>window.shadowCabinet.snapshot().preset==='custom');const custom=await snap();
    assert.equal(custom.preset,'custom');assert.deepEqual(custom.lamp,[0,0,-600]);assert.equal(custom.seed,1);
    for(let c=4;c<=16;c++)assert.equal(custom.rows[8][c],c===10?'.':'#',`stroke cell ${c}`);
    assert.equal(custom.tiles.length,24);checkProjection(custom);
    await page.locator('#scatter').click();assert.equal((await snap()).preset,'custom');assert.deepEqual((await snap()).rows,custom.rows);
    await page.locator('#open-maker').click();await page.locator('#draw-mode').click();
    const b=await page.locator('#drawing').boundingBox();await page.mouse.click(b.x+b.width*.5,b.y+b.height*.5);
    await page.locator('#clear-drawing').click();assert.ok(await page.locator('#make-sculpture').isDisabled());await page.locator('#cancel-maker').click();
   }
   if(stage>=4){
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
    for(const selector of ['#home','#scatter','#open-maker','#lamp-x','#lamp-y']){
     await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox();
     assert.ok(b.width>=44&&b.height>=44,`${selector} too small`);
    }
    assert.equal(await page.locator('details summary').innerText(),'How can a mess make a rabbit?');
    assert.ok(!(await page.locator('details').getAttribute('open')));
    await page.locator('details summary').click();assert.match(await page.locator('details').innerText(),/perfectly opaque, flat triangles/);
    await page.screenshot({path:`/artifacts/cabinet-${width}.png`,fullPage:true});
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  if(stage>=4){
   const animated=await browser.newPage({viewport:{width:1100,height:900},reducedMotion:'no-preference'});
   await animated.goto(url,{waitUntil:'networkidle'});await animated.waitForFunction(()=>window.shadowCabinet?.snapshot());
   await animated.waitForTimeout(120);assert.deepEqual(await animated.evaluate(()=>window.shadowCabinet.snapshot().lamp),[70,-25,-600]);
   await animated.locator('#home').click();await animated.waitForTimeout(120);
   const intermediate=await animated.evaluate(()=>window.shadowCabinet.snapshot().lamp);
   assert.ok(intermediate[0]>0&&intermediate[0]<70,'home should glide without reduced motion');
   await animated.waitForFunction(()=>window.shadowCabinet.snapshot().lamp[0]===0,{},{timeout:2500});
   await animated.close();
  }
  console.log(`browser stage ${stage} pass`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
